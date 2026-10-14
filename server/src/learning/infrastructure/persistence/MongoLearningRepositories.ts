import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { ICourseRepository, CourseFilter, ICoursePaginated } from '../../domain/repositories/ICourseRepository'
import { ISubjectRepository } from '../../domain/repositories/ISubjectRepository'
import { IClassRepository }   from '../../domain/repositories/IClassRepository'
import { ILessonRepository }  from '../../domain/repositories/ILessonRepository'
import { Course }  from '../../domain/entities/Course'
import { Subject } from '../../domain/entities/Subject'
import { Class }   from '../../domain/entities/Class'
import { Lesson }  from '../../domain/entities/Lesson'
import { Slug }    from '../../domain/value-objects/Slug'
import { CourseModel }  from './CourseModel'
import { SubjectModel } from './SubjectModel'
import { ClassModel }   from './ClassModel'
import { LessonModel }  from './LessonModel'
import { CourseworkModel } from './CourseworkModel'
import { CourseMapper, SubjectMapper, ClassMapper, LessonMapper, CourseworkMapper } from './LearningMappers'
import { ICourseworkRepository } from '../../domain/repositories/ICourseworkRepository'
import { Coursework } from '../../domain/entities/Coursework'
// ── Course ─────────────────────────────────────────────────────────────────
export class MongoCourseRepository implements ICourseRepository {
  async findById(id: UniqueEntityId): Promise<Course | null> {
    const d = await CourseModel.findById(id.toString())
    return d ? CourseMapper.toDomain(d) : null
  }

  async findBySlug(slug: Slug): Promise<Course | null> {
    const d = await CourseModel.findOne({ slug: slug.value })
    return d ? CourseMapper.toDomain(d) : null
  }

  async findAll(filter: CourseFilter = {}, page = 1, limit = 20): Promise<ICoursePaginated> {
    const q: Record<string, unknown> = {}
    if (filter.stageId)               q.stageId          = filter.stageId
    if (filter.gradeId)               q.gradeId          = filter.gradeId
    if (filter.trackId)               q.$and = [...(q.$and as unknown[] ?? []), { $or: [{ trackId: filter.trackId }, { trackIds: filter.trackId }] }]
    if (filter.specializationId)      q.$and = [...(q.$and as unknown[] ?? []), { $or: [{ specializationId: filter.specializationId }, { specializationIds: filter.specializationId }] }]
    if (filter.isPublished !== undefined) q.isPublished  = filter.isPublished
    if (filter.isActive    !== undefined) q.isActive     = filter.isActive
    if (filter.visibleCourseIds !== undefined) q._id = { $in: filter.visibleCourseIds }

    const [docs, total] = await Promise.all([
      CourseModel.find(q).sort({ order: 1 }).skip((page - 1) * limit).limit(limit),
      CourseModel.countDocuments(q),
    ])
    return { items: docs.map(CourseMapper.toDomain), total, page, limit }
  }


  async save(entity: Course): Promise<void> {
    await CourseModel.findByIdAndUpdate(
      entity.id.toString(),
      { $set: CourseMapper.toPersistence(entity) },
      { upsert: true }
    )
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await CourseModel.findByIdAndDelete(id.toString())
  }
}

// ── Subject ────────────────────────────────────────────────────────────────
export class MongoSubjectRepository implements ISubjectRepository {
  async findById(id: UniqueEntityId): Promise<Subject | null> {
    const d = await SubjectModel.findById(id.toString())
    return d ? SubjectMapper.toDomain(d) : null
  }

  async findByCourse(courseId: UniqueEntityId): Promise<Subject[]> {
    return (
      await SubjectModel.find({ courseId: courseId.toString(), isActive: true }).sort({ order: 1 })
    ).map(SubjectMapper.toDomain)
  }

  async save(entity: Subject): Promise<void> {
    await SubjectModel.findByIdAndUpdate(
      entity.id.toString(),
      { $set: SubjectMapper.toPersistence(entity) },
      { upsert: true }
    )
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await SubjectModel.findByIdAndDelete(id.toString())
  }
}

// ── Class ──────────────────────────────────────────────────────────────────
export class MongoClassRepository implements IClassRepository {
  async findById(id: UniqueEntityId): Promise<Class | null> {
    const d = await ClassModel.findById(id.toString())
    return d ? ClassMapper.toDomain(d) : null
  }

  async findBySubject(subjectId: UniqueEntityId): Promise<Class[]> {
    return (
      await ClassModel.find({ subjectId: subjectId.toString(), isActive: true }).sort({ order: 1 })
    ).map(ClassMapper.toDomain)
  }

  async save(entity: Class): Promise<void> {
    await ClassModel.findByIdAndUpdate(
      entity.id.toString(),
      { $set: ClassMapper.toPersistence(entity) },
      { upsert: true }
    )
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await ClassModel.findByIdAndDelete(id.toString())
  }
}

// ── Lesson ─────────────────────────────────────────────────────────────────
export class MongoLessonRepository implements ILessonRepository {
  async findById(id: UniqueEntityId): Promise<Lesson | null> {
    const d = await LessonModel.findById(id.toString())
    return d ? LessonMapper.toDomain(d) : null
  }

  async findByClass(classId: UniqueEntityId, onlyPublished = false): Promise<Lesson[]> {
    const q: Record<string, unknown> = { classId: classId.toString(), isActive: true }
    if (onlyPublished) q.isPublished = true
    return (await LessonModel.find(q).sort({ order: 1 })).map(LessonMapper.toDomain)
  }

  async findByClassOrdered(classId: UniqueEntityId): Promise<Lesson[]> {
    return this.findByClass(classId)
  }

  async findByVideoKey(key: string): Promise<Lesson | null> {
    const d = await LessonModel.findOne({ videoKey: key })
    return d ? LessonMapper.toDomain(d) : null
  }

  async save(entity: Lesson): Promise<void> {
    await LessonModel.findByIdAndUpdate(
      entity.id.toString(),
      { $set: LessonMapper.toPersistence(entity) },
      { upsert: true }
    )
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await LessonModel.findByIdAndDelete(id.toString())
  }
}

// ── Coursework ─────────────────────────────────────────────────────────────
export class MongoCourseworkRepository implements ICourseworkRepository {
  async findById(id: UniqueEntityId): Promise<Coursework | null> {
    const d = await CourseworkModel.findById(id.toString())
    return d ? CourseworkMapper.toDomain(d) : null
  }

  async findBySubjectId(subjectId: UniqueEntityId): Promise<Coursework[]> {
    return (
      await CourseworkModel.find({ subjectId: subjectId.toString(), isActive: true }).sort({ createdAt: 1 })
    ).map(CourseworkMapper.toDomain)
  }

  async findAll(): Promise<Coursework[]> {
    return (await CourseworkModel.find({}).sort({ createdAt: -1 })).map(CourseworkMapper.toDomain)
  }

  async save(entity: Coursework): Promise<void> {
    await CourseworkModel.findByIdAndUpdate(
      entity.id.toString(),
      { $set: CourseworkMapper.toPersistence(entity) },
      { upsert: true }
    )
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await CourseworkModel.findByIdAndDelete(id.toString())
  }
}
