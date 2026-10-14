import { IRepository } from '@shared/domain/IRepository'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { User } from '../entities/User'
import { Email } from '../value-objects/Email'

export interface IUserRepository extends IRepository<User> {
  findByUsername(username: string): Promise<User | null>
  existsByUsername(username: string): Promise<boolean>
  findLatestStudentByYear(year: number): Promise<User | null>
  findAll(filter?: { role?: string; isActive?: boolean }): Promise<User[]>
  /** Atomically consume the current refresh token so it can only be rotated once. */
  rotateRefreshToken(userId: string, sessionId: string, currentHash: string, nextHash: string): Promise<boolean>
  /** Atomically revoke a session only if it is still the current session. */
  revokeSession(userId: string, sessionId: string): Promise<boolean>
}
