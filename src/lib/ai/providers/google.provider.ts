/**
 * Google Generative AI provider implementation.
 * Wraps Vercel AI SDK's @ai-sdk/google to implement the LLMProvider and EmbeddingProvider interfaces.
 */

import { embed, embedMany, streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type {
  GenerateInput,
  GenerateOutput,
  StreamChunk,
  EmbeddingProvider,
  LLMProvider,
} from '../types/provider.types';
import { ProviderConfigError, ProviderError } from '../types/provider.types';

/**
 * Initialize Google AI client
 */
function initializeGoogleAI() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new ProviderConfigError(
      'GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set'
    );
  }

  return createGoogleGenerativeAI({
    apiKey,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  });
}

/**
 * Google LLM Provider implementation
 */
export class GoogleLLMProvider implements LLMProvider {
  name = 'google';
  private googleAI = initializeGoogleAI();
  private model = this.googleAI('gemini-2.5-flash');

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    try {
      const result = await streamText({
        model: this.model,
        system: input.system,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
      });

      // Collect full text from stream
      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }

      return {
        text: fullText,
        finishReason: 'stop',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new ProviderError(
        `Google LLM generation failed: ${error.message}`,
        error.status
      );
    }
  }

  async *stream(input: GenerateInput): AsyncIterable<StreamChunk> {
    try {
      const result = streamText({
        model: this.model,
        system: input.system,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
      });

      for await (const chunk of result.textStream) {
        yield {
          type: 'text',
          content: chunk,
        };
      }

      yield {
        type: 'finish',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      yield {
        type: 'error',
        error: `Google LLM streaming failed: ${error.message}`,
      };
    }
  }
}

/**
 * Google Embedding Provider implementation
 */
export class GoogleEmbeddingProvider implements EmbeddingProvider {
  name = 'google';
  dimension = 3072;
  private googleAI = initializeGoogleAI();
  private embeddingModel = this.googleAI.textEmbeddingModel(
    'gemini-embedding-001'
  );

  async embed(text: string): Promise<number[]> {
    try {
      const result = await embed({
        model: this.embeddingModel,
        value: text,
      });

      return result.embedding;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new ProviderError(
        `Google embedding generation failed: ${error.message}`,
        error.status
      );
    }
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    try {
      const result = await embedMany({
        model: this.embeddingModel,
        values: texts,
      });

      return result.embeddings;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new ProviderError(
        `Google batch embedding generation failed: ${error.message}`,
        error.status
      );
    }
  }
}

/**
 * Factory function to create Google providers
 */
export function createGoogleProvider() {
  return {
    llm: new GoogleLLMProvider(),
    embedding: new GoogleEmbeddingProvider(),
  };
}
