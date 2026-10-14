'use client'
import React, { useEffect, useState, useRef } from 'react'
import { AddCircleIcon, ArrowLeftIcon, ArrowRightIcon, CloseCircleIcon, DangerCircleIcon, DisketteIcon, MagicWand2Icon, RefreshIcon, TrashBinTrashIcon, UploadSquareIcon } from '@solar-icons/react/outline';
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Quiz, Question, QuestionType, Class, Course, AcademicStage, Grade } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type DraftQuestion = Omit<Question, '_id'> & { _id?: string }

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  true_false:      'صح / خطأ',
  multiple_choice: 'اختيار متعدد',
  fill_blank:      'أكمل الفراغ',
  define:          'تعريف / مقالي',
}
const QUESTION_TYPE_COLOR: Record<QuestionType, string> = {
  true_false:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  multiple_choice: 'bg-blue-50 text-blue-700 border-blue-200',
  fill_blank:      'bg-amber-50 text-amber-700 border-amber-200',
  define:          'bg-purple-50 text-purple-700 border-purple-200',
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionEditor
// ─────────────────────────────────────────────────────────────────────────────
function QuestionEditor({ question, index, onChange, onRemove }: {
  question: DraftQuestion; index: number
  onChange: (u: DraftQuestion) => void; onRemove: () => void
}) {
  const set = (patch: Partial<DraftQuestion>) => onChange({ ...question, ...patch })
  return (
    <div className="group relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">{index + 1}</span>
        <select
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          value={question.type}
          onChange={(e) => set({ type: e.target.value as QuestionType, options: [], correctAnswer: '' })}
        >
          {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
            <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <span className={`ml-auto px-2 py-0.5 rounded-full border text-xs font-bold ${QUESTION_TYPE_COLOR[question.type]}`}>
          {QUESTION_TYPE_LABELS[question.type]}
        </span>
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all" title="حذف السؤال">
          <TrashBinTrashIcon className="h-4 w-4" />
        </button>
      </div>
      <textarea rows={2} dir="auto"
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none mb-3"
        placeholder="نص السؤال..." value={question.questionText}
        onChange={(e) => set({ questionText: e.target.value })}
      />
      {question.type === 'true_false' && (
        <div className="flex gap-3 mb-3">
          {[{ label: '✓ صح', value: 'true' }, { label: '✗ خطأ', value: 'false' }].map(({ label, value }) => (
            <label key={value} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 cursor-pointer text-sm font-bold transition-all select-none ${question.correctAnswer === value ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
              <input type="radio" className="hidden" name={`tf-${index}`} value={value} checked={question.correctAnswer === value} onChange={() => set({ correctAnswer: value })} />
              {label}
            </label>
          ))}
        </div>
      )}
      {question.type === 'multiple_choice' && (
        <div className="space-y-2 mb-3">
          {(question.options ?? []).map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input type="radio" name={`mc-${index}`} value={opt} checked={question.correctAnswer === opt} onChange={() => set({ correctAnswer: opt })} className="accent-zinc-900" />
              <input className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={opt} dir="auto"
                onChange={(e) => { const opts = [...(question.options ?? [])]; opts[oi] = e.target.value; set({ options: opts }) }}
                placeholder={`الخيار ${oi + 1}`} />
              <button onClick={() => { const opts = (question.options ?? []).filter((_, i) => i !== oi); set({ options: opts, correctAnswer: question.correctAnswer === opt ? '' : question.correctAnswer }) }} className="text-red-400 hover:text-red-600"><CloseCircleIcon className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button onClick={() => set({ options: [...(question.options ?? []), ''] })} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 mt-1">
            <AddCircleIcon className="h-3 w-3" /> إضافة خيار
          </button>
        </div>
      )}
      {(question.type === 'fill_blank' || question.type === 'define') && (
        <input dir="auto" className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 mb-3"
          placeholder="الإجابة الصحيحة..." value={question.correctAnswer} onChange={(e) => set({ correctAnswer: e.target.value })} />
      )}
      <input dir="auto" className="w-full rounded-xl border border-zinc-100 bg-zinc-50/30 p-2.5 text-xs text-zinc-600 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        placeholder="شرح الإجابة (يظهر للطالب عند الإجابة الخاطئة)..." value={question.explanation ?? ''} onChange={(e) => set({ explanation: e.target.value })} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal Component
// ─────────────────────────────────────────────────────────────────────────────
interface CreateQuizModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  quiz?: Quiz | null
  stages: AcademicStage[]
  grades: Grade[]
  courses: Course[]
  courseClassMap: Record<string, { classItem: Class; subjectTitle?: string }[]>
}

export function CreateQuizModal({
  open,
  onOpenChange,
  onSuccess,
  quiz,
  stages,
  grades,
  courses,
  courseClassMap,
}: CreateQuizModalProps) {
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState(quiz?.title ?? '')
  const [description, setDescription] = useState(quiz?.description ?? '')

  // Hierarchy States: Stage -> Grade -> Course -> Class (Unit)
  const [stageId, setStageId] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [classId, setClassId] = useState(quiz?.classId ?? '')

  const [questions, setQuestions] = useState<DraftQuestion[]>(quiz?.questions ?? [])
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [aiStatus, setAiStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const fileRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep(1)
      setTitle(quiz?.title ?? '')
      setDescription(quiz?.description ?? '')
      setClassId(quiz?.classId ?? '')
      setQuestions(quiz?.questions ?? [])
      setExtractError('')

      if (quiz?.classId) {
        // Reverse lookup course from classId
        const cId = Object.keys(courseClassMap).find((c) =>
          courseClassMap[c]?.some((item) => item.classItem.id === quiz.classId)
        ) || ''
        setCourseId(cId)

        const matchedCourse = courses.find((c) => c.id === cId)
        if (matchedCourse) {
          setStageId(matchedCourse.stageId || '')
          setGradeId(matchedCourse.gradeId || '')
        }
      } else {
        setStageId('')
        setGradeId('')
        setCourseId('')
        setClassId('')
      }

      // Test AI connectivity on mount
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/quizzes/test-ai`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => r.json())
        .then((d) => setAiStatus(d?.success ? 'ok' : 'error'))
        .catch(() => setAiStatus('error'))
    }
  }, [open, quiz, courseClassMap, courses])

  // Cascading options
  const availableGrades = stageId
    ? grades.filter((g) => g.stageId === stageId)
    : []

  const availableCourses =
    stageId && gradeId
      ? courses.filter((c) => c.stageId === stageId && c.gradeId === gradeId)
      : []

  const availableClasses = courseId ? courseClassMap[courseId] ?? [] : []

  const handleNextStep = () => {
    if (!title.trim()) {
      toast.error('عنوان الاختبار مطلوب')
      return
    }
    if (!classId) {
      toast.error('يرجى تحديد المرحلة والصف والمقرر ثم اختيار الوحدة الدراسية')
      return
    }
    setStep(2)
  }

  const handleExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setExtracting(true)
    setExtractError('')

    try {
      const allExtracted: DraftQuestion[] = []

      // Extract from all files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const extracted = await api.extractQuizFromFile(file)
          allExtracted.push(...extracted)
        } catch (err: any) {
          toast.error(`خطأ في استخراج ملف ${file.name}: ${err.message}`)
        }
      }

      if (allExtracted.length > 0) {
        setQuestions((prev) => [...prev, ...allExtracted])
        toast.success(`✅ تم استخراج ${allExtracted.length} سؤال بنجاح`)
      } else {
        setExtractError('لم يتم العثور على أسئلة صالحة في الملفات المرفوعة.')
      }
    } catch (err: any) {
      const msg = err.message || 'فشل الاستخراج'
      setExtractError(msg)
      toast.error(msg, { duration: 8000 })
    } finally {
      setExtracting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('عنوان الاختبار مطلوب')
      return
    }
    if (!classId) {
      toast.error('اختر الوحدة الدراسية')
      return
    }
    if (!questions.length) {
      toast.error('أضف سؤالاً على الأقل')
      return
    }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].questionText.trim()) {
        toast.error(`السؤال ${i + 1}: النص مطلوب`)
        return
      }
      if (!questions[i].correctAnswer.trim()) {
        toast.error(`السؤال ${i + 1}: الإجابة مطلوبة`)
        return
      }
    }

    setSaving(true)
    try {
      if (quiz) {
        await api.updateQuiz(quiz._id ?? quiz.id, { title, description, questions })
      } else {
        await api.createQuiz({ title, description, classId, questions })
      }
      toast.success(quiz ? 'تم تحديث الاختبار' : 'تم حفظ الاختبار')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          step === 2 ? 'max-w-5xl' : 'max-w-lg'
        } bg-card border border-border shadow-xl rounded-[2rem] transition-all duration-300 overflow-hidden flex flex-col max-h-[90vh]`}>
        <DialogHeader className="px-2 shrink-0 text-right">
          <DialogTitle className="text-xl font-black text-foreground">
            {quiz ? 'تعديل الاختبار' : 'إنشاء اختبار جديد'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === 1
              ? 'الخطوة 1: تحديد التصنيف الأكاديمي والمعلومات الأساسية للاختبار'
              : 'الخطوة 2: رفع الملفات ومراجعة الأسئلة'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {step === 1 && (
            <div className="space-y-4 pt-2 text-right">
              {/* Quiz Title */}
              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">عنوان الاختبار *</Label>
                <Input
                  placeholder="مثال: اختبار الوحدة الأولى - النهايات والاتصال"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-right font-bold h-11 rounded-xl"
                  dir="auto"
                />
              </div>

              {/* Strict Academic Hierarchy: Stage -> Grade -> Course -> Class */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3.5">
                <span className="text-xs font-extrabold text-foreground block border-b border-border/40 pb-2">
                  التصنيف الأكاديمي لموضع الاختبار:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Step 1: Stage */}
                  <div className="space-y-1.5 text-right">
                    <Label className="font-bold text-xs text-foreground">1. المرحلة التعليمية *</Label>
                    <Select
                      dir="rtl"
                      value={stageId || undefined}
                      onValueChange={(val) => {
                        setStageId(val)
                        setGradeId('')
                        setCourseId('')
                        setClassId('')
                      }}
                      disabled={!!quiz}
                    >
                      <SelectTrigger className="w-full h-10 text-xs font-semibold rounded-xl" dir="rtl">
                        <SelectValue placeholder="-- اختر المرحلة --" />
                      </SelectTrigger>
                      <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 2: Grade */}
                  <div className="space-y-1.5 text-right">
                    <Label className="font-bold text-xs text-foreground">2. الصف الدراسي *</Label>
                    <Select
                      dir="rtl"
                      value={gradeId || undefined}
                      onValueChange={(val) => {
                        setGradeId(val)
                        setCourseId('')
                        setClassId('')
                      }}
                      disabled={!!quiz || !stageId}
                    >
                      <SelectTrigger className="w-full h-10 text-xs font-semibold rounded-xl" dir="rtl">
                        <SelectValue
                          placeholder={
                            !stageId
                              ? '← اختر المرحلة أولاً'
                              : availableGrades.length === 0
                              ? 'لا توجد صفوف مضافة'
                              : '-- اختر الصف --'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                        {availableGrades.map((g) => {
                          const stage = stages.find((s) => s.id === g.stageId)
                          return (
                            <SelectItem key={g.id} value={g.id}>
                              الصف {g.name} {stage ? `(${stage.name})` : ''}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Step 3: Course */}
                  <div className="space-y-1.5 text-right">
                    <Label className="font-bold text-xs text-foreground">3. المقرر الدراسي *</Label>
                    <Select
                      dir="rtl"
                      value={courseId || undefined}
                      onValueChange={(val) => {
                        setCourseId(val)
                        setClassId('')
                      }}
                      disabled={!!quiz || !gradeId}
                    >
                      <SelectTrigger className="w-full h-10 text-xs font-semibold rounded-xl" dir="rtl">
                        <SelectValue
                          placeholder={
                            !gradeId
                              ? '← اختر الصف أولاً'
                              : availableCourses.length === 0
                              ? 'لا توجد مقررات في هذا الصف'
                              : '-- اختر المقرر --'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                        {availableCourses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 4: Unit / Class */}
                  <div className="space-y-1.5 text-right">
                    <Label className="font-bold text-xs text-foreground">4. الوحدة / الدرس الدراسي *</Label>
                    <Select
                      dir="rtl"
                      value={classId || undefined}
                      onValueChange={setClassId}
                      disabled={!!quiz || !courseId}
                    >
                      <SelectTrigger className="w-full h-10 text-xs font-semibold rounded-xl" dir="rtl">
                        <SelectValue
                          placeholder={
                            !courseId
                              ? '← اختر المقرر أولاً'
                              : availableClasses.length === 0
                              ? 'لا توجد وحدات في هذا المقرر'
                              : '-- اختر الوحدة --'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent dir="rtl" position="popper" side="bottom" className="w-full max-h-60">
                        {availableClasses.map((item) => (
                          <SelectItem key={item.classItem.id} value={item.classItem.id}>
                            {item.subjectTitle ? `${item.subjectTitle} - ` : ''}
                            {item.classItem.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">الوصف أو التعليمات (اختياري)</Label>
                <Textarea
                  placeholder="تعليمات أو تفاصيل عن الاختبار للطلاب..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-right text-xs min-h-[90px] rounded-xl resize-none"
                  dir="auto"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pt-4 flex flex-col lg:flex-row gap-6 h-full text-right" dir="rtl">
              {/* Left sidebar for AI upload */}
              <div className="w-full lg:w-72 shrink-0 space-y-4">
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 dark:bg-zinc-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MagicWand2Icon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-bold text-foreground">استخراج بالذكاء الاصطناعي</span>
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        aiStatus === 'ok'
                          ? 'bg-emerald-500'
                          : aiStatus === 'error'
                          ? 'bg-red-500'
                          : 'bg-zinc-300 animate-pulse'
                      }`}
                      title={aiStatus === 'ok' ? 'Gemini متصل' : 'حالة الاتصال'}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ارفع صورة أو PDF لورقة الاختبار وسيستخرج النظام الأسئلة تلقائياً.
                    <br />
                    <span className="font-bold text-foreground mt-1 block">
                      ملاحظة: يمكنك تحديد ملفات متعددة معاً.
                    </span>
                  </p>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    className="hidden"
                    onChange={handleExtract}
                  />

                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={extracting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {extracting ? (
                      <>
                        <RefreshIcon className="h-4 w-4 animate-spin" /> جاري التحليل بالذكاء...
                      </>
                    ) : (
                      <>
                        <UploadSquareIcon className="h-4 w-4" /> رفع ورقة الاختبار
                      </>
                    )}
                  </button>

                  {extractError && (
                    <div className="flex items-start gap-1.5 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-200">
                      <DangerCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{extractError}</span>
                    </div>
                  )}
                </div>

                {/* Add question manually */}
                <button
                  onClick={() =>
                    setQuestions((prev) => [
                      ...prev,
                      { questionText: '', type: 'multiple_choice', options: ['', '', '', ''], correctAnswer: '' },
                    ])
                  }
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-foreground hover:bg-muted/50 transition-colors"
                >
                  <AddCircleIcon className="h-4 w-4" /> إضافة سؤال يدوياً
                </button>

                <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between font-bold text-foreground">
                    <span>إجمالي الأسئلة:</span>
                    <span>{questions.length}</span>
                  </div>
                </div>
              </div>

              {/* Questions list */}
              <div className="flex-1 space-y-4 max-h-[60vh] overflow-y-auto pl-1">
                {questions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-16 text-center text-muted-foreground border border-dashed rounded-2xl bg-muted/20">
                    <p className="font-bold text-sm">لا توجد أسئلة بعد</p>
                    <p className="text-xs mt-1">ارفع ملفاً بالذكاء الاصطناعي أو أضف أسئلة يدوياً</p>
                  </div>
                ) : (
                  questions.map((q, idx) => (
                    <QuestionEditor
                      key={q._id ?? idx}
                      question={q}
                      index={idx}
                      onChange={(updated) => {
                        const copy = [...questions]
                        copy[idx] = updated
                        setQuestions(copy)
                      }}
                      onRemove={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-border/40 flex items-center justify-between shrink-0">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full text-xs font-semibold">
                إلغاء
              </Button>
              <Button onClick={handleNextStep} className="rounded-full text-xs font-semibold gap-1.5 px-6 bg-foreground text-background hover:opacity-90">
                <span>التالي: الأسئلة</span>
                <ArrowLeftIcon className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-full text-xs font-semibold gap-1.5">
                <ArrowRightIcon className="h-3.5 w-3.5" />
                <span>السابق: المعلومات</span>
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-full text-xs font-semibold gap-1.5 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? <RefreshIcon className="h-3.5 w-3.5 animate-spin" /> : <DisketteIcon className="h-3.5 w-3.5" />}
                <span>{quiz ? 'حفظ التعديلات' : 'إنهاء وحفظ الاختبار'}</span>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
