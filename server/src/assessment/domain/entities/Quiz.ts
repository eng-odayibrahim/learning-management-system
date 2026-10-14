import { AggregateRoot } from '@shared/domain/AggregateRoot'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'

// ── Question Types ──────────────────────────────────────────────────────────
export type QuestionType = 'true_false' | 'multiple_choice' | 'fill_blank' | 'define'
export type AnswerVisibility = 'never' | 'after_submission'

export interface QuestionProps {
  questionText: string
  type:         QuestionType
  options?:     string[]         // Only for multiple_choice
  correctAnswer: string         // Stored in DB, NEVER sent to student
  explanation?: string          // Shown to student when they answer incorrectly
}

export interface QuestionDTO {
  _id?:          string
  questionText:  string
  type:          QuestionType
  options?:      string[]
  correctAnswer: string
  explanation?:  string
}

// ── Quiz Aggregate ──────────────────────────────────────────────────────────
export interface QuizProps {
  title:       string
  description?: string
  classId:     UniqueEntityId   // References the "Unit" (Class model in hierarchy)
  questions:   QuestionProps[]
  isActive:    boolean
  maxAttempts: number
  timeLimitMinutes?: number
  passPercentage: number
  availableFrom?: Date
  availableUntil?: Date
  answerVisibility: AnswerVisibility
  isFree: boolean
  createdAt:   Date
  updatedAt:   Date
}

export class Quiz extends AggregateRoot<QuizProps> {
  private constructor(props: QuizProps, id?: UniqueEntityId) {
    super(props, id)
  }

  get title():       string          { return this.props.title }
  get description(): string | undefined { return this.props.description }
  get classId():     UniqueEntityId  { return this.props.classId }
  get questions():   QuestionProps[] { return this.props.questions }
  get isActive():    boolean         { return this.props.isActive }
  get maxAttempts(): number          { return this.props.maxAttempts }
  get timeLimitMinutes(): number | undefined { return this.props.timeLimitMinutes }
  get passPercentage(): number       { return this.props.passPercentage }
  get availableFrom(): Date | undefined { return this.props.availableFrom }
  get availableUntil(): Date | undefined { return this.props.availableUntil }
  get answerVisibility(): AnswerVisibility { return this.props.answerVisibility }
  get isFree(): boolean              { return this.props.isFree }
  get createdAt():   Date            { return this.props.createdAt }
  get updatedAt():   Date            { return this.props.updatedAt }

  static create(props: {
    title:        string
    description?: string
    classId:      string
    questions:    QuestionProps[]
    maxAttempts?: number
    timeLimitMinutes?: number
    passPercentage?: number
    availableFrom?: Date
    availableUntil?: Date
    answerVisibility?: AnswerVisibility
    isFree?: boolean
  }, id?: UniqueEntityId): Quiz {
    return new Quiz({
      title:       props.title.trim(),
      description: props.description?.trim(),
      classId:     new UniqueEntityId(props.classId),
      questions:   props.questions,
      isActive:    true,
      maxAttempts: props.maxAttempts ?? 1,
      timeLimitMinutes: props.timeLimitMinutes,
      passPercentage: props.passPercentage ?? 50,
      availableFrom: props.availableFrom,
      availableUntil: props.availableUntil,
      answerVisibility: props.answerVisibility ?? 'never',
      isFree: props.isFree ?? false,
      createdAt:   new Date(),
      updatedAt:   new Date(),
    }, id)
  }

  static reconstitute(props: QuizProps, id: UniqueEntityId): Quiz {
    return new Quiz(props, id)
  }

  update(data: Partial<Pick<QuizProps, 'title' | 'description' | 'questions' | 'maxAttempts' | 'timeLimitMinutes' | 'passPercentage' | 'availableFrom' | 'availableUntil' | 'answerVisibility' | 'isFree'>>): void {
    if (data.title       !== undefined) this.props.title       = data.title.trim()
    if (data.description !== undefined) this.props.description = data.description?.trim()
    if (data.questions   !== undefined) this.props.questions   = data.questions
    if (data.maxAttempts !== undefined) this.props.maxAttempts = data.maxAttempts
    if (data.timeLimitMinutes !== undefined) this.props.timeLimitMinutes = data.timeLimitMinutes
    if (data.passPercentage !== undefined) this.props.passPercentage = data.passPercentage
    if (data.availableFrom !== undefined) this.props.availableFrom = data.availableFrom
    if (data.availableUntil !== undefined) this.props.availableUntil = data.availableUntil
    if (data.answerVisibility !== undefined) this.props.answerVisibility = data.answerVisibility
    if (data.isFree !== undefined) this.props.isFree = data.isFree
    this.props.updatedAt = new Date()
  }

  deactivate(): void {
    this.props.isActive  = false
    this.props.updatedAt = new Date()
  }

  toggleActive(): void {
    this.props.isActive  = !this.props.isActive
    this.props.updatedAt = new Date()
  }
}
