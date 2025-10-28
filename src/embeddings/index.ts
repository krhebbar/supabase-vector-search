/**
 * Embedding Generation Utilities
 *
 * Helper functions for generating embeddings with support for multi-section documents.
 * Based on production-tested code from real-world candidate search system.
 *
 * Author: Ravindra Kanchikare (krhebbar)
 * License: MIT
 */

import {
  Embedding,
  EmbeddingProvider,
  DocumentSections,
  DocumentEmbeddings,
  BatchEmbeddingOptions,
  EmbeddingError,
} from '../types';

/**
 * Generate embeddings for a document with multiple sections
 *
 * This function generates embeddings for different parts of a document,
 * enabling weighted multi-vector search for more accurate matching.
 *
 * @param sections - Document sections to embed
 * @param provider - Embedding provider to use
 * @returns Document embeddings for all sections
 *
 * @example
 * ```typescript
 * const provider = createOpenAIProvider({ apiKey: '...' });
 * const embeddings = await generateDocumentEmbeddings({
 *   main: "Full document text...",
 *   section_1: "Title and summary",
 *   section_2: "Main content",
 *   section_3: "Tags and metadata"
 * }, provider);
 * ```
 */
export async function generateDocumentEmbeddings(
  sections: DocumentSections,
  provider: EmbeddingProvider
): Promise<DocumentEmbeddings> {
  try {
    // Prepare section texts for embedding
    const sectionEntries: Array<[keyof DocumentSections, string]> = [];

    if (sections.main && sections.main.trim()) {
      sectionEntries.push(['main', sections.main.trim()]);
    }
    if (sections.section_1 && sections.section_1.trim()) {
      sectionEntries.push(['section_1', sections.section_1.trim()]);
    }
    if (sections.section_2 && sections.section_2.trim()) {
      sectionEntries.push(['section_2', sections.section_2.trim()]);
    }
    if (sections.section_3 && sections.section_3.trim()) {
      sectionEntries.push(['section_3', sections.section_3.trim()]);
    }

    if (sectionEntries.length === 0) {
      throw new EmbeddingError(
        'At least one non-empty section is required',
        'EMPTY_SECTIONS'
      );
    }

    // Generate embeddings for all sections in parallel
    const embeddingPromises = sectionEntries.map(async ([key, text]) => {
      const [embedding] = await provider.generateEmbedding(text);
      return { key, embedding };
    });

    const results = await Promise.all(embeddingPromises);

    // Map results back to DocumentEmbeddings structure
    const embeddings: DocumentEmbeddings = {
      embedding: null,
      embedding_section_1: null,
      embedding_section_2: null,
      embedding_section_3: null,
    };

    for (const result of results) {
      switch (result.key) {
        case 'main':
          embeddings.embedding = result.embedding;
          break;
        case 'section_1':
          embeddings.embedding_section_1 = result.embedding;
          break;
        case 'section_2':
          embeddings.embedding_section_2 = result.embedding;
          break;
        case 'section_3':
          embeddings.embedding_section_3 = result.embedding;
          break;
      }
    }

    return embeddings;
  } catch (error) {
    if (error instanceof EmbeddingError) {
      throw error;
    }

    throw new EmbeddingError(
      `Failed to generate document embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GENERATION_FAILED'
    );
  }
}

/**
 * Generate a single embedding for text
 *
 * @param text - Text to embed
 * @param provider - Embedding provider to use
 * @returns Embedding vector
 *
 * @example
 * ```typescript
 * const provider = createOpenAIProvider({ apiKey: '...' });
 * const embedding = await generateEmbedding("Search query text", provider);
 * ```
 */
export async function generateEmbedding(
  text: string,
  provider: EmbeddingProvider
): Promise<Embedding> {
  try {
    if (!text || !text.trim()) {
      throw new EmbeddingError('Text cannot be empty', 'EMPTY_INPUT');
    }

    const [embedding] = await provider.generateEmbedding(text.trim());
    return embedding;
  } catch (error) {
    if (error instanceof EmbeddingError) {
      throw error;
    }

    throw new EmbeddingError(
      `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GENERATION_FAILED'
    );
  }
}

