/**
 * OpenAI Embedding Provider
 *
 * Provider implementation for OpenAI embedding models.
 * Supports text-embedding-ada-002, text-embedding-3-small, and text-embedding-3-large.
 *
 * Author: Ravindra Kanchikare (krhebber)
 * License: MIT
 */

import OpenAI from 'openai';
import {
  Embedding,
  EmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingError,
} from '../../types';

/**
 * OpenAI model dimensions mapping
 */
const OPENAI_MODEL_DIMENSIONS: Record<string, number> = {
  'text-embedding-ada-002': 1536,
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
};

/**
 * OpenAI embedding provider configuration
 */
export interface OpenAIProviderConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model name (default: text-embedding-ada-002) */
  model?: string;
  /** Organization ID (optional) */
  organization?: string;
  /** Max retries for API calls (default: 3) */
  maxRetries?: number;
  /** Timeout in ms (default: 60000) */
  timeout?: number;
}

/**
 * OpenAI Embedding Provider
 *
 * Usage:
 * ```typescript
 * const provider = new OpenAIEmbeddingProvider({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'text-embedding-ada-002'
 * });
 *
 * const embeddings = await provider.generateEmbedding('Hello world');
 * ```
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'openai';
  public readonly dimensions: number;
  private client: OpenAI;
  private model: string;
  private config: OpenAIProviderConfig;

  constructor(config: OpenAIProviderConfig) {
    this.config = config;
    this.model = config.model || 'text-embedding-ada-002';
    this.dimensions = OPENAI_MODEL_DIMENSIONS[this.model];

    if (!this.dimensions) {
      throw new EmbeddingError(
        `Unsupported OpenAI model: ${this.model}. Supported models: ${Object.keys(OPENAI_MODEL_DIMENSIONS).join(', ')}`,
        'INVALID_MODEL',
        'openai'
      );
    }

    if (!config.apiKey) {
      throw new EmbeddingError(
        'OpenAI API key is required',
        'MISSING_API_KEY',
        'openai'
      );
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 60000,
    });
  }

  /**
   * Generate embeddings for input text(s)
   *
   * @param input - Single string or array of strings to embed
   * @returns Array of embedding vectors
   */
  async generateEmbedding(input: string | string[]): Promise<Embedding[]> {
    try {
      // Validate input
      const inputs = Array.isArray(input) ? input : [input];

      if (inputs.length === 0) {
        throw new EmbeddingError(
          'Input cannot be empty',
          'EMPTY_INPUT',
          'openai'
        );
      }

      // Filter out empty strings
      const validInputs = inputs.filter((text) => text && text.trim().length > 0);

      if (validInputs.length === 0) {
        throw new EmbeddingError(
          'All input strings are empty',
          'EMPTY_INPUT',
          'openai'
        );
      }

      // Call OpenAI API
      const response = await this.client.embeddings.create({
        model: this.model,
        input: validInputs,
      });

      // Extract embeddings from response
      const embeddings = response.data.map((item) => item.embedding);

      // Validate dimensions
      for (const embedding of embeddings) {
        if (embedding.length !== this.dimensions) {
          throw new EmbeddingError(
            `Expected ${this.dimensions} dimensions but got ${embedding.length}`,
            'DIMENSION_MISMATCH',
            'openai'
          );
        }
      }

      return embeddings;
    } catch (error) {
      if (error instanceof EmbeddingError) {
        throw error;
      }

      // Handle OpenAI API errors
      if (error instanceof OpenAI.APIError) {
        throw new EmbeddingError(
          `OpenAI API error: ${error.message}`,
          error.code || 'API_ERROR',
          'openai'
        );
      }

      // Handle other errors
      throw new EmbeddingError(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED',
        'openai'
      );
    }
  }

  /**
   * Get provider configuration
   */
  getConfig(): EmbeddingProviderConfig {
    return {
      provider: 'openai',
      apiKey: this.config.apiKey,
      model: this.model,
      dimensions: this.dimensions,
      options: {
        organization: this.config.organization,
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
      },
    };
  }

  /**
   * Get model information
   */
  getModelInfo(): { model: string; dimensions: number; maxTokens: number } {
    const maxTokens: Record<string, number> = {
      'text-embedding-ada-002': 8191,
      'text-embedding-3-small': 8191,
      'text-embedding-3-large': 8191,
    };

    return {
      model: this.model,
      dimensions: this.dimensions,
      maxTokens: maxTokens[this.model] || 8191,
    };
  }

  /**
   * Batch generate embeddings with rate limiting
   *
   * @param texts - Array of texts to embed
   * @param batchSize - Number of texts per batch (default: 100)
   * @param delayMs - Delay between batches in ms (default: 0)
   * @returns Array of embeddings
   */
  async generateEmbeddingBatch(
    texts: string[],
    batchSize: number = 100,
    delayMs: number = 0
  ): Promise<Embedding[]> {
    const results: Embedding[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await this.generateEmbedding(batch);
      results.push(...batchEmbeddings);

      // Add delay between batches to avoid rate limiting
      if (delayMs > 0 && i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}

/**
 * Convenience function to create OpenAI provider
 */
export function createOpenAIProvider(config: OpenAIProviderConfig): OpenAIEmbeddingProvider {
  return new OpenAIEmbeddingProvider(config);
}
