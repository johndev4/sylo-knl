'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { updateLibraryName } from '@/lib/actions/libraries';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const prefersReducedMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === originalName) return;

    try {
      setIsUpdating(true);
      await updateLibraryName(libraryId, trimmedName);
      setOriginalName(trimmedName);
      setSuccess('Library renamed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename library');
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
          <p className="text-sm text-muted-foreground">
            Change the name of your library. This will be visible to all members.
          </p>
        </div>

        {error && (
          <motion.div
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          >
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          >
            <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
          </motion.div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="library-name">Name</Label>
          <div className="flex gap-2">
            <Input
              id="library-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Awesome Library"
              disabled={isUpdating}
              maxLength={50}
              className="max-w-md"
            />
            <Button 
              type="submit" 
              disabled={!isDirty || isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
          {!isDirty && name.trim().length === 0 && (
             <p className="text-xs text-red-500">Name cannot be empty</p>
          )}
        </div>
      </form>
    </Card>
  );
}
