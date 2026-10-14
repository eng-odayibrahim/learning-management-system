import { ValueObject } from '@shared/domain/ValueObject'
import { AppError } from '@shared/errors/AppError'

export type RoleType = 'student' | 'admin'

interface UserRoleProps { value: RoleType }

export class UserRole extends ValueObject<UserRoleProps> {
  private constructor(props: UserRoleProps) { super(props) }

  get value(): RoleType { return this.props.value }

  static create(role: string): UserRole {
    const valid: RoleType[] = ['student', 'admin']
    if (!valid.includes(role as RoleType)) {
      throw new AppError('دور المستخدم غير صالح', 422)
    }
    return new UserRole({ value: role as RoleType })
  }

  static student(): UserRole { return new UserRole({ value: 'student' }) }
  static admin():   UserRole { return new UserRole({ value: 'admin' }) }

  isAdmin():   boolean { return this.props.value === 'admin' }
  isStudent(): boolean { return this.props.value === 'student' }
}
