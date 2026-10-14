import amqp, { ChannelModel, Channel, ConsumeMessage } from 'amqplib'

// ---------------------------------------------------------------------------
// RabbitMQ connection manager — singleton with auto-reconnect
// ---------------------------------------------------------------------------

let connection: ChannelModel | null = null
let channel: Channel | null = null
let connecting = false
const RECONNECT_DELAY_MS = 5_000

/**
 * Get or create a RabbitMQ connection + channel.
 * Automatically reconnects on failure.
 */
export async function getRabbitChannel(): Promise<Channel> {
  if (channel) return channel

  if (connecting) {
    // Wait for the in-flight connection attempt
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    if (channel) return channel
    throw new Error('[RabbitMQ] Connection attempt in progress — retry later')
  }

  connecting = true
  const url = process.env.RABBITMQ_URL?.trim()
  if (!url) {
    connecting = false
    throw new Error('Missing required environment variable: RABBITMQ_URL')
  }

  try {
    console.log('[RabbitMQ] Connecting…')
    connection = await amqp.connect(url)
    channel = await connection.createChannel()

    // Prefetch 1 so only one video is processed at a time per worker
    await channel.prefetch(1)

    console.log('[RabbitMQ] ✅ Connected and channel created')

    // Handle connection close — schedule reconnect
    connection.on('close', () => {
      console.warn('[RabbitMQ] Connection closed')
      channel = null
      connection = null
      setTimeout(() => {
        getRabbitChannel().catch(() => {})
      }, RECONNECT_DELAY_MS)
    })

    connection.on('error', (err: Error) => {
      console.error('[RabbitMQ] Connection error:', err.message)
    })

    return channel
  } catch (err: any) {
    console.error('[RabbitMQ] ❌ Failed to connect:', err.message)
    channel = null
    connection = null
    throw err
  } finally {
    connecting = false
  }
}

/**
 * Publish a message directly to a queue.
 */
export async function publishToQueue(
  queue: string,
  message: Record<string, unknown>,
): Promise<void> {
  const ch = await getRabbitChannel()
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true, // survive broker restart
    contentType: 'application/json',
  })
}

/**
 * Consume messages from a queue.
 */
export async function consumeQueue(
  queue: string,
  handler: (msg: ConsumeMessage, channel: Channel) => Promise<void>,
): Promise<void> {
  const ch = await getRabbitChannel()
  await ch.consume(queue, async (msg) => {
    if (!msg) return
    try {
      await handler(msg, ch)
    } catch (err: any) {
      console.error(`[RabbitMQ] Unhandled consumer error on ${queue}:`, err.message)
      // Negative acknowledge — message goes back to queue (or dead-letter)
      ch.nack(msg, false, false)
    }
  })
}

/**
 * Gracefully close the RabbitMQ connection.
 */
export async function closeRabbit(): Promise<void> {
  try {
    if (channel) await channel.close()
    if (connection) await connection.close()
  } catch (_) {}
  channel = null
  connection = null
}
