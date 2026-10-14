// ─────────────────────────────────────────────────────────────────────────────
// Project Athar — Frontend TypeScript Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export type RoleType = 'student' | 'admin'

export interface User {
  id:             string
  username:       string
  fullName:       string
  role:           RoleType
  email?:         string
  phones?:        { number: string; relation: string }[]
  stage?:         string
  grade?:         string
  track?:         string
  specialization?: string
  /** Canonical academic placement ObjectIds (set by admin via placement API) */
  academicStageId?:          string | null
  academicGradeId?:          string | null
  academicTrackId?:          string | null
  academicSpecializationId?: string | null
  permissions?:   Record<string, { read: boolean; edit: boolean }>
  isSuperAdmin?:  boolean
  isActive?:      boolean
  isPaid?:        boolean
  paidPercentage?: number
  categoryId?:    string
  createdAt?:     string
  generatedPassword?: string
}

export interface RelationCategory {
  id?: string
  _id?: string
  name: string
  isActive: boolean
}

export interface FamilyGroup {
  id?: string
  _id?: string
  categoryId: string | RelationCategory
  studentIds: string[] | User[]
}

export interface AuthResponse {
  accessToken:  string
  refreshToken: string
  user:         User
}

export interface AcademicStage {
  id: string
  name: string
  image?: string
  description?: string
  isActive: boolean
}

export interface Grade {
  id:           string
  name:         number
  isActive:     boolean
  stageId?:     string
}

export interface Track {
  id:           string
  name:         string
  isActive:     boolean
  gradeIds?:    string[]
}

export interface Specialization {
  id:           string
  name:         string
  isActive:     boolean
  trackIds?:    string[]
}

export interface FullTaxonomy {
  stages:          AcademicStage[]
  grades:          Grade[]
  tracks:          Track[]
  specializations: Specialization[]
}

export interface CategoryNode {
  id:           string
  name:         string
  slug:         string
  parentId?:    string | null
  description?: string
  icon?:        string
  order:        number
  isActive?:    boolean
  children?:    CategoryNode[]
}

export interface Course {
  id:                string
  title:             string
  slug:              string
  description:       string
  stageId?:          string | null
  gradeId?:          string | null
  trackId?:          string | null
  trackIds?:         string[]
  specializationId?: string | null
  specializationIds?:string[]
  thumbnail?:        string
  isPublished:       boolean
  isActive:          boolean
  order:             number
  createdAt?:        string
}

export interface Subject {
  id:          string
  title:       string
  slug?:       string
  description: string
  courseId:    string
  thumbnail?:  string
  order:       number
  isActive?:   boolean
}

export interface Class {
  id:        string
  title:     string
  subjectId: string
  order:     number
  isActive?: boolean
}

export type LessonType = 'video' | 'worksheet' | 'mixed'
export type VideoStatusValue = 'pending' | 'processing' | 'ready' | 'failed'
export type VideoStageValue = 'idle' | 'uploading' | 'queued' | 'transcoding' | 'uploading_r2' | 'retrying' | 'done' | 'failed'

export interface Lesson {
  id:            string
  title:         string
  classId:       string
  order:         number
  type:          LessonType
  description?:  string
  videoKey?:     string
  hlsKey?:       string
  hlsUrl?:       string
  hasVideo?:     boolean
  videoDuration?: number
  videoStatus:   VideoStatusValue
  videoStage?:   VideoStageValue
  videoProgress?: number
  retryCount?:   number
  lastVideoError?: string
  materialKeys?: string[]
  coverImage?:   string
  isFree:        boolean
  isPublished:   boolean
  isActive?:     boolean
}

export interface VideoJobStatus {
  videoStatus:    VideoStatusValue
  videoStage:     VideoStageValue
  videoProgress:  number
  retryCount:     number
  lastVideoError: string | null
  hlsUrl:         string | null
  videoJobId:     string | null
}

export interface CurriculumTreeCourse extends Course {
  subjects: {
    subject: Subject
    courseworks?: Coursework[]
    classes: {
      classItem: Class
      lessons:   Lesson[]
      quizzes?:  QuizForStudent[]
    }[]
  }[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page:  number
  limit: number
  pages: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?:   T
  error?: {
    code:    string
    message: string
  }
}

export interface Coursework {
  id: string
  title: string
  description?: string
  subjectId: string
  materialKeys: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz / Assessment
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionType = 'true_false' | 'multiple_choice' | 'fill_blank' | 'define'

/** Full question as stored in DB (admin view) */
export interface Question {
  _id:           string
  questionText:  string
  type:          QuestionType
  options?:      string[]
  correctAnswer: string
  explanation?:  string
}

/** Question as returned to students — correctAnswer is excluded */
export interface QuestionForStudent {
  _id:          string
  questionText: string
  type:         QuestionType
  options?:     string[]
  explanation?: string        // not shown until graded
}

export interface Quiz {
  id:           string
  _id?:         string
  title:        string
  description?: string
  classId:      string
  questions:    Question[]
  isActive:     boolean
  createdAt:    string
  updatedAt:    string
}

/** Quiz returned to students — questions have no correctAnswer */
export interface QuizForStudent {
  id:           string
  _id?:         string
  title:        string
  description?: string
  classId:      string
  questions:    QuestionForStudent[]
  isActive:     boolean
}

/** Per-question grading result returned after submission */
export interface GradedQuestion {
  questionId:     string
  isCorrect:      boolean
  correctAnswer?: string     // only included when wrong
  explanation?:   string     // only included when wrong
}

/** Full response from POST /api/quizzes/:id/submit */
export interface QuizSubmitResult {
  score:           number
  total:           number
  percentage:      number
  gradedQuestions: GradedQuestion[]
}
