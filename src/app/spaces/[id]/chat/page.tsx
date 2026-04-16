"use client";

import { use, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, User, ArrowUp, Loader2 } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      <header className="flex justify-between items-center p-4 border-b bg-background dark:bg-background/95">
        <h1 className="font-semibold text-lg">AI Knowledge Chat</h1>
        <div className="flex gap-4">
          <Link href={`/spaces/${params.id}/documents`}>
            <Button variant="outline" size="sm">Manage Documents</Button>
          </Link>
          <Link href="/spaces">
            <Button variant="ghost" size="sm">Back to Spaces</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
           <div className="text-center text-muted-foreground mt-20">
             <Bot className="mx-auto h-12 w-12 text-muted-foreground/60 mb-4" />
             <h2 className="text-xl font-medium mb-2">Welcome to your Knowledge Base</h2>
             <p>Ask a question, and the AI will answer strictly based on your uploaded documents.</p>
           </div>
          ) : (
            <>
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot size={18} className="text-primary" />
                    </div>
                  )}
                  
                  <Card className={`max-w-[85%] border-none shadow-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card dark:bg-card'}`}>
                    <CardContent className="p-4 prose prose-sm dark:prose-invert">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </CardContent>
                  </Card>

                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <User size={18} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </main>

      <footer className="p-4 bg-background dark:bg-background/95 border-t">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your knowledge base..."
            className="pr-12 py-6 rounded-full bg-input border-none focus-visible:ring-1 focus-visible:ring-primary shadow-inner"
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            type="submit" 
            disabled={isLoading || !input.trim()} 
            className="absolute right-2 rounded-full h-8 w-8"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
          </Button>
        </form>
        <div className="text-center mt-2 text-xs text-muted-foreground">
          AI can make mistakes. Verify answers with source documents.
        </div>
      </footer>
    </div>
  );
}
