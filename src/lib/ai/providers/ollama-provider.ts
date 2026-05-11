/**
 * Ollama provider implementation.
 * Integrates with local Ollama instances using ollama-ai-provider-v2 from Vercel AI SDK.
 */

import { createOllama } from 'ollama-ai-provider-v2';
import { streamText, embed, embedMany } from 'ai';
import type {
  GenerateInput,
  GenerateOutput,
  StreamChunk,
  EmbeddingProvider,
  LLMProvider,
} from '../types/provider-types';
import { ProviderError } from '../types/provider-types';

/**
 * Get Ollama base URL from environment or use default
 */
function getOllamaBaseUrl(): string {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  return baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
}

/**
 * Ollama LLM Provider implementation
 */
export class OllamaLLMProvider implements LLMProvider {
  name = 'ollama';
  private llmModel = process.env.OLLAMA_LLM_MODEL || 'mistral';
  private provider = createOllama({
    baseURL: getOllamaBaseUrl(),
  });

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    try {
      const model = this.provider(this.llmModel);

      const result = await streamText({
        model,
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
        `Ollama LLM generation failed: ${error.message}`,
        error.status
      );
    }
  }

  async *stream(input: GenerateInput): AsyncIterable<StreamChunk> {
    try {
      const model = this.provider(this.llmModel);

      const result = streamText({
        model,
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
        error: `Ollama LLM streaming failed: ${error.message}`,
      };
    }
  }
}

/**
 * Ollama Embedding Provider implementation
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  name = 'ollama';
  dimension = 1536; // Default for most Ollama embedding models; can be overridden
  private embeddingModel =
    process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
  private provider = createOllama({
    baseURL: getOllamaBaseUrl(),
  });

  constructor() {
    // Validate dimension if specified via env
    if (process.env.OLLAMA_EMBEDDING_DIMENSION) {
      this.dimension = parseInt(process.env.OLLAMA_EMBEDDING_DIMENSION, 10);
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const model = this.provider.textEmbeddingModel(this.embeddingModel);

      const result = await embed({
        model,
        value: text,
      });

      return result.embedding;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // Log detailed error for debugging
      console.error('[OLLAMA EMBED ERROR]', {
        model: this.embeddingModel,
        baseUrl: getOllamaBaseUrl(),
        message: error.message,
        status: error.status,
        cause: error.cause,
        errorType: error.constructor.name,
      });

      throw new ProviderError(
        `Ollama embedding generation failed: ${error.message}. Make sure Ollama is running at ${getOllamaBaseUrl()} and model "${this.embeddingModel}" is available.`,
        error.status
      );
    }
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    try {
      const model = this.provider.textEmbeddingModel(this.embeddingModel);

      const result = await embedMany({
        model,
        values: texts,
      });

      return result.embeddings;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // Log detailed error for debugging
      console.error('[OLLAMA EMBEDMANY ERROR]', {
        model: this.embeddingModel,
        baseUrl: getOllamaBaseUrl(),
        textCount: texts.length,
        message: error.message,
        status: error.status,
        cause: error.cause,
        errorType: error.constructor.name,
      });

      throw new ProviderError(
        `Ollama batch embedding generation failed: ${error.message}. Make sure Ollama is running at ${getOllamaBaseUrl()} and model "${this.embeddingModel}" is available (e.g., pull it with: ollama pull ${this.embeddingModel})`,
        error.status
      );
    }
  }
}

/**
 * Factory function to create Ollama providers
 */
export function createOllamaProvider() {
  return {
    llm: new OllamaLLMProvider(),
    embedding: new OllamaEmbeddingProvider(),
  };
}
