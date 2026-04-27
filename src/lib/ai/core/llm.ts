/**
 * Provider-agnostic LLM core interface.
 * All LLM calls should go through these functions, which delegate to the active provider.
 */

import type { GenerateInput, StreamChunk } from '../types/provider.types';
import { getLLMProvider } from './provider-factory';

/**
 * Generate text response non-streaming
 */
export async function generateAnswer(
  systemPrompt: string,
  userMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const provider = getLLMProvider();

  const input: GenerateInput = {
    system: systemPrompt,
    messages: userMessages,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
  };

  const result = await provider.generate(input);
  return result.text;
}

/**
 * Stream text response chunk by chunk
 * Returns an async iterable of stream chunks
 */
export async function* streamAnswer(
  systemPrompt: string,
  userMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): AsyncIterable<StreamChunk> {
  const provider = getLLMProvider();

  const input: GenerateInput = {
    system: systemPrompt,
    messages: userMessages,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
  };

  yield* provider.stream(input);
}
