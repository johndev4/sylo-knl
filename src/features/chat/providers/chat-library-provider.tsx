'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/providers/auth-provider';
import { useUserLibrariesSWR } from '@/features/chat/swr';

export interface ChatLibrary {
  id: string;
  name: string;
  role: string;
}

interface ChatLibraryContextValue {
  libraries: ChatLibrary[];
  selectedIds: string[];
  isLoadingLibraries: boolean;
  allSelected: boolean;
  noneSelected: boolean;
  selectedLibraries: ChatLibrary[];
  toggleLibrary: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
}

const ChatLibraryContext = createContext<ChatLibraryContextValue | null>(null);

export function useChatLibrary() {
  const context = useContext(ChatLibraryContext);
  if (!context) {
    throw new Error('useChatLibrary must be used within ChatLibraryProvider.');
  }
  return context;
}

/** @deprecated Use `useChatLibrary` instead. */
export const useChatSidebar = useChatLibrary;

export function ChatLibraryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const { libraries, isLoading: isLoadingLibraries } = useUserLibrariesSWR();

  // null means "no param in URL yet" → will auto-select all after load
  const libraryIdsParam = searchParams.get('libraryIds');
  const requestedSelectedIds = useMemo(
    () => libraryIdsParam?.split(',').filter(Boolean) ?? null,
    [libraryIdsParam]
  );

  const selectedIds = useMemo(() => {
    if (requestedSelectedIds === null) return [];
    if (isLoadingLibraries) return requestedSelectedIds;
    return requestedSelectedIds.filter((id) =>
      libraries.some((library) => library.id === id)
    );
  }, [isLoadingLibraries, libraries, requestedSelectedIds]);

  const updateSearchParams = useCallback(
    (ids: string[]) => {
      const url = ids.length
        ? `${pathname}?libraryIds=${ids.join(',')}`
        : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router]
  );

  // Redirect unauthenticated users
  useEffect(() => {
    if (!user) router.push('/login');
  }, [router, user]);

  // We no longer auto-select all libraries by default.
  // Selection must be explicit via the UI or URL parameters.

  // Strip invalid IDs from URL after libraries load
  useEffect(() => {
    if (isLoadingLibraries || requestedSelectedIds === null) return;
    if (selectedIds.length !== requestedSelectedIds.length) {
      updateSearchParams(selectedIds);
    }
  }, [
    isLoadingLibraries,
    requestedSelectedIds,
    selectedIds,
    updateSearchParams,
  ]);

  const selectedLibraries = useMemo(
    () => libraries.filter((library) => selectedIds.includes(library.id)),
    [libraries, selectedIds]
  );
  const allSelected =
    libraries.length > 0 && selectedIds.length === libraries.length;
  const noneSelected = selectedIds.length === 0;

  const toggleLibrary = useCallback(
    (id: string) => {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id];
      updateSearchParams(next);
    },
    [selectedIds, updateSearchParams]
  );

  const toggleAll = useCallback(() => {
    const next = allSelected ? [] : libraries.map((library) => library.id);
    updateSearchParams(next);
  }, [allSelected, libraries, updateSearchParams]);

  const clearSelection = useCallback(() => {
    updateSearchParams([]);
  }, [updateSearchParams]);

  const contextValue = useMemo(
    () => ({
      libraries,
      selectedIds,
      isLoadingLibraries,
      allSelected,
      noneSelected,
      selectedLibraries,
      toggleLibrary,
      toggleAll,
      clearSelection,
    }),
    [
      libraries,
      selectedIds,
      isLoadingLibraries,
      allSelected,
      noneSelected,
      selectedLibraries,
      toggleLibrary,
      toggleAll,
      clearSelection,
    ]
  );

  return (
    <ChatLibraryContext.Provider value={contextValue}>
      {children}
    </ChatLibraryContext.Provider>
  );
}

/** @deprecated Use `ChatLibraryProvider` instead. */
export const ChatSidebarProvider = ChatLibraryProvider;
