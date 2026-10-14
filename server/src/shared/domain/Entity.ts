import { UniqueEntityId } from './UniqueEntityId'

export abstract class Entity<T> {
  protected readonly _id: UniqueEntityId
  protected readonly props: T

  constructor(props: T, id?: UniqueEntityId) {
    this._id = id ?? new UniqueEntityId()
    this.props = props
  }

  get id(): UniqueEntityId {
    return this._id
  }

  equals(entity?: Entity<T>): boolean {
    if (!entity) return false
    if (this === entity) return true
    return this._id.equals(entity._id)
  }
}
