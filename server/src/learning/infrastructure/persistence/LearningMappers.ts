import mongoose from 'mongoose'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { Course }  from '../../domain/entities/Course'
import { Subject } from '../../domain/entities/Subject'
import { Class }   from '../../domain/entities/Class'
import { Lesson }  from '../../domain/entities/Lesson'
import { Slug }    from '../../domain/value-objects/Slug'
import { LessonOrder }  from '../../domain/value-objects/LessonOrder'
import { VideoStatus }  from '../../domain/value-objects/VideoStatus'
import { CourseDocument }  from './CourseModel'
import { SubjectDocument } from './SubjectModel'
import { ClassDocument }   from './ClassModel'
import { LessonDocument }  from './LessonModel'
import { CourseworkDocument } from './CourseworkModel'
import { Coursework } from '../../domain/entities/Coursework'

type AnyDoc = CourseDocument | SubjectDocument | ClassDocument | LessonDocument | CourseworkDocument

function eid(doc: AnyDoc): UniqueEntityId {
  return new UniqueEntityId((doc._id as mongoose.Types.ObjectId).toHexString())
}

// ── Course ─────────────────────────────────────────────────────────────────
export const CourseMapper = {
  toDomain(doc: CourseDocument): Course {
    return Course.reconstitute(
      {
        status:           doc.status ?? (doc.isPublished ? 'published' : 'draft'),
        title:            doc.title,
        slug:             Slug.fromExisting(doc.slug),
        description:      doc.description,
        stageId:          doc.stageId?.toHexString(),
        gradeId:          doc.gradeId?.toHexString(),
        trackId:          doc.trackId?.toHexString(),
        trackIds:         (doc.trackIds ?? []).map((id) => id.toHexString()),
        specializationId: doc.specializationId?.toHexString(),
        specializationIds: (doc.specializationIds ?? []).map((id) => id.toHexString()),
        thumbnail:        doc.thumbnail,
        isPublished:      doc.isPublished,
        isActive:         doc.isActive,
        order:            doc.order,
        createdAt:        doc.createdAt,
        updatedAt:        doc.updatedAt,
      },
      eid(doc)
    )
  },
  toPersistence(e: Course): Record<string, unknown> {
    return {
      _id:              e.id.toString(),
      title:            e.title,
      slug:             e.slug.value,
      description:      e.description,
      stageId:          e.stageId ? new mongoose.Types.ObjectId(e.stageId) : undefined,
      gradeId:          e.gradeId ? new mongoose.Types.ObjectId(e.gradeId) : undefined,
      trackId:          e.trackId ? new mongoose.Types.ObjectId(e.trackId) : undefined,
      trackIds:         e.trackIds.map((id) => new mongoose.Types.ObjectId(id)),
      specializationId: e.specializationId ? new mongoose.Types.ObjectId(e.specializationId) : undefined,
      specializationIds: e.specializationIds.map((id) => new mongoose.Types.ObjectId(id)),
      thumbnail:        e.thumbnail,
      status:           e.status,
      isPublished:      e.isPublished,
      isActive:         e.isActive,
      order:            e.order,
    }
  },
}

// ── Subject ────────────────────────────────────────────────────────────────
export const SubjectMapper = {
  toDomain(doc: SubjectDocument): Subject {
    return Subject.reconstitute(
      {
        title:       doc.title,
        slug:        Slug.fromExisting(doc.slug),
        description: doc.description,
        courseId:    new UniqueEntityId(doc.courseId.toHexString()),
        thumbnail:   doc.thumbnail,
        order:       doc.order,
        isActive:    doc.isActive,
        createdAt:   doc.createdAt,
        updatedAt:   doc.updatedAt,
      },
      eid(doc)
    )
  },
  toPersistence(e: Subject): Record<string, unknown> {
    return {
      _id:         e.id.toString(),
      title:       e.title,
      slug:        e.slug.value,
      description: e.description,
      courseId:    e.courseId.toString(),
      thumbnail:   e.thumbnail,
      order:       e.order,
      isActive:    e.isActive,
    }
  },
}

// ── Class ──────────────────────────────────────────────────────────────────
export const ClassMapper = {
  toDomain(doc: ClassDocument): Class {
    return Class.reconstitute(
      {
        title:     doc.title,
        subjectId: new UniqueEntityId(doc.subjectId.toHexString()),
        order:     doc.order,
        isActive:  doc.isActive,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      eid(doc)
    )
  },
  toPersistence(e: Class): Record<string, unknown> {
    return {
      _id:       e.id.toString(),
      title:     e.title,
      subjectId: e.subjectId.toString(),
      order:     e.order,
      isActive:  e.isActive,
    }
  },
}

// ── Lesson ─────────────────────────────────────────────────────────────────
export const LessonMapper = {
  toDomain(doc: LessonDocument): Lesson {
    return Lesson.reconstitute(
      {
        status:        doc.status ?? (doc.isPublished ? 'published' : 'draft'),
        title:         doc.title,
        classId:       new UniqueEntityId(doc.classId.toHexString()),
        order:         LessonOrder.create(doc.order),
        type:          doc.type,
        description:   doc.description,
        videoKey:      doc.videoKey,
        hlsKey:        doc.hlsKey,
        hlsUrl:        doc.hlsUrl,
        videoDuration: doc.videoDuration,
        // The HLS master key is written only after the processing pipeline has
        // uploaded the complete stream. Treat it as authoritative if a stale
        // status update left videoStatus behind.
        videoStatus:   VideoStatus.fromValue(doc.hlsKey ? 'ready' : doc.videoStatus),
        materialKeys:  doc.materialKeys ?? [],
        coverImage:    doc.coverImage,
        isFree:        doc.isFree,
        isPublished:   doc.isPublished,
        isActive:      doc.isActive,
        createdAt:     doc.createdAt,
        updatedAt:     doc.updatedAt,
      },
      eid(doc)
    )
  },
  toPersistence(e: Lesson): Record<string, unknown> {
    return {
      _id:           e.id.toString(),
      title:         e.title,
      classId:       e.classId.toString(),
      order:         e.order.value,
      type:          e.type,
      description:   e.description,
      // Media lifecycle fields are owned by the upload/processing pipeline.
      // Metadata edits and publish toggles must not overwrite them from a
      // potentially stale domain snapshot.
      materialKeys:  e.materialKeys,
      coverImage:    e.coverImage,
      isFree:        e.isFree,
      status:        e.status,
      isPublished:   e.isPublished,
      isActive:      e.isActive,
    }
  },
}

// ── Coursework ─────────────────────────────────────────────────────────────
export const CourseworkMapper = {
  toDomain(doc: CourseworkDocument): Coursework {
    return Coursework.reconstitute(
      {
        title:        doc.title,
        description:  doc.description,
        subjectId:    new UniqueEntityId(doc.subjectId.toHexString()),
        materialKeys: doc.materialKeys ?? [],
        isActive:     doc.isActive,
        createdAt:    doc.createdAt,
        updatedAt:    doc.updatedAt,
      },
      eid(doc)
    )
  },
  toPersistence(e: Coursework): Record<string, unknown> {
    return {
      _id:          e.id.toString(),
      title:        e.title,
      description:  e.description,
      subjectId:    e.subjectId.toString(),
      materialKeys: e.materialKeys,
      isActive:     e.isActive,
    }
  },
}
