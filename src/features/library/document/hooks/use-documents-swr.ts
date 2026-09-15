'use client';

import { useCallback, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/components/providers/auth-provider';
import { getDocuments } from '@/features/library/document/queries';
import type {
  DocumentListItem,
  DocumentListResult,
} from '@/features/library/document/document-schema';

export const DOCUMENTS_SWR_KEY = '/documents';
export const PAGE_SIZE = 100;

export const isDocumentsSWRKey = (key: unknown): key is readonly unknown[] =>
  Array.isArray(key) && key[0] === DOCUMENTS_SWR_KEY;

export function mutateDocumentListCache(
  updater: (
    current: DocumentListResult[] | undefined
  ) => DocumentListResult[] | undefined,
  options?: { revalidate?: boolean }
) {
  return import('swr').then(({ mutate }) =>
    mutate((key) => isDocumentsSWRKey(key), updater, {
      revalidate: options?.revalidate ?? true,
    })
  );
}

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

  const handleCreate = useCallback(
    async (newDoc: DocumentListItem) => {
      await mutate(
        (current) => {
          const pages = Array.isArray(current)
            ? current
            : current && typeof current === 'object' && 'data' in current
              ? [current]
              : [];

          const next = [...pages];
          const firstPage = next[0] ?? {
            data: [],
            metadata: { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 },
          };

          next[0] = {
            ...firstPage,
            data: [newDoc, ...(firstPage.data ?? [])].slice(0, PAGE_SIZE),
            metadata: {
              ...firstPage.metadata,
              total: (firstPage.metadata?.total ?? 0) + 1,
            },
          };

          return next;
        },
        { revalidate: false }
      );

      await revalidateAll();
    },
    [mutate, revalidateAll]
  );

  const handleUpdate = useCallback(
    async (docId: string, changes: Partial<DocumentListItem>) => {
      await mutate(
        (current) => {
          const pages = Array.isArray(current)
            ? current
            : current && typeof current === 'object' && 'data' in current
              ? [current]
              : [];

          return pages.map((page) => ({
            ...page,
            data: (page.data ?? []).map((doc) =>
              doc.id === docId ? { ...doc, ...changes } : doc
            ),
          }));
        },
        { revalidate: false }
      );

      await revalidateAll();
    },
    [mutate, revalidateAll]
  );

  const handleDelete = useCallback(
    async (docId: string) => {
      await mutate(
        (current) => {
          const pages = Array.isArray(current)
            ? current
            : current && typeof current === 'object' && 'data' in current
              ? [current]
              : [];

          const next = pages
            .map((page) => ({
              ...page,
              data: (page.data ?? []).filter((doc) => doc.id !== docId),
              metadata: {
                ...page.metadata,
                total: Math.max((page.metadata?.total ?? 0) - 1, 0),
              },
            }))
            .filter(
              (page) => (page.data ?? []).length > 0 || page === pages[0]
            );

          return next.length > 0 ? next : [];
        },
        { revalidate: false }
      );

      await revalidateAll();
    },
    [mutate, revalidateAll]
  );

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
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
