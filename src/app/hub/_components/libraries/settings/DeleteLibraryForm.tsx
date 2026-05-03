'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { deleteLibrary } from '@/lib/actions/libraries';

interface DeleteLibraryFormProps {
  libraryId: string;
  libraryName: string;
}

export function DeleteLibraryForm({
  libraryId,
  libraryName,
}: DeleteLibraryFormProps) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Animation variants for error message
  const errorVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: 'easeOut' as const,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.2,
      },
    },
  };

  const handleDelete = async () => {
    if (confirmName !== libraryName) {
      setError('Library name does not match. Please try again.');
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteLibrary(libraryId);
      router.push('/hub');
    } catch (err: any) {
      setError(err.message || 'Failed to delete library. Please try again.');
      setIsDeleting(false);
    }
  };

  const canDelete = confirmName === libraryName && !isDeleting;

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-100 p-2.5 dark:bg-red-900/40">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle className="text-red-700 dark:text-red-400">
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-600 dark:text-red-500">
              Permanently delete this library
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-red-700 dark:text-red-400">
            Deleting this library will:
          </p>
          <ul className="ml-4 space-y-1 text-sm text-red-600 dark:text-red-500">
            <li className="flex items-start gap-2">
              <span className="mt-1.5">•</span>
              <span>Permanently delete all documents in this library</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5">•</span>
              <span>Remove all members from the library</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5">•</span>
              <span>This action cannot be undone</span>
            </li>
          </ul>
        </div>

        <div className="space-y-2 pt-2">
          <Label
            htmlFor="confirm-name"
            className="text-sm font-medium text-red-700 dark:text-red-400"
          >
            Type the library name to confirm deletion:
          </Label>
          <Input
            id="confirm-name"
            type="text"
            placeholder={libraryName}
            value={confirmName}
            onChange={(e) => {
              setConfirmName(e.target.value);
              setError(null);
            }}
            className="cursor-text font-mono text-sm"
            disabled={isDeleting}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Enter <span className="font-semibold">"{libraryName}"</span> to
            enable the delete button
          </p>
        </div>

        {error && (
          <motion.div
            variants={errorVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="rounded border border-red-300 bg-red-200 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/40 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}

        <Button
          variant="destructive"
          className="w-full cursor-pointer bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
          onClick={handleDelete}
          disabled={!canDelete}
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting library...
            </>
          ) : (
            'Delete Library'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
