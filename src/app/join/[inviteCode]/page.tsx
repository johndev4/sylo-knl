/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/use-auth';
import { use } from 'react';

export default function JoinPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // React 19 pattern for params
  const { inviteCode } = use(params);

  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/invites/${inviteCode}`);
        const result = await res.json();
        
        if (!res.ok) {
          throw new Error(result.error || 'Failed to fetch invite details');
        }
        
        setInvite(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid invite code');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [inviteCode]);

  const handleJoin = async () => {
    try {
      setIsJoining(true);
      setError('');
      
      const res = await fetch(`/api/invites/${inviteCode}/join`, {
        method: 'POST',
      });
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Failed to join library');
      }
      
      // Success! Redirect to the library
      router.push(`/hub/libraries/${result.data.library_id}/documents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsJoining(false);
    }
  };

  const handleLoginRedirect = () => {
    // Navigate to login with redirect param
    router.push(`/login?redirect=/join/${inviteCode}`);
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center shadow-lg">
          <p className="text-muted-foreground animate-pulse">Loading invite details...</p>
        </Card>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md p-8 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Invite</h1>
          <p className="text-muted-foreground mb-6">{error || 'This invite link is invalid or no longer exists.'}</p>
          <Button onClick={() => router.push('/')} variant="outline" className="w-full">
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-6">
          <Badge variant={invite.isValid ? "default" : "destructive"} className="mb-4">
            {invite.isValid ? 'Valid Invite' : 'Expired / Maxed'}
          </Badge>
          <h1 className="text-2xl font-bold">{"You've been invited!"}</h1>
          <p className="text-muted-foreground mt-2">
            Join the library <span className="font-semibold text-foreground">{invite.libraryName}</span>
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4 mb-6 flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Assigned Role:</span>
          <span className="font-medium">{invite.role}</span>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm mb-6 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {!invite.isValid ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-destructive font-medium">
              {invite.isExpired ? 'This invite has expired.' : 'This invite has reached its maximum uses or is inactive.'}
            </p>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Return Home
            </Button>
          </div>
        ) : !user ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Please sign in or create an account to accept this invite.
            </p>
            <Button onClick={handleLoginRedirect} className="w-full">
              Sign In to Join
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 border rounded-md mb-4 bg-background">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                <p className="font-medium truncate">{user.name || 'User'}</p>
                <p className="text-muted-foreground text-xs truncate">{user.email}</p>
              </div>
            </div>
            
            <Button 
              onClick={handleJoin} 
              disabled={isJoining} 
              className="w-full"
            >
              {isJoining ? 'Joining...' : 'Accept Invite'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
