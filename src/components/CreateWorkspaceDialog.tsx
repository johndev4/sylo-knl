'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createWorkspace } from '@/lib/actions/workspaces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateWorkspaceDialogProps {
  triggerClassName?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon';
  triggerText?: string;
}

export function CreateWorkspaceDialog({ 
  triggerClassName, 
  variant = 'default',
  size = 'default',
  triggerText = 'Create Workspace'
}: CreateWorkspaceDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const workspace = await createWorkspace(name);
      setIsOpen(false);
      setName('');
      router.push('/spaces');
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={() => !isLoading && setIsOpen(false)}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-zinc-950 w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-bold tracking-tight">Create New Workspace</h2>
            <button 
              onClick={() => !isLoading && setIsOpen(false)}
              className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              disabled={isLoading}
            >
              <X className="h-4 w-4 text-zinc-500" />
            </button>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Workspaces help you organize documents by project or team.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g. Engineering, Marketing, Private"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
                disabled={isLoading}
                className="h-11"
              />
              {error && (
                <p className="text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        variant={variant}
        size={size}
        className={triggerClassName}
      >
        <Plus className={cn("h-4 w-4", triggerText ? "mr-2" : "")} />
        {triggerText}
      </Button>

      {isOpen && mounted && createPortal(modal, document.body)}
    </>
  );
}
