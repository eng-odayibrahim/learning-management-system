import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import { createReadStream, statSync } from 'fs'

// ---------------------------------------------------------------------------
// Content-Type map for HLS assets
// ---------------------------------------------------------------------------

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl', // RFC 8216 §4 — required for Safari/iOS
  '.ts':   'video/mp2t',                     // MPEG-TS container
  '.mp4':  'video/mp4',
  '.aac':  'audio/aac',
  '.vtt':  'text/vtt',                       // WebVTT captions if added later
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream'
}

// ---------------------------------------------------------------------------
// R2 client factory
// ---------------------------------------------------------------------------

/**
 * Cloudflare R2 is S3-compatible. The only difference from AWS S3 is:
 *   - endpoint: https://<accountId>.r2.cloudflarestorage.com
 *   - region: 'auto' (R2 ignores the region field but SDK requires one)
 *   - No egress fees — perfect for video delivery
 */
let cachedClient: S3Client | undefined
export function createR2Client(): S3Client {
  if (cachedClient) return cachedClient
  const accountId  = process.env.R2_ACCOUNT_ID
  const accessKeyId     = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env',
    )
  }

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // Force path-style so the SDK doesn't try to resolve bucket DNS sub-domains
    forcePathStyle: true,
  })
  return cachedClient
}

export function requireBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME?.trim()
  if (!bucket) throw new Error('Missing required environment variable: R2_BUCKET_NAME')
  return bucket
}

/** Fetch a private object by server-controlled key. */
export async function getR2Object(key: string) {
  return createR2Client().send(new GetObjectCommand({ Bucket: requireBucketName(), Key: key }))
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadItem {
  localPath: string   // absolute path on disk
  r2Key: string       // object key inside the bucket (e.g. "videos/<id>/master.m3u8")
}

export interface UploadResult {
  r2Key: string
  sizeBytes: number
}

// ---------------------------------------------------------------------------
// Bulk uploader
// ---------------------------------------------------------------------------

/**
 * Upload a list of local files to Cloudflare R2.
 *
 * Files are uploaded with:
 *   - Correct Content-Type for HLS playback (critical — browsers enforce MIME sniffing)
 *   - Cache-Control tuned per file type:
 *       .m3u8 playlists → no-cache (players re-fetch to get updated rendition lists)
 *       .ts  segments   → max-age 31536000 (immutable; names are unique per transcode)
 *
 * @param items     Array of { localPath, r2Key } objects
 * @param bucket    R2 bucket name
 * @param publicUrl CDN / R2 public URL base, e.g. https://pub-<hash>.r2.dev
 * @param concurrency Max simultaneous PUT requests (default 5)
 */
export async function uploadHLSToR2(
  items: UploadItem[],
  bucket: string,
  concurrency = 5,
): Promise<UploadResult[]> {
  const client = createR2Client()
  const results: UploadResult[] = []

  // Process in batches to avoid overwhelming the network / R2 rate limits
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)

    const batchResults = await Promise.all(
      batch.map((item) => uploadSingle(client, item, bucket)),
    )

    results.push(...batchResults)
    console.log(`[R2] Uploaded ${Math.min(i + concurrency, items.length)} / ${items.length} files`)
  }

  return results
}

async function uploadSingle(
  client: S3Client,
  item: UploadItem,
  bucket: string,
): Promise<UploadResult> {
  const { localPath, r2Key } = item
  const stat = statSync(localPath)
  const contentType = getContentType(localPath)
  const ext = path.extname(localPath).toLowerCase()

  // Private content: never cacheable by shared caches.
  const cacheControl = 'private, max-age=300'

  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: r2Key,
    Body: createReadStream(localPath),
    ContentType: contentType,
    ContentLength: stat.size,
    CacheControl: cacheControl,
    // Allow the browser to fetch HLS assets cross-origin (video player CDN)
    Metadata: {
      'x-content-origin': 'hls-transcode',
    },
  }

  await client.send(new PutObjectCommand(params))

  console.log(`[R2] uploaded ${r2Key} (${(stat.size / 1024).toFixed(1)} KB)`)

  return { r2Key, sizeBytes: stat.size }
}

// ---------------------------------------------------------------------------
// Directory scanner — collect all HLS files from an output directory
// ---------------------------------------------------------------------------

/**
 * Walk a local HLS output directory and return an array of UploadItem objects
 * ready to be passed to uploadHLSToR2.
 *
 * Example layout produced by transcoder:
 *   outputDir/
 *     master.m3u8
 *     480p/playlist.m3u8
 *     480p/seg_000.ts  ...
 *     720p/playlist.m3u8
 *     720p/seg_000.ts  ...
 *     1080p/playlist.m3u8
 *     1080p/seg_000.ts ...
 *
 * @param outputDir  Local directory root (absolute path)
 * @param r2Prefix   R2 key prefix, e.g. "videos/<videoId>"
 */
export function buildUploadItems(outputDir: string, r2Prefix: string): UploadItem[] {
  const items: UploadItem[] = []

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else {
        const relativePath = path.relative(outputDir, fullPath).replace(/\\/g, '/')
        items.push({
          localPath: fullPath,
          r2Key: `${r2Prefix}/${relativePath}`,
        })
      }
    }
  }

  walk(outputDir)
  return items
}
