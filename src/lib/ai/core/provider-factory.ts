/**
 * Provider factory and selection logic.
 * Dynamically instantiates the correct provider based on environment variables.
 */

import type { LLMProvider, EmbeddingProvider } from '../types/provider.types';
import { ProviderConfigError } from '../types/provider.types';
import { createGoogleProvider } from '../providers/google.provider';
import { createOllamaProvider } from '../providers/ollama.provider';

type ProviderType = 'google' | 'ollama';

/**
 * Get the active LLM provider based on environment variable
 */
export function getLLMProvider(): LLMProvider {
  const providerName = (process.env.LLM_PROVIDER || 'google') as ProviderType;

  switch (providerName) {
    case 'google':
      return createGoogleProvider().llm;
    case 'ollama':
      return createOllamaProvider().llm;
    default:
      throw new ProviderConfigError(
        `Invalid LLM_PROVIDER: ${providerName}. Supported: 'google', 'ollama'`,
      );
  }
}

/**
 * Get the active embedding provider based on environment variable.
 * Falls back to LLM_PROVIDER if EMBEDDING_PROVIDER is not set.
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  const providerName = (
    process.env.EMBEDDING_PROVIDER ||
    process.env.LLM_PROVIDER ||
    'google'
  ) as ProviderType;

  switch (providerName) {
    case 'google':
      return createGoogleProvider().embedding;
    case 'ollama':
      return createOllamaProvider().embedding;
    default:
      throw new ProviderConfigError(
        `Invalid EMBEDDING_PROVIDER: ${providerName}. Supported: 'google', 'ollama'`,
      );
  }
}

/**
 * Get provider configuration info (for logging/debugging)
 */
export function getProviderInfo() {
  const llmProvider = getLLMProvider();
  const embeddingProvider = getEmbeddingProvider();

  return {
    llm: {
      name: llmProvider.name,
      model: process.env.LLM_PROVIDER === 'ollama' 
        ? process.env.OLLAMA_LLM_MODEL || 'mistral'
        : 'gemini-2.5-flash',
    },
    embedding: {
      name: embeddingProvider.name,
      model: process.env.EMBEDDING_PROVIDER === 'ollama' 
        ? process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'
        : 'gemini-embedding-001',
      dimension: embeddingProvider.dimension,
    },
  };
}
