import fs from 'fs'
import path from 'path'

export type UploadKind = 'video' | 'image' | 'document'

interface KindRule {
  extensions: string[]
  mimes: string[]
  maxBytes: number
}

export const UPLOAD_RULES: Record<UploadKind, KindRule> = {
  video: { extensions: ['.mp4'], mimes: ['video/mp4'], maxBytes: 2 * 1024 * 1024 * 1024 },
  image: {
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxBytes: 10 * 1024 * 1024,
  },
  document: {
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.gif'],
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    ],
    maxBytes: 50 * 1024 * 1024,
  },
}

/** Multer-level checks that run before any bytes hit the disk (extension + declared MIME). */
export function isDeclaredTypeAllowed(kind: UploadKind, originalName: string, mimetype: string): boolean {
  const rule = UPLOAD_RULES[kind]
  const ext = path.extname(originalName).toLowerCase()
  return rule.extensions.includes(ext) && rule.mimes.includes(mimetype)
}

const OLE_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false
  return bytes.every((b, i) => buf[offset + i] === b)
}

/** Detect the real content type from magic bytes. Returns the ext family or null. */
export function sniffSignature(buf: Buffer): 'mp4' | 'jpeg' | 'png' | 'webp' | 'gif' | 'pdf' | 'zip' | 'ole' | 'text' | null {
  if (startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) return 'mp4' // "ftyp"
  if (startsWith(buf, [0xff, 0xd8])) return 'jpeg'
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp'
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return 'gif'
  // PDF (%PDF can be at offset 0 or within first 1024 bytes)
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46])) return 'pdf'
  const headLimit = Math.min(buf.length - 4, 1024)
  for (let i = 0; i <= headLimit; i++) {
    if (buf[i] === 0x25 && buf[i + 1] === 0x50 && buf[i + 2] === 0x44 && buf[i + 3] === 0x46) {
      return 'pdf'
    }
  }
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) return 'zip'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(OLE_HEADER)) return 'ole'
  // Plain text: no NUL bytes and mostly printable.
  if (buf.length > 0 && !buf.includes(0x00)) {
    let printable = 0
    for (const b of buf) if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128) printable++
    if (printable / buf.length > 0.95) return 'text'
  }
  return null
}

const ALLOWED_SIGNATURES: Record<string, string[]> = {
  '.mp4': ['mp4'],
  '.jpg': ['jpeg'], '.jpeg': ['jpeg'],
  '.png': ['png'],
  '.webp': ['webp'],
  '.gif': ['gif'],
  '.pdf': ['pdf'],
  '.zip': ['zip'],
  '.docx': ['zip'], '.xlsx': ['zip'], '.pptx': ['zip'],
  '.doc': ['ole'], '.xls': ['ole'], '.ppt': ['ole'],
  '.txt': ['text'],
}

const MIME_SIGNATURES: Record<string, string[]> = {
  'video/mp4': ['mp4'],
  'image/jpeg': ['jpeg'], 'image/png': ['png'], 'image/webp': ['webp'], 'image/gif': ['gif'],
  'application/pdf': ['pdf'],
  'application/zip': ['zip'], 'application/x-zip-compressed': ['zip'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['zip'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['zip'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['zip'],
  'application/msword': ['ole'], 'application/vnd.ms-excel': ['ole'], 'application/vnd.ms-powerpoint': ['ole'],
  'text/plain': ['text'],
}

/**
 * Validate the first bytes of a stored temp file against its extension and declared MIME.
 * Does not trust the browser's Content-Type.
 */
export function validateFileSignature(filePath: string, originalName: string, mimetype: string): boolean {
  const fd = fs.openSync(filePath, 'r')
  try {
    const buf = Buffer.alloc(512)
    const n = fs.readSync(fd, buf, 0, 512, 0)
    const detected = sniffSignature(buf.subarray(0, n))
    if (!detected) return false
    const ext = path.extname(originalName).toLowerCase()
    return (ALLOWED_SIGNATURES[ext] ?? []).includes(detected) && (MIME_SIGNATURES[mimetype] ?? []).includes(detected)
  } finally {
    fs.closeSync(fd)
  }
}

/** Safe extension (from the allow-list only) for server-generated storage keys. */
export function safeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : ''
}

export function removeFileQuietly(filePath?: string): void {
  if (!filePath) return
  fs.unlink(filePath, () => undefined)
}

/**
 * Validate a client-supplied relative object sub-path (e.g. HLS segment names).
 * Rejects traversal, absolute, Windows, encoded and NUL variants.
 * Returns the normalized path or null.
 */
export function sanitizeRelativeObjectPath(raw: string, allowedExtensions: string[]): string | null {
  let decoded = raw
  try {
    // Decode repeatedly so double-encoded traversal is caught.
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
  } catch {
    return null
  }
  if (!decoded || decoded.length > 200) return null
  if (decoded.includes('\0') || decoded.includes('\\') || decoded.startsWith('/') || /^[a-zA-Z]:/.test(decoded)) return null
  if (!/^[A-Za-z0-9_\-./]+$/.test(decoded)) return null
  const segments = decoded.split('/')
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return null
  const ext = path.posix.extname(decoded).toLowerCase()
  if (!allowedExtensions.includes(ext)) return null
  return decoded
}

/** Ensure a resolved path stays inside a base directory. */
export function resolveInside(baseDir: string, ...parts: string[]): string {
  const base = path.resolve(baseDir)
  const target = path.resolve(base, ...parts)
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error('Path escapes base directory')
  }
  return target
}
