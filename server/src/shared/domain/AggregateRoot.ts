import { Entity } from './Entity'
import { UniqueEntityId } from './UniqueEntityId'
import { DomainEvent } from './DomainEvent'

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = []

  constructor(props: T, id?: UniqueEntityId) {
    super(props, id)
  }

  get domainEvents(): DomainEvent[] {
    return this._domainEvents
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  clearDomainEvents(): void {
    this._domainEvents = []
  }
}
