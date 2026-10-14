import { DomainEvent } from '@shared/domain/DomainEvent'
import { User } from '../entities/User'

export class UserRegisteredEvent implements DomainEvent {
  dateTimeOccurred: Date
  private readonly user: User

  constructor(user: User) {
    this.dateTimeOccurred = new Date()
    this.user = user
  }

  getAggregateId(): string { return this.user.id.toString() }
  getUser(): User { return this.user }
}
