import { AggregateRoot } from '@shared/domain/AggregateRoot'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { LessonOrder } from '../value-objects/LessonOrder'
import { VideoStatus } from '../value-objects/VideoStatus'

export type LessonType = 'video' | 'worksheet' | 'mixed'
export type LessonStatus = 'draft' | 'published' | 'archived'
export const LESSON_STATUSES: LessonStatus[] = ['draft', 'published', 'archived']

interface LessonProps {
  status:         LessonStatus
  title:          string
  classId:        UniqueEntityId
  order:          LessonOrder
  type:           LessonType
  description?:   string

  // Video fields (populated after FFmpeg processing)
  videoKey?:      string         // R2 object key of original
  hlsKey?:        string         // R2 prefix for HLS manifest + segments
  hlsUrl?:        string         // signed or public .m3u8 URL
  videoDuration?: number         // seconds
  videoStatus:    VideoStatus

  // Worksheet / material
  materialKeys:   string[]       // R2 object keys (PDFs, docs)

  coverImage?:    string         // Cover image URL for the lesson
  isFree:         boolean        // preview lesson, no subscription needed
  isPublished:    boolean
  isActive:       boolean
  createdAt:      Date
  updatedAt:      Date
}

export class Lesson extends AggregateRoot<LessonProps> {
  private constructor(props: LessonProps, id?: UniqueEntityId) {
    super(props, id)
  }

  get title():          string          { return this.props.title }
  get classId():        UniqueEntityId  { return this.props.classId }
  get order():          LessonOrder     { return this.props.order }
  get type():           LessonType      { return this.props.type }
  get description():    string | undefined { return this.props.description }
  get videoKey():       string | undefined { return this.props.videoKey }
  get hlsKey():         string | undefined { return this.props.hlsKey }
  get hlsUrl():         string | undefined { return this.props.hlsUrl }
  get videoDuration():  number | undefined { return this.props.videoDuration }
  get videoStatus():    VideoStatus     { return this.props.videoStatus }
  get materialKeys():   string[]        { return this.props.materialKeys }
  get coverImage():     string | undefined { return this.props.coverImage }
  get isFree():         boolean         { return this.props.isFree }
  get status():         LessonStatus    { return this.props.status }
  get isPublished():    boolean         { return this.props.status === 'published' }
  get isActive():       boolean         { return this.props.isActive }
  get createdAt():      Date            { return this.props.createdAt }
  get updatedAt():      Date            { return this.props.updatedAt }

  static create(props: {
    title:        string
    classId:      string
    order:        number
    type:         LessonType
    description?: string
    coverImage?:  string
    isFree?:      boolean
  }, id?: UniqueEntityId): Lesson {
    return new Lesson({
      title:        props.title.trim(),
      classId:      new UniqueEntityId(props.classId),
      order:        LessonOrder.create(props.order),
      type:         props.type,
      description:  props.description,
      videoStatus:  VideoStatus.pending(),
      materialKeys: [],
      coverImage:   props.coverImage,
      isFree:       props.isFree ?? false,
      status:       'draft',
      isPublished:  false,
      isActive:     true,
      createdAt:    new Date(),
      updatedAt:    new Date(),
    }, id)
  }

  static reconstitute(props: LessonProps, id: UniqueEntityId): Lesson {
    return new Lesson(props, id)
  }

  // called by video pipeline after upload
  markVideoUploaded(videoKey: string): void {
    this.props.videoKey     = videoKey
    this.props.videoStatus  = VideoStatus.processing()
    this.touch()
  }

  // called by FFmpeg job when HLS transcode completes
  markVideoReady(hlsKey: string, hlsUrl: string, duration: number): void {
    this.props.hlsKey        = hlsKey
    this.props.hlsUrl        = hlsUrl
    this.props.videoDuration = duration
    this.props.videoStatus   = VideoStatus.ready()
    this.touch()
  }

  markVideoFailed(): void {
    this.props.videoStatus = VideoStatus.failed()
    this.touch()
  }

  addMaterial(key: string): void {
    if (!this.props.materialKeys.includes(key)) {
      this.props.materialKeys.push(key)
      this.touch()
    }
  }

  removeMaterial(key: string): void {
    this.props.materialKeys = this.props.materialKeys.filter(k => k !== key)
    this.touch()
  }

  private setStatus(status: LessonStatus): void {
    this.props.status = status
    this.props.isPublished = status === 'published'
    this.touch()
  }
  publish():   void { this.setStatus('published') }
  unpublish(): void { this.setStatus('draft') }
  archive():   void { this.setStatus('archived') }
  deactivate():void { this.props.isActive    = false; this.touch() }

  update(data: Partial<Pick<LessonProps, 'title' | 'description' | 'isFree' | 'type' | 'coverImage'>> & { order?: number }): void {
    if (data.title !== undefined)       this.props.title       = data.title.trim()
    if (data.description !== undefined) this.props.description = data.description
    if (data.isFree !== undefined)      this.props.isFree      = data.isFree
    if (data.type !== undefined)        this.props.type        = data.type
    if (data.coverImage !== undefined)  this.props.coverImage  = data.coverImage
    if (data.order !== undefined)       this.props.order       = LessonOrder.create(data.order)
    this.touch()
  }

  private touch(): void { this.props.updatedAt = new Date() }
}
