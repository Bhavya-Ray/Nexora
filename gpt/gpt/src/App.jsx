import { useEffect, useState, useCallback } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";

const API_BASE = "http://127.0.0.1:3000";

const defaultChats = [{ id: "1", title: "New Chat", messages: [], pinned: false }];

function App() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentChat = chats.find((chat) => chat.id === activeChat) ?? chats[0];

  // Fetch all chats on mount
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/chats`);
        const data = await res.json();
        
        if (data.length > 0) {
          const formattedChats = data.map(c => ({
            ...c,
            pinned: Boolean(c.pinned),
            messages: [] // Messages will be fetched on demand
          }));
          setChats(formattedChats);
          setActiveChat(formattedChats[0].id);
        } else {
          // Initialize first chat if none exist
          const initialChat = { id: Date.now().toString(), title: "New Chat", messages: [], pinned: false };
          await fetch(`${API_BASE}/api/chats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: initialChat.id, title: initialChat.title })
          });
          setChats([initialChat]);
          setActiveChat(initialChat.id);
        }
      } catch (err) {
        console.error("Failed to load chats:", err);
        setChats(defaultChats);
        setActiveChat(defaultChats[0].id);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChats();
  }, []);

  // Fetch messages when activeChat changes
  useEffect(() => {
    if (!activeChat) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/messages/${activeChat}`);
        const data = await res.json();
        
        setChats(prev => prev.map(chat => 
          chat.id === activeChat ? { ...chat, messages: data } : chat
        ));
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    };
    
    // Only fetch if messages aren't loaded yet
    const chat = chats.find(c => c.id === activeChat);
    if (chat && chat.messages.length === 0) {
      fetchMessages();
    }
  }, [activeChat]);

  const createNewChat = async () => {
    const emptyChat = chats.find((chat) => chat.messages.length === 0);

    if (emptyChat) {
      setActiveChat(emptyChat.id);
      return;
    }

    const newChat = { id: Date.now().toString(), title: "New Chat", messages: [], pinned: false };
    try {
      await fetch(`${API_BASE}/api/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newChat.id, title: newChat.title })
      });
      setChats((prevChats) => [newChat, ...prevChats]);
      setActiveChat(newChat.id);
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  const updateMessages = useCallback((chatId, updater) => {
    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }

        const nextMessages =
          typeof updater === "function" ? updater(chat.messages) : updater;

        // Note: Backend saves messages automatically during /chat request.
        // This frontend update is mostly for optimistic UI.

        return { ...chat, messages: nextMessages };
      })
    );
  }, []);

  const renameChat = async (chatId) => {
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) return;

    const nextTitle = window.prompt("Rename chat", chat.title)?.trim();
    if (!nextTitle) return;

    try {
      await fetch(`${API_BASE}/api/chats/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle })
      });
      setChats((prevChats) =>
        prevChats.map((item) =>
          item.id === chatId ? { ...item, title: nextTitle } : item
        )
      );
    } catch (err) {
      console.error("Failed to rename chat:", err);
    }
  };

  const togglePinChat = async (chatId) => {
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) return;

    try {
      await fetch(`${API_BASE}/api/chats/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !chat.pinned })
      });
      setChats((prevChats) =>
        prevChats.map((c) =>
          c.id === chatId ? { ...c, pinned: !c.pinned } : c
        )
      );
    } catch (err) {
      console.error("Failed to pin chat:", err);
    }
  };

  const deleteChat = async (chatId) => {
    const chat = chats.find((item) => item.id === chatId);
    if (!chat || !window.confirm(`Delete "${chat.title}"?`)) return;

    try {
      await fetch(`${API_BASE}/api/chats/${chatId}`, { method: "DELETE" });
      setChats((prevChats) => {
        const nextChats = prevChats.filter((item) => item.id !== chatId);

        if (nextChats.length === 0) {
          const fallbackId = Date.now().toString();
          const fallbackChat = { id: fallbackId, title: "New Chat", messages: [], pinned: false };
          fetch(`${API_BASE}/api/chats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: fallbackId, title: "New Chat" })
          });
          setActiveChat(fallbackId);
          return [fallbackChat];
        }

        if (chatId === activeChat) {
          setActiveChat(nextChats[0].id);
        }

        return nextChats;
      });
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const [enlargedImage, setEnlargedImage] = useState(null);

  if (isLoading || !currentChat) {
    return <div className="loading-screen">Syncing your workspace...</div>;
  }

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeId={currentChat.id}
        onNewChat={createNewChat}
        onSelect={setActiveChat}
        onRenameChat={renameChat}
        onTogglePinChat={togglePinChat}
        onDeleteChat={deleteChat}
      />
      <ChatArea
        chatId={currentChat.id}
        chatTitle={currentChat.title}
        isPinned={currentChat.pinned}
        messages={currentChat.messages}
        setMessages={(updater) => updateMessages(currentChat.id, updater)}
        onTogglePinChat={() => togglePinChat(currentChat.id)}
        onDeleteChat={() => deleteChat(currentChat.id)}
        onPreviewImage={setEnlargedImage}
      />

      {enlargedImage && (
        <div className="lightbox-overlay" onClick={() => setEnlargedImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={enlargedImage} alt="Enlarged view" />
            <button className="lightbox-close" onClick={() => setEnlargedImage(null)}>
              <svg xmlns="http://www.w3.org/2004/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