/**
 * Generate embeddings for multiple texts in batches
 *
 * This function handles batching, rate limiting, and progress tracking
 * for embedding large numbers of texts.
 *
 * @param options - Batch embedding options
 * @param provider - Embedding provider to use
 * @returns Array of embeddings
 *
 * @example
 * ```typescript
 * const provider = createOpenAIProvider({ apiKey: '...' });
 * const embeddings = await generateEmbeddingsBatch({
 *   texts: ["text 1", "text 2", "text 3", ...],
 *   batchSize: 100,
 *   delayMs: 1000,
 *   onProgress: (completed, total) => {
 *     console.log(`Progress: ${completed}/${total}`);
 *   }
 * }, provider);
 * ```
 */
export async function generateEmbeddingsBatch(
  options: BatchEmbeddingOptions,
  provider: EmbeddingProvider
): Promise<Embedding[]> {
  const {
    texts,
    batchSize = 100,
    delayMs = 0,
    onProgress,
  } = options;

  try {
    if (texts.length === 0) {
      return [];
    }

    const results: Embedding[] = [];
    let completed = 0;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      // Filter out empty strings
      const validBatch = batch.filter((text) => text && text.trim().length > 0);

      if (validBatch.length > 0) {
        const batchEmbeddings = await provider.generateEmbedding(validBatch);
        results.push(...batchEmbeddings);
      }

      completed += batch.length;

      // Call progress callback
      if (onProgress) {
        onProgress(completed, texts.length);
      }

      // Add delay between batches to avoid rate limiting
      if (delayMs > 0 && i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return results;
  } catch (error) {
    if (error instanceof EmbeddingError) {
      throw error;
    }

    throw new EmbeddingError(
      `Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BATCH_GENERATION_FAILED'
    );
  }
}

/**
 * Validate embedding dimensions
 *
 * @param embedding - Embedding vector to validate
 * @param expectedDimensions - Expected number of dimensions
 * @throws EmbeddingError if dimensions don't match
 */
export function validateEmbeddingDimensions(
  embedding: Embedding,
  expectedDimensions: number
): void {
  if (!Array.isArray(embedding)) {
    throw new EmbeddingError(
      'Embedding must be an array',
      'INVALID_EMBEDDING_TYPE'
    );
  }

  if (embedding.length !== expectedDimensions) {
    throw new EmbeddingError(
      `Expected ${expectedDimensions} dimensions but got ${embedding.length}`,
      'DIMENSION_MISMATCH'
    );
  }

  if (!embedding.every((val) => typeof val === 'number' && !isNaN(val))) {
    throw new EmbeddingError(
      'Embedding must contain only valid numbers',
      'INVALID_EMBEDDING_VALUES'
    );
  }
}

/**
 * Normalize embedding vector to unit length
 *
 * This is useful for certain distance metrics and can improve search quality.
 *
 * @param embedding - Embedding vector to normalize
 * @returns Normalized embedding vector
 */
export function normalizeEmbedding(embedding: Embedding): Embedding {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) {
    throw new EmbeddingError(
      'Cannot normalize zero vector',
      'ZERO_VECTOR'
    );
  }

  return embedding.map((val) => val / magnitude);
}

/**
 * Calculate cosine similarity between two embeddings
 *
 * @param embedding1 - First embedding vector
 * @param embedding2 - Second embedding vector
 * @returns Cosine similarity score (0-1, higher is more similar)
 */
export function cosineSimilarity(
  embedding1: Embedding,
  embedding2: Embedding
): number {
  if (embedding1.length !== embedding2.length) {
    throw new EmbeddingError(
      'Embeddings must have same dimensions',
      'DIMENSION_MISMATCH'
    );
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    magnitude1 += embedding1[i] * embedding1[i];
    magnitude2 += embedding2[i] * embedding2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

// Re-export providers for convenience
export * from './providers';
