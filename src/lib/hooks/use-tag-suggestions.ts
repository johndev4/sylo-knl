'use client';

import { useEffect, useMemo, useState } from 'react';

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
    if (query.length < 3) {
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
          const encodedQuery = encodeURIComponent(query);
          const response = await fetch(
            `/api/libraries/${encodeURIComponent(libraryId)}/tags?q=${encodedQuery}`
          );

          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || 'Failed to load tag suggestions');
          }

          const data = await response.json();
          const tags = Array.isArray(data.tags) ? data.tags : [];
          setAvailableTags(tags);
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
