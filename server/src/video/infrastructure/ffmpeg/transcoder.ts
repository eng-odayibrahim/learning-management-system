import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RenditionConfig {
  name: string   // e.g. "1080p"
  width: number
  height: number
  videoBitrate: string  // e.g. "5000k"
  audioBitrate: string  // e.g. "192k"
  maxrate: string       // 10% ceiling above target for VBV buffer
  bufsize: string       // VBV buffer (2× maxrate keeps latency under control)
}

export interface TranscodeResult {
  outputDir: string
  masterPlaylistPath: string
  renditions: { name: string; playlistPath: string }[]
}

// ---------------------------------------------------------------------------
// Rendition ladder — industry-standard ABR (Adaptive Bitrate) profile
// ---------------------------------------------------------------------------

export const DEFAULT_RENDITIONS: RenditionConfig[] = [
  {
    name: '360p',
    width: 640,
    height: 360,
    videoBitrate: '800k',
    audioBitrate: '96k',
    maxrate: '880k',
    bufsize: '1760k',
  },
  {
    name: '480p',
    width: 854,
    height: 480,
    videoBitrate: '1100k',  // تخفيف من 1400k → 1100k (جودة اقتصادية بين 360p و 480p الكاملة)
    audioBitrate: '96k',    // توحيد مع 360p لتقليل حجم الملف
    maxrate: '1200k',
    bufsize: '2400k',
  },
]

// ---------------------------------------------------------------------------
// Helper: run FFmpeg and stream stderr to the console log
// ---------------------------------------------------------------------------

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[FFmpeg] Starting: ffmpeg ${args.slice(0, 6).join(' ')} ...`)

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })

    // FFmpeg writes progress to stderr — surface it so Docker logs are useful
    proc.stderr.on('data', (chunk: Buffer) => {
      process.stdout.write(chunk)
    })

    proc.on('error', (err) => reject(new Error(`FFmpeg spawn error: ${err.message}`)))
    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`))
      }
    })
  })
}

// ---------------------------------------------------------------------------
// Core transcoding function
// ---------------------------------------------------------------------------

/**
 * Transcode a source MP4 into an adaptive HLS stream.
 *
 * For each rendition the function runs FFmpeg once, producing:
 *   <outputDir>/<name>/playlist.m3u8   ← per-rendition variant playlist
 *   <outputDir>/<name>/seg_000.ts      ← 10-second MPEG-TS segments
 *
 * Then it writes a master.m3u8 that references all variant playlists.
 *
 * @param sourcePath  Absolute path to the uploaded MP4 file
 * @param outputDir   Directory where HLS artefacts will be written
 * @param renditions  Override the default ABR ladder if needed
 */
