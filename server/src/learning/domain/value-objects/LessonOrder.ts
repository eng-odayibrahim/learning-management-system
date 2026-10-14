import { ValueObject } from '@shared/domain/ValueObject'
import { AppError } from '@shared/errors/AppError'

interface LessonOrderProps { value: number }

export class LessonOrder extends ValueObject<LessonOrderProps> {
  private constructor(props: LessonOrderProps) { super(props) }

  get value(): number { return this.props.value }

  static create(order: number): LessonOrder {
    if (!Number.isInteger(order) || order < 1) {
      throw new AppError('ترتيب الدرس يجب أن يكون رقماً صحيحاً أكبر من صفر', 422)
    }
    return new LessonOrder({ value: order })
  }
}
