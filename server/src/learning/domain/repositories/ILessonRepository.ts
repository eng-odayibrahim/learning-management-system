import { IRepository } from '@shared/domain/IRepository'
import { Lesson } from '../entities/Lesson'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'

export interface ILessonRepository extends IRepository<Lesson> {
  findByClass(classId: UniqueEntityId, onlyPublished?: boolean): Promise<Lesson[]>
  findByVideoKey(key: string): Promise<Lesson | null>
  findByClassOrdered(classId: UniqueEntityId): Promise<Lesson[]>
}
