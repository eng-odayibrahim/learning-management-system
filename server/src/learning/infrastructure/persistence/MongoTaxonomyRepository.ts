import { AcademicStage, AcademicStageProps } from '../../domain/entities/AcademicStage'
import { Grade, GradeProps } from '../../domain/entities/Grade'
import { Track, TrackProps } from '../../domain/entities/Track'
import { Specialization, SpecializationProps } from '../../domain/entities/Specialization'
import {
  AcademicStageModel,
  GradeModel,
  TrackModel,
  SpecializationModel,
  AcademicStageDocument,
  GradeDocument,
  TrackDocument,
  SpecializationDocument
} from './TaxonomyModels'

export class MongoTaxonomyRepository {
  // ── 1. AcademicStage CRUD ────────────────────────────────────────────────
  async findAllStages(onlyActive = true): Promise<AcademicStage[]> {
    const filter = onlyActive ? { isActive: true } : {}
    const docs = await AcademicStageModel.find(filter).sort({ name: 1 })
    return docs.map(this.mapStage)
  }

  async findStageById(id: string): Promise<AcademicStage | null> {
    const doc = await AcademicStageModel.findById(id)
    return doc ? this.mapStage(doc) : null
  }

  async saveStage(stage: AcademicStage): Promise<AcademicStage> {
    const doc = await AcademicStageModel.findByIdAndUpdate(
      stage.id,
      {
        name: stage.name,
        image: stage.image,
        description: stage.description,
        isActive: stage.isActive
      },
      { new: true, upsert: true }
    )
    return this.mapStage(doc)
  }

  async deleteStage(id: string): Promise<boolean> {
    const res = await AcademicStageModel.findByIdAndDelete(id)
    return !!res
  }

  private mapStage(doc: AcademicStageDocument): AcademicStage {
    return new AcademicStage({
      id: doc._id.toHexString(),
      name: doc.name,
      image: doc.image,
      description: doc.description,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    })
  }

  // ── 2. Grade CRUD ────────────────────────────────────────────────────────
  async findAllGrades(onlyActive = true): Promise<Grade[]> {
    const filter: any = onlyActive ? { isActive: true } : {}
    const docs = await GradeModel.find(filter).sort({ name: 1 })
    return docs.map(this.mapGrade)
  }

  async findGradeById(id: string): Promise<Grade | null> {
    const doc = await GradeModel.findById(id)
    return doc ? this.mapGrade(doc) : null
  }

  async saveGrade(grade: Grade): Promise<Grade> {
    const doc = await GradeModel.findByIdAndUpdate(
      grade.id,
      {
        name: grade.name,
        stageId: grade.stageId,
        isActive: grade.isActive
      },
      { new: true, upsert: true }
    )
    return this.mapGrade(doc)
  }

  async deleteGrade(id: string): Promise<boolean> {
    const res = await GradeModel.findByIdAndDelete(id)
    return !!res
  }

  private mapGrade(doc: any): Grade {
    let parsedName = Number(doc.name)
    if (isNaN(parsedName)) {
      const match = String(doc.name).match(/\d+/)
      parsedName = match ? Number(match[0]) : 0
    }
    return new Grade({
      id: doc._id.toHexString(),
      name: parsedName,
      stageId: doc.stageId?.toHexString(),
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    })
  }

  // ── 3. Track CRUD ────────────────────────────────────────────────────────
  async findAllTracks(onlyActive = true): Promise<Track[]> {
    const filter = onlyActive ? { isActive: true } : {}
    const docs = await TrackModel.find(filter).sort({ name: 1 })
    return docs.map(this.mapTrack)
  }

  async findTrackById(id: string): Promise<Track | null> {
    const doc = await TrackModel.findById(id)
    return doc ? this.mapTrack(doc) : null
  }

  async saveTrack(track: Track): Promise<Track> {
    const doc = await TrackModel.findByIdAndUpdate(
      track.id,
      {
        name: track.name,
        gradeIds: track.gradeIds,
        isActive: track.isActive
      },
      { new: true, upsert: true }
    )
    return this.mapTrack(doc)
  }

  async deleteTrack(id: string): Promise<boolean> {
    const res = await TrackModel.findByIdAndDelete(id)
    return !!res
  }

  private mapTrack(doc: TrackDocument): Track {
    return new Track({
      id: doc._id.toHexString(),
      name: doc.name,
      gradeIds: (doc.gradeIds ?? []).map((id: any) => id.toHexString()),
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    })
  }

  // ── 4. Specialization CRUD ───────────────────────────────────────────────
  async findAllSpecializations(onlyActive = true): Promise<Specialization[]> {
    const filter = onlyActive ? { isActive: true } : {}
    const docs = await SpecializationModel.find(filter).sort({ name: 1 })
    return docs.map(this.mapSpecialization)
  }

  async findSpecializationById(id: string): Promise<Specialization | null> {
    const doc = await SpecializationModel.findById(id)
    return doc ? this.mapSpecialization(doc) : null
  }

  async saveSpecialization(spec: Specialization): Promise<Specialization> {
    const doc = await SpecializationModel.findByIdAndUpdate(
      spec.id,
      {
        name: spec.name,
        trackIds: spec.trackIds,
        isActive: spec.isActive
      },
      { new: true, upsert: true }
    )
    return this.mapSpecialization(doc)
  }

  async deleteSpecialization(id: string): Promise<boolean> {
    const res = await SpecializationModel.findByIdAndDelete(id)
    return !!res
  }

  private mapSpecialization(doc: SpecializationDocument): Specialization {
    return new Specialization({
      id: doc._id.toHexString(),
      name: doc.name,
      trackIds: (doc.trackIds ?? []).map((id: any) => id.toHexString()),
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    })
  }

  // ── Unified Taxonomy DTO for Catalog/Dashboard ───────────────────────────
  async getFullTaxonomy(onlyActive = true) {
    const [stages, grades, tracks, specializations] = await Promise.all([
      this.findAllStages(onlyActive),
      this.findAllGrades(onlyActive),
      this.findAllTracks(onlyActive),
      this.findAllSpecializations(onlyActive)
    ])
    return { stages, grades, tracks, specializations }
  }
}
