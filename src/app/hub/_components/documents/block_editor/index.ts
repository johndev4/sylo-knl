import dynamic from 'next/dynamic';

export const BlockEditor = dynamic(() => import('./Editor'), { ssr: false });
