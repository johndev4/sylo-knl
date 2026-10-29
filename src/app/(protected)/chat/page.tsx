'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, Bot, Trash2, User } from 'lucide-react';
import AITextLoading from '@/components/kokonutui/ai-text-loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';
import { useChatSidebar } from '@/features/chat/providers/chat-sidebar-provider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const prefersReducedMotion = useReducedMotion();
  const {
    libraries,
    isLoadingLibraries,
    noneSelected,
    selectedIds,
    selectedLibraries,
  } = useChatSidebar();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!input.trim() || isLoading || noneSelected) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
      };
      setMessages((current) => [...current, userMessage]);
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
          const error = await response
            .json()
            .catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error ?? 'Failed to get response');
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
        setMessages((current) => [...current, assistantMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value);
          setMessages((current) => {
            const updated = [...current];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: assistantContent,
            };
            return updated;
          });
        }
      } catch (error) {
        console.error('Chat error:', error);
        setMessages((current) => [
          ...current,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Please try again.'}`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, noneSelected, selectedIds]
  );

  const messageItemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: prefersReducedMotion ? 0 : 0.28,
          ease: 'easeOut' as const,
        },
      },
    }),
    [prefersReducedMotion]
  );

  if (isLoadingLibraries) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="size-8 rounded-full border-4 border-indigo-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-neutral-200/10 px-2 py-2 dark:border-neutral-800/20">
        <SidebarTrigger />
        {messages.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
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
              }
            />
            <TooltipContent>Clear all messages</TooltipContent>
          </Tooltip>
        )}
      </div>

      <main
        className="flex-1 overflow-y-auto p-4 md:p-6"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
      >
        <div className="mx-auto max-w-3xl">
          {messages.length === 0 ? (
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
                <div className="absolute -top-1 -right-1 size-4 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-neutral-950" />
              </div>

              <div className="max-w-md space-y-2">
                <h2 className="text-xl font-semibold">
                  {noneSelected ? 'Pick a library to begin' : 'Ready to answer'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {noneSelected
                    ? 'Use the library selector in the sidebar to choose which knowledge bases to query.'
                    : `Querying ${selectedIds.length === libraries.length ? 'all your libraries' : selectedLibraries.map((library) => library.name).join(', ')}. Ask anything and the AI will answer from your documents.`}
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
                      className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm text-neutral-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  variants={messageItemVariants}
                  initial="hidden"
                  animate="visible"
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                      <Bot className="size-4 text-white" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                      message.role === 'user'
                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950'
                        : 'border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                    )}
                  >
                    {message.role === 'assistant' &&
                    isLoading &&
                    index === messages.length - 1 &&
                    message.content === '' ? (
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
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-neutral-900 shadow-sm dark:bg-neutral-100">
                      <User className="size-4 text-white dark:text-neutral-950" />
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-white/80 px-4 py-4 backdrop-blur-sm dark:border-neutral-800/50 dark:bg-neutral-950/80">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-center gap-2"
        >
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                noneSelected
                  ? 'Select a library in the sidebar first…'
                  : 'Ask about your knowledge base…'
              }
              className="h-12 rounded-2xl border-neutral-200/60 bg-neutral-50/50 px-4 focus-visible:ring-indigo-400 dark:border-neutral-800/60 dark:bg-neutral-900/50"
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
  );
}
