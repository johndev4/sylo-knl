export function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []
  
  // Basic recursive chunking based on characters (MVP approach)
  // Splits by sentences or paragraphs where possible
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        // Keep overlap from the end of the previous chunk
        const overlapStart = Math.max(0, currentChunk.length - overlap)
        currentChunk = currentChunk.substring(overlapStart) + sentence
      } else {
        // If a single sentence is larger than maxChunkSize, just push it (or we could split by words)
        chunks.push(sentence.trim())
        currentChunk = ''
      }
    } else {
      currentChunk += ' ' + sentence
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}
