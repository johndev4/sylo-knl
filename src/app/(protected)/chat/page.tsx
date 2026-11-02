'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import {
  Message,
  MessageAvatar,
  MessageContent,
} from '@/components/ui/message';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSession } from '@/components/providers/auth-provider';
import { useChatHistory } from '@/features/chat/hooks/use-chat-history';
import { useChatLibrary } from '@/features/chat/providers/chat-library-provider';
import { LibrarySelectorButton } from '@/features/chat/components/library-selector-button';
import { appToast } from '@/lib/toast';

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function getMessageText(message: UIMessage | undefined) {
  return (
    message?.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('') ?? ''
  );
}

function ChatView({ userId }: { userId?: string | null }) {
  const prefersReducedMotion = useReducedMotion();
  const { allSelected, noneSelected, selectedIds, selectedLibraries } =
    useChatLibrary();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const { getStoredMessages, saveHistory, clearHistory } =
    useChatHistory(userId);
  const [initialMessages] = useState(() => getStoredMessages());

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
  } = useChat({
    transport,
    messages: initialMessages,
  });
  const isBusy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (status === 'ready' || status === 'error') {
      saveHistory(messages);
    }
  }, [messages, saveHistory, status]);

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
    clearHistory();
    clearError();
    setIsClearDialogOpen(false);
    appToast.success('Chat history cleared');
  }

  function handleMessagesScroll(event: React.UIEvent<HTMLElement>) {
    const element = event.currentTarget;
    shouldAutoScrollRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 96;
  }

  const selectedCountLabel = allSelected
    ? 'All libraries'
    : `${selectedIds.length} ${selectedIds.length === 1 ? 'library' : 'libraries'} selected`;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b px-3 py-2 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">Library Chat</h1>
          <p className="text-muted-foreground truncate text-xs">
            {selectedCountLabel}
          </p>
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

      <ScrollArea
        className="min-h-0 min-w-0 flex-1"
        viewportProps={{
          render: <main />,
          className: 'overflow-y-auto p-3 sm:p-4 md:p-6',
          'aria-label': 'Chat messages',
          'aria-live': 'polite',
          'aria-atomic': false,
          onScroll: handleMessagesScroll,
        }}
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
                    ? 'Select one or more knowledge bases from the library picker below to start a conversation.'
                    : `Searching ${allSelected ? 'all your libraries' : selectedLibraries.map((library) => library.name).join(', ')}. Answers are grounded in your documents.`}
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
      </ScrollArea>

      <footer className="bg-background/95 supports-[backdrop-filter]:bg-background/80 shrink-0 border-t px-3 py-2 backdrop-blur sm:px-6 sm:py-4">
        {status === 'error' && (
          <div
            className="border-destructive/30 bg-destructive/5 mx-auto mb-3 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
            role="alert"
          >
            <span className="text-destructive">
              Couldn&apos;t generate a response.
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
          librarySelector={<LibrarySelectorButton />}
          placeholder={
            noneSelected
              ? 'Select a library below first…'
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
        <p className="text-muted-foreground mx-auto mt-1 max-w-3xl text-center text-[10px] leading-4 sm:mt-2 sm:text-xs">
          AI responses are based strictly on your uploaded documents. Always
          verify with source material.
        </p>
      </footer>
    </div>
  );
}

export default function ChatPage() {
  const isMounted = useMounted();
  const { user } = useSession();
  const { isLoadingLibraries } = useChatLibrary();

  if (isLoadingLibraries || !isMounted) {
    return (
      <div
        className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm"
        role="status"
      >
        <span className="bg-primary size-2 animate-pulse rounded-full motion-reduce:animate-none" />
        {isLoadingLibraries ? 'Loading libraries…' : 'Loading conversation…'}
      </div>
    );
  }

  return <ChatView key={user?.id ?? 'anonymous'} userId={user?.id} />;
}
