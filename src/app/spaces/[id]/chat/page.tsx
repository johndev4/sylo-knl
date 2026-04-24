"use client";

import { use, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, User, ArrowUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkspaceNav from "@/components/workspace-settings/WorkspaceNav";
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = useReducedMotion();

  // Message animation variants
  const messageContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const messageItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: 'easeOut' as const,
      },
    },
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          spaceId: params.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantContent += chunk;
        
        // Update the assistant message with streaming content
        setMessages(prev => {
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
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <header className="flex flex-col gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950/80 shadow-soft-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-semibold text-lg">AI Knowledge Chat</h1>
            <p className="text-sm text-muted-foreground">Explore answers pulled from your workspace documents.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/spaces/${params.id}/documents`}>Manage Documents</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/spaces">Back to Dashboard</a>
            </Button>
          </div>
        </div>

        <WorkspaceNav workspaceId={params.id} currentSection="chat" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="space-y-6 text-center text-muted-foreground mt-20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-10 w-10" />
              </div>
              <div className="space-y-3">
                <h2 className="text-xl font-medium">Welcome to your Knowledge Base</h2>
                <p className="max-w-xl mx-auto">Ask a question, and the AI will answer strictly based on your uploaded documents.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <CardHeader>
                    <CardTitle>Upload more context</CardTitle>
                    <CardDescription>Bring the workspace up to date by adding recent documentation.</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <CardHeader>
                    <CardTitle>Start a fresh chat</CardTitle>
                    <CardDescription>Clear the current conversation and ask a new question anytime.</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          ) : (
            <motion.div
              variants={messageContainerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
              aria-live="polite"
              aria-atomic="false"
            >
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  variants={messageItemVariants}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800">
                      <Bot size={18} className="text-foreground" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] rounded-lg p-3 shadow-soft-sm ${m.role === 'user' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'}`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>

                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0">
                      <User size={18} className="text-white dark:text-zinc-950" />
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </div>
      </main>

      <footer className="p-4 bg-white dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-zinc-800/50 shadow-soft-xs">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your knowledge base..."
            className="flex-1 rounded-lg focus-visible:ring-2 transition-smooth"
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            type="submit" 
            disabled={isLoading || !input.trim()} 
            className="rounded-lg h-9 w-9"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
          </Button>
        </form>
        <div className="text-center mt-3 text-xs text-muted-foreground">
          AI can make mistakes. Verify answers with source documents.
        </div>
      </footer>
    </div>
  );
}
