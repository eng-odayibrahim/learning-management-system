'use client'
import { ArrowLeftIcon, RefreshIcon, SadCircleIcon, StarIcon } from '@solar-icons/react/outline';


import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { QuizForStudent } from '@/lib/types'
import QuizRenderer from '@/components/QuizRenderer'


/**
 * Student-facing quiz page.
 * Lives under /courses/[id]/quiz/[quizId] — matches the existing [id] course route.
 * Fetches quiz WITHOUT correctAnswer (server applies projection).
 */
export default function QuizPage() {
  const params  = useParams()
  const router  = useRouter()
  const quizId  = params.quizId as string

  const [quiz,    setQuiz]    = useState<QuizForStudent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!quizId) return
    api.getQuizForStudent(quizId)
      .then(setQuiz)
      .catch((err) => setError(err.message || 'حدث خطأ في تحميل الاختبار'))
      .finally(() => setLoading(false))
  }, [quizId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-zinc-400">
        <RefreshIcon className="h-10 w-10 animate-spin" />
        <span className="text-sm font-semibold">جاري تحميل الاختبار...</span>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-zinc-400 px-4" dir="rtl">
        <SadCircleIcon className="h-16 w-16 opacity-30"  />
        <p className="text-lg font-bold text-zinc-600">{error || 'الاختبار غير موجود'}</p>
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-700 transition-colors">
          <ArrowLeftIcon className="h-4 w-4" /> العودة
        </button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Top nav bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-zinc-200 px-4 py-3 flex items-center gap-4" dir="rtl">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 font-semibold transition-colors">
          <ArrowLeftIcon className="h-4 w-4" /> العودة
        </button>
        <div className="h-4 w-px bg-zinc-200" />
        <span className="text-sm font-bold text-zinc-900 truncate">{quiz.title}</span>
      </div>
      <QuizRenderer quiz={quiz} />
    </main>
  )
}
