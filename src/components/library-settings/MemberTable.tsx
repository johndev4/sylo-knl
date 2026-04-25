'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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

export default function MemberTable({
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
        <thead className="border-b border-border">
          <tr>
            {canManageMembers && (
              <th className="text-left py-3 px-4 font-medium">
                <Checkbox
                  checked={
                    members.length > 0 &&
                    selectedMembers.size === members.filter(m => m.role !== 'OWNER').length
                  }
                  onChange={() => {
                    if (
                      selectedMembers.size ===
                      members.filter(m => m.role !== 'OWNER').length
                    ) {
                      // Deselect all
                      selectedMembers.forEach((id) => {
                        onSelectMember(id);
                      });
                    } else {
                      // Select all non-owner members
                      members.forEach((m) => {
                        if (m.role !== 'OWNER' && !selectedMembers.has(m.user_id)) {
                          onSelectMember(m.user_id);
                        }
                      });
                    }
                  }}
                  aria-label="Select all members"
                />
              </th>
            )}
            <th className="text-left py-3 px-4 font-medium">Name</th>
            <th className="text-left py-3 px-4 font-medium">Email</th>
            <th className="text-left py-3 px-4 font-medium">Role</th>
            <th className="text-left py-3 px-4 font-medium">Joined</th>
            {canManageMembers && (
              <th className="text-left py-3 px-4 font-medium">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.user_id}
              className="border-b border-border hover:bg-muted/50 transition-colors"
            >
              {canManageMembers && (
                <td className="py-3 px-4">
                  <Checkbox
                    checked={selectedMembers.has(member.user_id)}
                    onChange={() => onSelectMember(member.user_id)}
                    disabled={member.role === 'OWNER'}
                    aria-label={`Select ${member.user?.email}`}
                  />
                </td>
              )}
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {member.user?.avatar_url && (
                    <img
                      src={member.user.avatar_url}
                      alt={member.user?.name || 'Avatar'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="font-medium">
                    {member.user?.name || 'Unknown User'}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-muted-foreground">
                {member.user?.email}
              </td>
              <td className="py-3 px-4">
                {canManageMembers && member.role !== 'OWNER' ? (
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member.user_id, e.target.value)
                    }
                    className="px-2 py-1 border border-input rounded text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label={`Role for ${member.user?.email}`}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <span className="font-medium">{member.role}</span>
                    {member.role === 'OWNER' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Library creator
                      </p>
                    )}
                  </div>
                )}
              </td>
              <td className="py-3 px-4 text-muted-foreground text-xs">
                {new Date(member.created_at).toLocaleDateString()}
              </td>
              {canManageMembers && (
                <td className="py-3 px-4">
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
