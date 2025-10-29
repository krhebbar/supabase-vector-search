/**
 * Document Manager
 *
 * Handles CRUD operations for documents in the database.
 *
 * Author: Ravindra Kanchikare (krhebbar)
 * License: MIT
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Document, SearchError, ValidationError } from '../types';

export class DocumentManager {
  private client: SupabaseClient;
  private tableName: string;

  constructor(client: SupabaseClient, tableName: string = 'documents') {
    this.client = client;
    this.tableName = tableName;
  }

  /**
   * Insert a single document into the database
   */
  async insert(document: Document): Promise<Document> {
    try {
      if (!document.content || !document.content.trim()) {
        throw new ValidationError('Document content is required', 'content');
      }

      const { data, error } = await this.client
        .from(this.tableName)
        .insert({
          content: document.content,
          metadata: document.metadata || {},
          embedding: document.embedding || null,
        })
        .select()
        .single();

      if (error) {
        throw new SearchError(`Failed to insert document: ${error.message}`, error.code);
      }

      return data as Document;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Unexpected error inserting document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Insert multiple documents in batches
   */
  async insertBatch(
    documents: Document[],
    batchSize: number = 100,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Document[]> {
    try {
      if (documents.length === 0) {
        return [];
      }

      const results: Document[] = [];
      let completed = 0;

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        const { data, error } = await this.client
          .from(this.tableName)
          .insert(
            batch.map((doc) => ({
              content: doc.content,
              metadata: doc.metadata || {},
              embedding: doc.embedding || null,
            }))
          )
          .select();

        if (error) {
          throw new SearchError(`Failed to insert batch: ${error.message}`, error.code);
        }

        results.push(...(data as Document[]));
        completed += batch.length;

        if (onProgress) {
          onProgress(completed, documents.length);
        }
      }

      return results;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Unexpected error in batch insert: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

    /**
   * Get a document by ID
   */
  async get(id: string): Promise<Document | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select()
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new SearchError(`Failed to get document: ${error.message}`, error.code);
      }

      return data as Document;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Unexpected error getting document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a document
   */
  async update(id: string, updates: Partial<Document>): Promise<Document> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new SearchError(`Failed to update document: ${error.message}`, error.code);
      }

      return data as Document;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Unexpected error updating document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client.from(this.tableName).delete().eq('id', id);

      if (error) {
        throw new SearchError(`Failed to delete document: ${error.message}`, error.code);
      }
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Unexpected error deleting document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count total documents
   */
  async count(filterMetadata?: Record<string, any>): Promise<number> {
    try {
      let query = this.client.from(this.tableName).select('*', { count: 'exact', head: true });

      if (filterMetadata) {
        query = query.contains('metadata', filterMetadata);
      }

      const { count, error } = await query;

      if (error) {
        throw new SearchError(`Failed to count documents: ${error.message}`, error.code);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Unexpected error counting documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}