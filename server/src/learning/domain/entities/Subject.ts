import { Entity } from '@shared/domain/Entity'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { Slug } from '../value-objects/Slug'

// Subject belongs to a Course (e.g. Course: "الرياضيات" → Subject: "الجبر")
interface SubjectProps {
  title:       string
  slug:        Slug
  description: string
  courseId:    UniqueEntityId
  thumbnail?:  string
  order:       number
  isActive:    boolean
  createdAt:   Date
  updatedAt:   Date
}

export class Subject extends Entity<SubjectProps> {
  private constructor(props: SubjectProps, id?: UniqueEntityId) {
    super(props, id)
  }

  get title():       string         { return this.props.title }
  get slug():        Slug           { return this.props.slug }
  get description(): string         { return this.props.description }
  get courseId():    UniqueEntityId { return this.props.courseId }
  get thumbnail():   string | undefined { return this.props.thumbnail }
  get order():       number         { return this.props.order }
  get isActive():    boolean        { return this.props.isActive }
  get createdAt():   Date           { return this.props.createdAt }
  get updatedAt():   Date           { return this.props.updatedAt }

  static create(props: {
    title:       string
    description: string
    courseId:    string
    thumbnail?:  string
    order?:      number
  }, id?: UniqueEntityId): Subject {
    return new Subject({
      title:       props.title.trim(),
      slug:        Slug.create(props.title),
      description: props.description.trim(),
      courseId:    new UniqueEntityId(props.courseId),
      thumbnail:   props.thumbnail,
      order:       props.order ?? 0,
      isActive:    true,
      createdAt:   new Date(),
      updatedAt:   new Date(),
    }, id)
  }

  static reconstitute(props: SubjectProps, id: UniqueEntityId): Subject {
    return new Subject(props, id)
  }

  update(data: Partial<Pick<SubjectProps, 'title' | 'description' | 'thumbnail' | 'order'>>): void {
    if (data.title)       { this.props.title = data.title.trim(); this.props.slug = Slug.create(data.title) }
    if (data.description) this.props.description = data.description.trim()
    if (data.thumbnail !== undefined) this.props.thumbnail = data.thumbnail
    if (data.order !== undefined)     this.props.order     = data.order
    this.props.updatedAt = new Date()
  }

  deactivate(): void { this.props.isActive = false; this.props.updatedAt = new Date() }
}
