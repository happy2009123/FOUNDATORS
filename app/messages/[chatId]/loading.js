import ChatListPane from '@/components/ChatListPane';

// Matches the real conversation frame (wide-desktop 2-pane on desktop,
// full-screen chat-screen everywhere) so the shell never flashes narrow or
// loses the conversation list while the chat chunk loads.
export default function MessagesChatLoading() {
  return (
    <div className="app-shell wide-desktop chat-screen flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <ChatListPane />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex flex-none items-center gap-3 border-b border-linesoft px-4 py-3 animate-pulse">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="flex-1">
              <div className="skeleton mb-1 h-4 w-24 rounded-xl" />
              <div className="skeleton h-3 w-16 rounded-xl" />
            </div>
          </div>
          <div className="min-h-0 flex-1 px-4 pt-4 animate-pulse">
            <div className="skeleton mb-3 ml-auto h-12 w-48 rounded-2xl" />
            <div className="skeleton mb-3 h-12 w-48 rounded-2xl" />
            <div className="skeleton mb-3 ml-auto h-10 w-36 rounded-2xl" />
            <div className="skeleton h-12 w-52 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
