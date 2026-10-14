import { Entity } from '@shared/domain/Entity'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'

interface CourseworkProps {
  title:        string
  description?: string
  subjectId:    UniqueEntityId
  materialKeys: string[]
  isActive:     boolean
  createdAt:    Date
  updatedAt:    Date
}

export class Coursework extends Entity<CourseworkProps> {
  private constructor(props: CourseworkProps, id?: UniqueEntityId) {
    super(props, id)
  }

  get title():        string         { return this.props.title }
  get description():  string | undefined { return this.props.description }
  get subjectId():    UniqueEntityId { return this.props.subjectId }
  get materialKeys(): string[]       { return this.props.materialKeys }
  get isActive():     boolean        { return this.props.isActive }
  get createdAt():    Date           { return this.props.createdAt }
  get updatedAt():    Date           { return this.props.updatedAt }

  static create(props: {
    title:        string
    subjectId:    string
    description?: string
    materialKeys?: string[]
  }, id?: UniqueEntityId): Coursework {
    return new Coursework({
      title:        props.title.trim(),
      description:  props.description?.trim(),
      subjectId:    new UniqueEntityId(props.subjectId),
      materialKeys: props.materialKeys ?? [],
      isActive:     true,
      createdAt:    new Date(),
      updatedAt:    new Date(),
    }, id)
  }

  static reconstitute(props: CourseworkProps, id: UniqueEntityId): Coursework {
    return new Coursework(props, id)
  }

  update(data: Partial<Pick<CourseworkProps, 'title' | 'description' | 'materialKeys'>>): void {
    if (data.title !== undefined)       this.props.title        = data.title.trim()
    if (data.description !== undefined) this.props.description  = data.description?.trim()
    if (data.materialKeys !== undefined) this.props.materialKeys = data.materialKeys
    this.props.updatedAt = new Date()
  }

  addMaterial(key: string): void {
    if (!this.props.materialKeys.includes(key)) {
      this.props.materialKeys.push(key)
      this.props.updatedAt = new Date()
    }
  }

  removeMaterial(key: string): void {
    this.props.materialKeys = this.props.materialKeys.filter(k => k !== key)
    this.props.updatedAt = new Date()
  }

  deactivate(): void { 
    this.props.isActive = false
    this.props.updatedAt = new Date() 
  }
}
