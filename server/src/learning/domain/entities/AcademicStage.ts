export interface AcademicStageProps {
  id: string
  name: string
  image?: string
  description?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class AcademicStage {
  readonly id: string
  readonly name: string
  readonly image?: string
  readonly description?: string
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: AcademicStageProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('AcademicStage name is required.')
    }
    this.id = props.id
    this.name = props.name.trim()
    this.image = props.image
    this.description = props.description
    this.isActive = props.isActive ?? true
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }

  update(props: Partial<{ name: string; image: string; description: string; isActive: boolean }>): AcademicStage {
    return new AcademicStage({
      ...this,
      name: props.name ?? this.name,
      image: props.image !== undefined ? props.image : this.image,
      description: props.description !== undefined ? props.description : this.description,
      isActive: props.isActive ?? this.isActive,
      updatedAt: new Date()
    })
  }

  toggle(): AcademicStage {
    return new AcademicStage({
      ...this,
      isActive: !this.isActive,
      updatedAt: new Date()
    })
  }
}
