import { IRepository } from '@shared/domain/IRepository'
import { Course } from '../entities/Course'
import { Slug } from '../value-objects/Slug'

export interface CourseFilter {
  stageId?:          string
  gradeId?:          string
  trackId?:          string
  specializationId?: string
  isPublished?:      boolean
  isActive?:         boolean
  visibleCourseIds?: string[]
}

export interface ICoursePaginated {
  items: Course[]
  total: number
  page:  number
  limit: number
}

export interface ICourseRepository extends IRepository<Course> {
  findBySlug(slug: Slug): Promise<Course | null>
  findAll(filter?: CourseFilter, page?: number, limit?: number): Promise<ICoursePaginated>
}
