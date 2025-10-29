import { describe, it, expect, vi } from 'vitest';
import { SearchManager } from '../../src/search/manager';
import { SupabaseClient } from '@supabase/supabase-js';
import { SearchOptions, SearchResult } from '../../src/types';

describe('SearchManager', () => {
  it('should perform a search', async () => {
    const mockSupabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: [{ id: '123', content: 'Test content', similarity: 0.9 }], error: null }),
    } as unknown as SupabaseClient;

    const searchManager = new SearchManager(mockSupabaseClient);
    const options: SearchOptions = {
      queryEmbedding: [0.1, 0.2, 0.3],
      matchThreshold: 0.8,
      matchCount: 5,
    };
    const result = await searchManager.search(options);

    expect(result).toEqual([{ id: '123', content: 'Test content', similarity: 0.9 }]);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('match_documents', {
      query_embedding: [0.1, 0.2, 0.3],
      match_threshold: 0.8,
      match_count: 5,
      filter_metadata: null,
    });
  });
});