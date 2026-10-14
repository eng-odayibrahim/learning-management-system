import { ValueObject } from '@shared/domain/ValueObject'

export type VideoStatusType = 'pending' | 'processing' | 'ready' | 'failed'

interface VideoStatusProps { value: VideoStatusType }

export class VideoStatus extends ValueObject<VideoStatusProps> {
  private constructor(props: VideoStatusProps) { super(props) }

  get value(): VideoStatusType { return this.props.value }

  static pending():    VideoStatus { return new VideoStatus({ value: 'pending' }) }
  static processing(): VideoStatus { return new VideoStatus({ value: 'processing' }) }
  static ready():      VideoStatus { return new VideoStatus({ value: 'ready' }) }
  static failed():     VideoStatus { return new VideoStatus({ value: 'failed' }) }

  static fromValue(v: VideoStatusType): VideoStatus {
    return new VideoStatus({ value: v })
  }

  isPending():    boolean { return this.props.value === 'pending' }
  isProcessing(): boolean { return this.props.value === 'processing' }
  isReady():      boolean { return this.props.value === 'ready' }
  isFailed():     boolean { return this.props.value === 'failed' }
}
