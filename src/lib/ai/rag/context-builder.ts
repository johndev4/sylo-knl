/**
 * Context building for RAG prompts.
 * Formats retrieved chunks into a system prompt context string and builds balanced system prompts.
 */

import type { RetrievedChunk } from './retrieve';

/**
 * Build system prompt with retrieved document context
 */
export function buildPromptContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return 'No relevant documents found.';
  }

  return chunks
    .map(
      (chunk) =>
        `[Source: ${chunk.title} (Library: ${chunk.library_name})]\n${chunk.content}`
    )
    .join('\n\n');
}

/**
 * Build complete system prompt for RAG with balanced grounding across
 * document context and chat conversation memory.
 */
export function buildSystemPrompt(contextContent: string): string {
  return `You are Sylo's intelligent knowledge assistant.
You have access to:
1. The ongoing conversation history with the user (chat memory).
2. Retrieved context documents from the user's authorized knowledge libraries.

Guidelines:
- Ground domain and factual answers strictly in the provided Context Documents. When citing facts, mention the document title or library naturally.
- Use the ongoing conversation history for conversational continuity, resolving follow-up questions, comparing previously discussed topics, and answering questions about what was said earlier in the chat.
- For conversational pleasantries, greetings, or meta-questions about the conversation itself, answer naturally and politely.
- If the user asks a factual question about their documents that is neither covered by the Context Documents nor prior conversation, politely state: "I don't have enough information in the selected libraries to answer that."

Context Documents:
${contextContent}
`;
}

/**
 * Build conversational system prompt when no external document retrieval is needed
 * (e.g. greetings, chat summaries, pleasantries).
 */
export function buildConversationalSystemPrompt(): string {
  return `You are Sylo's intelligent knowledge assistant.
Respond naturally, helpfully, and politely using the ongoing conversation history.
If the user asks specific factual questions about their library documents or data, let them know you can search their selected libraries.
`;
}
