import { ILessonRepository } from '../../domain/repositories/ILessonRepository'
import { IClassRepository }  from '../../domain/repositories/IClassRepository'
import { Lesson, LessonStatus } from '../../domain/entities/Lesson'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError, AppError } from '@shared/errors/AppError'
import { CreateLessonDto, UpdateLessonDto } from '../dtos/LearningDtos'

// Never exposes permanent storage URLs. Playback goes through
// POST /api/video/lessons/:id/playback; materials through the authorized materials route.
export function lessonView(l: Lesson, includeMaterials = true) {
  return {
    id:            l.id.toString(),
    title:         l.title,
    classId:       l.classId.toString(),
    order:         l.order.value,
    type:          l.type,
    description:   l.description,
    videoStatus:   l.videoStatus.value,
    hasVideo:      l.videoStatus.value === 'ready' && Boolean(l.hlsKey),
    videoDuration: l.videoDuration,
    materialKeys:  includeMaterials ? l.materialKeys.map((_k, i) => `lessons/${l.id.toString()}/materials/${i}`) : [],
    materialCount: l.materialKeys.length,
    coverImage:    l.coverImage,
    isFree:        l.isFree,
    status:        l.status,
    isPublished:   l.isPublished,
    isActive:      l.isActive,
    createdAt:     l.createdAt,
  }
}

export class CreateLessonUseCase {
  constructor(
    private readonly lessonRepo: ILessonRepository,
    private readonly classRepo:  IClassRepository,
  ) {}

  async execute(dto: CreateLessonDto) {
    const cls = await this.classRepo.findById(new UniqueEntityId(dto.classId))
    if (!cls) throw new NotFoundError('الفصل')
    const lesson = Lesson.create({
      ...dto,
      coverImage: dto.coverImage ?? undefined,
    })
    await this.lessonRepo.save(lesson)
    return lessonView(lesson)
  }
}

export class UpdateLessonUseCase {
  constructor(private readonly lessonRepo: ILessonRepository) {}

  async execute(lessonId: string, dto: UpdateLessonDto) {
    const lesson = await this.lessonRepo.findById(new UniqueEntityId(lessonId))
    if (!lesson) throw new NotFoundError('الدرس')
    lesson.update({
      ...dto,
      coverImage: dto.coverImage ?? undefined,
    })
    await this.lessonRepo.save(lesson)
    return lessonView(lesson)
  }
}

const LESSON_TRANSITIONS: Record<LessonStatus, LessonStatus[]> = {
  draft:     ['published', 'archived'],
  published: ['draft', 'archived'],
  archived:  ['draft'],
}

export class SetLessonStatusUseCase {
  constructor(private readonly lessonRepo: ILessonRepository) {}

  async execute(lessonId: string, next: LessonStatus) {
    const lesson = await this.lessonRepo.findById(new UniqueEntityId(lessonId))
    if (!lesson) throw new NotFoundError('Lesson')
    const from = lesson.status
    if (from !== next) {
      if (!LESSON_TRANSITIONS[from].includes(next)) {
        throw new AppError(`Cannot change lesson status from ${from} to ${next}`, 409, true, 'INVALID_STATUS_TRANSITION')
      }
      if (next === 'published') lesson.publish()
      else if (next === 'archived') lesson.archive()
      else lesson.unpublish()
      await this.lessonRepo.save(lesson)
    }
    return { id: lesson.id.toString(), from, to: next }
  }
}

export class PublishLessonUseCase {
  constructor(private readonly lessonRepo: ILessonRepository) {}

  async execute(lessonId: string, publish: boolean) {
    return new SetLessonStatusUseCase(this.lessonRepo).execute(lessonId, publish ? 'published' : 'draft')
  }
}

export class ListLessonsUseCase {
  constructor(private readonly lessonRepo: ILessonRepository) {}

  // isAdmin = see all; student = published only
  async execute(classId: string, isAdmin = false) {
    const lessons = await this.lessonRepo.findByClass(
      new UniqueEntityId(classId),
      !isAdmin,  // onlyPublished for students
    )
    return lessons.map((lesson) => lessonView(lesson))
  }
}

export class GetLessonUseCase {
  constructor(private readonly lessonRepo: ILessonRepository) {}

  async execute(lessonId: string) {
    const lesson = await this.lessonRepo.findById(new UniqueEntityId(lessonId))
    if (!lesson) throw new NotFoundError('الدرس')
    return lessonView(lesson)
  }
}

export class DeleteLessonUseCase {
  constructor(private readonly lessonRepo: ILessonRepository) {}

  async execute(lessonId: string) {
    const lesson = await this.lessonRepo.findById(new UniqueEntityId(lessonId))
    if (!lesson) throw new NotFoundError('الدرس')
    lesson.deactivate()
    await this.lessonRepo.save(lesson)
  }
}
