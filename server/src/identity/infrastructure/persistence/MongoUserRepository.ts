import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { User } from '../../domain/entities/User'

import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { UserModel } from './UserModel'
import { UserMapper } from './UserMapper'

export class MongoUserRepository implements IUserRepository {

  async findById(id: UniqueEntityId): Promise<User | null> {
    const doc = await UserModel.findById(id.toString()).select('+sessionId +refreshTokenHash +refreshToken')
    return doc ? UserMapper.toDomain(doc) : null
  }

  async findByUsername(username: string): Promise<User | null> {
    const doc = await UserModel.findOne({ $or: [{ username }, { email: username }] }).select('+sessionId +refreshTokenHash +refreshToken')
    return doc ? UserMapper.toDomain(doc) : null
  }

  async existsByUsername(username: string): Promise<boolean> {
    return UserModel.exists({ username }).then(Boolean)
  }

  async findLatestStudentByYear(year: number): Promise<User | null> {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year + 1, 0, 1)
    
    // Find highest username that starts with year+'s' 
    // Just sort by username desc and get the first one
    const prefix = `${year}s`
    const doc = await UserModel.findOne({ 
      role: 'student', 
      username: { $regex: `^${prefix}` } 
    }).sort({ username: -1 })
    
    return doc ? UserMapper.toDomain(doc) : null
  }

  async findAll(filter?: { role?: string; isActive?: boolean }): Promise<User[]> {
    const query: Record<string, unknown> = {}
    if (filter?.role)      query.role     = filter.role
    if (filter?.isActive !== undefined) query.isActive = filter.isActive
    const docs = await UserModel.find(query).sort({ createdAt: -1 })
    return docs.map(UserMapper.toDomain)
  }

  async save(user: User): Promise<void> {
    const data = await UserMapper.toPersistence(user)
    const unset: Record<string, 1> = { refreshToken: 1 }
    if (!user.sessionId) unset.sessionId = 1
    if (!user.refreshTokenHash) unset.refreshTokenHash = 1
    await UserModel.findByIdAndUpdate(
      user.id.toString(),
      { $set: data, $unset: unset },
      { upsert: true, new: true }
    )
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await UserModel.findByIdAndDelete(id.toString())
  }

  async rotateRefreshToken(userId: string, sessionId: string, currentHash: string, nextHash: string): Promise<boolean> {
    const result = await UserModel.updateOne(
      { _id: userId, isActive: true, sessionId, refreshTokenHash: currentHash },
      { $set: { refreshTokenHash: nextHash, updatedAt: new Date() } },
    )
    return result.modifiedCount === 1
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await UserModel.updateOne(
      { _id: userId, sessionId },
      { $unset: { sessionId: 1, refreshTokenHash: 1, refreshToken: 1 }, $set: { updatedAt: new Date() } },
    )
    return result.modifiedCount === 1
  }
}
