import { ApiResponse, AuthResponse, CategoryNode, Course, CurriculumTreeCourse, Lesson, Paginated, Subject, Class, User, AcademicStage, Grade, Track, Specialization, FullTaxonomy, VideoJobStatus, RelationCategory, FamilyGroup, Coursework, Quiz, QuizForStudent, QuizSubmitResult, Question } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

class ApiError extends Error {
  constructor(public message: string, public status: number, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && typeof window !== 'undefined' && endpoint !== '/api/auth/refresh') {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        const refreshJson = await refreshRes.json()
        if (refreshRes.ok && refreshJson.success && refreshJson.data?.accessToken) {
          const newAccessToken = refreshJson.data.accessToken
          const newRefreshToken = refreshJson.data.refreshToken
          localStorage.setItem('accessToken', newAccessToken)
          if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken)
          headers['Authorization'] = `Bearer ${newAccessToken}`
          res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
          })
        }
      } catch (err) {
        // Fallthrough
      }
    }
  }

  let json: ApiResponse<T> | null = null
  try {
    json = await res.json()
  } catch (e) {
    // If not JSON
  }

  if (!res.ok || (json && !json.success)) {
    const errorMsg = (json as any)?.message || json?.error?.message || `حدث خطأ: ${res.statusText || res.status}`
    throw new ApiError(errorMsg, res.status, json?.error?.code)
  }

  return (json ? json.data : undefined) as T
}

