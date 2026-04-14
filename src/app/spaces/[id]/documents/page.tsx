"use client";

import { useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DocumentsPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
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
        router.push(`/spaces/${params.id}/chat`);
      }, 2000);
      
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href={`/spaces`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Spaces
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Ingestion</h1>
        <p className="text-muted-foreground mt-2">
          Add new documents to this space. Text will be chunked, embedded, and stored for RAG.
        </p>
      </div>

      <Card>
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
                className="flex min-h-[300px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>

            {message && (
              <div className={`p-4 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
    </div>
  );
}
