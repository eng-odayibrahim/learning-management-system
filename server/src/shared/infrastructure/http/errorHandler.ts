import { Request, Response, NextFunction } from 'express'
import { AppError } from '@shared/errors/AppError'
import { ZodError } from 'zod'
import { MulterError } from 'multer'

interface ErrorBody {
  success: false
  code: string
  message: string
  error?: {
    code: string
    message: string
  }
  errors?: unknown
}

function send(res: Response, status: number, body: ErrorBody): void {
  res.status(status).json({
    ...body,
    error: {
      code: body.code,
      message: body.message,
    },
  })
}

const MULTER_CODES: Record<string, { status: number; code: string; message: string }> = {
  LIMIT_FILE_SIZE: { status: 413, code: 'UPLOAD_TOO_LARGE', message: 'The uploaded file is too large' },
  LIMIT_FILE_COUNT: { status: 422, code: 'UPLOAD_TOO_MANY_FILES', message: 'Too many files were uploaded' },
  LIMIT_FIELD_COUNT: { status: 422, code: 'UPLOAD_INVALID', message: 'Too many form fields' },
  LIMIT_FIELD_KEY: { status: 422, code: 'UPLOAD_INVALID', message: 'Invalid form field' },
  LIMIT_FIELD_VALUE: { status: 422, code: 'UPLOAD_INVALID', message: 'Form field value is too large' },
  LIMIT_PART_COUNT: { status: 422, code: 'UPLOAD_INVALID', message: 'Too many parts in the request' },
  LIMIT_UNEXPECTED_FILE: { status: 422, code: 'UPLOAD_INVALID', message: 'Unexpected file field' },
}

/** Consistent error contract. Never leaks stacks, DB errors, paths or secrets. */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return

  if (err instanceof ZodError) {
    send(res, 422, {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation error',
      errors: err.flatten().fieldErrors,
    })
    return
  }

  if (err instanceof MulterError) {
    console.warn(`[MulterError] ${err.code}: ${err.message}`)
    const mapped = MULTER_CODES[err.code] ?? { status: 400, code: 'UPLOAD_INVALID', message: 'Invalid upload' }
    send(res, mapped.status, { success: false, code: mapped.code, message: mapped.message })
    return
  }

  const anyErr = err as unknown as { code?: number; type?: string; message?: string }

  if (anyErr.code === 11000) {
    send(res, 409, {
      success: false,
      code: 'DUPLICATE_RESOURCE',
      message: 'A record with the same unique value already exists',
    })
    return
  }

  // body-parser errors (malformed JSON / oversize payload)
  if (anyErr.type === 'entity.parse.failed') {
    send(res, 400, { success: false, code: 'INVALID_JSON', message: 'Malformed request body' })
    return
  }
  if (anyErr.type === 'entity.too.large') {
    send(res, 413, { success: false, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' })
    return
  }

  // Malformed multipart bodies surface from busboy as plain errors
  if (typeof anyErr.message === 'string' && /multipart|boundary|unexpected end of form/i.test(anyErr.message)) {
    send(res, 400, { success: false, code: 'MALFORMED_MULTIPART', message: 'Malformed multipart request' })
    return
  }

  if (err instanceof AppError) {
    send(res, err.statusCode, { success: false, code: err.code, message: err.message })
    return
  }

  // Internal diagnostics are logged server-side only (no request bodies/headers).
  console.error('Unhandled error:', { method: req.method, path: req.path, name: err.name, message: err.message })
  send(res, 500, { success: false, code: 'INTERNAL_ERROR', message: 'Internal server error' })
}