export const api = {
  // Auth
  registerStudent: (data: { fullName: string; phones?: { number: string; relation: string }[]; stageId: string; gradeId: string; trackId?: string | null; specializationId?: string | null }) =>
    request<{ id: string; username: string; password: string }>('/api/auth/admin/students', { method: 'POST', body: JSON.stringify(data) }),

  setAcademicPlacement: (studentId: string, data: { stageId: string; gradeId: string; trackId?: string | null; specializationId?: string | null }) =>
    request<{ studentId: string; stageId: string; gradeId: string; trackId: string | null; specializationId: string | null }>(`/api/auth/admin/students/${studentId}/academic-placement`, { method: 'PATCH', body: JSON.stringify(data) }),

  batchSetAcademicPlacement: (data: { studentIds: string[]; stageId: string; gradeId: string; trackId?: string | null; specializationId?: string | null }) =>
    request<{ matchedCount: number; modifiedCount: number; stageId: string; gradeId: string; trackId: string | null; specializationId: string | null }>('/api/auth/admin/students/batch-placement', { method: 'PATCH', body: JSON.stringify(data) }),

  login: async (data: { username: string; password: string }) => {
    const res = await request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) })
    if (typeof window !== 'undefined' && res.accessToken) {
      localStorage.setItem('accessToken', res.accessToken)
      localStorage.setItem('refreshToken', res.refreshToken)
      localStorage.setItem('user', JSON.stringify(res.user))
    }
    return res
  },

  logout: async () => {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null
      if (refreshToken) {
        await request('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) })
      }
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      }
    }
  },

  getMe: () => request<User>('/api/auth/me'),

  updateProfile: async (data: {
    fullName?: string
    email?: string
    currentPassword?: string
    newPassword?: string
  }) => {
    const res = await request<{
      user: User
      accessToken?: string
      refreshToken?: string
    }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    if (res?.accessToken && typeof window !== 'undefined') {
      localStorage.setItem('accessToken', res.accessToken)
      if (res.refreshToken) localStorage.setItem('refreshToken', res.refreshToken)
    }
    return res
  },

  // Explicit Taxonomy (Stages, Grades, Tracks, Specializations)
  getTaxonomy: (includeInactive = false) =>
    request<FullTaxonomy>(`/api/learning/taxonomy?includeInactive=${includeInactive}`),

  getStages: (includeInactive = false) =>
    request<AcademicStage[]>(`/api/learning/stages?includeInactive=${includeInactive}`),
  createStage: (data: Partial<AcademicStage>) =>
    request<AcademicStage>('/api/learning/stages', { method: 'POST', body: JSON.stringify(data) }),
  updateStage: (id: string, data: Partial<AcademicStage>) =>
    request<AcademicStage>(`/api/learning/stages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStage: (id: string) =>
    request<{ success: boolean }>(`/api/learning/stages/${id}`, { method: 'DELETE' }),

  getGrades: (includeInactive = false) => {
    const params = new URLSearchParams({ includeInactive: String(includeInactive) })
    return request<Grade[]>(`/api/learning/grades?${params.toString()}`)
  },
  createGrade: (data: Partial<Grade>) =>
    request<Grade>('/api/learning/grades', { method: 'POST', body: JSON.stringify(data) }),
  updateGrade: (id: string, data: Partial<Grade>) =>
    request<Grade>(`/api/learning/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGrade: (id: string) =>
    request<{ success: boolean }>(`/api/learning/grades/${id}`, { method: 'DELETE' }),

  getTracks: (includeInactive = false) =>
    request<Track[]>(`/api/learning/tracks?includeInactive=${includeInactive}`),
  createTrack: (data: Partial<Track>) =>
    request<Track>('/api/learning/tracks', { method: 'POST', body: JSON.stringify(data) }),
  updateTrack: (id: string, data: Partial<Track>) =>
    request<Track>(`/api/learning/tracks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTrack: (id: string) =>
    request<{ success: boolean }>(`/api/learning/tracks/${id}`, { method: 'DELETE' }),

  getSpecializations: (includeInactive = false) =>
    request<Specialization[]>(`/api/learning/specializations?includeInactive=${includeInactive}`),
  createSpecialization: (data: Partial<Specialization>) =>
    request<Specialization>('/api/learning/specializations', { method: 'POST', body: JSON.stringify(data) }),
  updateSpecialization: (id: string, data: Partial<Specialization>) =>
    request<Specialization>(`/api/learning/specializations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSpecialization: (id: string) =>
    request<{ success: boolean }>(`/api/learning/specializations/${id}`, { method: 'DELETE' }),

  // Categories (Legacy / Fallback Tree)
  getCategoryTree: (includeInactive = false) =>
    request<CategoryNode[]>(`/api/learning/categories/tree?includeInactive=${includeInactive}`),

  getCategoriesFlat: (includeInactive = false) =>
    request<CategoryNode[]>(`/api/learning/categories?includeInactive=${includeInactive}`),

  createCategory: (data: { name: string; parentId?: string | null; description?: string; icon?: string; order?: number }) =>
    request<CategoryNode>('/api/learning/categories', { method: 'POST', body: JSON.stringify(data) }),

  updateCategory: (id: string, data: { name?: string; description?: string; icon?: string; order?: number }) =>
    request<CategoryNode>(`/api/learning/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  toggleCategory: (id: string) =>
    request<CategoryNode>(`/api/learning/categories/${id}/toggle`, { method: 'PATCH' }),

  moveCategory: (id: string, parentId: string | null) =>
    request<CategoryNode>(`/api/learning/categories/${id}/move`, { method: 'PATCH', body: JSON.stringify({ parentId }) }),

  // Courses
  getCourses: (filters: { stageId?: string; gradeId?: string; trackId?: string; specializationId?: string } = {}, page = 1, limit = 20) => {
    const params = new URLSearchParams()
    if (filters.stageId)          params.set('stageId', filters.stageId)
    if (filters.gradeId)          params.set('gradeId', filters.gradeId)
    if (filters.trackId)          params.set('trackId', filters.trackId)
    if (filters.specializationId) params.set('specializationId', filters.specializationId)
    params.set('page', String(page))
    params.set('limit', String(limit))
    return request<Paginated<Course>>(`/api/learning/courses?${params.toString()}`)
  },

  getCourse: (id: string) => request<Course>(`/api/learning/courses/${id}`),

  getCurriculumTree: (courseId: string) => request<CurriculumTreeCourse>(`/api/learning/courses/${courseId}/tree`),

  createCourse: (data: { title: string; description?: string; stageId?: string; gradeId?: string; trackId?: string; trackIds?: string[]; specializationId?: string; specializationIds?: string[]; categoryId?: string; thumbnail?: string; order?: number }) =>
    request<Course>('/api/learning/courses', { method: 'POST', body: JSON.stringify(data) }),

  updateCourse: (id: string, data: Partial<Course>) =>
    request<Course>(`/api/learning/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  publishCourse: (id: string, publish = true) =>
    request<{ success: boolean }>(`/api/learning/courses/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ publish }) }),

  deleteCourse: (id: string) => request<{ success: boolean }>(`/api/learning/courses/${id}`, { method: 'DELETE' }),

  // Subjects, Classes & Lessons
  createSubject: (data: { title: string; description?: string; courseId: string; order?: number }) =>
    request<Subject>('/api/learning/subjects', { method: 'POST', body: JSON.stringify(data) }),

  updateSubject: (id: string, data: Partial<Subject>) =>
    request<Subject>(`/api/learning/subjects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteSubject: (id: string) =>
    request<{ success: boolean }>(`/api/learning/subjects/${id}`, { method: 'DELETE' }),

  createClass: (data: { title: string; subjectId: string; order?: number }) =>
    request<Class>('/api/learning/classes', { method: 'POST', body: JSON.stringify(data) }),

  deleteClass: (id: string) =>
    request<{ success: boolean }>(`/api/learning/classes/${id}`, { method: 'DELETE' }),

  createLesson: (data: { title: string; classId: string; order: number; type: string; description?: string; isFree?: boolean }) =>
    request<Lesson>('/api/learning/lessons', { method: 'POST', body: JSON.stringify(data) }),

  updateLesson: (id: string, data: Partial<{ title: string; description: string; type: string; isFree: boolean; order: number; coverImage: string }>) =>
    request<Lesson>(`/api/learning/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  publishLesson: (id: string, publish = true) =>
    request<{ success: boolean }>(`/api/learning/lessons/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ publish }) }),

  deleteLesson: (id: string) =>
    request<{ success: boolean }>(`/api/learning/lessons/${id}`, { method: 'DELETE' }),

  getLesson: (id: string) => request<Lesson>(`/api/learning/lessons/${id}`),

  getLessonPlayback: (lessonId: string) =>
    request<{ url: string; expiresInSeconds: number }>(`/api/video/lessons/${lessonId}/playback`, { method: 'POST' }),

  // Coursework (اعمال السنة)
  getCourseworksBySubject: (subjectId: string) => request<Coursework[]>(`/api/learning/subjects/${subjectId}/courseworks`),
  getAllCourseworks: () => request<Coursework[]>('/api/learning/courseworks'),
  getCoursework: (id: string) => request<Coursework>(`/api/learning/courseworks/${id}`),
  createCoursework: (data: { title: string; subjectId: string; description?: string; materialKeys?: string[] }) =>
    request<Coursework>('/api/learning/courseworks', { method: 'POST', body: JSON.stringify(data) }),
  updateCoursework: (id: string, data: Partial<{ title: string; description: string; materialKeys: string[] }>) =>
    request<Coursework>(`/api/learning/courseworks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCoursework: (id: string) => request<{ success: boolean }>(`/api/learning/courseworks/${id}`, { method: 'DELETE' }),

  // Image upload (course thumbnail / lesson cover)
  uploadImage: async (file: File, folder = 'images'): Promise<string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const formData = new FormData()
    formData.append('image', file)
    formData.append('folder', folder)
    const res = await fetch(`${API_BASE}/api/video/upload-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json?.error?.message || 'فشل رفع الصورة')
    return json.data.url as string
  },

  // Document upload (coursework materials, pdfs, etc.)
  uploadDocument: async (file: File, folder = 'documents'): Promise<string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const formData = new FormData()
    formData.append('document', file)
    formData.append('folder', folder)
    const res = await fetch(`${API_BASE}/api/video/upload-document`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json?.error?.message || 'فشل رفع الملف')
    return json.data.url as string
  },

  // Admin Students
  getStudents: () => request<User[]>('/api/auth/admin/students'),

  adminToggleStudent: (studentId: string, activate: boolean) =>
    request<{ success: boolean }>(`/api/auth/admin/students/${studentId}/toggle`, { method: 'PATCH', body: JSON.stringify({ activate }) }),

  adminUpdateFinance: (studentId: string, data: { isPaid: boolean; paidPercentage: number }) =>
    request<{ success: boolean }>(`/api/auth/admin/students/${studentId}/finance`, { method: 'PATCH', body: JSON.stringify(data) }),

  adminRegeneratePassword: (studentId: string) => 
    request<{ newPassword: string }>(`/api/auth/admin/students/${studentId}/regenerate-password`, { method: 'PATCH' }),

  // Admin Management
  getAdmins: () => request<User[]>('/api/auth/admin/admins'),
  createAdmin: (data: any) =>
    request<User>('/api/auth/admin/admins', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminPermissions: (adminId: string, permissions: Record<string, { read: boolean; edit: boolean }>) =>
    request<{ success: boolean }>(`/api/auth/admin/admins/${adminId}/permissions`, { method: 'PATCH', body: JSON.stringify({ permissions }) }),
  toggleAdmin: (adminId: string, activate: boolean) =>
    request<{ success: boolean }>(`/api/auth/admin/admins/${adminId}/toggle`, { method: 'PATCH', body: JSON.stringify({ activate }) }),

  // Family / Relations
  getRelationCategories: () => request<RelationCategory[]>('/api/auth/admin/family/categories'),
  createRelationCategory: (name: string) =>
    request<RelationCategory>('/api/auth/admin/family/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteRelationCategory: (id: string) =>
    request<{ success: boolean }>(`/api/auth/admin/family/categories/${id}`, { method: 'DELETE' }),

  getFamilyGroups: () => request<FamilyGroup[]>('/api/auth/admin/family/groups'),
  createFamilyGroup: (categoryId: string, studentIds: string[]) =>
    request<FamilyGroup>('/api/auth/admin/family/groups', { method: 'POST', body: JSON.stringify({ categoryId, studentIds }) }),
  deleteFamilyGroup: (id: string) =>
    request<{ success: boolean }>(`/api/auth/admin/family/groups/${id}`, { method: 'DELETE' }),

  // Video Processing Status (polling)
  getVideoStatus: (lessonId: string) =>
    request<VideoJobStatus>(`/api/video/${lessonId}/status`),

  // ────────────────────────────────────────────────────────────────
  // Quiz / Assessment
  // ────────────────────────────────────────────────────────────────

  /** Admin: list quizzes. Pass classId to filter by unit. */
  getQuizzes: (classId?: string) => {
    const url = classId
      ? `/api/quizzes?classId=${classId}`
      : '/api/quizzes'
    return request<Quiz[]>(url)
  },

  /** Student: fetch quiz WITHOUT correctAnswer */
  getQuizForStudent: (id: string) =>
    request<QuizForStudent>(`/api/quizzes/${id}`),

  /** Admin: fetch quiz WITH correctAnswer */
  getQuiz: (id: string) => request<Quiz>(`/api/quizzes/${id}`),

  /** Admin: create a new quiz */
  createQuiz: (data: {
    title:        string
    description?: string
    classId:      string
    questions:    Omit<Question, '_id'>[]
  }) => request<Quiz>('/api/quizzes', { method: 'POST', body: JSON.stringify(data) }),

  /** Admin: update a quiz */
  updateQuiz: (id: string, data: Partial<{ title: string; description: string; questions: Omit<Question, '_id'>[] }>) =>
    request<Quiz>(`/api/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  /** Admin: delete (soft) a quiz */
  deleteQuiz: (id: string) =>
    request<{ success: boolean }>(`/api/quizzes/${id}`, { method: 'DELETE' }),

  /** Admin: toggle active status of a quiz */
  toggleQuiz: (id: string) =>
    request<Quiz>(`/api/quizzes/${id}/toggle`, { method: 'PATCH' }),

  /**
   * Admin: upload a quiz paper (PDF/Image) and get AI-extracted questions.
   * Returns a JSON array of questions for human review BEFORE saving.
   */
  extractQuizFromFile: async (file: File): Promise<Omit<Question, '_id'>[]> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const formData = new FormData()
    formData.append('quizFile', file)
    const res = await fetch(`${API_BASE}/api/quizzes/extract`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    formData,
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error((json as any)?.message || json?.error?.message || 'فشل استخراج الأسئلة')
    return json.data as Omit<Question, '_id'>[]
  },

  /** Student: open a persistent server-side assessment attempt. */
  startQuizAttempt: (id: string) =>
    request<{ id: string; attemptNumber: number; startedAt: string; timeLimitMinutes?: number }>(`/api/quizzes/${id}/attempts`, { method: 'POST' }),

  /** Student: submit answers for the current persistent attempt. */
  submitQuizAttempt: (id: string, attemptId: string, answers: Record<string, string>) =>
    request<QuizSubmitResult>(`/api/quizzes/${id}/attempts/${attemptId}/submit`, {
      method: 'POST',
      body:   JSON.stringify({ answers }),
    }),
}
