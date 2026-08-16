import dynamic from 'next/dynamic';

export const BlockEditor = dynamic(() => import('./editor'), { ssr: false });
