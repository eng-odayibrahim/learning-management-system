import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { Coursework } from '../../domain/entities/Coursework'
import { ICourseworkRepository } from '../../domain/repositories/ICourseworkRepository'

export class CreateCourseworkUseCase {
  constructor(private courseworkRepo: ICourseworkRepository) {}
  async execute(params: { title: string; subjectId: string; description?: string; materialKeys?: string[] }): Promise<Coursework> {
    const coursework = Coursework.create({
      title: params.title,
      subjectId: params.subjectId,
      description: params.description,
      materialKeys: params.materialKeys
    })
    await this.courseworkRepo.save(coursework)
    return coursework
  }
}

export class UpdateCourseworkUseCase {
  constructor(private courseworkRepo: ICourseworkRepository) {}
  async execute(id: string, params: { title?: string; description?: string; materialKeys?: string[] }): Promise<Coursework> {
    const coursework = await this.courseworkRepo.findById(new UniqueEntityId(id))
    if (!coursework) throw new Error('Coursework not found')

    coursework.update(params)
    await this.courseworkRepo.save(coursework)
    return coursework
  }
}

export class DeleteCourseworkUseCase {
  constructor(private courseworkRepo: ICourseworkRepository) {}
  async execute(id: string): Promise<void> {
    await this.courseworkRepo.delete(new UniqueEntityId(id))
  }
}

export class GetCourseworksBySubjectUseCase {
  constructor(private courseworkRepo: ICourseworkRepository) {}
  async execute(subjectId: string): Promise<Coursework[]> {
    return this.courseworkRepo.findBySubjectId(new UniqueEntityId(subjectId))
  }
}

export class GetAllCourseworksUseCase {
  constructor(private courseworkRepo: ICourseworkRepository) {}
  async execute(): Promise<Coursework[]> {
    return this.courseworkRepo.findAll()
  }
}

export class GetCourseworkByIdUseCase {
  constructor(private courseworkRepo: ICourseworkRepository) {}
  async execute(id: string): Promise<Coursework | null> {
    return this.courseworkRepo.findById(new UniqueEntityId(id))
  }
}
