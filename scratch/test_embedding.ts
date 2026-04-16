import { embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import 'dotenv/config'

const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

const EMBEDDING_MODEL = googleAI.textEmbeddingModel('gemini-embedding-001', {
  outputDimensionality: 3072,
})

async function check() {
  try {
    const result = await embed({
      model: EMBEDDING_MODEL,
      value: "test",
    })
    console.log('Embedding length:', result.embedding.length)
  } catch (e) {
    console.error('Error:', e)
  }
}

check()
