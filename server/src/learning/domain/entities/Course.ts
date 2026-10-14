import { AggregateRoot } from '@shared/domain/AggregateRoot'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { Slug } from '../value-objects/Slug'

export type CourseStatus = 'draft' | 'review' | 'published' | 'archived'
export const COURSE_STATUSES: CourseStatus[] = ['draft', 'review', 'published', 'archived']

export interface CourseProps {
  status:           CourseStatus
  title:            string
  slug:             Slug
  description:      string
  stageId?:         string
  gradeId?:         string
  trackId?:         string
  trackIds?:        string[]
  specializationId?: string
  specializationIds?: string[]
  thumbnail?:       string
  isPublished:      boolean
  isActive:         boolean
  order:            number
  createdAt:        Date
  updatedAt:        Date
}

export class Course extends AggregateRoot<CourseProps> {
  private constructor(props: CourseProps, id?: UniqueEntityId) {
    super(props, id)
  }

  get title():            string { return this.props.title }
  get slug():             Slug   { return this.props.slug }
  get description():      string { return this.props.description }
  get stageId():          string | undefined { return this.props.stageId }
  get gradeId():          string | undefined { return this.props.gradeId }
  get trackId():          string | undefined { return this.props.trackId }
  get trackIds():         string[] { return this.props.trackIds ?? [] }
  get specializationId(): string | undefined { return this.props.specializationId }
  get specializationIds(): string[] { return this.props.specializationIds ?? [] }
  get thumbnail():        string | undefined { return this.props.thumbnail }
  get status():           CourseStatus { return this.props.status }
  get isPublished():      boolean { return this.props.status === 'published' }
  get isActive():         boolean { return this.props.isActive }
  get order():            number  { return this.props.order }
  get createdAt():        Date    { return this.props.createdAt }
  get updatedAt():        Date    { return this.props.updatedAt }

  static create(props: {
    title:            string
    slug?:            string
    description:      string
    stageId?:         string
    gradeId?:         string
    trackId?:         string
    trackIds?:        string[]
    specializationId?: string
    specializationIds?: string[]
    thumbnail?:       string
    order?:           number
  }, id?: UniqueEntityId): Course {
    return new Course({
      title:            props.title.trim(),
      slug:             Slug.create(props.slug || props.title),
      description:      props.description.trim(),
      stageId:          props.stageId,
      gradeId:          props.gradeId,
      trackId:          props.trackId,
      trackIds:         props.trackIds ?? [],
      specializationId: props.specializationId,
      specializationIds: props.specializationIds ?? [],
      thumbnail:        props.thumbnail,
      status:           'draft',
      isPublished:      false,
      isActive:         true,
      order:            props.order ?? 0,
      createdAt:        new Date(),
      updatedAt:        new Date(),
    }, id)
  }

  static reconstitute(props: CourseProps, id: UniqueEntityId): Course {
    return new Course(props, id)
  }

  private setStatus(status: CourseStatus): void {
    this.props.status = status
    this.props.isPublished = status === 'published'
    this.touch()
  }
  submitForReview(): void { this.setStatus('review') }
  publish():    void { this.setStatus('published') }
  unpublish():  void { this.setStatus('draft') }
  archive():    void { this.setStatus('archived') }
  deactivate(): void { this.props.isActive    = false; this.touch() }

  update(data: Partial<Pick<CourseProps, 'title' | 'description' | 'stageId' | 'gradeId' | 'trackId' | 'trackIds' | 'specializationId' | 'specializationIds' | 'thumbnail' | 'order'>>): void {
    if (data.title)       { this.props.title = data.title.trim(); this.props.slug = Slug.create(data.title) }
    if (data.description !== undefined)      this.props.description      = data.description.trim()
    if (data.stageId !== undefined)          this.props.stageId          = data.stageId
    if (data.gradeId !== undefined)          this.props.gradeId          = data.gradeId
    if (data.trackId !== undefined)          this.props.trackId          = data.trackId
    if (data.trackIds !== undefined)         this.props.trackIds         = data.trackIds
    if (data.specializationId !== undefined) this.props.specializationId = data.specializationId
    if (data.specializationIds !== undefined) this.props.specializationIds = data.specializationIds
    if (data.thumbnail !== undefined)        this.props.thumbnail        = data.thumbnail
    if (data.order !== undefined)            this.props.order            = data.order
    this.touch()
  }

  private touch(): void { this.props.updatedAt = new Date() }
}
