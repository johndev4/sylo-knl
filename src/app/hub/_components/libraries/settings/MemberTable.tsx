'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LibraryMember {
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
  members: LibraryMember[];
  currentUserRole: string;
  canManageMembers: boolean;
  selectedMembers: Set<string>;
  onSelectMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onUpdateRole: (userId: string, newRole: string) => Promise<void>;
}

const roleDescriptions: Record<string, string> = {
  OWNER: 'Full control over library',
  ADMIN: 'Can manage members and settings',
  EDITOR: 'Can create and edit content',
  VIEWER: 'Can view content only',
};

const roleOptions = ['ADMIN', 'EDITOR', 'VIEWER'];

export function MemberTable({
  members,
  currentUserRole,
  canManageMembers,
  selectedMembers,
  onSelectMember,
  onRemoveMember,
  onUpdateRole,
}: MemberTableProps) {
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await onUpdateRole(userId, newRole);
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  return (
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
                      // Deselect all
                      selectedMembers.forEach((id) => {
                        onSelectMember(id);
                      });
                    } else {
                      // Select all non-owner members
                      members.forEach((m) => {
                        if (
                          m.role !== 'OWNER' &&
                          !selectedMembers.has(m.user_id)
                        ) {
                          onSelectMember(m.user_id);
                        }
                      });
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
                    onChange={() => onSelectMember(member.user_id)}
                    disabled={member.role === 'OWNER'}
                    aria-label={`Select ${member.user?.email}`}
                  />
                </td>
              )}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {member.user?.avatar_url && (
                    <img
                      src={member.user.avatar_url}
                      alt={member.user?.name || 'Avatar'}
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
                      onClick={() => onRemoveMember(member.user_id)}
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
  );
}
