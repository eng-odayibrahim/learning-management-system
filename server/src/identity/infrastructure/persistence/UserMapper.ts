import mongoose from 'mongoose'
import { User } from '../../domain/entities/User'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'

import { Email } from '../../domain/value-objects/Email'
import { Password } from '../../domain/value-objects/Password'
import { UserRole } from '../../domain/value-objects/UserRole'
import { UserDocument } from './UserModel'

export class UserMapper {
  static toDomain(doc: UserDocument): User {
    return User.reconstitute(
      {
        username:        doc.username,
        email:           doc.email ? Email.create(doc.email) : undefined,
        password:        Password.createHashed(doc.password),
        role:            UserRole.create(doc.role),
        fullName:        doc.fullName,
        phones:          doc.phones || [],
        stage:           doc.stage,
        grade:           doc.grade,
        track:           doc.track,
        specialization:  doc.specialization,
        permissions:     doc.permissions ? Object.fromEntries(doc.permissions as any) : undefined,
        isSuperAdmin:    doc.isSuperAdmin,
        isActive:        doc.isActive,
        isPaid:          doc.isPaid,
        paidPercentage:  doc.paidPercentage,
        sessionId:       doc.sessionId,
        refreshTokenHash: doc.refreshTokenHash,
        createdAt:       doc.createdAt,
        updatedAt:       doc.updatedAt,
      },
      new UniqueEntityId(doc._id.toHexString())
    )
  }

  static async toPersistence(user: User): Promise<Record<string, unknown>> {
    return {
      _id:             user.id.toString(),
      username:        user.username,
      email:           user.email,
      password:        await user.password.getHashedValue(),
      role:            user.role.value,
      fullName:        user.fullName,
      phones:          user.phones,
      stage:           user.stage,
      grade:           user.grade,
      track:           user.track,
      specialization:  user.specialization,
      permissions:     user.permissions,
      isSuperAdmin:    user.isSuperAdmin,
      isActive:        user.isActive,
      isPaid:          user.isPaid,
      paidPercentage:  user.paidPercentage,
      sessionId:       user.sessionId,
      refreshTokenHash:user.refreshTokenHash,
    }
  }
}
