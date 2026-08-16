'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface SidebarRefreshContextValue {
  refreshKey: number;
  triggerRefresh: () => void;
}

const SidebarRefreshContext = createContext<SidebarRefreshContextValue>({
  refreshKey: 0,
  triggerRefresh: () => {},
});

export function SidebarRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  return (
    <SidebarRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </SidebarRefreshContext.Provider>
  );
}

export function useSidebarRefresh() {
  return useContext(SidebarRefreshContext);
}
