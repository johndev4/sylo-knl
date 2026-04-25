'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Upload, Sparkles } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';

interface LibraryFabProps {
  onUpload?: () => void;
  onNewChat?: () => void;
}

export function LibraryFab({ onUpload, onNewChat }: LibraryFabProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' }}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
    >
      <div className="rounded-full bg-slate-950/95 text-white shadow-2xl ring-1 ring-slate-900/20 backdrop-blur-xl px-4 py-3 text-sm font-medium tracking-[0.02em] text-slate-100">
        Quick actions
      </div>
      {onUpload && (
        <Button
          size="sm"
          variant="secondary"
          onClick={onUpload}
          className="flex items-center gap-2 rounded-full px-4 py-2 shadow-lg"
        >
          <Upload className="h-4 w-4" />
          Upload docs
        </Button>
      )}
      {onNewChat && (
        <Button
          size="sm"
          variant="default"
          onClick={onNewChat}
          className="flex items-center gap-2 rounded-full px-4 py-2 shadow-lg"
        >
          <MessageSquare className="h-4 w-4" />
          New chat
        </Button>
      )}
      <div className="rounded-full bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm ring-1 ring-slate-900/10 backdrop-blur">
        <Sparkles className="inline h-3 w-3 text-amber-500 mr-1" /> Instant library actions
      </div>
    </motion.div>
  );
}
