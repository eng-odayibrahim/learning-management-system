import { AggregateRoot } from '@shared/domain/AggregateRoot'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { Email } from '../value-objects/Email'
import { Password } from '../value-objects/Password'
import { UserRole, RoleType } from '../value-objects/UserRole'
import { UserRegisteredEvent } from '../events/UserRegisteredEvent'

interface UserProps {
  username:        string
  email?:          Email
  password:        Password
  role:            UserRole
  fullName:        string
  phones:          { number: string; relation: string }[]
  stage?:          string
  grade?:          string
  track?:          string
  specialization?: string
  permissions?:    Record<string, { read: boolean; edit: boolean }>
  isSuperAdmin?:   boolean
  isActive:        boolean
  isPaid?:         boolean
  paidPercentage?: number
  sessionId?:       string
  refreshTokenHash?: string
  createdAt:       Date
  updatedAt:       Date
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id?: UniqueEntityId) {
    super(props, id)
  }

  get username():        string                       { return this.props.username }
  get email():           string | undefined           { return this.props.email?.value }
  get password():        Password                     { return this.props.password }
  get role():            UserRole                     { return this.props.role }
  get fullName():        string                       { return this.props.fullName }
  get phones():          { number: string; relation: string }[] { return this.props.phones }
  get stage():           string | undefined           { return this.props.stage }
  get grade():           string | undefined           { return this.props.grade }
  get track():           string | undefined           { return this.props.track }
  get specialization():  string | undefined           { return this.props.specialization }
  get isActive():        boolean                      { return this.props.isActive }
  get isPaid():          boolean                      { return this.props.isPaid ?? false }
  get paidPercentage():  number                       { return this.props.paidPercentage ?? 0 }
  get permissions():     Record<string, { read: boolean; edit: boolean }> | undefined { return this.props.permissions }
  get isSuperAdmin():    boolean                      { return this.props.isSuperAdmin ?? false }
  get sessionId():       string | undefined           { return this.props.sessionId }
  get refreshTokenHash(): string | undefined           { return this.props.refreshTokenHash }
  get createdAt():       Date                         { return this.props.createdAt }
  get updatedAt():       Date                         { return this.props.updatedAt }

  static create(props: {
    username:   string
    email?:     string
    password:   string
    role:       RoleType
    fullName:   string
    phones?:    { number: string; relation: string }[]
    stage?:     string
    grade?:     string
    track?:     string
    specialization?: string
    permissions?: Record<string, { read: boolean; edit: boolean }>
    isSuperAdmin?: boolean
  }, id?: UniqueEntityId): User {
    const user = new User({
      username:        props.username.trim().toLowerCase(),
      email:           props.email ? Email.create(props.email) : undefined,
      password:        Password.createPlain(props.password),
      role:            UserRole.create(props.role),
      fullName:        props.fullName.trim(),
      phones:          props.phones || [],
      stage:           props.stage,
      grade:           props.grade,
      track:           props.track,
      specialization:  props.specialization,
      permissions:     props.permissions,
      isSuperAdmin:    props.isSuperAdmin ?? false,
      isActive:        true,
      isPaid:          false,
      paidPercentage:  0,
      createdAt:       new Date(),
      updatedAt:       new Date(),
    }, id)
    user.addDomainEvent(new UserRegisteredEvent(user))
    return user
  }

  static reconstitute(props: UserProps, id: UniqueEntityId): User {
    return new User(props, id)
  }

  deactivate(): void { this.props.isActive = false; this.clearSession(); this.touch() }
  activate():   void { this.props.isActive = true; this.clearSession(); this.touch() }

  setSession(sessionId: string, refreshTokenHash: string): void {
    this.props.sessionId = sessionId
    this.props.refreshTokenHash = refreshTokenHash
    this.touch()
  }

  clearSession(): void {
    this.props.sessionId = undefined
    this.props.refreshTokenHash = undefined
    this.touch()
  }

  changePassword(password: string): void {
    this.props.password = Password.createPlain(password)
    this.clearSession()
    this.touch()
  }

  updateFinance(data: { isPaid: boolean; paidPercentage: number }): void {
    this.props.isPaid = data.isPaid
    this.props.paidPercentage = data.paidPercentage
    this.touch()
  }

  updatePermissions(permissions: Record<string, { read: boolean; edit: boolean }>): void {
    this.props.permissions = permissions
    this.clearSession()
    this.touch()
  }

  updateProfile(data: { fullName?: string; email?: string; phones?: { number: string; relation: string }[]; stage?: string; grade?: string; track?: string; specialization?: string }): void {
    if (data.fullName)              this.props.fullName   = data.fullName.trim()
    if (data.email !== undefined)   this.props.email      = data.email ? Email.create(data.email) : undefined
    if (data.phones !== undefined)  this.props.phones     = data.phones
    if (data.stage !== undefined)   this.props.stage      = data.stage
    if (data.grade !== undefined)   this.props.grade      = data.grade
    if (data.track !== undefined)   this.props.track      = data.track
    if (data.specialization !== undefined) this.props.specialization = data.specialization
    this.touch()
  }

  private touch(): void { this.props.updatedAt = new Date() }
}
