import { IRepository } from '@shared/domain/IRepository'
import { Category, CategoryTreeNode } from '../entities/Category'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'

export interface ICategoryRepository extends IRepository<Category> {
  findBySlug(slug: string): Promise<Category | null>
  findAll(onlyActive?: boolean): Promise<Category[]>
  findChildren(parentId: UniqueEntityId): Promise<Category[]>
  /** Returns the full nested tree, built via $graphLookup in one DB roundtrip */
  getTree(onlyActive?: boolean): Promise<CategoryTreeNode[]>
}
