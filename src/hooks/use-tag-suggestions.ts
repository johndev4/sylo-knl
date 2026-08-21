'use client';

import { createClient } from '@/lib/supabase/client';
import { getLibraryTagSuggestions } from '@/queries/libraries';
import { useEffect, useMemo, useState } from 'react';

const MIN_TAG_QUERY_LENGTH = 3;

export function useTagSuggestions(
  libraryId: string,
  tagInput: string,
  existingTags: string[]
) {
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [lastQuery, setLastQuery] = useState('');

  useEffect(() => {
    const query = tagInput.trim();
    if (query.length < MIN_TAG_QUERY_LENGTH) {
      return;
    }

    if (query === lastQuery) {
      return;
    }

    const timeout = setTimeout(() => {
      const fetchTags = async () => {
        setIsLoadingTags(true);
        setLoadError(null);

        try {
          const supabase = await createClient();
          const tags = await getLibraryTagSuggestions(
            libraryId,
            query,
            supabase
          );
          setAvailableTags(Array.isArray(tags) ? tags : []);
          setLastQuery(query);
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          setLoadError(message);
        } finally {
          setIsLoadingTags(false);
        }
      };

      fetchTags();
    }, 180);

    return () => clearTimeout(timeout);
  }, [libraryId, tagInput, lastQuery]);

  const lowerCaseExistingTags = useMemo(
    () => new Set(existingTags.map((tag) => tag.toLowerCase())),
    [existingTags]
  );

  const filteredSuggestions = useMemo(() => {
    const query = tagInput.trim().toLowerCase();
    if (query.length < 3 || availableTags.length === 0) {
      return [];
    }

    return availableTags
      .filter(
        (tag) =>
          tag.toLowerCase().includes(query) &&
          !lowerCaseExistingTags.has(tag.toLowerCase())
      )
      .slice(0, 10);
  }, [availableTags, lowerCaseExistingTags, tagInput]);

  return {
    suggestions: filteredSuggestions,
    isLoadingTags,
    loadError,
  };
}
