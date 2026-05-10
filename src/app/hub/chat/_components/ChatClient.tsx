'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import AITextLoading from '@/components/kokonutui/ai-text-loading';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Bot, User, ArrowUp, Trash2 } from 'lucide-react';
import { ChatSidebar } from './ChatSidebar';

interface Library {
  id: string;
  name: string;
  role: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatClientProps {
  libraries: Library[];
  initialLibraryIds: string[];
}

export default function ChatClient({
  libraries,
  initialLibraryIds,
}: ChatClientProps) {
  const prefersReducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>(initialLibraryIds);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Library selection helpers ──────────────────────────────────────────────
  const allSelected = selectedIds.length === libraries.length;
  const noneSelected = selectedIds.length === 0;

  const toggleLibrary = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : libraries.map((l) => l.id));
  };

  const selectedLibraries = libraries.filter((l) => selectedIds.includes(l.id));

  // ── Chat submission ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || noneSelected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          libraryIds: selectedIds,
        }),
      });

      if (!response.ok) {
        const err = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? 'Failed to get response');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantContent += decoder.decode(value);

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: assistantContent,
          };
          return updated;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Please try again.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Animations ────────────────────────────────────────────────────────────
  const messageItemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.28,
        ease: 'easeOut' as const,
      },
    },
  };

  // ── Selector label (unused now, but keeping for logic if needed) ──────────
  // const selectorLabel = ...

  return (
    <div className="bg-background flex h-[calc(100vh-4.5rem)] w-full overflow-hidden">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <ChatSidebar
        libraries={libraries}
        selectedIds={selectedIds}
        onToggleLibrary={toggleLibrary}
        onToggleAll={toggleAll}
        allSelected={allSelected}
        noneSelected={noneSelected}
      />

      {/* ── Main Chat Area ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sub-header (Optional/Minimal) */}
        <div className="flex items-center justify-end border-b border-zinc-200/10 px-6 py-2 dark:border-zinc-800/20">
          {messages.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessages([])}
                  className="text-muted-foreground hover:text-foreground h-8 gap-1.5 text-[10px] font-bold tracking-widest uppercase"
                  aria-label="Clear chat"
                >
                  <Trash2 className="size-3" />
                  Clear History
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear all messages</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* ── Messages (Scrollable) ────────────────────────────────────────── */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          aria-label="Chat messages"
          aria-live="polite"
          aria-atomic="false"
        >
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
                className="flex flex-col items-center justify-center gap-8 pt-16 text-center"
              >
                <div className="relative">
                  <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 shadow-inner ring-1 ring-indigo-200 dark:ring-indigo-800">
                    <Bot className="size-10 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 size-4 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-zinc-950" />
                </div>

                <div className="max-w-md space-y-2">
                  <h2 className="text-xl font-semibold">
                    {noneSelected
                      ? 'Pick a library to begin'
                      : 'Ready to answer'}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {noneSelected
                      ? 'Use the library selector in the sidebar to choose which knowledge bases to query.'
                      : `Querying ${selectedIds.length === libraries.length ? 'all your libraries' : selectedLibraries.map((l) => l.name).join(', ')}. Ask anything and the AI will answer from your documents.`}
                  </p>
                </div>

                {!noneSelected && (
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      'What topics are covered?',
                      'Summarize the key concepts',
                      'Find recent updates',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm text-zinc-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex flex-col gap-5">
                {messages.map((m, i) => (
                  <motion.div
                    key={m.id}
                    variants={messageItemVariants}
                    initial="hidden"
                    animate="visible"
                    className={cn(
                      'flex gap-3',
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {m.role === 'assistant' && (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                        <Bot className="size-4 text-white" />
                      </div>
                    )}

                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                        m.role === 'user'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                          : 'border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                      )}
                    >
                      {m.role === 'assistant' &&
                      isLoading &&
                      i === messages.length - 1 &&
                      m.content === '' ? (
                        <AITextLoading
                          texts={[
                            'Searching libraries…',
                            'Retrieving context…',
                            'Composing answer…',
                          ]}
                          interval={1400}
                          className="text-sm font-normal"
                        />
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {m.role === 'user' && (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 shadow-sm dark:bg-zinc-100">
                        <User className="size-4 text-white dark:text-zinc-950" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing indicator while loading (after last user message) */}
                {isLoading &&
                  messages[messages.length - 1]?.role === 'user' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                        <Bot className="size-4 text-white" />
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <AITextLoading
                          texts={[
                            'Searching libraries…',
                            'Retrieving context…',
                            'Composing answer…',
                          ]}
                          interval={1400}
                          className="text-sm font-normal"
                        />
                      </div>
                    </motion.div>
                  )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* ── Input footer (Pinned) ────────────────────────────────────────── */}
        <footer className="border-t border-zinc-200 bg-white/80 px-4 py-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/80">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl items-center gap-2"
          >
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  noneSelected
                    ? 'Select a library in the sidebar first…'
                    : 'Ask about your knowledge base…'
                }
                className="h-12 rounded-2xl border-zinc-200/60 bg-zinc-50/50 px-4 focus-visible:ring-indigo-400 dark:border-zinc-800/60 dark:bg-zinc-900/50"
                disabled={isLoading || noneSelected}
                aria-label="Chat message input"
                aria-disabled={isLoading || noneSelected}
              />
            </div>

            <Button
              id="chat-submit"
              size="icon"
              type="submit"
              disabled={isLoading || !input.trim() || noneSelected}
              className="size-12 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm hover:from-indigo-600 hover:to-violet-700 disabled:opacity-40"
              aria-label="Send message"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="size-4 rounded-full border-2 border-white/30 border-t-white"
                />
              ) : (
                <ArrowUp className="size-5" />
              )}
            </Button>
          </form>

          <p className="text-muted-foreground mt-3 text-center text-[10px] font-medium opacity-60">
            AI responses are based strictly on your uploaded documents. Always
            verify with source material.
          </p>
        </footer>
      </div>
    </div>
  );
}
