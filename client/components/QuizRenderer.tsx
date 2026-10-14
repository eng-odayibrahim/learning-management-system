'use client'
import { CheckCircleIcon, CloseCircleIcon, LightbulbIcon, RefreshIcon } from '@solar-icons/react/outline';


import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { QuizForStudent, QuestionForStudent, GradedQuestion, QuizSubmitResult } from '@/lib/types'
import { toast } from 'sonner'


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const SCORE_COLOR = (pct: number) =>
  pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'

const SCORE_BG = (pct: number) =>
  pct >= 80 ? 'bg-emerald-50 border-emerald-200' : pct >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

// ─────────────────────────────────────────────────────────────────────────────
// ScoreBoard — shown after submission
// ─────────────────────────────────────────────────────────────────────────────
function ScoreBoard({ result }: { result: QuizSubmitResult }) {
  return (
    <div className={`rounded-2xl border-2 p-6 mb-8 text-center ${SCORE_BG(result.percentage)}`}>
      <div className={`text-5xl font-black mb-1 ${SCORE_COLOR(result.percentage)}`}>
        {result.percentage}%
      </div>
      <p className="text-base font-semibold text-zinc-700">
        أجبت على {result.score} من {result.total} سؤال بشكل صحيح
      </p>
      <p className="mt-4 text-sm text-zinc-600">تم حفظ المحاولة.</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionInput — renders the appropriate input for each question type
// ─────────────────────────────────────────────────────────────────────────────
function QuestionInput({
  question, answer, onChange, disabled, grading,
}: {
  question: QuestionForStudent
  answer:   string
  onChange: (val: string) => void
  disabled: boolean
  grading?: GradedQuestion
}) {
  const isCorrect   = grading?.isCorrect
  const isWrong     = grading && !grading.isCorrect
  const borderClass = grading
    ? (isCorrect ? 'border-emerald-400 bg-emerald-50/30' : 'border-red-400 bg-red-50/30')
    : 'border-zinc-200'

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all duration-300 ${borderClass}`}>
      {/* Question text */}
      <p className="text-base font-bold text-zinc-900 mb-4 leading-relaxed" dir="auto">
        {question.questionText}
      </p>

      {/* ── TRUE/FALSE ─────────────────────────────────────────── */}
      {question.type === 'true_false' && (
        <div className="flex gap-3">
          {[
            { label: '✓ صح',   value: 'true'  },
            { label: '✗ خطأ',  value: 'false' },
          ].map(({ label, value }) => (
            <label
              key={value}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer text-sm font-bold transition-all select-none ${
                answer === value
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
              } ${disabled ? 'cursor-default' : ''}`}
            >
              <input
                type="radio" className="hidden"
                name={question._id} value={value}
                checked={answer === value}
                onChange={() => !disabled && onChange(value)}
              />
              {label}
            </label>
          ))}
        </div>
      )}

      {/* ── MULTIPLE CHOICE ───────────────────────────────────── */}
      {question.type === 'multiple_choice' && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer text-sm font-semibold transition-all select-none ${
                answer === opt
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50'
              } ${disabled ? 'cursor-default' : ''}`}
            >
              <input
                type="radio" className="hidden"
                name={question._id} value={opt}
                checked={answer === opt}
                onChange={() => !disabled && onChange(opt)}
              />
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black ${
                answer === opt ? 'border-white text-white' : 'border-zinc-400 text-zinc-500'
              }`}>
                {String.fromCharCode(65 + i)}
              </span>
              <span dir="auto">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {/* ── FILL IN THE BLANK ─────────────────────────────────── */}
      {question.type === 'fill_blank' && (
        <input
          type="text"
          className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50 transition-colors"
          placeholder="اكتب إجابتك هنا..."
          value={answer}
          onChange={(e) => !disabled && onChange(e.target.value)}
          disabled={disabled}
          dir="auto"
        />
      )}

      {/* ── DEFINE / ESSAY ────────────────────────────────────── */}
      {question.type === 'define' && (
        <textarea
          rows={4}
          className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50 resize-none transition-colors"
          placeholder="اكتب تعريفك أو إجابتك التفصيلية هنا..."
          value={answer}
          onChange={(e) => !disabled && onChange(e.target.value)}
          disabled={disabled}
          dir="auto"
        />
      )}

      {/* ── Grading Feedback ─────────────────────────────────── */}
      {grading && (
        <div className="mt-4">
          {isCorrect ? (
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <CheckCircleIcon className="h-5 w-5"  />
              إجابة صحيحة!
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <CloseCircleIcon className="h-5 w-5"  />
                إجابة خاطئة
              </div>
              {grading.correctAnswer && (
                <div className="rounded-xl bg-white border border-emerald-200 px-4 py-2.5 text-sm" dir="auto">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-0.5">
                    الإجابة الصحيحة
                  </span>
                  <span className="font-bold text-zinc-900">{grading.correctAnswer}</span>
                </div>
              )}
              {grading.explanation && (
                <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm" dir="auto">
                  <LightbulbIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5"  />
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-widest block mb-0.5">الشرح</span>
                    <span className="text-zinc-700">{grading.explanation}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// QuizRenderer — main exported component
// ─────────────────────────────────────────────────────────────────────────────
interface QuizRendererProps {
  quiz: QuizForStudent
}

export default function QuizRenderer({ quiz }: QuizRendererProps) {
  // answers: keyed by question _id
  const [answers,   setAnswers]   = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result,    setResult]    = useState<QuizSubmitResult | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [attemptError, setAttemptError] = useState<string | null>(null)
  const [shuffledQuestions, setShuffledQuestions] = useState<QuestionForStudent[]>(() => {
    return [...quiz.questions].sort(() => Math.random() - 0.5)
  })

  useEffect(() => {
    let active = true
    api.startQuizAttempt(quiz.id || quiz._id!).then((attempt) => {
      if (active) setAttemptId(attempt.id)
    }).catch((error: Error) => {
      if (active) setAttemptError(error.message)
    })
    return () => { active = false }
  }, [quiz.id, quiz._id])

  // grading lookup map: questionId → GradedQuestion
  const gradingMap: Record<string, GradedQuestion> = {}
  result?.gradedQuestions.forEach((g) => { gradingMap[g.questionId] = g })

  const setAnswer = (qId: string, val: string) =>
    setAnswers((prev) => ({ ...prev, [qId]: val }))

  const handleSubmit = async () => {
    // Validate: all questions answered
    const unanswered = shuffledQuestions.filter(
      (q) => !answers[q._id]?.trim()
    )
    if (unanswered.length > 0) {
      toast.warning(`يرجى الإجابة على جميع الأسئلة (${unanswered.length} سؤال غير مُجاب)`)
      return
    }

    setSubmitting(true)
    try {
      if (!attemptId) throw new Error(attemptError || 'تعذر بدء محاولة الاختبار')
      const res = await api.submitQuizAttempt(quiz.id || quiz._id!, attemptId, answers)
      setResult(res)
      // Scroll to top to see score
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isSubmitted = !!result

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4" dir="rtl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-zinc-900">{quiz.title}</h1>
        {quiz.description && (
          <p className="text-sm text-zinc-500">{quiz.description}</p>
        )}
        <p className="text-xs text-zinc-400">
          {shuffledQuestions.length} سؤال
        </p>
      </div>

      {/* Score board (after submission) */}
      {result && <ScoreBoard result={result} />}

      {/* Questions */}
      <div className="space-y-5">
        {shuffledQuestions.map((q, i) => (
          <div key={q._id}>
            {/* Question number label */}
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
              السؤال {i + 1}
            </p>
            <QuestionInput
              question={q}
              answer={answers[q._id] ?? ''}
              onChange={(val) => setAnswer(q._id, val)}
              disabled={isSubmitted}
              grading={gradingMap[q._id]}
            />
          </div>
        ))}
      </div>

      {/* Submit button — hidden after submission */}
      {!isSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={submitting || !attemptId}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-zinc-900 text-white font-black text-base hover:bg-zinc-700 disabled:opacity-60 transition-colors shadow-lg"
        >
          {submitting
            ? <><RefreshIcon className="h-5 w-5 animate-spin" /> جاري التصحيح...</>
            : !attemptId ? (attemptError || 'جاري بدء المحاولة...') : 'تسليم الاختبار'}
        </button>
      )}
    </div>
  )
}
