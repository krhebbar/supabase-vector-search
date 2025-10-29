import { describe, it, expect, vi } from 'vitest';
import { DocumentManager } from '../../src/document/manager';
import { SupabaseClient } from '@supabase/supabase-js';
import { Document } from '../../src/types';

describe('DocumentManager', () => {
  it('should insert a document', async () => {
    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '123', content: 'Test content' }, error: null }),
    } as unknown as SupabaseClient;

    const documentManager = new DocumentManager(mockSupabaseClient);
    const doc: Document = { content: 'Test content' };
    const result = await documentManager.insert(doc);

    expect(result).toEqual({ id: '123', content: 'Test content' });
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('documents');
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
      content: 'Test content',
      metadata: {},
      embedding: null,
    });
  });
});