export async function transcodeToHLS(
  sourcePath: string,
  outputDir: string,
  renditions: RenditionConfig[] = DEFAULT_RENDITIONS,
): Promise<TranscodeResult> {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`)
  }

  const results: { name: string; playlistPath: string; bandwidth: number }[] = []

  for (const r of renditions) {
    const renditionDir = path.join(outputDir, r.name)
    fs.mkdirSync(renditionDir, { recursive: true })

    const playlistPath = path.join(renditionDir, 'playlist.m3u8')
    const segmentPattern = path.join(renditionDir, 'seg_%03d.ts')

    /**
     * FFmpeg flag breakdown:
     *
     * -i <input>
     *   Input file.
     *
     * -vf scale=<w>:<h>:force_original_aspect_ratio=decrease,pad=<w>:<h>:(ow-iw)/2:(oh-ih)/2
     *   Scale to target size while preserving aspect ratio (letterbox/pillarbox).
     *   pad centres the image inside the target box.
     *
     * -c:v libx264
     *   H.264 video codec — widest device compatibility for HLS.
     *
     * -profile:v main
     *   H.264 Main profile; supported by virtually all mobile/desktop HW decoders.
     *
     * -preset veryfast
     *   Encoding speed vs. compression trade-off. "veryfast" is a good balance
     *   for server-side transcoding where CPU cost matters.
     *
     * -crf 23
     *   Constant Rate Factor — quality target used alongside the VBV constraint.
     *   Lower = better quality (18-28 is typical range).
     *
     * -b:v <videoBitrate>
     *   Target average video bitrate. Combined with -maxrate / -bufsize for VBV
     *   (Video Buffering Verifier) constrained encoding.
     *
     * -maxrate <maxrate>
     *   Hard ceiling on instantaneous bitrate (≈ 10% above target).
     *   Prevents buffer overflow on slow connections.
     *
     * -bufsize <bufsize>
     *   VBV buffer size. A 2× maxrate value gives the encoder room to handle
     *   complex scenes without violating the maxrate constraint.
     *
     * -g 240  (for 24 fps → keyframe every 10 seconds)
     *   GOP (Group of Pictures) size. HLS requires a keyframe at every segment
     *   boundary so the player can seek cleanly. With 120-second segments at 24 fps,
     *   -force_key_frames handles exact alignment every 2 minutes.
     *   We use a 10-second GOP (240 frames) as internal reference — keyframes within
     *   the segment are fine; -force_key_frames guarantees segment boundaries.
     *
     * -keyint_min 240
     *   Minimum GOP length — prevents the encoder from inserting extra keyframes
     *   that would inflate the bitrate.
     *
     * -sc_threshold 0
     *   Disable scene-change-driven keyframes so only the -g interval applies.
     *   Crucial for predictable segment sizes.
     *
     * -c:a aac
     *   AAC audio codec — required for HLS compatibility on Apple devices.
     *
     * -ar 48000
     *   Audio sample rate 48 kHz (broadcast standard).
     *
     * -b:a <audioBitrate>
     *   Audio bitrate.
     *
     * -f hls
     *   Output format: HLS muxer.
     *
     * -hls_time 120
     *   Target segment duration in seconds (2 minutes).
     *   Reduces the total number of segments dramatically, which speeds up
     *   the R2 upload phase (fewer HTTP requests). The trade-off is slightly
     *   coarser seeking granularity, which is acceptable for a VOD LMS platform.
     *
     * -hls_playlist_type vod
     *   Writes #EXT-X-ENDLIST at the end of the playlist (VOD, not live stream).
     *
     * -hls_segment_filename <pattern>
     *   Naming template for .ts segment files.
     *
     * -hls_flags independent_segments
     *   Marks each segment as independently decodable in the playlist.
     *   Required by Apple HLS validator (mediafilesegmenter).
     *
     * -movflags +faststart
     *   Moves MP4 metadata to the front — not strictly needed for HLS but useful
     *   if the source is re-wrapped.
     */
    const fps = 24 // assume 24 fps; for production probe with ffprobe
    const gopSize = fps * 10 // keyframe every 10 s (internal GOP; -force_key_frames handles segment cuts)

    const args: string[] = [
      '-y',                           // overwrite output without prompting
      '-i', sourcePath,

      // --- Video ---
      '-vf', `scale=${r.width}:${r.height}:force_original_aspect_ratio=decrease,pad=${r.width}:${r.height}:(ow-iw)/2:(oh-ih)/2`,
      '-c:v', 'libx264',
      '-profile:v', 'main',
      '-preset', 'veryfast',
      '-crf', '23',
      '-b:v', r.videoBitrate,
      '-maxrate', r.maxrate,
      '-bufsize', r.bufsize,
      '-g', String(gopSize),
      '-keyint_min', String(gopSize),
      '-sc_threshold', '0',
      '-force_key_frames', `expr:gte(t,n_forced*120)`, // force keyframe at every 2-minute segment boundary

      // --- Audio ---
      '-c:a', 'aac',
      '-ar', '48000',
      '-b:a', r.audioBitrate,

      // --- HLS muxer ---
      '-f', 'hls',
      '-hls_time', '120',              // 2-minute segments
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', segmentPattern,
      '-hls_flags', 'independent_segments',

      playlistPath,
    ]

    await runFFmpeg(args)
    console.log(`[FFmpeg] ✅ Rendition ${r.name} done → ${playlistPath}`)

    // Compute peak bandwidth (maxrate) in bps for the master playlist EXT-X-STREAM-INF tag
    const bwBps = parseInt(r.maxrate.replace('k', ''), 10) * 1000

    results.push({ name: r.name, playlistPath, bandwidth: bwBps })
  }

  // ---------------------------------------------------------------------------
  // Write the master playlist
  // ---------------------------------------------------------------------------

  const masterPlaylistPath = path.join(outputDir, 'master.m3u8')
  const masterLines: string[] = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '',
  ]

  for (const r of renditions) {
    const result = results.find((x) => x.name === r.name)!
    masterLines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${result.bandwidth},RESOLUTION=${r.width}x${r.height},CODECS="avc1.4d401f,mp4a.40.2",NAME="${r.name}"`,
      `${r.name}/playlist.m3u8`,
      '',
    )
  }

  fs.writeFileSync(masterPlaylistPath, masterLines.join('\n'), 'utf8')
  console.log(`[FFmpeg] ✅ Master playlist written → ${masterPlaylistPath}`)

  return {
    outputDir,
    masterPlaylistPath,
    renditions: results.map((r) => ({ name: r.name, playlistPath: r.playlistPath })),
  }
}
