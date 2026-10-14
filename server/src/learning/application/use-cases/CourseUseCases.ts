import { ICourseRepository, CourseFilter } from '../../domain/repositories/ICourseRepository'
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository'
import { Course, CourseStatus } from '../../domain/entities/Course'
import { Slug } from '../../domain/value-objects/Slug'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError, AppError } from '@shared/errors/AppError'
import { CreateCourseDto, UpdateCourseDto, PaginationDto } from '../dtos/LearningDtos'

function courseView(c: Course) {
  return {
    id:               c.id.toString(),
    title:            c.title,
    slug:             c.slug.value,
    description:      c.description,
    stageId:          c.stageId ?? null,
    gradeId:          c.gradeId ?? null,
    trackId:          c.trackId ?? null,
    trackIds:         c.trackIds,
    specializationId: c.specializationId ?? null,
    specializationIds:c.specializationIds,
    thumbnail:        c.thumbnail,
    status:           c.status,
    isPublished:      c.isPublished,
    isActive:         c.isActive,
    order:            c.order,
    createdAt:        c.createdAt,
  }
}

export class CreateCourseUseCase {
  constructor(
    private readonly courseRepo:   ICourseRepository,
  ) {}

  async execute(dto: CreateCourseDto) {

    let initialSlug = Slug.create(dto.title)
    let existing = await this.courseRepo.findBySlug(initialSlug)
    let slugStr = initialSlug.value
    if (existing) {
      const suffix = Math.floor(100 + Math.random() * 900)
      slugStr = `${slugStr}-${suffix}`
    }

    const course = Course.create({ 
      ...dto, 
      slug: slugStr,
      stageId: dto.stageId ?? undefined,
      gradeId: dto.gradeId ?? undefined,
      trackId: dto.trackId ?? undefined,
      trackIds: dto.trackIds ?? [],
      specializationId: dto.specializationId ?? undefined,
      specializationIds: dto.specializationIds ?? [],
      thumbnail: dto.thumbnail ?? undefined,
    })
    await this.courseRepo.save(course)
    return courseView(course)
  }
}

export class UpdateCourseUseCase {
  constructor(
    private readonly courseRepo:   ICourseRepository,
  ) {}

  async execute(courseId: string, dto: UpdateCourseDto) {
    const course = await this.courseRepo.findById(new UniqueEntityId(courseId))
    if (!course) throw new NotFoundError('المقرر')


    course.update({
      ...dto,
      stageId: dto.stageId ?? undefined,
      gradeId: dto.gradeId ?? undefined,
      trackId: dto.trackId ?? undefined,
      trackIds: dto.trackIds,
      specializationId: dto.specializationId ?? undefined,
      specializationIds: dto.specializationIds,
      thumbnail: dto.thumbnail ?? undefined,
    })

    await this.courseRepo.save(course)
    return courseView(course)
  }
}

// Allowed lifecycle transitions: published content must be unpublished/archived explicitly.
const COURSE_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
  draft:     ['review', 'published', 'archived'],
  review:    ['draft', 'published', 'archived'],
  published: ['draft', 'archived'],
  archived:  ['draft'],
}

export class SetCourseStatusUseCase {
  constructor(private readonly courseRepo: ICourseRepository) {}

  async execute(courseId: string, next: CourseStatus) {
    const course = await this.courseRepo.findById(new UniqueEntityId(courseId))
    if (!course) throw new NotFoundError('Course')
    const from = course.status
    if (from !== next) {
      if (!COURSE_TRANSITIONS[from].includes(next)) {
        throw new AppError(`Cannot change course status from ${from} to ${next}`, 409, true, 'INVALID_STATUS_TRANSITION')
      }
      if (next === 'review') course.submitForReview()
      else if (next === 'published') course.publish()
      else if (next === 'archived') course.archive()
      else course.unpublish()
      await this.courseRepo.save(course)
    }
    return { id: course.id.toString(), from, to: next }
  }
}

export class PublishCourseUseCase {
  constructor(private readonly courseRepo: ICourseRepository) {}

  async execute(courseId: string, publish: boolean) {
    return new SetCourseStatusUseCase(this.courseRepo).execute(courseId, publish ? 'published' : 'draft')
  }
}

export class ListCoursesUseCase {
  constructor(private readonly courseRepo: ICourseRepository) {}

  async execute(filter: CourseFilter = {}, pagination: PaginationDto) {
    const result = await this.courseRepo.findAll(filter, pagination.page, pagination.limit)
    return {
      items: result.items.map(courseView),
      total: result.total,
      page:  result.page,
      limit: result.limit,
      pages: Math.ceil(result.total / result.limit),
    }
  }
}

export class GetCourseUseCase {
  constructor(private readonly courseRepo: ICourseRepository) {}

  async execute(courseId: string) {
    const course = await this.courseRepo.findById(new UniqueEntityId(courseId))
    if (!course) throw new NotFoundError('المقرر')
    return courseView(course)
  }
}

export class DeleteCourseUseCase {
  constructor(private readonly courseRepo: ICourseRepository) {}

  async execute(courseId: string) {
    const course = await this.courseRepo.findById(new UniqueEntityId(courseId))
    if (!course) throw new NotFoundError('المقرر')
    course.deactivate()
    await this.courseRepo.save(course)
  }
}
