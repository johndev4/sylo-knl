'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { updateLibraryName } from '@/features/library/actions';
import { appToast } from '@/lib/toast';

interface RenameLibraryFormProps {
  libraryId: string;
  initialName: string;
}

export function RenameLibraryForm({
  libraryId,
  initialName,
}: RenameLibraryFormProps) {
  const [name, setName] = useState(initialName);
  const [isUpdating, setIsUpdating] = useState(false);
  const [originalName, setOriginalName] = useState(initialName);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === originalName) return;

    try {
      setIsUpdating(true);
      await updateLibraryName(libraryId, trimmedName);
      setOriginalName(trimmedName);
      appToast.success('Library renamed successfully');
    } catch (err) {
      appToast.error(
        err instanceof Error ? err.message : 'Failed to rename library'
      );
      setName(originalName); // Reset to original on error
    } finally {
      setIsUpdating(false);
    }
  };

  const isDirty = name.trim() !== originalName && name.trim().length > 0;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Library Name</h2>
          <p className="text-muted-foreground text-sm">
            Change the name of your library. This will be visible to all
            members.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="library-name">Name</Label>
          <div className="flex gap-2">
            <Input
              id="library-name"
              name="libraryName"
              autoComplete="off"
              aria-invalid={!isDirty && name.trim().length === 0}
              aria-describedby={
                !isDirty && name.trim().length === 0
                  ? 'library-name-error'
                  : undefined
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Awesome Library…"
              disabled={isUpdating}
              maxLength={50}
              className="max-w-md"
            />
            <Button type="submit" disabled={!isDirty || isUpdating}>
              {isUpdating ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
          {!isDirty && name.trim().length === 0 && (
            <p
              id="library-name-error"
              className="text-xs text-red-500"
              aria-live="polite"
            >
              Name cannot be empty
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}
