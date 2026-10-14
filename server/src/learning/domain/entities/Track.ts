export interface TrackProps {
  id: string
  name: string
  gradeIds?: string[]
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class Track {
  readonly id: string
  readonly name: string
  readonly gradeIds: string[]
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: TrackProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Track name is required.')
    }
    this.id = props.id
    this.name = props.name.trim()
    this.gradeIds = props.gradeIds ?? []
    this.isActive = props.isActive ?? true
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }

  update(props: Partial<{ name: string; gradeIds: string[]; isActive: boolean }>): Track {
    return new Track({
      ...this,
      name: props.name ?? this.name,
      gradeIds: props.gradeIds ?? this.gradeIds,
      isActive: props.isActive ?? this.isActive,
      updatedAt: new Date()
    })
  }

  toggle(): Track {
    return new Track({
      ...this,
      isActive: !this.isActive,
      updatedAt: new Date()
    })
  }
}
