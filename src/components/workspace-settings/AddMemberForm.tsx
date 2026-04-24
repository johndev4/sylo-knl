'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddMemberFormProps {
  onAddMember: (email: string, role: string) => Promise<void>;
  isLoading: boolean;
  memberCount: number;
}

const roleOptions = [
  { value: 'ADMIN', label: 'Admin - Can manage members and settings' },
  { value: 'EDITOR', label: 'Editor - Can create and edit content' },
  { value: 'VIEWER', label: 'Viewer - Can view content only' },
];

export default function AddMemberForm({
  onAddMember,
  isLoading,
  memberCount,
}: AddMemberFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const prefersReducedMotion = useReducedMotion();

  const isFull = memberCount >= 11;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (memberCount >= 11) {
      setError('Workspace has reached maximum member limit');
      return;
    }

    try {
      await onAddMember(email, role);
      setEmail('');
      setRole('VIEWER');
      setSuccess('Member added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <motion.div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3"
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
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
        </motion.div>
      )}

      <div>
        <Label htmlFor="email" className="text-sm font-medium">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="member@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isFull || isLoading}
          className="mt-1"
          aria-label="Email address to add"
        />
      </div>

      <div>
        <Label htmlFor="role" className="text-sm font-medium">
          Role
        </Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={isFull || isLoading}
          className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Member role"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        disabled={isFull || isLoading}
        className="w-full"
        aria-busy={isLoading}
      >
        {isLoading ? 'Adding member...' : isFull ? 'Workspace is full' : 'Add Member'}
      </Button>

      {isFull && (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          Workspace has reached maximum member limit of 11. Remove a member to add new ones.
        </p>
      )}
    </form>
  );
}
