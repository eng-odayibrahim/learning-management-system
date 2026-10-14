import mongoose from 'mongoose'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository'
import { Category, CategoryTreeNode } from '../../domain/entities/Category'
import { Slug } from '../../domain/value-objects/Slug'
import { CategoryModel, CategoryDocument } from './CategoryModel'
import { CourseModel } from './CourseModel'

// ── Private mapper ──────────────────────────────────────────────────────────

function toId(doc: { _id: mongoose.Types.ObjectId }): UniqueEntityId {
  return new UniqueEntityId(doc._id.toHexString())
}

function toDomain(doc: CategoryDocument): Category {
  return Category.reconstitute(
    {
      name:        doc.name,
      slug:        Slug.fromExisting(doc.slug),
      parentId:    doc.parentId ? new UniqueEntityId(doc.parentId.toHexString()) : undefined,
      description: doc.description,
      icon:        doc.icon,
      order:       doc.order,
      isActive:    doc.isActive,
      createdAt:   doc.createdAt,
      updatedAt:   doc.updatedAt,
    },
    toId(doc)
  )
}

function toPersistence(e: Category): Record<string, unknown> {
  return {
    _id:         e.id.toString(),
    name:        e.name,
    slug:        e.slug.value,
    parentId:    e.parentId ? new mongoose.Types.ObjectId(e.parentId.toString()) : null,
    description: e.description ?? '',
    icon:        e.icon,
    order:       e.order,
    isActive:    e.isActive,
  }
}

// ── Repository ──────────────────────────────────────────────────────────────

export class MongoCategoryRepository implements ICategoryRepository {
  async findById(id: UniqueEntityId): Promise<Category | null> {
    const doc = await CategoryModel.findById(id.toString())
    return doc ? toDomain(doc) : null
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const doc = await CategoryModel.findOne({ slug: slug.toLowerCase() })
    return doc ? toDomain(doc) : null
  }

  async findAll(onlyActive = false): Promise<Category[]> {
    const q = onlyActive ? { isActive: true } : {}
    const docs = await CategoryModel.find(q).sort({ parentId: 1, order: 1 })
    return docs.map(toDomain)
  }

  async findChildren(parentId: UniqueEntityId): Promise<Category[]> {
    const docs = await CategoryModel.find({
      parentId: new mongoose.Types.ObjectId(parentId.toString()),
      isActive: true,
    }).sort({ order: 1 })
    return docs.map(toDomain)
  }

  /**
   * Fetches the entire taxonomy tree in a single $graphLookup aggregation,
   * then assembles the nested structure in memory.
   *
   * $graphLookup traverses from root nodes (parentId: null) downward,
   * collecting all descendants into a flat `descendants` array per root.
   * We then do a recursive in-memory assembly — O(n log n) at most.
   */
  async getTree(onlyActive = true): Promise<CategoryTreeNode[]> {
    const filter = onlyActive ? { isActive: true } : {}

    // Fetch ALL categories in one shot, flat
    const allDocs = await CategoryModel.find(filter).sort({ order: 1 }).lean()

    // Build a map: id → node (with empty children array)
    const nodeMap = new Map<string, CategoryTreeNode>()
    for (const doc of allDocs) {
      nodeMap.set(doc._id.toHexString(), {
        id:          doc._id.toHexString(),
        name:        doc.name,
        slug:        doc.slug,
        parentId:    doc.parentId ? doc.parentId.toHexString() : undefined,
        description: doc.description,
        icon:        doc.icon,
        order:       doc.order,
        isActive:    doc.isActive,
        children:    [],
      })
    }

    // Wire up parent → child relationships
    const roots: CategoryTreeNode[] = []
    for (const node of nodeMap.values()) {
      if (node.parentId) {
        const parent = nodeMap.get(node.parentId)
        if (parent) parent.children.push(node)
      } else {
        roots.push(node)
      }
    }

    // Sort children by order at each level
    function sortChildren(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
      return nodes
        .sort((a, b) => a.order - b.order)
        .map(n => ({ ...n, children: sortChildren(n.children) }))
    }

    return sortChildren(roots)
  }


  async save(entity: Category): Promise<void> {
    await CategoryModel.findByIdAndUpdate(
      entity.id.toString(),
      { $set: toPersistence(entity) },
      { upsert: true, new: true }
    )
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await CategoryModel.findByIdAndDelete(id.toString())
  }
}
