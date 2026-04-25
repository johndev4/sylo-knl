'use client';

import { motion } from 'framer-motion';

interface LoginHeroProps {
  children: React.ReactNode;
}

export function LoginHero({ children }: LoginHeroProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-slate-100">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_35%)]" />
        <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:px-8 lg:grid-cols-[1.4fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="space-y-8"
          >
            <div className="inline-flex rounded-full bg-sky-100 px-4 py-1 text-sm font-semibold text-sky-700 shadow-sm dark:bg-sky-900/20 dark:text-sky-200">
              AI-powered knowledge library
            </div>
            <div className="max-w-2xl space-y-6">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Turn your documents into searchable library answers.
              </h1>
              <p className="max-w-xl text-base text-slate-600 dark:text-slate-300">
                Upload documents, organize libraries, and get accurate AI responses based on your own knowledge base. Built for teams that need fast, reliable access to shared information.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">Search faster</p>
                <p className="mt-3 text-base font-semibold text-slate-950 dark:text-white">Find answers inside documents instantly.</p>
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">Secure access</p>
                <p className="mt-3 text-base font-semibold text-slate-950 dark:text-white">Manage libraries, roles, and protected knowledge.</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="rounded-[2rem] border border-zinc-200 bg-white/95 p-8 shadow-2xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
