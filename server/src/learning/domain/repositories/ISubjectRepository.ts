import { IRepository } from '@shared/domain/IRepository'
import { Subject } from '../entities/Subject'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'

export interface ISubjectRepository extends IRepository<Subject> {
  findByCourse(courseId: UniqueEntityId): Promise<Subject[]>
}
