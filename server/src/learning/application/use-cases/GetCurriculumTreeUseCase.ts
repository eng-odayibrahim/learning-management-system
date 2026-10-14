import { ICourseRepository }  from '../../domain/repositories/ICourseRepository'
import { ISubjectRepository } from '../../domain/repositories/ISubjectRepository'
import { IClassRepository }   from '../../domain/repositories/IClassRepository'
import { ILessonRepository }  from '../../domain/repositories/ILessonRepository'
import { ICourseworkRepository } from '../../domain/repositories/ICourseworkRepository'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError }  from '@shared/errors/AppError'

// Returns the full nested tree for a course:
//   Course → [Subject → [Class → [Lesson]]]
// Students see only published content; admins see everything.
export class GetCurriculumTreeUseCase {
  constructor(
    private readonly courseRepo:  ICourseRepository,
    private readonly subjectRepo: ISubjectRepository,
    private readonly classRepo:   IClassRepository,
    private readonly lessonRepo:  ILessonRepository,
    private readonly courseworkRepo: ICourseworkRepository,
    private readonly quizRepo: any,
  ) {}

  async execute(courseId: string, isAdmin = false) {
    const course = await this.courseRepo.findById(new UniqueEntityId(courseId))
    if (!course) throw new NotFoundError('المقرر')

    const subjects = await this.subjectRepo.findByCourse(course.id)
    subjects.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    // Determine the first published lesson across the entire course for free preview
    let firstLessonId: string | null = null
    for (const sub of subjects) {
      const clsList = await this.classRepo.findBySubject(sub.id)
      clsList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      for (const cls of clsList) {
        const lList = await this.lessonRepo.findByClass(cls.id, true)
        if (lList.length > 0) {
          firstLessonId = lList[0].id.toString()
          break
        }
      }
      if (firstLessonId) break
    }

    const tree = await Promise.all(
      subjects.map(async (subject) => {
        const classes = await this.classRepo.findBySubject(subject.id)
        classes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

        const classesWithLessons = await Promise.all(
          classes.map(async (cls) => {
            const lessons = await this.lessonRepo.findByClass(cls.id, !isAdmin)
            const quizzes = await this.quizRepo.findByClassId(cls.id.toString())
            const visibleLessons = isAdmin ? lessons : lessons.filter((lesson) => lesson.isActive && lesson.isPublished)

            return {
              classItem: {
                id:        cls.id.toString(),
                title:     cls.title,
                subjectId: subject.id.toString(),
                order:     cls.order,
              },
              lessons:  visibleLessons.map(l => ({
                id:            l.id.toString(),
                title:         l.title,
                classId:       cls.id.toString(),
                order:         l.order.value,
                type:          l.type,
                videoStatus:   l.videoStatus.value,
                videoDuration: l.videoDuration,
                // Private media is only available through the authorized playback endpoint.
                coverImage:    l.coverImage,
                isFree:        l.isFree || (l.id.toString() === firstLessonId),
                isPublished:   l.isPublished,
                isActive:      l.isActive,
              })),
              // Quiz content and coursework are not public previews; P2 can
              // expose them through the centralized entitlement policy.
              quizzes: (isAdmin ? quizzes : []).map((q: any) => ({
                id: q.id.toString(),
                title: q.title,
                description: q.description,
                classId: q.classId.toString(),
                isActive: q.isActive,
                // Do not send correct answers to students in the tree
                questions: q.questions.map((qn: any) => ({
                  _id: qn._id ? qn._id.toString() : undefined,
                  questionText: qn.questionText,
                  type: qn.type,
                  options: qn.options,
                  explanation: isAdmin ? qn.explanation : undefined,
                  correctAnswer: isAdmin ? qn.correctAnswer : undefined,
                })),
              })),
            }
          })
        )

        const courseworks = await this.courseworkRepo.findBySubjectId(subject.id)

        return {
          subject: {
            id:          subject.id.toString(),
            title:       subject.title,
            slug:        subject.slug.value,
            description: subject.description,
            courseId:    course.id.toString(),
            thumbnail:   subject.thumbnail,
            order:       subject.order,
            isActive:    subject.isActive,
          },
          classes: classesWithLessons,
          courseworks: (isAdmin ? courseworks : []).map(cw => ({
            id: cw.id.toString(),
            title: cw.title,
            description: cw.description,
            subjectId: cw.subjectId.toString(),
            materialKeys: cw.materialKeys,
            isActive: cw.isActive,
            createdAt: cw.createdAt,
            updatedAt: cw.updatedAt,
          })),
        }
      })
    )

    return {
      id:               course.id.toString(),
      title:            course.title,
      slug:             course.slug.value,
      description:      course.description,
      stageId:          course.stageId ?? null,
      gradeId:          course.gradeId ?? null,
      trackId:          course.trackId ?? null,
      specializationId: course.specializationId ?? null,
      thumbnail:        course.thumbnail,
      isPublished:      course.isPublished,
      isActive:         course.isActive,
      subjects:         tree,
    }
  }
}
