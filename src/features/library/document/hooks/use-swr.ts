'use client';

import { useCallback, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import useSWRMutation from 'swr/mutation';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/components/providers/auth-provider';
import { getDocuments } from '@/features/library/document/queries';
import type {
  CreateDocumentInput,
  DocumentListResult,
  UpdateDocumentInput,
} from '@/features/library/document/document-schema';
import { createDocument, deleteDocument, updateDocument } from '../actions';

export const DOCUMENTS_SWR_KEY = '/documents';
export const PAGE_SIZE = 3;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useDocumentsSWR(
  libraryId: string,
  searchQuery: string,
  selectedTags: string[] = []
) {
  const { user } = useSession();

  const getKey = useCallback(
    (index: number, previousPageData: DocumentListResult | null) => {
      if (!libraryId) return null;

      const normalizedSearch = searchQuery.trim();
      const normalizedTags = [...selectedTags].sort();

      if (previousPageData && previousPageData.data.length < PAGE_SIZE) {
        return null;
      }

      return [
        DOCUMENTS_SWR_KEY,
        libraryId,
        index + 1,
        normalizedSearch,
        normalizedTags,
      ] as const;
    },
    [libraryId, searchQuery, selectedTags]
  );

  const fetcher = useCallback(
    async (key: readonly unknown[]) => {
      if (!user) {
        throw new Error('User not available for document fetch');
      }

      const [, currentLibraryId, page, searchTerm, tags] = key;
      const supabase = await createClient();

      return getDocuments(
        {
          libraryId: String(currentLibraryId),
          page: Number(page),
          limit: PAGE_SIZE,
          search: typeof searchTerm === 'string' ? searchTerm : undefined,
          tags: Array.isArray(tags) ? (tags as string[]) : undefined,
        },
        supabase,
        user
      );
    },
    [user]
  );

  const shouldFetch = Boolean(user && libraryId);
  const keyLoader = useCallback(
    (index: number, previousPageData: DocumentListResult | null) => {
      if (!shouldFetch) {
        return null;
      }

      return getKey(index, previousPageData);
    },
    [getKey, shouldFetch]
  );

  const { data, error, size, setSize, mutate, isLoading, isValidating } =
    useSWRInfinite<DocumentListResult>(
      keyLoader,
      shouldFetch ? fetcher : null,
      {
        revalidateOnFocus: true,
        revalidateFirstPage: true,
        dedupingInterval: 5_000,
        focusThrottleInterval: 10_000,
      }
    );

  const documents = useMemo(
    () => data?.flatMap((page) => page.data ?? []) ?? [],
    [data]
  );

  const totalDocs = useMemo(() => data?.[0]?.metadata?.total ?? 0, [data]);

  const hasMore = useMemo(
    () =>
      !!data &&
      data.length > 0 &&
      data[data.length - 1]?.data?.length === PAGE_SIZE &&
      documents.length < totalDocs,
    [data, documents.length, totalDocs]
  );

  const isLoadingMore = useMemo(
    () => isValidating && size > 1,
    [isValidating, size]
  );

  const revalidateAll = useCallback(async () => {
    await mutate((current) => current, { revalidate: true });
  }, [mutate]);

  return {
    documents,
    totalDocs,
    size,
    setSize,
    mutate,
    isLoading: isLoading && !data,
    isLoadingMore,
    hasMore,
    error,
    revalidateAll,
  };
}

export function useCreateDocumentSWR() {
  return useSWRMutation(
    DOCUMENTS_SWR_KEY,
    async (_, { arg }: { arg: { input: CreateDocumentInput } }) =>
      await createDocument(arg.input)
  );
}

export function useUpdateDocumentSWR() {
  return useSWRMutation(
    DOCUMENTS_SWR_KEY,
    async (
      _,
      { arg }: { arg: { docId: string; input: UpdateDocumentInput } }
    ) => await updateDocument(arg.docId, arg.input)
  );
}

export function useDeleteDocumentSWR() {
  return useSWRMutation(
    DOCUMENTS_SWR_KEY,
    async (_, { arg }: { arg: { docId: string } }) =>
      await deleteDocument(arg.docId)
  );
}
