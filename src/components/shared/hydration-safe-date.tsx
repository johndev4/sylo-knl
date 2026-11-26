'use client';

import { useSyncExternalStore } from 'react';

interface HydrationSafeDateProps {
  value: string;
  format?: 'date' | 'relative';
}

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function formatStableDate(date: Date, value: string) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

function formatClientDate(date: Date, value: string, format: 'date' | 'relative') {
  if (format === 'date') return date.toLocaleDateString();

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

export function HydrationSafeDate({
  value,
  format = 'date',
}: HydrationSafeDateProps) {
  const hydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <time dateTime={value}>{value}</time>;

  return (
    <time dateTime={value}>
      {hydrated ? formatClientDate(date, value, format) : formatStableDate(date, value)}
    </time>
  );
}
