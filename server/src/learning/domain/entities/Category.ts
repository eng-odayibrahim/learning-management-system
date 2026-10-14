import { Entity } from '@shared/domain/Entity'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { Slug } from '../value-objects/Slug'

// Category is a self-referential taxonomy node.
// A root node has no parentId.  Child nodes reference their parent.
// Depth is unlimited — the tree is resolved via $graphLookup on the DB layer.
interface CategoryProps {
  name:         string
  slug:         Slug
  parentId?:    UniqueEntityId   // null/undefined → root node
  description?: string
  icon?:        string           // emoji or icon class name for UI
  order:        number           // sibling ordering
  isActive:     boolean
  createdAt:    Date
  updatedAt:    Date
}

export interface CategoryTreeNode {
  id:          string
  name:        string
  slug:        string
  parentId?:   string
  description?: string
  icon?:       string
  order:       number
  isActive:    boolean
  children:    CategoryTreeNode[]
}

export class Category extends Entity<CategoryProps> {
  private constructor(props: CategoryProps, id?: UniqueEntityId) {
    super(props, id)
  }

  get name():         string                    { return this.props.name }
  get slug():         Slug                      { return this.props.slug }
  get parentId():     UniqueEntityId | undefined { return this.props.parentId }
  get description():  string | undefined         { return this.props.description }
  get icon():         string | undefined         { return this.props.icon }
  get order():        number                    { return this.props.order }
  get isActive():     boolean                   { return this.props.isActive }
  get createdAt():    Date                      { return this.props.createdAt }
  get updatedAt():    Date                      { return this.props.updatedAt }

  static create(props: {
    name:         string
    parentId?:    string
    description?: string
    icon?:        string
    order?:       number
  }, id?: UniqueEntityId): Category {
    return new Category({
      name:        props.name.trim(),
      slug:        Slug.create(props.name),
      parentId:    props.parentId ? new UniqueEntityId(props.parentId) : undefined,
      description: props.description?.trim(),
      icon:        props.icon,
      order:       props.order ?? 0,
      isActive:    true,
      createdAt:   new Date(),
      updatedAt:   new Date(),
    }, id)
  }

  static reconstitute(props: CategoryProps, id: UniqueEntityId): Category {
    return new Category(props, id)
  }

  update(data: {
    name?:         string
    description?:  string
    icon?:         string
    order?:        number
  }): void {
    if (data.name !== undefined) {
      this.props.name = data.name.trim()
      this.props.slug = Slug.create(data.name)
    }
    if (data.description !== undefined) this.props.description = data.description.trim()
    if (data.icon        !== undefined) this.props.icon        = data.icon
    if (data.order       !== undefined) this.props.order       = data.order
    this.touch()
  }

  // Re-parent this node to a new parent (or promote to root)
  move(newParentId?: string): void {
    this.props.parentId = newParentId ? new UniqueEntityId(newParentId) : undefined
    this.touch()
  }

  toggle(): void {
    this.props.isActive = !this.props.isActive
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }
}
