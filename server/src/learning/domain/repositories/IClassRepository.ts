import { IRepository } from '@shared/domain/IRepository'
import { Class } from '../entities/Class'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'

export interface IClassRepository extends IRepository<Class> {
  findBySubject(subjectId: UniqueEntityId): Promise<Class[]>
}
