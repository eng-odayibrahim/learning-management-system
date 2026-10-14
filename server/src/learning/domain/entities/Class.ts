import { Entity } from '@shared/domain/Entity'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'

// Class = a logical group of lessons inside a Subject
// e.g. Subject: "الجبر" → Class: "الوحدة الأولى: المعادلات"
interface ClassProps {
  title:      string
  subjectId:  UniqueEntityId
  order:      number
  isActive:   boolean
  createdAt:  Date
  updatedAt:  Date
}

export class Class extends Entity<ClassProps> {
  private constructor(props: ClassProps, id?: UniqueEntityId) {
    super(props, id)
  }

  get title():     string         { return this.props.title }
  get subjectId(): UniqueEntityId { return this.props.subjectId }
  get order():     number         { return this.props.order }
  get isActive():  boolean        { return this.props.isActive }
  get createdAt(): Date           { return this.props.createdAt }
  get updatedAt(): Date           { return this.props.updatedAt }

  static create(props: {
    title:     string
    subjectId: string
    order?:    number
  }, id?: UniqueEntityId): Class {
    return new Class({
      title:     props.title.trim(),
      subjectId: new UniqueEntityId(props.subjectId),
      order:     props.order ?? 0,
      isActive:  true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, id)
  }

  static reconstitute(props: ClassProps, id: UniqueEntityId): Class {
    return new Class(props, id)
  }

  update(data: { title?: string; order?: number }): void {
    if (data.title)           this.props.title = data.title.trim()
    if (data.order !== undefined) this.props.order = data.order
    this.props.updatedAt = new Date()
  }

  deactivate(): void { this.props.isActive = false; this.props.updatedAt = new Date() }
}
