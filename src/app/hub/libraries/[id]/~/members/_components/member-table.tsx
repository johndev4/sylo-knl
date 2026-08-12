'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  updateLibraryMemberRole,
  removeLibraryMember,
  removeMultipleLibraryMembers,
} from '@/lib/actions/libraries';

export interface LibraryMember {
  library_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  created_at: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface MemberTableProps {
  libraryId: string;
  members: LibraryMember[];
  currentUserRole: string;
  canManageMembers: boolean;
}

const roleOptions = ['ADMIN', 'EDITOR', 'VIEWER'];

export function MemberTable({
  libraryId,
  members,
  canManageMembers,
}: MemberTableProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setIsUpdating(true);
      setError('');
      await updateLibraryMemberRole(
        libraryId,
        userId,
        newRole as 'ADMIN' | 'EDITOR' | 'VIEWER'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      setIsUpdating(true);
      setError('');
      await removeLibraryMember(libraryId, userId);
      setSelectedMembers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMultiple = async () => {
    if (selectedMembers.size === 0) return;
    const ids = Array.from(selectedMembers);
    try {
      setIsUpdating(true);
      setError('');
      await removeMultipleLibraryMembers(libraryId, ids);
      setSelectedMembers(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove members');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Members</h2>
            <p className="text-muted-foreground text-sm">
              {members.length} of 11 members
            </p>
          </div>
          {canManageMembers && selectedMembers.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isUpdating}
              onClick={handleRemoveMultiple}
            >
              Remove {selectedMembers.size} member(s)
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {members.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">No members yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-border border-b">
              <tr>
                {canManageMembers && (
                  <th className="px-4 py-3 text-left font-medium">
                    <Checkbox
                      checked={
                        members.length > 0 &&
                        selectedMembers.size ===
                          members.filter((m) => m.role !== 'OWNER').length
                      }
                      onChange={() => {
                        if (
                          selectedMembers.size ===
                          members.filter((m) => m.role !== 'OWNER').length
                        ) {
                          setSelectedMembers(new Set());
                        } else {
                          const nonOwners = members
                            .filter((m) => m.role !== 'OWNER')
                            .map((m) => m.user_id);
                          setSelectedMembers(new Set(nonOwners));
                        }
                      }}
                      aria-label="Select all members"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                {canManageMembers && (
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.user_id}
                  className="border-border hover:bg-muted/50 border-b transition-colors"
                >
                  {canManageMembers && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedMembers.has(member.user_id)}
                        onChange={() => handleSelectMember(member.user_id)}
                        disabled={member.role === 'OWNER'}
                        aria-label={`Select ${member.user?.email}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {member.user?.avatar_url && (
                        <Image
                          src={member.user.avatar_url}
                          alt={member.user?.name || 'Avatar'}
                          width={32}
                          height={32}
                          unoptimized
                          className="h-8 w-8 rounded-full"
                        />
                      )}
                      <span className="font-medium">
                        {member.user?.name || 'Unknown User'}
                      </span>
                    </div>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {member.user?.email}
                  </td>
                  <td className="px-4 py-3">
                    {canManageMembers && member.role !== 'OWNER' ? (
                      <Select
                        value={member.role}
                        disabled={isUpdating}
                        onValueChange={(value) =>
                          handleRoleChange(member.user_id, value)
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-[110px]"
                          aria-label={`Role for ${member.user?.email}`}
                        >
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>
                        <span className="font-medium">{member.role}</span>
                        {member.role === 'OWNER' && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Library creator
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  {canManageMembers && (
                    <td className="px-4 py-3">
                      {member.role !== 'OWNER' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Remove ${member.user?.email}`}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
