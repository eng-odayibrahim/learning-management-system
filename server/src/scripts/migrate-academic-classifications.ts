import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { UserModel } from '../identity/infrastructure/persistence/UserModel'
import { CourseModel } from '../learning/infrastructure/persistence/CourseModel'
import {
  AcademicStageModel,
  GradeModel,
  TrackModel,
  SpecializationModel,
} from '../learning/infrastructure/persistence/TaxonomyModels'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

interface MigrationStats {
  studentsTotal: number
  studentsAlreadyCanonical: number
  studentsDeterministicMigrated: number
  studentsFlaggedForReview: {
    id: string
    username: string
    fullName: string
    legacy: { stage?: string; grade?: string; track?: string; specialization?: string }
    reason: string
  }[]
  coursesTotal: number
  coursesUpdatedTracks: number
  coursesUpdatedSpecializations: number
  coursesUnclassified: { id: string; title: string; reason: string }[]
}

const ARABIC_ORDINALS: Record<string, string> = {
  'الاول': '1',
  'الثاني': '2',
  'الثالث': '3',
  'الرابع': '4',
  'الخامس': '5',
  'السادس': '6',
  'السابع': '7',
  'الثامن': '8',
  'التاسع': '9',
  'العاشر': '10',
  'الحادي عشر': '11',
  'الثاني عشر': '12',
  '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٠': '0'
}

