export interface GradeProps {
  id: string
  name: number
  stageId?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class Grade {
  readonly id: string
  readonly name: number
  readonly stageId?: string
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: GradeProps) {
    if (props.name === undefined || props.name === null || isNaN(props.name)) {
      throw new Error('Grade name must be a valid number.')
    }
    this.id = props.id
    this.name = props.name
    this.stageId = props.stageId
    this.isActive = props.isActive ?? true
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }

  update(props: Partial<{ name: number; stageId: string; isActive: boolean }>): Grade {
    return new Grade({
      ...this,
      name: props.name !== undefined ? props.name : this.name,
      stageId: props.stageId !== undefined ? props.stageId : this.stageId,
      isActive: props.isActive ?? this.isActive,
      updatedAt: new Date()
    })
  }

  toggle(): Grade {
    return new Grade({
      ...this,
      isActive: !this.isActive,
      updatedAt: new Date()
    })
  }
}
