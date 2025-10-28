/**
 * Cohere Embedding Provider
 *
 * Provider implementation for Cohere embedding models.
 * Supports embed-english-v3.0, embed-multilingual-v3.0, and other Cohere models.
 *
 * Author: Ravindra Kanchikare (krhebbar)
 * License: MIT
 */

import {
  Embedding,
  EmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingError,
} from '../../types';

/**
 * Cohere model dimensions mapping
 */
const COHERE_MODEL_DIMENSIONS: Record<string, number> = {
  'embed-english-v3.0': 1024,
  'embed-multilingual-v3.0': 1024,
  'embed-english-light-v3.0': 384,
  'embed-multilingual-light-v3.0': 384,
};

/**
 * Cohere embedding provider configuration
 */
export interface CohereProviderConfig {
  /** Cohere API key */
  apiKey: string;
  /** Model name (default: embed-english-v3.0) */
  model?: string;
  /** Input type (default: search_document) */
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
  /** Truncate input if too long (default: END) */
  truncate?: 'NONE' | 'START' | 'END';
  /** Max retries for API calls (default: 3) */
  maxRetries?: number;
  /** Timeout in ms (default: 60000) */
  timeout?: number;
}

/**
 * Cohere API response interface
 */
interface CohereEmbeddingResponse {
  embeddings: number[][];
  meta?: {
    billed_units?: {
      input_tokens: number;
    };
  };
}

/**
 * Cohere Embedding Provider
 *
 * Usage:
 * ```typescript
 * const provider = new CohereEmbeddingProvider({
 *   apiKey: process.env.COHERE_API_KEY,
 *   model: 'embed-english-v3.0'
 * });
 *
 * const embeddings = await provider.generateEmbedding('Hello world');
 * ```
 */
export class CohereEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'cohere';
  public readonly dimensions: number;
  private model: string;
  private config: CohereProviderConfig;
  private apiEndpoint = 'https://api.cohere.ai/v1/embed';

  constructor(config: CohereProviderConfig) {
    this.config = config;
    this.model = config.model || 'embed-english-v3.0';
    this.dimensions = COHERE_MODEL_DIMENSIONS[this.model];

    if (!this.dimensions) {
      throw new EmbeddingError(
        `Unsupported Cohere model: ${this.model}. Supported models: ${Object.keys(COHERE_MODEL_DIMENSIONS).join(', ')}`,
        'INVALID_MODEL',
        'cohere'
      );
    }

    if (!config.apiKey) {
      throw new EmbeddingError(
        'Cohere API key is required',
        'MISSING_API_KEY',
        'cohere'
      );
    }
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
          'cohere'
        );
      }

      // Filter out empty strings
      const validInputs = inputs.filter((text) => text && text.trim().length > 0);

      if (validInputs.length === 0) {
        throw new EmbeddingError(
          'All input strings are empty',
          'EMPTY_INPUT',
          'cohere'
        );
      }

      // Call Cohere API
      const response = await this.callCohereAPI(validInputs);

      // Validate dimensions
      for (const embedding of response.embeddings) {
        if (embedding.length !== this.dimensions) {
          throw new EmbeddingError(
            `Expected ${this.dimensions} dimensions but got ${embedding.length}`,
            'DIMENSION_MISMATCH',
            'cohere'
          );
        }
      }

      return response.embeddings;
    } catch (error) {
      if (error instanceof EmbeddingError) {
        throw error;
      }

      // Handle fetch errors
      throw new EmbeddingError(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED',
        'cohere'
      );
    }
  }

  /**
   * Call Cohere API with retry logic
   */
  private async callCohereAPI(
    texts: string[],
    retryCount: number = 0
  ): Promise<CohereEmbeddingResponse> {
    const maxRetries = this.config.maxRetries || 3;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, this.config.timeout || 60000);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          texts: texts,
          input_type: this.config.inputType || 'search_document',
          truncate: this.config.truncate || 'END',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Cohere API error (${response.status}): ${errorData.message || response.statusText}`
        );
      }

      const data: CohereEmbeddingResponse = await response.json();
      return data;
    } catch (error) {
      // Retry on transient errors
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.callCohereAPI(texts, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Get provider configuration
   */
  getConfig(): EmbeddingProviderConfig {
    return {
      provider: 'cohere',
      apiKey: this.config.apiKey,
      model: this.model,
      dimensions: this.dimensions,
      options: {
        inputType: this.config.inputType,
        truncate: this.config.truncate,
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
      'embed-english-v3.0': 512,
      'embed-multilingual-v3.0': 512,
      'embed-english-light-v3.0': 512,
      'embed-multilingual-light-v3.0': 512,
    };

    return {
      model: this.model,
      dimensions: this.dimensions,
      maxTokens: maxTokens[this.model] || 512,
    };
  }

  /**
   * Batch generate embeddings with rate limiting
   *
   * @param texts - Array of texts to embed
   * @param batchSize - Number of texts per batch (default: 96)
   * @param delayMs - Delay between batches in ms (default: 0)
   * @returns Array of embeddings
   */
  async generateEmbeddingBatch(
    texts: string[],
    batchSize: number = 96, // Cohere's max batch size
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
 * Convenience function to create Cohere provider
 */
export function createCohereProvider(config: CohereProviderConfig): CohereEmbeddingProvider {
  return new CohereEmbeddingProvider(config);
}
