'use client';

import { useCallback } from 'react';
import type { UIMessage } from 'ai';
import { logger } from '@/lib/logging/logger';

const STORAGE_PREFIX = 'sylo:chat-history:v1:';
const MAX_MESSAGES = 100;

interface StoredChatHistory<METADATA = unknown> {
  version: 1;
  updatedAt: number;
  messages: UIMessage<METADATA>[];
}

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function useChatHistory<METADATA = unknown>(userId?: string | null) {
  const getStoredMessages = useCallback((): UIMessage<METADATA>[] => {
    if (!userId || typeof window === 'undefined') {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(getStorageKey(userId));
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        'version' in parsed &&
        (parsed as StoredChatHistory).version === 1 &&
        Array.isArray((parsed as StoredChatHistory).messages)
      ) {
        return (parsed as StoredChatHistory<METADATA>).messages;
      }
    } catch (error: unknown) {
      logger.warn('Unable to read saved chat history', { error });
    }

    return [];
  }, [userId]);

  const saveHistory = useCallback(
    (messages: UIMessage<METADATA>[]) => {
      if (!userId || typeof window === 'undefined') return;

      try {
        if (messages.length === 0) {
          window.localStorage.removeItem(getStorageKey(userId));
          return;
        }

        const trimmedMessages = messages.slice(-MAX_MESSAGES);
        const payload: StoredChatHistory = {
          version: 1,
          updatedAt: Date.now(),
          messages: trimmedMessages,
        };

        window.localStorage.setItem(
          getStorageKey(userId),
          JSON.stringify(payload)
        );
      } catch (error: unknown) {
        logger.warn('Unable to save chat history', { error });
      }
    },
    [userId]
  );

  const clearHistory = useCallback(() => {
    if (!userId || typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(getStorageKey(userId));
    } catch (error: unknown) {
      logger.warn('Unable to clear saved chat history', { error });
    }
  }, [userId]);

  return {
    getStoredMessages,
    saveHistory,
    clearHistory,
  };
}
