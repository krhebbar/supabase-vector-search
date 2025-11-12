/**
 * Search Manager
 *
 * Handles single-vector and multi-vector search operations.
 *
 * Author: Ravindra Kanchikare (krhebbar)
 * License: MIT
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SearchResult, SearchOptions, WeightedSearchOptions, SearchError, ValidationError } from '../types';
import { validateEmbeddingDimensions } from '../embeddings';
import { Logger, defaultLogger } from '../logger';
import { withRetry } from '../utils/retry';

export class SearchManager {
  private client: SupabaseClient;
  private logger: Logger;

  constructor(client: SupabaseClient, logger: Logger = defaultLogger) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Search for documents using single-vector similarity
   */
  async search(options: SearchOptions, expectedDimensions?: number): Promise<SearchResult[]> {
    try {
      if (!options.queryEmbedding || options.queryEmbedding.length === 0) {
        throw new ValidationError('Query embedding is required', 'queryEmbedding');
      }
      if (expectedDimensions) {
        validateEmbeddingDimensions(options.queryEmbedding, expectedDimensions);
      }

      const result = await withRetry(
        async () => {
          const { data, error } = await this.client.rpc('match_documents', {
            query_embedding: options.queryEmbedding,
            match_threshold: options.matchThreshold || 0.5,
            match_count: options.matchCount || 10,
            filter_metadata: options.filterMetadata || null,
          });

          if (error) {
            throw new SearchError(`Search failed: \${error.message}`, error.code);
          }

          return (data || []) as SearchResult[];
        },
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            this.logger.warn(
              `Retrying search (attempt \${attempt}/3): \${error.message}`
            );
          },
        }
      );

      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Unexpected error during search: \${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for documents using multi-vector weighted similarity
   */
  async searchWeighted(options: WeightedSearchOptions, expectedDimensions?: number): Promise<SearchResult[]> {
    try {
      if (!options.queryEmbedding || options.queryEmbedding.length === 0) {
        throw new ValidationError('Query embedding is required', 'queryEmbedding');
      }
      if (expectedDimensions) {
        validateEmbeddingDimensions(options.queryEmbedding, expectedDimensions);
        if (options.querySection1) validateEmbeddingDimensions(options.querySection1, expectedDimensions);
        if (options.querySection2) validateEmbeddingDimensions(options.querySection2, expectedDimensions);
        if (options.querySection3) validateEmbeddingDimensions(options.querySection3, expectedDimensions);
      }

      // Normalize weights to sum to 1.0 for consistent scoring
      const providedWeightMain = options.weightMain ?? 0.25;
      const providedWeightSection1 = options.weightSection1 ?? 0.25;
      const providedWeightSection2 = options.weightSection2 ?? 0.25;
      const providedWeightSection3 = options.weightSection3 ?? 0.25;

      const totalWeight = providedWeightMain + providedWeightSection1 + providedWeightSection2 + providedWeightSection3;

      if (totalWeight === 0) {
        throw new ValidationError('Weights cannot all be zero', 'weights');
      }

      // Auto-normalize weights if they don't sum to 1.0
      let normalizedWeightMain = providedWeightMain;
      let normalizedWeightSection1 = providedWeightSection1;
      let normalizedWeightSection2 = providedWeightSection2;
      let normalizedWeightSection3 = providedWeightSection3;

      if (Math.abs(totalWeight - 1.0) > 0.01) {
        normalizedWeightMain = providedWeightMain / totalWeight;
        normalizedWeightSection1 = providedWeightSection1 / totalWeight;
        normalizedWeightSection2 = providedWeightSection2 / totalWeight;
        normalizedWeightSection3 = providedWeightSection3 / totalWeight;

        this.logger.info(
          `Weights normalized: [\${providedWeightMain.toFixed(2)}, \${providedWeightSection1.toFixed(2)}, \${providedWeightSection2.toFixed(2)}, \${providedWeightSection3.toFixed(2)}] -> [\${normalizedWeightMain.toFixed(2)}, \${normalizedWeightSection1.toFixed(2)}, \${normalizedWeightSection2.toFixed(2)}, \${normalizedWeightSection3.toFixed(2)}]`
        );
      }

      const result = await withRetry(
        async () => {
          const { data, error } = await this.client.rpc('match_documents_weighted', {
            query_embedding: options.queryEmbedding,
            query_section_1: options.querySection1 || null,
            query_section_2: options.querySection2 || null,
            query_section_3: options.querySection3 || null,
            weight_main: normalizedWeightMain,
            weight_section_1: normalizedWeightSection1,
            weight_section_2: normalizedWeightSection2,
            weight_section_3: normalizedWeightSection3,
            match_threshold: options.matchThreshold || 0.5,
            match_count: options.matchCount || 10,
            filter_metadata: options.filterMetadata || null,
          });

          if (error) {
            throw new SearchError(`Weighted search failed: \${error.message}`, error.code);
          }

          return (data || []) as SearchResult[];
        },
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            this.logger.warn(
              `Retrying weighted search (attempt \${attempt}/3): \${error.message}`
            );
          },
        }
      );

      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Unexpected error during weighted search: \${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
