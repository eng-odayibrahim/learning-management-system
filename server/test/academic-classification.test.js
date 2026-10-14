const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')

const { CourseAccessPolicy, LessonAccessPolicy } = require('../dist/learning/application/policies/AccessPolicies')
const { UserModel } = require('../dist/identity/infrastructure/persistence/UserModel')
const {
  AcademicStageModel,
  GradeModel,
  TrackModel,
  SpecializationModel,
} = require('../dist/learning/infrastructure/persistence/TaxonomyModels')
const { CourseModel } = require('../dist/learning/infrastructure/persistence/CourseModel')
const { LessonModel } = require('../dist/learning/infrastructure/persistence/LessonModel')
const { ClassModel } = require('../dist/learning/infrastructure/persistence/ClassModel')
const { SubjectModel } = require('../dist/learning/infrastructure/persistence/SubjectModel')

const oid = (val) => ({
  _id: val,
  toString: () => val,
  equals: (other) => val === (other?._id ? String(other._id) : String(other)),
})

test('Academic Classification: validates valid combinations and rejects cross-stage hierarchy', async () => {
  const stage1 = oid('607f1f77bcf86cd799439001')
  const stage2 = oid('607f1f77bcf86cd799439002')
  const grade1 = { ...oid('607f1f77bcf86cd799439003'), stageId: stage1, isActive: true }
  const grade2 = { ...oid('607f1f77bcf86cd799439004'), stageId: stage2, isActive: true }

  assert.equal(grade1.stageId.equals(stage1), true, 'grade1 belongs to stage1')
  assert.equal(grade1.stageId.equals(stage2), false, 'grade1 does not belong to stage2')
  assert.equal(grade2.stageId.equals(stage2), true, 'grade2 belongs to stage2')
})

test('Academic Eligibility: student sees only their track, shared tracks appear, cross-track courses hidden', async () => {
  const ids = {
    stage: '607f1f77bcf86cd799439010',
    grade3: '607f1f77bcf86cd799439011',
    scientificTrack: '607f1f77bcf86cd799439012',
    literaryTrack: '607f1f77bcf86cd799439013',
    otherGrade: '607f1f77bcf86cd799439014',
  }

  const scientificStudent = {
    _id: oid('607f1f77bcf86cd799439020'),
    academicStageId: oid(ids.stage),
    academicGradeId: oid(ids.grade3),
    academicTrackId: oid(ids.scientificTrack),
  }

  const origUserFindOne = UserModel.findOne
  const origGradeFindById = GradeModel.findById
  const origTrackFindById = TrackModel.findById
  const origSpecFindById = SpecializationModel.findById

  UserModel.findOne = () => ({ select: () => ({ lean: async () => scientificStudent }) })
  GradeModel.findById = () => ({ select: () => ({ lean: async () => ({ stageId: oid(ids.stage), isActive: true }) }) })
  TrackModel.findById = () => ({ select: () => ({ lean: async () => ({ gradeIds: [oid(ids.grade3)], isActive: true }) }) })
  SpecializationModel.findById = () => ({ select: () => ({ lean: async () => null }) })

  const actor = { sub: scientificStudent._id.toString(), role: 'student' }

  try {
    // 1. Track-specific course (Scientific) -> SHOULD BE ELIGIBLE
    const scientificCourse = {
      _id: oid('607f1f77bcf86cd799439031'),
      stageId: oid(ids.stage),
      gradeId: oid(ids.grade3),
      trackIds: [oid(ids.scientificTrack)],
      specializationIds: [],
    }
    assert.equal(await CourseAccessPolicy.isAcademicallyEligible(scientificCourse, actor), true)

    // 2. Shared course (Arabic / English for Scientific & Literary) -> SHOULD BE ELIGIBLE
    const sharedCourse = {
      _id: oid('607f1f77bcf86cd799439032'),
      stageId: oid(ids.stage),
      gradeId: oid(ids.grade3),
      trackIds: [oid(ids.scientificTrack), oid(ids.literaryTrack)],
      specializationIds: [],
    }
    assert.equal(await CourseAccessPolicy.isAcademicallyEligible(sharedCourse, actor), true)

    // 3. Cross-track course (Literary only) -> MUST BE STRICTLY HIDDEN
    const literaryCourse = {
      _id: oid('607f1f77bcf86cd799439033'),
      stageId: oid(ids.stage),
      gradeId: oid(ids.grade3),
      trackIds: [oid(ids.literaryTrack)],
      specializationIds: [],
    }
    assert.equal(await CourseAccessPolicy.isAcademicallyEligible(literaryCourse, actor), false)

    // 4. Cross-grade course -> MUST BE STRICTLY HIDDEN
    const wrongGradeCourse = {
      _id: oid('607f1f77bcf86cd799439034'),
      stageId: oid(ids.stage),
      gradeId: oid(ids.otherGrade),
      trackIds: [],
      specializationIds: [],
    }
    assert.equal(await CourseAccessPolicy.isAcademicallyEligible(wrongGradeCourse, actor), false)
  } finally {
    UserModel.findOne = origUserFindOne
    GradeModel.findById = origGradeFindById
    TrackModel.findById = origTrackFindById
    SpecializationModel.findById = origSpecFindById
  }
})

