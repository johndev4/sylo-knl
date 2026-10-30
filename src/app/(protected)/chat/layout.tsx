import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { ChatSidebar } from '@/features/chat/components/chat-sidebar';
import { ChatSidebarProvider } from '@/features/chat/providers/chat-sidebar-provider';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatSidebarProvider>
      <SidebarLayout sidebar={<ChatSidebar />}>
        <div className="bg-background relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </SidebarLayout>
    </ChatSidebarProvider>
  );
}
