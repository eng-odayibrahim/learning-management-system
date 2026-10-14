import { Types } from 'mongoose'

export class UniqueEntityId {
  private readonly value: string

  constructor(id?: string) {
    this.value = id ?? new Types.ObjectId().toHexString()
  }

  equals(id?: UniqueEntityId): boolean {
    return id?.toString() === this.value
  }

  toString(): string {
    return this.value
  }
}