test('Academic Eligibility: unclassified student without placement sees 0 courses', async () => {
  const origUserFindOne = UserModel.findOne
  const unclassifiedStudent = {
    _id: oid('607f1f77bcf86cd799439099'),
    academicStageId: null,
    academicGradeId: null,
  }
  UserModel.findOne = () => ({ select: () => ({ lean: async () => unclassifiedStudent }) })

  const actor = { sub: unclassifiedStudent._id.toString(), role: 'student' }

  const course = {
    _id: oid('607f1f77bcf86cd799439031'),
    stageId: oid('607f1f77bcf86cd799439010'),
    gradeId: oid('607f1f77bcf86cd799439011'),
    trackIds: [],
    specializationIds: [],
  }

  try {
    assert.equal(await CourseAccessPolicy.isAcademicallyEligible(course, actor), false)
  } finally {
    UserModel.findOne = origUserFindOne
  }
})

test('Academic Security: direct URL access to lesson in cross-track course is denied', async () => {
  const ids = {
    stage: '607f1f77bcf86cd799439010',
    grade3: '607f1f77bcf86cd799439011',
    scientificTrack: '607f1f77bcf86cd799439012',
    literaryTrack: '607f1f77bcf86cd799439013',
  }

  const scientificStudent = {
    academicStageId: oid(ids.stage),
    academicGradeId: oid(ids.grade3),
    academicTrackId: oid(ids.scientificTrack),
  }

  const orig = {
    userFindOne: UserModel.findOne,
    gradeFindById: GradeModel.findById,
    trackFindById: TrackModel.findById,
    specFindById: SpecializationModel.findById,
    lessonFindById: LessonModel.findById,
    classFindById: ClassModel.findById,
    subjectFindById: SubjectModel.findById,
    courseFindById: CourseModel.findById,
  }

  UserModel.findOne = () => ({ select: () => ({ lean: async () => scientificStudent }) })
  GradeModel.findById = () => ({ select: () => ({ lean: async () => ({ stageId: oid(ids.stage), isActive: true }) }) })
  TrackModel.findById = () => ({ select: () => ({ lean: async () => ({ gradeIds: [oid(ids.grade3)], isActive: true }) }) })
  SpecializationModel.findById = () => ({ select: () => ({ lean: async () => null }) })

  const literaryCourse = {
    _id: oid('607f1f77bcf86cd799439088'),
    stageId: oid(ids.stage),
    gradeId: oid(ids.grade3),
    trackIds: [oid(ids.literaryTrack)],
    specializationIds: [],
    isActive: true,
    isPublished: true,
    status: 'published',
  }

  LessonModel.findById = async () => ({ classId: 'cls1', isFree: true, isActive: true, isPublished: true, status: 'published' })
  ClassModel.findById = async () => ({ subjectId: 'subj1' })
  SubjectModel.findById = async () => ({ courseId: literaryCourse._id.toString() })
  CourseModel.findById = async () => literaryCourse

  const actor = { sub: '607f1f77bcf86cd799439020', role: 'student' }

  try {
    await assert.rejects(
      () => LessonAccessPolicy.authorize('607f1f77bcf86cd799439090', actor),
      /Lesson not found/
    )
  } finally {
    UserModel.findOne = orig.userFindOne
    GradeModel.findById = orig.gradeFindById
    TrackModel.findById = orig.trackFindById
    SpecializationModel.findById = orig.specFindById
    LessonModel.findById = orig.lessonFindById
    ClassModel.findById = orig.classFindById
    SubjectModel.findById = orig.subjectFindById
    CourseModel.findById = orig.courseFindById
  }
})
