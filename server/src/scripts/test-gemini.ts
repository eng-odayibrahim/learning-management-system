/**
 * Quick Gemini API key diagnostic script.
 * Run: npx tsx src/scripts/test-gemini.ts
 */
import 'dotenv/config'
import { GoogleGenerativeAI } from '@google/generative-ai'

const key = process.env.GEMINI_API_KEY

console.log('─────────────────────────────────────────')
console.log('Gemini API Key Diagnostic')
console.log('─────────────────────────────────────────')
console.log('Key present :', !!key)
console.log('Key prefix  :', key?.slice(0, 6) + '...')
console.log('Key length  :', key?.length)
console.log('─────────────────────────────────────────')

if (!key) {
  console.error('❌ GEMINI_API_KEY is not set in .env')
  process.exit(1)
}

const genAI = new GoogleGenerativeAI(key)

// Try models in order of preference — 2.0-flash first, then 1.5-flash-latest
const MODELS_TO_TRY = [
  'gemini-3.1-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-pro',
]

async function tryModel(modelName: string): Promise<boolean> {
  try {
    console.log(`Testing model: ${modelName} ...`)
    const model = genAI.getGenerativeModel({ model: modelName })
    const result = await model.generateContent('Say the word OK only.')
    const text = result.response.text()
    console.log(`✅ ${modelName} works! Response: ${text.trim()}`)
    return true
  } catch (err: any) {
    console.log(`❌ ${modelName}: ${err.message?.split('\n')[0]}`)
    return false
  }
}

async function main() {
  for (const m of MODELS_TO_TRY) {
    const ok = await tryModel(m)
    if (ok) {
      console.log('')
      console.log('✔ Use this model name in your .env or code:', m)
      break
    }
  }
}

main()
