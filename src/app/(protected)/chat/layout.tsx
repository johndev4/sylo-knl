import { ChatLibraryProvider } from '@/features/chat/providers/chat-library-provider';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatLibraryProvider>
      <div className="bg-background relative flex h-[calc(100dvh-4.5rem)] min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </ChatLibraryProvider>
  );
}
