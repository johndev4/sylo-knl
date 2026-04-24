'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { deleteWorkspace } from '@/lib/actions/workspaces';

interface DeleteWorkspaceFormProps {
  workspaceId: string;
  workspaceName: string;
}

export function DeleteWorkspaceForm({ workspaceId, workspaceName }: DeleteWorkspaceFormProps) {
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
    if (confirmName !== workspaceName) {
      setError('Workspace name does not match. Please try again.');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteWorkspace(workspaceId);
      router.push('/spaces');
    } catch (err: any) {
      setError(err.message || 'Failed to delete workspace. Please try again.');
      setIsDeleting(false);
    }
  };

  const canDelete = confirmName === workspaceName && !isDeleting;

  return (
    <Card className="border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-100 dark:bg-red-900/40 p-2.5">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle className="text-red-700 dark:text-red-400">Danger Zone</CardTitle>
            <CardDescription className="text-red-600 dark:text-red-500">
              Permanently delete this workspace
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-red-700 dark:text-red-400">
            Deleting this workspace will:
          </p>
          <ul className="text-sm text-red-600 dark:text-red-500 space-y-1 ml-4">
            <li className="flex items-start gap-2">
              <span className="mt-1.5">•</span>
              <span>Permanently delete all documents in this workspace</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5">•</span>
              <span>Remove all members from the workspace</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5">•</span>
              <span>This action cannot be undone</span>
            </li>
          </ul>
        </div>

        <div className="space-y-2 pt-2">
          <label htmlFor="confirm-name" className="text-sm font-medium text-red-700 dark:text-red-400">
            Type the workspace name to confirm deletion:
          </label>
          <Input
            id="confirm-name"
            type="text"
            placeholder={workspaceName}
            value={confirmName}
            onChange={(e) => {
              setConfirmName(e.target.value);
              setError(null);
            }}
            className="font-mono text-sm cursor-text"
            disabled={isDeleting}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Enter <span className="font-semibold">"{workspaceName}"</span> to enable the delete button
          </p>
        </div>

        {error && (
          <motion.div
            variants={errorVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="p-3 bg-red-200 dark:bg-red-900/40 border border-red-300 dark:border-red-900/60 rounded text-sm text-red-700 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}

        <Button
          variant="destructive"
          className="w-full bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 cursor-pointer"
          onClick={handleDelete}
          disabled={!canDelete}
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting workspace...
            </>
          ) : (
            'Delete Workspace'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
