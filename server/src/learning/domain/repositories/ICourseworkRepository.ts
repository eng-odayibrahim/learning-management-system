import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { Coursework } from '../entities/Coursework'

export interface ICourseworkRepository {
  findById(id: UniqueEntityId): Promise<Coursework | null>
  findBySubjectId(subjectId: UniqueEntityId): Promise<Coursework[]>
  findAll(): Promise<Coursework[]>
  save(entity: Coursework): Promise<void>
  delete(id: UniqueEntityId): Promise<void>
}
