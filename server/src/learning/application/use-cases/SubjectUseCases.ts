import { ISubjectRepository } from '../../domain/repositories/ISubjectRepository'
import { ICourseRepository }  from '../../domain/repositories/ICourseRepository'
import { Subject } from '../../domain/entities/Subject'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError } from '@shared/errors/AppError'
import { CreateSubjectDto, UpdateSubjectDto } from '../dtos/LearningDtos'

function subjectView(s: Subject) {
  return {
    id:          s.id.toString(),
    title:       s.title,
    slug:        s.slug.value,
    description: s.description,
    courseId:    s.courseId.toString(),
    thumbnail:   s.thumbnail,
    order:       s.order,
    isActive:    s.isActive,
  }
}

export class CreateSubjectUseCase {
  constructor(
    private readonly subjectRepo: ISubjectRepository,
    private readonly courseRepo:  ICourseRepository,
  ) {}

  async execute(dto: CreateSubjectDto) {
    const course = await this.courseRepo.findById(new UniqueEntityId(dto.courseId))
    if (!course) throw new NotFoundError('المقرر')
    const subject = Subject.create({
      ...dto,
      thumbnail: dto.thumbnail ?? undefined,
    })
    await this.subjectRepo.save(subject)
    return subjectView(subject)
  }
}

export class UpdateSubjectUseCase {
  constructor(private readonly subjectRepo: ISubjectRepository) {}

  async execute(subjectId: string, dto: UpdateSubjectDto) {
    const subject = await this.subjectRepo.findById(new UniqueEntityId(subjectId))
    if (!subject) throw new NotFoundError('الموضوع')
    subject.update({
      ...dto,
      thumbnail: dto.thumbnail ?? undefined,
    })
    await this.subjectRepo.save(subject)
    return subjectView(subject)
  }
}

export class ListSubjectsUseCase {
  constructor(private readonly subjectRepo: ISubjectRepository) {}

  async execute(courseId: string) {
    const subjects = await this.subjectRepo.findByCourse(new UniqueEntityId(courseId))
    return subjects.map(subjectView)
  }
}

export class DeleteSubjectUseCase {
  constructor(private readonly subjectRepo: ISubjectRepository) {}

  async execute(subjectId: string) {
    const subject = await this.subjectRepo.findById(new UniqueEntityId(subjectId))
    if (!subject) throw new NotFoundError('الموضوع')
    subject.deactivate()
    await this.subjectRepo.save(subject)
  }
}
