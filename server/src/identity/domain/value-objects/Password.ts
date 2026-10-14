import { ValueObject } from '@shared/domain/ValueObject'
import { AppError } from '@shared/errors/AppError'
import bcrypt from 'bcryptjs'

interface PasswordProps { hashed: string; isHashed: boolean }

export class Password extends ValueObject<PasswordProps> {
  private constructor(props: PasswordProps) { super(props) }

  static createPlain(plain: string): Password {
    if (plain.length < 8) {
      throw new AppError('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 422)
    }
    return new Password({ hashed: plain, isHashed: false })
  }

  static createHashed(hash: string): Password {
    return new Password({ hashed: hash, isHashed: true })
  }

  async getHashedValue(): Promise<string> {
    if (this.props.isHashed) return this.props.hashed
    return bcrypt.hash(this.props.hashed, 12)
  }

  async compare(plain: string): Promise<boolean> {
    if (!this.props.isHashed) return plain === this.props.hashed
    return bcrypt.compare(plain, this.props.hashed)
  }
}
