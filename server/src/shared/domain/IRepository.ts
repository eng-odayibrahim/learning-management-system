import { UniqueEntityId } from './UniqueEntityId'

export interface IRepository<T> {
  findById(id: UniqueEntityId): Promise<T | null>
  save(entity: T): Promise<void>
  delete(id: UniqueEntityId): Promise<void>
}
