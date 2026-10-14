import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository'
import { Category, CategoryTreeNode } from '../../domain/entities/Category'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError, ConflictError, AppError } from '@shared/errors/AppError'
import { CreateCategoryDto, UpdateCategoryDto, MoveCategoryDto } from '../dtos/CategoryDtos'

// ── View helpers ────────────────────────────────────────────────────────────

function categoryView(c: Category) {
  return {
    id:          c.id.toString(),
    name:        c.name,
    slug:        c.slug.value,
    parentId:    c.parentId?.toString() ?? null,
    description: c.description ?? '',
    icon:        c.icon ?? null,
    order:       c.order,
    isActive:    c.isActive,
    createdAt:   c.createdAt,
    updatedAt:   c.updatedAt,
  }
}

// ── Use Cases ────────────────────────────────────────────────────────────────

/**
 * Admin creates a new taxonomy node.
 * If parentId is provided, we verify the parent exists first.
 */
export class CreateCategoryUseCase {
  constructor(private readonly repo: ICategoryRepository) {}

  async execute(dto: CreateCategoryDto) {
    // Verify parent exists if given
    if (dto.parentId) {
      const parent = await this.repo.findById(new UniqueEntityId(dto.parentId))
      if (!parent) throw new NotFoundError('التصنيف الأب')
    }

    // Slug uniqueness guard
    const existing = await this.repo.findBySlug(
      dto.name.toLowerCase().replace(/\s+/g, '-')
    )
    if (existing) throw new ConflictError('يوجد تصنيف بهذا الاسم بالفعل')

    const category = Category.create(dto)
    await this.repo.save(category)
    return categoryView(category)
  }
}

/**
 * Admin updates metadata of an existing node (name, description, icon, order).
 * Does NOT change parentage — use MoveCategoryUseCase for that.
 */
export class UpdateCategoryUseCase {
  constructor(private readonly repo: ICategoryRepository) {}

  async execute(categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.repo.findById(new UniqueEntityId(categoryId))
    if (!category) throw new NotFoundError('التصنيف')
    category.update(dto)
    await this.repo.save(category)
    return categoryView(category)
  }
}

/**
 * Admin re-parents a category node (moves it in the tree).
 * Guards against circular references (a node cannot be parented to its own descendant).
 */
export class MoveCategoryUseCase {
  constructor(private readonly repo: ICategoryRepository) {}

  async execute(categoryId: string, dto: MoveCategoryDto) {
    const category = await this.repo.findById(new UniqueEntityId(categoryId))
    if (!category) throw new NotFoundError('التصنيف')

    if (dto.parentId) {
      // Cannot move a node to itself
      if (dto.parentId === categoryId) {
        throw new AppError('لا يمكن أن يكون التصنيف أباً لنفسه', 422)
      }
      // Verify the new parent exists
      const newParent = await this.repo.findById(new UniqueEntityId(dto.parentId))
      if (!newParent) throw new NotFoundError('التصنيف الأب الجديد')

      // Anti-circular: the new parent must not be a descendant of this node.
      // We get the full flat list and walk up from newParent to root.
      const allCategories = await this.repo.findAll()
      const idMap = new Map(allCategories.map(c => [c.id.toString(), c]))
      let cursor: Category | undefined = newParent
      while (cursor?.parentId) {
        if (cursor.parentId.toString() === categoryId) {
          throw new AppError('لا يمكن نقل التصنيف إلى أحد تصنيفاته الفرعية', 422)
        }
        cursor = idMap.get(cursor.parentId.toString())
      }
    }

    category.move(dto.parentId ?? undefined)
    await this.repo.save(category)
    return categoryView(category)
  }
}

/**
 * Admin toggles isActive on a category.
 * Note: deactivating a parent does NOT cascade to children —
 * the tree fetch (getTree) already filters by isActive per-node.
 */
export class ToggleCategoryUseCase {
  constructor(private readonly repo: ICategoryRepository) {}

  async execute(categoryId: string) {
    const category = await this.repo.findById(new UniqueEntityId(categoryId))
    if (!category) throw new NotFoundError('التصنيف')

    // (Categories are no longer directly tied to courses in the new taxonomy system)

    category.toggle()
    await this.repo.save(category)
    return categoryView(category)
  }
}

/**
 * Public: returns the full nested category tree in one call.
 * Used by the React frontend to render dynamic filter dropdowns.
 */
export class GetCategoryTreeUseCase {
  constructor(private readonly repo: ICategoryRepository) {}

  async execute(includeInactive = false): Promise<CategoryTreeNode[]> {
    return this.repo.getTree(!includeInactive)
  }
}

/**
 * Public / Admin: returns a flat list of all categories, optionally filtered.
 */
export class ListCategoriesUseCase {
  constructor(private readonly repo: ICategoryRepository) {}

  async execute(onlyActive = true) {
    const categories = await this.repo.findAll(onlyActive)
    return categories.map(categoryView)
  }
}
