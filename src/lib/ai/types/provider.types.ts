/**
 * Provider abstraction types for LLM and embedding providers.
 * Defines the contract that all providers must implement.
 */

/**
 * Input for LLM generation/streaming
 */
export interface GenerateInput {
  system: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Single chunk from an LLM stream
 */
export interface StreamChunk {
  type: 'text' | 'error' | 'finish';
  content?: string;
  error?: string;
}

/**
 * Output from non-streaming LLM generation
 */
export interface GenerateOutput {
  text: string;
  finishReason: 'stop' | 'length' | 'error';
}

/**
 * Input for embedding generation
 */
export interface EmbedInput {
  text: string;
}

/**
 * Interface all LLM providers must implement
 */
export interface LLMProvider {
  name: string;

  /**
   * Generate text response (non-streaming)
   */
  generate(input: GenerateInput): Promise<GenerateOutput>;

  /**
   * Generate text response with streaming
   */
  stream(input: GenerateInput): AsyncIterable<StreamChunk>;
}

/**
 * Interface all embedding providers must implement
 */
export interface EmbeddingProvider {
  name: string;

  /**
   * Dimension of returned embeddings (e.g., 3072 for Google, 1536 for some Ollama models)
   */
  dimension: number;

  /**
   * Generate single embedding
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate multiple embeddings in batch
   */
  embedMany(texts: string[]): Promise<number[][]>;
}

/**
 * Provider configuration errors
 */
export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderConfigError';
  }
}

/**
 * Provider runtime errors
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
