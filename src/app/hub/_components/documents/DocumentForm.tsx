'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, X, Save, Loader2 } from 'lucide-react';
import { useSidebarRefresh } from './SidebarRefreshContext';

interface DocumentFormProps {
  libraryId: string;
  initialData?: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    updated_at: string;
    created_at?: string;
  };
}

export function DocumentForm({ libraryId, initialData }: DocumentFormProps) {
  const router = useRouter();
  const { triggerRefresh } = useSidebarRefresh();
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialData;
  const now = new Date().toISOString();
  const createdAt = initialData?.created_at || now;
  const updatedAt = initialData?.updated_at || now;

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() !== '') {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/documents/${initialData.id}`
        : `/api/documents`;

      const method = isEditing ? 'PUT' : 'POST';

      const payload: any = {
        title,
        content: content || '', // Allow empty content during creation if using Novel
        tags,
      };

      if (!isEditing) {
        payload.libraryId = libraryId;
      } else {
        payload.lastUpdatedAt = initialData.updated_at;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            data.error || 'Conflict: Document was edited by another user.'
          );
        }
        throw new Error(data.error || 'Failed to save document');
      }

      triggerRefresh();
      router.push(
        `/hub/libraries/${libraryId}/documents/${data.documentId || initialData?.id}`
      );
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn flex h-full flex-col overflow-hidden">
      <form onSubmit={handleSubmit} className="flex h-full flex-col">
        {/* Top Sticky Header with Controls */}
        <div className="bg-background/80 z-20 flex shrink-0 items-center justify-between px-8 py-4 backdrop-blur-sm">
          <div className="mr-4 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Document"
              aria-label="Document Title"
              className="placeholder:text-muted-foreground/30 text-foreground w-full border-none bg-transparent text-3xl font-bold focus:outline-none"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              disabled={isLoading}
              className="text-muted-foreground"
            >
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !title.trim()}
              className="rounded-lg bg-[#10b981] px-4 font-semibold text-white shadow-sm hover:bg-[#059669]"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="scrollbar-hide flex-1 overflow-y-auto px-8 pb-20">
          <div className="max-w-4xl">
            {/* Metadata Row */}
            <div className="text-muted-foreground/40 mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[10px] font-bold tracking-wider uppercase">
              <div className="flex items-center">
                <Calendar className="mr-2 h-3.5 w-3.5" />
                CREATED:{' '}
                <span className="text-muted-foreground/80 ml-1">
                  {new Date(createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="mr-2 h-3.5 w-3.5" />
                MODIFIED:{' '}
                <span className="text-muted-foreground/80 ml-1">
                  {new Date(updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center">
                <Users className="mr-2 h-3.5 w-3.5" />
                AUTHORS:{' '}
                <span className="text-muted-foreground/80 ml-1">YOU</span>
              </div>
            </div>

            {/* Tags Section */}
            <div className="mb-10 flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-900">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-muted-foreground hover:text-foreground group flex items-center gap-1 rounded-full border-none bg-zinc-100 px-3 py-0.5 text-[10px] transition-colors dark:bg-zinc-900"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="min-w-[120px] flex-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tag..."
                  aria-label="Tags"
                  className="text-muted-foreground/60 placeholder:text-muted-foreground/20 w-full border-none bg-transparent text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 text-destructive border-destructive/20 mb-4 rounded-lg border p-3 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Novel Editor */}
            <div className="min-h-[500px]">
              {/* <NovelEditor
                value={content}
                onChange={setContent}
                disabled={isLoading}
              /> */}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