function normalizeName(val?: string | number | null): string {
  if (val === null || val === undefined) return ''
  let str = String(val)
    .trim()
    .toLowerCase()
    .replace(/^(المرحلة|مرحلة|الصف|صف)\s+/gi, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()

  if (ARABIC_ORDINALS[str]) {
    str = ARABIC_ORDINALS[str]
  }
  return str
}

export async function runAcademicMigration(options: { dryRun?: boolean; mongoUri?: string } = {}) {
  const isDryRun = options.dryRun ?? (process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true')
  const mongoUri = options.mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms'

  console.log(`=======================================================`)
  console.log(`[Academic Migration] Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'APPLY (Live Updates)'}`)
  console.log(`=======================================================\n`)

  let shouldDisconnect = false
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri)
    shouldDisconnect = true
    console.log(`Connected to MongoDB: ${mongoUri}`)
  }

  const stats: MigrationStats = {
    studentsTotal: 0,
    studentsAlreadyCanonical: 0,
    studentsDeterministicMigrated: 0,
    studentsFlaggedForReview: [],
    coursesTotal: 0,
    coursesUpdatedTracks: 0,
    coursesUpdatedSpecializations: 0,
    coursesUnclassified: [],
  }

  try {
    // ── 1. Cache Taxonomy ───────────────────────────────────────────────────
    const [stages, grades, tracks, specializations] = await Promise.all([
      AcademicStageModel.find({ isActive: true }).lean(),
      GradeModel.find({ isActive: true }).lean(),
      TrackModel.find({ isActive: true }).lean(),
      SpecializationModel.find({ isActive: true }).lean(),
    ])

    console.log(`Loaded taxonomy: ${stages.length} stages, ${grades.length} grades, ${tracks.length} tracks, ${specializations.length} specializations.`)

    // ── 2. Migrate Students ─────────────────────────────────────────────────
    const students = await UserModel.find({ role: 'student' })
    stats.studentsTotal = students.length

    for (const student of students) {
      if (student.academicStageId && student.academicGradeId) {
        stats.studentsAlreadyCanonical++
        continue
      }

      const legacy = {
        stage: student.stage,
        grade: student.grade,
        track: student.track,
        specialization: student.specialization,
      }

      if (!legacy.stage || !legacy.grade) {
        stats.studentsFlaggedForReview.push({
          id: student._id.toString(),
          username: student.username,
          fullName: student.fullName,
          legacy,
          reason: 'Missing legacy stage or grade text value',
        })
        continue
      }

      const normStage = normalizeName(legacy.stage)
      const normGrade = normalizeName(legacy.grade)

      // Match Stage
      const matchedStages = stages.filter((s) => {
        const sNorm = normalizeName(s.name)
        return sNorm === normStage || sNorm.includes(normStage) || normStage.includes(sNorm)
      })

      if (matchedStages.length !== 1) {
        stats.studentsFlaggedForReview.push({
          id: student._id.toString(),
          username: student.username,
          fullName: student.fullName,
          legacy,
          reason: matchedStages.length === 0 ? `Stage '${legacy.stage}' not found in active stages` : `Ambiguous stage '${legacy.stage}' (${matchedStages.length} matches)`,
        })
        continue
      }

      const stage = matchedStages[0]

      // Match Grade belonging to this Stage
      const validGradesForStage = grades.filter((g) => g.stageId && g.stageId.toString() === stage._id.toString())
      const matchedGrades = validGradesForStage.filter((g) => {
        const gNorm = normalizeName(g.name)
        return gNorm === normGrade || gNorm.includes(normGrade) || normGrade.includes(gNorm)
      })

      if (matchedGrades.length !== 1) {
        stats.studentsFlaggedForReview.push({
          id: student._id.toString(),
          username: student.username,
          fullName: student.fullName,
          legacy,
          reason: matchedGrades.length === 0
            ? `Grade '${legacy.grade}' does not match any grade in stage '${stage.name}'`
            : `Ambiguous grade '${legacy.grade}' (${matchedGrades.length} matches in stage)`,
        })
        continue
      }

      const grade = matchedGrades[0]

      // Match Track if provided
      let matchedTrackId: mongoose.Types.ObjectId | undefined
      if (legacy.track) {
        const normTrack = normalizeName(legacy.track)
        const validTracksForGrade = tracks.filter((t) => !t.gradeIds?.length || t.gradeIds.some((gid) => gid.toString() === grade._id.toString()))
        const matchedTracks = validTracksForGrade.filter((t) => {
          const tNorm = normalizeName(t.name)
          return tNorm === normTrack || tNorm.includes(normTrack) || normTrack.includes(tNorm)
        })

        if (matchedTracks.length === 1) {
          matchedTrackId = matchedTracks[0]._id as mongoose.Types.ObjectId
        } else if (matchedTracks.length > 1) {
          stats.studentsFlaggedForReview.push({
            id: student._id.toString(),
            username: student.username,
            fullName: student.fullName,
            legacy,
            reason: `Ambiguous track '${legacy.track}' for grade '${grade.name}'`,
          })
          continue
        }
      }

      // Match Specialization if provided
      let matchedSpecId: mongoose.Types.ObjectId | undefined
      if (legacy.specialization) {
        const normSpec = normalizeName(legacy.specialization)
        const validSpecsForTrack = specializations.filter((sp) => !sp.trackIds?.length || (matchedTrackId && sp.trackIds.some((tid) => tid.toString() === matchedTrackId?.toString())))
        const matchedSpecs = validSpecsForTrack.filter((sp) => {
          const spNorm = normalizeName(sp.name)
          return spNorm === normSpec || spNorm.includes(normSpec) || normSpec.includes(spNorm)
        })

        if (matchedSpecs.length === 1) {
          matchedSpecId = matchedSpecs[0]._id as mongoose.Types.ObjectId
        } else if (matchedSpecs.length > 1) {
          stats.studentsFlaggedForReview.push({
            id: student._id.toString(),
            username: student.username,
            fullName: student.fullName,
            legacy,
            reason: `Ambiguous specialization '${legacy.specialization}'`,
          })
          continue
        }
      }

      // Deterministic Match Found!
      if (!isDryRun) {
        await UserModel.updateOne(
          { _id: student._id },
          {
            $set: {
              academicStageId: stage._id,
              academicGradeId: grade._id,
              academicTrackId: matchedTrackId,
              academicSpecializationId: matchedSpecId,
            },
          }
        )
      }
      stats.studentsDeterministicMigrated++
    }

    // ── 3. Migrate Courses ──────────────────────────────────────────────────
    const courses = await CourseModel.find({})
    stats.coursesTotal = courses.length

    for (const course of courses) {
      if (!course.stageId || !course.gradeId) {
        stats.coursesUnclassified.push({
          id: course._id.toString(),
          title: course.title,
          reason: 'Course is missing stageId or gradeId',
        })
      }

      let shouldUpdateCourse = false
      const updateSet: Record<string, unknown> = {}

      // Backfill trackIds from singular trackId
      if (course.trackId && (!course.trackIds || course.trackIds.length === 0)) {
        updateSet.trackIds = [course.trackId]
        stats.coursesUpdatedTracks++
        shouldUpdateCourse = true
      }

      // Backfill specializationIds from singular specializationId
      if (course.specializationId && (!course.specializationIds || course.specializationIds.length === 0)) {
        updateSet.specializationIds = [course.specializationId]
        stats.coursesUpdatedSpecializations++
        shouldUpdateCourse = true
      }

      if (shouldUpdateCourse && !isDryRun) {
        await CourseModel.updateOne({ _id: course._id }, { $set: updateSet })
      }
    }

    // ── 4. Print Summary Report ─────────────────────────────────────────────
    console.log(`\n=================== MIGRATION SUMMARY ===================`)
    console.log(`Students:`)
    console.log(`  Total Evaluated:              ${stats.studentsTotal}`)
    console.log(`  Already Canonical:            ${stats.studentsAlreadyCanonical}`)
    console.log(`  Deterministically Migrated:   ${stats.studentsDeterministicMigrated}`)
    console.log(`  Flagged for Manual Review:    ${stats.studentsFlaggedForReview.length}`)
    console.log(`\nCourses:`)
    console.log(`  Total Evaluated:              ${stats.coursesTotal}`)
    console.log(`  Track Arrays Populated:       ${stats.coursesUpdatedTracks}`)
    console.log(`  Spec Arrays Populated:        ${stats.coursesUpdatedSpecializations}`)
    console.log(`  Unclassified Courses:         ${stats.coursesUnclassified.length}`)

    if (stats.studentsFlaggedForReview.length > 0) {
      console.log(`\n--- Flagged Students Requiring Manual Admin Review (${stats.studentsFlaggedForReview.length}) ---`)
      for (const item of stats.studentsFlaggedForReview.slice(0, 20)) {
        console.log(`- [${item.username}] ${item.fullName} | Stage: '${item.legacy.stage || ''}', Grade: '${item.legacy.grade || ''}' | Reason: ${item.reason}`)
      }
      if (stats.studentsFlaggedForReview.length > 20) {
        console.log(`  ... and ${stats.studentsFlaggedForReview.length - 20} more.`)
      }
    }

    if (stats.coursesUnclassified.length > 0) {
      console.log(`\n--- Unclassified Courses Requiring Admin Placement (${stats.coursesUnclassified.length}) ---`)
      for (const item of stats.coursesUnclassified) {
        console.log(`- [${item.id}] ${item.title} | Reason: ${item.reason}`)
      }
    }
    console.log(`=========================================================\n`)

    return stats
  } finally {
    if (shouldDisconnect) {
      await mongoose.disconnect()
    }
  }
}

if (require.main === module) {
  runAcademicMigration().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
}
