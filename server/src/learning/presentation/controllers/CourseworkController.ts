import { Request, Response } from 'express'
import {
  CreateCourseworkUseCase,
  UpdateCourseworkUseCase,
  DeleteCourseworkUseCase,
  GetCourseworksBySubjectUseCase,
  GetAllCourseworksUseCase,
  GetCourseworkByIdUseCase
} from '../../application/use-cases/CourseworkUseCases'
import { MongoCourseworkRepository } from '../../infrastructure/persistence/MongoLearningRepositories'
import { z } from 'zod'
import { Coursework } from '../../domain/entities/Coursework'
import { SubjectModel } from '../../infrastructure/persistence/SubjectModel'
import { CourseAccessPolicy, canReadCourseAdminData } from '../../application/policies/AccessPolicies'
import { ForbiddenError, NotFoundError } from '@shared/errors/AppError'
import mongoose from 'mongoose'

async function authorizeSubjectCourse(subjectId: string, req: Request): Promise<boolean> {
  if (!mongoose.isValidObjectId(subjectId)) throw new NotFoundError('Coursework')
  const subject = await SubjectModel.findById(subjectId).select('courseId isActive').lean()
  if (!subject?.isActive) throw new NotFoundError('Coursework')
  const course = await CourseAccessPolicy.loadForView(subject.courseId.toString(), req.user)
  const manager = canReadCourseAdminData(req.user)
  if (!manager && (course.price ?? 0) > 0 && !(await CourseAccessPolicy.hasEntitlement(course._id.toString(), req.user))) {
    throw new ForbiddenError('You do not have access to this coursework')
  }
  return manager
}

const toDTO = (cw: Coursework) => ({
  id: cw.id.toString(),
  title: cw.title,
  description: cw.description,
  subjectId: cw.subjectId.toString(),
  materialKeys: cw.materialKeys,
  isActive: cw.isActive,
  createdAt: cw.createdAt,
  updatedAt: cw.updatedAt
})

const courseworkRepo = new MongoCourseworkRepository()
const createCourseworkUC = new CreateCourseworkUseCase(courseworkRepo)
const updateCourseworkUC = new UpdateCourseworkUseCase(courseworkRepo)
const deleteCourseworkUC = new DeleteCourseworkUseCase(courseworkRepo)
const getCourseworksBySubjectUC = new GetCourseworksBySubjectUseCase(courseworkRepo)
const getAllCourseworksUC = new GetAllCourseworksUseCase(courseworkRepo)
const getCourseworkByIdUC = new GetCourseworkByIdUseCase(courseworkRepo)

const createCourseworkSchema = z.object({
  title: z.string().min(1),
  subjectId: z.string().min(1),
  description: z.string().optional(),
  materialKeys: z.array(z.string()).optional()
})

const updateCourseworkSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  materialKeys: z.array(z.string()).optional()
})

export class CourseworkController {
  static async create(req: Request, res: Response): Promise<void> {
    const data = createCourseworkSchema.parse(req.body)
    const coursework = await createCourseworkUC.execute(data)
    res.status(201).json({ success: true, data: toDTO(coursework) })
  }

  static async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const data = updateCourseworkSchema.parse(req.body)
    const coursework = await updateCourseworkUC.execute(id, data)
    res.json({ success: true, data: toDTO(coursework) })
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    await deleteCourseworkUC.execute(id)
    res.json({ success: true })
  }

  static async getBySubject(req: Request, res: Response): Promise<void> {
    const { subjectId } = req.params
    const manager = await authorizeSubjectCourse(subjectId, req)
    const courseworks = await getCourseworksBySubjectUC.execute(subjectId)
    res.json({ success: true, data: manager ? courseworks.map(toDTO) : courseworks.map((cw) => ({
      id: cw.id.toString(), title: cw.title, description: cw.description,
      subjectId: cw.subjectId.toString(), isActive: cw.isActive,
    })) })
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    const courseworks = await getAllCourseworksUC.execute()
    res.json({ success: true, data: courseworks.map(toDTO) })
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Coursework')
    const coursework = await getCourseworkByIdUC.execute(id)
    if (!coursework) {
      res.status(404).json({ success: false, error: { message: 'Coursework not found' } })
      return
    }
    const manager = await authorizeSubjectCourse(coursework.subjectId.toString(), req)
    const data = manager ? toDTO(coursework) : {
      id: coursework.id.toString(), title: coursework.title, description: coursework.description,
      subjectId: coursework.subjectId.toString(), isActive: coursework.isActive,
    }
    res.json({ success: true, data })
  }
}
