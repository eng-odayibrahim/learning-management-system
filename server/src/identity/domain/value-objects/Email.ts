import { ValueObject } from '@shared/domain/ValueObject'
import { AppError } from '@shared/errors/AppError'

interface EmailProps { value: string }

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) { super(props) }

  get value(): string { return this.props.value }

  static create(email: string): Email {
    const normalized = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new AppError('البريد الإلكتروني غير صالح', 422)
    }
    return new Email({ value: normalized })
  }
}
