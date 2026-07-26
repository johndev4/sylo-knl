/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  createLibraryInvite,
  fetchLibraryInvites,
  revokeLibraryInvite,
} from '@/lib/actions/libraries';

interface InviteSectionProps {
  libraryId: string;
}

const roleOptions = [
  { value: 'EDITOR', label: 'Editor - Can create and edit content' },
  { value: 'VIEWER', label: 'Viewer - Can view content only' },
];

export function InviteSection({ libraryId }: InviteSectionProps) {
  const [invites, setInvites] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [role, setRole] = useState('VIEWER');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    loadInvites();
  }, [libraryId]);

  const loadInvites = async () => {
    try {
      setIsLoading(true);
      const data = await fetchLibraryInvites(libraryId);
      setInvites(data);
    } catch (err) {
      console.error('Failed to load invites:', err);
      setError('Failed to load active invites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setIsCreating(true);

      let parsedExpiresAt = null;
      if (expiresAt) {
        parsedExpiresAt = new Date(expiresAt).toISOString();
      }

      let parsedMaxUses = null;
      if (maxUses) {
        parsedMaxUses = parseInt(maxUses, 10);
        if (isNaN(parsedMaxUses) || parsedMaxUses <= 0) {
          throw new Error('Max uses must be a positive number');
        }
      }

      const newInvite = await createLibraryInvite(
        libraryId,
        role as 'VIEWER' | 'EDITOR',
        parsedExpiresAt,
        parsedMaxUses
      );

      setSuccess('Invite created successfully');
      setRole('VIEWER');
      setExpiresAt('');
      setMaxUses('');

      // Update list
      loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;

    try {
      await revokeLibraryInvite(libraryId, inviteId);
      setSuccess('Invite revoked successfully');
      loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
    }
  };

  const handleCopyLink = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    setSuccess('Invite link copied to clipboard');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Invite Links</h2>
        <p className="text-muted-foreground text-sm">
          Create shareable links to invite multiple users to your library.
        </p>
      </div>

      {error && (
        <motion.div
          className="rounded border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          className="rounded border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          <p className="text-sm text-green-700 dark:text-green-400">
            {success}
          </p>
        </motion.div>
      )}

      <form
        onSubmit={handleCreateInvite}
        className="bg-muted/20 space-y-4 rounded-md border p-4"
      >
        <h3 className="font-medium">Generate New Invite</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="inviteMemberRole" className="text-sm font-medium">
              Role
            </Label>
            <Select value={role} onValueChange={setRole} disabled={isCreating}>
              <SelectTrigger
                id="inviteMemberRole"
                className="mt-1"
                aria-label="Invite member role"
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="expiresAt" className="text-sm font-medium">
              Expiration (Optional)
            </Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={isCreating}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="maxUses" className="text-sm font-medium">
              Max Uses (Optional)
            </Label>
            <Input
              id="maxUses"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              disabled={isCreating}
              className="mt-1"
            />
          </div>
        </div>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? 'Generating...' : 'Generate Invite Link'}
        </Button>
      </form>

      <div className="mt-6" aria-label="Active Invites Section">
        <h3 className="mb-4 font-medium">Active Invites</h3>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading invites...</p>
        ) : invites.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active invites.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-border border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Uses</th>
                  <th className="px-4 py-3 text-left font-medium">Expires</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite: any) => (
                  <tr
                    key={invite.id}
                    className="border-border hover:bg-muted/50 border-b"
                  >
                    <td className="px-4 py-3 font-mono">
                      {invite.invite_code}
                    </td>
                    <td className="px-4 py-3">{invite.role}</td>
                    <td className="px-4 py-3">
                      {invite.use_count} / {invite.max_uses || '∞'}
                    </td>
                    <td className="px-4 py-3">
                      {invite.expires_at
                        ? new Date(invite.expires_at).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(invite.invite_code)}
                        >
                          Copy
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevoke(invite.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
