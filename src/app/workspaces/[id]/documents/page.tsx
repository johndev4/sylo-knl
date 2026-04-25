"use client";

import { useState, useRef, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkspaceNav from "@/components/workspace-settings/WorkspaceNav";

export default function DocumentsPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          spaceId: params.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to ingest document");
      }

      setMessage({ text: "Document successfully processed and added to Knowledge Base!", type: 'success' });
      setTitle("");
      setContent("");
      
      // Let user view it or navigate back
      setTimeout(() => {
        router.push(`/workspaces/${params.id}/chat`);
      }, 2000);
      
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrollToForm = () => {
    titleInputRef.current?.focus();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <a href={`/workspaces`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </a>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Knowledge Ingestion</h1>
          <p className="text-muted-foreground">
            Add new documents to this space. Text will be chunked, embedded, and stored for RAG.
          </p>
        </div>
      </div>

      <WorkspaceNav workspaceId={params.id} currentSection="documents" />

      <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="order-2 lg:order-1">
          <CardHeader>
            <CardTitle>Add Document</CardTitle>
            <CardDescription>
              Paste your manual, documentation, or transcript here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Q3 Financial Report"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Text Content</Label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste the full text here..."
                  className="flex min-h-[300px] w-full rounded-lg border border-border bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm transition-smooth placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950"
                  required
                />
              </div>

              {message && (
                <div
                  className={`p-4 rounded-lg text-sm border ${
                    message.type === 'success' 
                      ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' 
                      : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {message.text}
                </div>
              )}

              <Button type="submit" disabled={isLoading || !content.trim()}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Processing & Embedding..." : "Ingest Document"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <aside className="order-1 lg:order-2 space-y-4">
          <Card className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <CardHeader>
              <CardTitle>Need a quick start?</CardTitle>
              <CardDescription>Upload your first document and then ask the workspace AI questions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Every document is automatically chunked and embedded for fast retrieval.</p>
              <div className="mt-4 flex flex-col gap-3">
                <Button variant="outline" onClick={handleScrollToForm}>Focus upload form</Button>
                <Button variant="default" onClick={() => router.push(`/workspaces/${params.id}/chat`)}>Go to chat</Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
