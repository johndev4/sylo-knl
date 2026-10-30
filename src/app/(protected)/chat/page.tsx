'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import { Streamdown } from 'streamdown';
import { TextStreamChatTransport, type UIMessage } from 'ai';
import { Bot, RotateCcw, Trash2, User } from 'lucide-react';
import AITextLoading from '@/components/kokonutui/ai-text-loading';
import AIInputSearch, {
  type AIInputSearchProps,
} from '@/components/kokonutui/ai-input-search';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import {
  Message,
  MessageAvatar,
  MessageContent,
} from '@/components/ui/message';
import { useChatSidebar } from '@/features/chat/providers/chat-sidebar-provider';

function getMessageText(message: UIMessage | undefined) {
  return (
    message?.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('') ?? ''
  );
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [transport] = useState(
    () =>
      new TextStreamChatTransport<UIMessage>({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...(body ?? {}),
            messages: messages
              .filter((message) => message.role !== 'system')
              .map((message) => ({
                role: message.role,
                content: getMessageText(message),
              })),
          },
        }),
      })
  );
  const {
    messages,
    sendMessage,
    setMessages,
    stop,
    regenerate,
    status,
    clearError,
  } = useChat({ transport });
  const isBusy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'instant',
        block: 'end',
      });
    }
  }, [messages]);

  async function handleSearch(
    query: string,
    { signal }: Parameters<NonNullable<AIInputSearchProps['onSearch']>>[1]
  ) {
    shouldAutoScrollRef.current = true;
    const abortChat = () => void stop();
    signal.addEventListener('abort', abortChat, { once: true });
    try {
      await sendMessage({ text: query }, { body: { libraryIds: selectedIds } });
    } finally {
      signal.removeEventListener('abort', abortChat);
    }
  }

  function clearChat() {
    if (isBusy) void stop();
    setMessages([]);
    clearError();
    setIsClearDialogOpen(false);
  }

  function handleMessagesScroll(event: React.UIEvent<HTMLElement>) {
    const element = event.currentTarget;
    shouldAutoScrollRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 96;
  }

  if (isLoadingLibraries) {
    return (
      <div
        className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm"
        role="status"
      >
        <span className="bg-primary size-2 animate-pulse rounded-full motion-reduce:animate-none" />
        Loading libraries…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Library Chat</h1>
            <p className="text-muted-foreground truncate text-xs">
              {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'library' : 'libraries'} selected
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsClearDialogOpen(true)}
                    aria-label="Clear chat history"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                }
              />
              <TooltipContent>Clear chat history</TooltipContent>
            </Tooltip>
            <AlertDialog
              open={isClearDialogOpen}
              onOpenChange={setIsClearDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all messages from the current chat.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={clearChat}>
                    Clear conversation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </header>

      <main
        className="flex-1 overflow-y-auto p-4 md:p-6"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
        onScroll={handleMessagesScroll}
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
              className="flex flex-1 flex-col items-center justify-center gap-7 py-12 text-center"
            >
              <div className="bg-muted/50 text-foreground flex size-16 items-center justify-center rounded-2xl border shadow-sm">
                <Bot className="size-8" aria-hidden="true" />
              </div>

              <div className="max-w-lg space-y-2">
                <h2 className="text-2xl font-semibold">
                  {noneSelected ? 'Choose a library' : 'Ask your library'}
                </h2>
                <p className="text-muted-foreground text-sm leading-6">
                  {noneSelected
                    ? 'Select one or more knowledge bases from the sidebar to start a conversation.'
                    : `Searching ${selectedIds.length === libraries.length ? 'all your libraries' : selectedLibraries.map((library) => library.name).join(', ')}. Answers are grounded in your documents.`}
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-6 py-2">
              {messages.map((message, index) => {
                const content = getMessageText(message);
                const isLatest = index === messages.length - 1;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                  >
                    <Message align={message.role === 'user' ? 'end' : 'start'}>
                      <MessageAvatar
                        className="bg-background text-muted-foreground size-8 self-start rounded-lg border"
                        aria-hidden="true"
                      >
                        {message.role === 'user' ? (
                          <User className="size-4" />
                        ) : (
                          <Bot className="size-4" />
                        )}
                      </MessageAvatar>
                      <MessageContent className="max-w-[min(100%,52rem)]">
                        <Bubble
                          variant={
                            message.role === 'user' ? 'default' : 'muted'
                          }
                          className="max-w-full shadow-sm"
                        >
                          <BubbleContent className="px-4 py-3">
                            {message.role === 'assistant' &&
                            isBusy &&
                            isLatest &&
                            !content ? (
                              <AITextLoading
                                texts={[
                                  'Searching libraries…',
                                  'Retrieving context…',
                                  'Composing answer…',
                                ]}
                                interval={1400}
                                className="text-sm font-normal"
                              />
                            ) : message.role === 'assistant' ? (
                              <Streamdown
                                className="prose prose-sm dark:prose-invert max-w-none break-words"
                                isAnimating={isBusy && isLatest}
                              >
                                {content}
                              </Streamdown>
                            ) : (
                              <p className="break-words whitespace-pre-wrap">
                                {content}
                              </p>
                            )}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </motion.div>
                );
              })}
              {isBusy && messages.at(-1)?.role === 'user' && (
                <Message align="start">
                  <MessageAvatar
                    className="bg-background text-muted-foreground size-8 self-start rounded-lg border"
                    aria-hidden="true"
                  >
                    <Bot className="size-4" />
                  </MessageAvatar>
                  <MessageContent>
                    <Bubble variant="muted">
                      <BubbleContent className="px-4 py-3">
                        <AITextLoading
                          texts={[
                            'Searching libraries…',
                            'Retrieving context…',
                            'Composing answer…',
                          ]}
                          interval={1400}
                          className="text-sm font-normal"
                        />
                      </BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <footer className="bg-background/95 supports-[backdrop-filter]:bg-background/80 shrink-0 border-t px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        {status === 'error' && (
          <div
            className="border-destructive/30 bg-destructive/5 mx-auto mb-3 flex max-w-3xl items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
            role="alert"
          >
            <span className="text-destructive">
              Couldn’t generate a response.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void regenerate({ body: { libraryIds: selectedIds } })
              }
            >
              <RotateCcw data-icon="inline-start" />
              Try again
            </Button>
          </div>
        )}
        <AIInputSearch
          className="max-w-3xl py-0"
          disabled={noneSelected}
          mode="chat"
          onSearch={handleSearch}
          placeholder={
            noneSelected
              ? 'Select a library in the sidebar first…'
              : 'Ask about your documents…'
          }
          suggestions={
            messages.length === 0 && !noneSelected
              ? [
                  'What topics are covered?',
                  'Summarize the key concepts',
                  'Find recent updates',
                ]
              : []
          }
        />
        <p className="text-muted-foreground mx-auto mt-2 max-w-3xl text-center text-xs">
          AI responses are based strictly on your uploaded documents. Always
          verify with source material.
        </p>
      </footer>
    </div>
  );
}
