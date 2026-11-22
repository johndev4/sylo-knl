'use client';

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { createClient } from '@/lib/supabase/client';
import { getLibraryMembers, getLibraryInvites } from '../queries';
import {
  createLibraryInvite,
  revokeLibraryInvite,
  updateLibraryMemberRole,
  removeLibraryMember,
  removeMultipleLibraryMembers,
} from '@/features/library/actions';
import type { Invite } from '@/features/library/library-schema';
import { unwrapActionResult } from '@/lib/errors/app-error';

export const LIBRARY_MEMBERS_SWR_KEY = (libraryId: string) =>
  ['members', libraryId] as const;
export const LIBRARY_INVITES_SWR_KEY = (libraryId: string) =>
  ['invites', libraryId] as const;

type MembersKey = ReturnType<typeof LIBRARY_MEMBERS_SWR_KEY>;
type InvitesKey = ReturnType<typeof LIBRARY_INVITES_SWR_KEY>;

type MembersData = Awaited<ReturnType<typeof getLibraryMembers>>;
type InvitesData = Awaited<ReturnType<typeof getLibraryInvites>>;

const membersFetcher = async ([, libraryId]: MembersKey) => {
  const supabase = createClient();
  return getLibraryMembers(libraryId, supabase);
};

const invitesFetcher = async ([, libraryId]: InvitesKey) => {
  const supabase = createClient();
  return getLibraryInvites(libraryId, supabase);
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useLibraryMembersSWR(libraryId: string) {
  const key = libraryId ? LIBRARY_MEMBERS_SWR_KEY(libraryId) : null;
  const { data, error, isLoading, mutate } = useSWR<MembersData, Error>(
    key,
    membersFetcher
  );

  return {
    members: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useLibraryInvitesSWR(libraryId: string) {
  const key = libraryId ? LIBRARY_INVITES_SWR_KEY(libraryId) : null;
  const { data, error, isLoading, mutate } = useSWR<InvitesData, Error>(
    key,
    invitesFetcher
  );

  return {
    invites: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useCreateLibraryInviteSWR(libraryId: string) {
  const { trigger, isMutating } = useSWRMutation<
    Invite,
    Error,
    InvitesKey,
    {
      role: 'EDITOR' | 'VIEWER';
      expiresAt: string | null;
      maxUses: number | null;
    }
  >(LIBRARY_INVITES_SWR_KEY(libraryId), async (_, { arg }) => {
    const parsedExpiresAt = arg.expiresAt
      ? new Date(arg.expiresAt).toISOString()
      : null;

    let parsedMaxUses: number | null = null;

    if (arg.maxUses !== null && arg.maxUses !== undefined) {
      parsedMaxUses = Number(arg.maxUses);
      if (Number.isNaN(parsedMaxUses) || parsedMaxUses <= 0) {
        throw new Error('Max uses must be a positive number');
      }
    }

    return unwrapActionResult(
      await createLibraryInvite(
        libraryId,
        arg.role,
        parsedExpiresAt,
        parsedMaxUses
      )
    );
  });

  return {
    createInvite: trigger,
    isCreating: isMutating,
  };
}

export function useRevokeLibraryInviteSWR(libraryId: string) {
  const { trigger, isMutating } = useSWRMutation<
    void,
    Error,
    InvitesKey,
    string
  >(LIBRARY_INVITES_SWR_KEY(libraryId), async (_, { arg }) => {
    unwrapActionResult(await revokeLibraryInvite(libraryId, arg));
  });

  return {
    revokeInvite: trigger,
    isRevoking: isMutating,
  };
}

export function useUpdateLibraryMemberRoleSWR(libraryId: string) {
  const { trigger, isMutating } = useSWRMutation<
    void,
    Error,
    MembersKey,
    { userId: string; newRole: 'ADMIN' | 'EDITOR' | 'VIEWER' }
  >(LIBRARY_MEMBERS_SWR_KEY(libraryId), async (_, { arg }) => {
    unwrapActionResult(
      await updateLibraryMemberRole(libraryId, arg.userId, arg.newRole)
    );
  });

  return {
    updateRole: trigger,
    isUpdating: isMutating,
  };
}

export function useRemoveLibraryMemberSWR(libraryId: string) {
  const { trigger, isMutating } = useSWRMutation<
    void,
    Error,
    MembersKey,
    string
  >(LIBRARY_MEMBERS_SWR_KEY(libraryId), async (_, { arg }) => {
    unwrapActionResult(await removeLibraryMember(libraryId, arg));
  });

  return {
    removeMember: trigger,
    isRemoving: isMutating,
  };
}

export function useRemoveMultipleLibraryMembersSWR(libraryId: string) {
  const { trigger, isMutating } = useSWRMutation<
    void,
    Error,
    MembersKey,
    string[]
  >(LIBRARY_MEMBERS_SWR_KEY(libraryId), async (_, { arg }) => {
    unwrapActionResult(await removeMultipleLibraryMembers(libraryId, arg));
  });

  return {
    removeMembers: trigger,
    isRemoving: isMutating,
  };
}
