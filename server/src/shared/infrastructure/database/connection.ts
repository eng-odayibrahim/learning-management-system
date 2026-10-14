import mongoose from 'mongoose'

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!uri) throw new Error('MONGODB_URI or MONGO_URI is not set')

  mongoose.connection.on('connected', () =>
    console.log('✅ MongoDB connected')
  )
  mongoose.connection.on('error', (err) =>
    console.error('❌ MongoDB error:', err)
  )

  await mongoose.connect(uri)
}
