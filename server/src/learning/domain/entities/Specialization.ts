export interface SpecializationProps {
  id: string
  name: string
  trackIds?: string[]
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class Specialization {
  readonly id: string
  readonly name: string
  readonly trackIds: string[]
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: SpecializationProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Specialization name is required.')
    }
    this.id = props.id
    this.name = props.name.trim()
    this.trackIds = props.trackIds ?? []
    this.isActive = props.isActive ?? true
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }

  update(props: Partial<{ name: string; trackIds: string[]; isActive: boolean }>): Specialization {
    return new Specialization({
      ...this,
      name: props.name ?? this.name,
      trackIds: props.trackIds ?? this.trackIds,
      isActive: props.isActive ?? this.isActive,
      updatedAt: new Date()
    })
  }

  toggle(): Specialization {
    return new Specialization({
      ...this,
      isActive: !this.isActive,
      updatedAt: new Date()
    })
  }
}
