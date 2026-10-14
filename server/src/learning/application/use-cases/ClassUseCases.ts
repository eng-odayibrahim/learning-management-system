import { IClassRepository }   from '../../domain/repositories/IClassRepository'
import { ISubjectRepository } from '../../domain/repositories/ISubjectRepository'
import { Class } from '../../domain/entities/Class'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError } from '@shared/errors/AppError'
import { CreateClassDto, UpdateClassDto } from '../dtos/LearningDtos'

function classView(c: Class) {
  return {
    id:        c.id.toString(),
    title:     c.title,
    subjectId: c.subjectId.toString(),
    order:     c.order,
    isActive:  c.isActive,
  }
}

export class CreateClassUseCase {
  constructor(
    private readonly classRepo:   IClassRepository,
    private readonly subjectRepo: ISubjectRepository,
  ) {}

  async execute(dto: CreateClassDto) {
    const subject = await this.subjectRepo.findById(new UniqueEntityId(dto.subjectId))
    if (!subject) throw new NotFoundError('الموضوع')
    const cls = Class.create(dto)
    await this.classRepo.save(cls)
    return classView(cls)
  }
}

export class UpdateClassUseCase {
  constructor(private readonly classRepo: IClassRepository) {}

  async execute(classId: string, dto: UpdateClassDto) {
    const cls = await this.classRepo.findById(new UniqueEntityId(classId))
    if (!cls) throw new NotFoundError('الفصل')
    cls.update(dto)
    await this.classRepo.save(cls)
    return classView(cls)
  }
}

export class ListClassesUseCase {
  constructor(private readonly classRepo: IClassRepository) {}

  async execute(subjectId: string) {
    const classes = await this.classRepo.findBySubject(new UniqueEntityId(subjectId))
    return classes.map(classView)
  }
}

export class DeleteClassUseCase {
  constructor(private readonly classRepo: IClassRepository) {}

  async execute(classId: string) {
    const cls = await this.classRepo.findById(new UniqueEntityId(classId))
    if (!cls) throw new NotFoundError('الفصل')
    cls.deactivate()
    await this.classRepo.save(cls)
  }
}
