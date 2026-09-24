'use client';

import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
import { createDocument, deleteDocument, updateDocument } from './actions';
import { getRecentlyAddedTags, searchLibraryTags } from '../queries';
import useSWR from 'swr';

// ---------------------------------------------------------------------------
// Constant Variables
// ---------------------------------------------------------------------------

export const DOCUMENTS_SWR_KEY = '/documents';
export const PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type DocumentSWRContextType = {
  sharedLibraryId: string;
  setSharedLibraryId: Dispatch<SetStateAction<string>>;
  sharedSearchQuery: string;
  setSharedSearchQuery: Dispatch<SetStateAction<string>>;
  sharedSelectedTags: string[];
  setSharedSelectedTags: Dispatch<SetStateAction<string[]>>;
};

const DocumentSWRContext = createContext<DocumentSWRContextType>({
  sharedLibraryId: '',
  setSharedLibraryId: () => {},
  sharedSearchQuery: '',
  setSharedSearchQuery: () => {},
  sharedSelectedTags: [],
  setSharedSelectedTags: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function DocumentSWRProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sharedLibraryId, setSharedLibraryId] = useState<string>('');
  const [sharedSearchQuery, setSharedSearchQuery] = useState<string>('');
  const [sharedSelectedTags, setSharedSelectedTags] = useState<string[]>([]);

  return (
    <DocumentSWRContext.Provider
      value={{
        sharedLibraryId,
        setSharedLibraryId,
        sharedSearchQuery,
        setSharedSearchQuery,
        sharedSelectedTags,
        setSharedSelectedTags,
      }}
    >
      {children}
    </DocumentSWRContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useSharedState() {
  return useContext(DocumentSWRContext);
}

export function useGetDocumentsSWRInfinite(
  libraryId: string,
  searchQuery: string,
  selectedTags: string[] = []
) {
  const { user } = useSession();
  const { setSharedLibraryId, setSharedSearchQuery, setSharedSelectedTags } =
    useSharedState();

  useEffect(() => {
    setSharedLibraryId(libraryId);
    setSharedSearchQuery(searchQuery);
    setSharedSelectedTags(selectedTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedTags]);

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
      const supabase = createClient();

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

export function useCreateDocumentSWR(libraryId: string) {
  const { sharedSearchQuery, sharedSelectedTags } = useSharedState();

  const { mutate } = useGetDocumentsSWRInfinite(
    libraryId,
    sharedSearchQuery,
    sharedSelectedTags
  );

  return useSWRMutation(
    DOCUMENTS_SWR_KEY,
    async (_, { arg }: { arg: { input: CreateDocumentInput } }) =>
      await createDocument(arg.input),
    {
      onSuccess: () => {
        mutate();
      },
    }
  );
}

export function useUpdateDocumentSWR(libraryId: string) {
  const { sharedSearchQuery, sharedSelectedTags } = useSharedState();

  const { mutate } = useGetDocumentsSWRInfinite(
    libraryId,
    sharedSearchQuery,
    sharedSelectedTags
  );

  return useSWRMutation(
    DOCUMENTS_SWR_KEY,
    async (
      _,
      { arg }: { arg: { docId: string; input: UpdateDocumentInput } }
    ) => await updateDocument(arg.docId, arg.input),
    {
      onSuccess: () => {
        mutate();
      },
    }
  );
}

export function useDeleteDocumentSWR(libraryId: string) {
  const { sharedSearchQuery, sharedSelectedTags } = useSharedState();

  const { mutate } = useGetDocumentsSWRInfinite(
    libraryId,
    sharedSearchQuery,
    sharedSelectedTags
  );

  return useSWRMutation(
    DOCUMENTS_SWR_KEY,
    async (_, { arg }: { arg: { docId: string } }) =>
      await deleteDocument(arg.docId),
    {
      onSuccess: () => {
        mutate();
      },
    }
  );
}

export function useGetRecentlyAddedTags(libraryId: string) {
  const fetchRecentlyAddedTags = useCallback(
    async (key: readonly [string, string]) => {
      const [, currentLibraryId] = key;
      if (!currentLibraryId) return [];
      const supabase = createClient();
      return await getRecentlyAddedTags(currentLibraryId, supabase);
    },
    []
  );

  const key = libraryId
    ? (['/tags/recommendations', libraryId] as const)
    : null;

  return useSWR(key, fetchRecentlyAddedTags, {
    fallbackData: [],
  });
}

export function useSearchLibraryTagsSWR(libraryId: string, query: string) {
  const fetchSearchTags = useCallback(
    async (key: readonly [string, string, string]) => {
      const [, currentLibraryId, searchParam] = key;
      if (!currentLibraryId || !searchParam.trim()) return [];
      const supabase = createClient();
      return await searchLibraryTags(currentLibraryId, searchParam, supabase);
    },
    []
  );

  const trimmedQuery = query.trim();
  const key =
    libraryId && trimmedQuery
      ? (['/tags/search', libraryId, trimmedQuery] as const)
      : null;

  return useSWR(key, fetchSearchTags, {
    fallbackData: [],
    keepPreviousData: true,
  });
}
