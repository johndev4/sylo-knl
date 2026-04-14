import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SpacesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch spaces user is a member of
  const spaceMemberships = await prisma.spaceMember.findMany({
    where: { userId: user.id },
    include: { space: true },
  });

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Spaces</h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-gray-500">{user.email}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Personal Space Fallback */}
        {spaceMemberships.length === 0 && (
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle>Personal Knowledge Base</CardTitle>
              <CardDescription>Your private documents and notes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Link href={`/spaces/${user.id}/chat`}>
                  <Button variant="default" className="w-full justify-start">
                    Chat with Library
                  </Button>
                </Link>
                <Link href={`/spaces/${user.id}/documents`}>
                  <Button variant="outline" className="w-full justify-start">
                    Manage Documents
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Shared Spaces */}
        {spaceMemberships.map(({ space, role }) => (
          <Card key={space.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle>{space.name}</CardTitle>
              <CardDescription>{role} • {space.isShared ? "Shared" : "Private"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Link href={`/spaces/${space.id}/chat`}>
                  <Button variant="default" className="w-full justify-start">Chat with Space</Button>
                </Link>
                {role !== "VIEWER" && (
                  <Link href={`/spaces/${space.id}/documents`}>
                    <Button variant="outline" className="w-full justify-start">Manage Documents</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
