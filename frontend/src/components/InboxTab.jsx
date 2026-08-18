import React, { useState, useEffect, useRef } from 'react';
import { getInboxConversations, getInboxChat, sendInboxReply } from '../services/inboxService';
import { Search, Send, User, MessageCircle, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function InboxTab() {
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  
  const chatEndRef = useRef(null);

  const fetchConversations = async () => {
    try {
      const res = await getInboxConversations();
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    } finally {
      setLoadingConv(false);
    }
  };

  const fetchChatHistory = async (phone) => {
    setLoadingChat(true);
    try {
      const res = await getInboxChat(phone);
      setChatHistory(res.data);
      // Re-fetch conversations to clear unread badges
      fetchConversations();
    } catch (err) {
      console.error('Failed to fetch chat', err);
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000); // Auto-refresh list
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPhone) {
      fetchChatHistory(selectedPhone);
      const interval = setInterval(() => fetchChatHistory(selectedPhone), 10000); // Auto-refresh active chat
      return () => clearInterval(interval);
    }
  }, [selectedPhone]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedPhone) return;

    const activeConv = conversations.find(c => c.senderPhone === selectedPhone);
    const senderName = activeConv?.senderName || 'Unknown';

    setSending(true);
    try {
      const res = await sendInboxReply(selectedPhone, replyText, senderName);
      if (res.data.success) {
        setReplyText('');
        setChatHistory([...chatHistory, res.data.message]);
      } else {
        alert('Failed to send message. Make sure you are within the 24-hour window.');
      }
    } catch (err) {
      console.error('Failed to send reply', err);
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    (c.senderName || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.senderPhone || '').includes(search)
  );

  return (
    <div className="bg-surface rounded-xl shadow-card border border-border-default h-[75vh] flex overflow-hidden">
      
      {/* Left Panel: Conversations List */}
      <div className="w-1/3 border-r border-border-default flex flex-col bg-warm-white">
        <div className="p-4 border-b border-border-default shrink-0">
          <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center justify-between">
            Inbox
            <button onClick={fetchConversations} className="text-text-muted hover:text-primary transition-colors">
              <RefreshCw size={16} />
            </button>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border-strong rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConv ? (
            <div className="p-8 text-center text-text-muted animate-pulse">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No conversations found.</div>
          ) : (
            <div className="divide-y divide-border-default">
              {filteredConversations.map((conv) => (
                <button
                  key={conv._id}
                  onClick={() => setSelectedPhone(conv.senderPhone)}
                  className={`w-full text-left p-4 hover:bg-bg transition-colors flex gap-3 ${selectedPhone === conv.senderPhone ? 'bg-bg border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-text-primary truncate">{conv.senderName}</span>
                      <span className="text-[10px] text-text-muted whitespace-nowrap ml-2">
                        {format(new Date(conv.lastMessageAt), 'dd MMM')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm text-text-secondary truncate flex-1">
                        {conv.lastMessageDirection === 'outbound' ? 'You: ' : ''}{conv.lastMessage}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Chat Window */}
      <div className="flex-1 flex flex-col bg-bg">
        {selectedPhone ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border-default bg-surface flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">
                  {conversations.find(c => c.senderPhone === selectedPhone)?.senderName || 'Unknown'}
                </h3>
                <p className="text-xs text-text-muted">{selectedPhone}</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingChat && chatHistory.length === 0 ? (
                <div className="text-center text-text-muted mt-8 animate-pulse">Loading chat...</div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center text-text-muted mt-8">No messages yet.</div>
              ) : (
                chatHistory.map((msg) => {
                  const isOutbound = msg.direction === 'outbound';
                  return (
                    <div key={msg._id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-xl px-4 py-2 shadow-sm ${isOutbound ? 'bg-primary text-white rounded-br-sm' : 'bg-surface border border-border-default text-text-primary rounded-bl-sm'}`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isOutbound ? 'text-white/70' : 'text-text-muted'}`}>
                          {format(new Date(msg.createdAt), 'hh:mm a')}
                          {isOutbound && msg.status === 'read' && <span className="text-blue-300 font-bold ml-1">✓✓</span>}
                          {isOutbound && msg.status === 'delivered' && <span className="ml-1">✓✓</span>}
                          {isOutbound && msg.status === 'sent' && <span className="ml-1">✓</span>}
                          {isOutbound && msg.status === 'failed' && <span className="text-red-300 ml-1">!</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-surface border-t border-border-default shrink-0">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a manual reply..."
                  className="flex-1 px-4 py-2 border border-border-strong rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
                >
                  <Send size={16} className={sending ? 'animate-pulse' : ''} />
                </button>
              </form>
              <div className="text-center mt-2">
                <span className="text-[10px] text-text-muted">
                  Note: You can only reply if the user has messaged you within the last 24 hours.
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
            <MessageCircle size={48} className="mb-4 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
