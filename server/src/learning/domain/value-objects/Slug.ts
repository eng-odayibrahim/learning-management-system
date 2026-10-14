import { ValueObject } from '@shared/domain/ValueObject'
import { AppError } from '@shared/errors/AppError'

interface SlugProps { value: string }

export class Slug extends ValueObject<SlugProps> {
  private constructor(props: SlugProps) { super(props) }

  get value(): string { return this.props.value }

  static create(input: string): Slug {
    const slug = input
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\u0600-\u06FFa-z0-9-]/g, '') // allow arabic + latin + digits + hyphen
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (slug.length < 2) throw new AppError('المعرف النصي غير صالح', 422)
    return new Slug({ value: slug })
  }

  static fromExisting(slug: string): Slug {
    return new Slug({ value: slug })
  }
}
