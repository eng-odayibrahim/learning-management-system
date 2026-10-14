/**
 * Determines whether the given academic stage and grade correspond to the 3rd grade of secondary school
 * (الصف الثالث الثانوي).
 * Track and specialization are mandatory ONLY for students at this level.
 */
export function isSecondaryThirdGrade(stageName?: string, gradeName?: string | number): boolean {
  if (!stageName || gradeName === undefined || gradeName === null) return false

  const normStage = String(stageName)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()

  const isSecondary =
    normStage.includes('ثانوي') ||
    normStage.includes('secondary') ||
    normStage.includes('high')

  const normGrade = String(gradeName)
    .toLowerCase()
    .replace(/^(الصف|صف)\s+/gi, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()

  const isThird =
    normGrade === '3' ||
    normGrade === '٣' ||
    normGrade === '12' ||
    normGrade.includes('ثالث') ||
    normGrade.includes('ثاني عشر') ||
    normGrade === 'grade 3' ||
    normGrade === 'grade 12'

  return isSecondary && isThird
}
