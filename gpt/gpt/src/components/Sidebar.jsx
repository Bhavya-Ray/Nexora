import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function Sidebar({
  chats,
  activeId,
  onNewChat,
  onSelect,
  onRenameChat,
  onTogglePinChat,
  onDeleteChat
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuCoords, setMenuCoords] = useState(null);
  const sidebarRef = useRef(null);

  const sortedChats = useMemo(
    () =>
      [...chats].sort((left, right) => {
        if (left.pinned === right.pinned) {
          return right.id - left.id;
        }

        return left.pinned ? -1 : 1;
      }),
    [chats]
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest('.chat-item-menu') && !event.target.closest('.chat-item-menu-button')) {
        setOpenMenuId(null);
        setMenuCoords(null);
      }
    };

    const handleScroll = () => {
      if (openMenuId) {
        setOpenMenuId(null);
        setMenuCoords(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openMenuId]);

  const handleMenuToggle = (event, chatId) => {
    event.stopPropagation();
    if (openMenuId === chatId) {
      setOpenMenuId(null);
      setMenuCoords(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setOpenMenuId(chatId);
      setMenuCoords({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  };

  const handleMenuAction = (event, action, chatId) => {
    event.stopPropagation();
    setOpenMenuId(null);
    setMenuCoords(null);
    action(chatId);
  };

  return (
    <aside className="sidebar" ref={sidebarRef}>
      <div className="sidebar-header">
        <div className="logo-badge">AI</div>
        <div className="sidebar-copy">
          <h1>Nexora</h1>
          <p>Fast local chat workspace</p>
        </div>
      </div>

      <button className="new-chat" onClick={onNewChat}>
        + New Chat
      </button>

      <div className="chat-history">
        <p className="chat-history-label">Recent Chats</p>
        <div className="chat-list">
          {sortedChats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${chat.id === activeId ? "active" : ""}`}
            >
              <button
                type="button"
                className="chat-item-main"
                onClick={() => {
                  setOpenMenuId(null);
                  setMenuCoords(null);
                  onSelect(chat.id);
                }}
              >
                <span className="chat-item-title">
                  {chat.pinned && <span className="chat-pin-indicator">Pinned</span>}
                  {chat.title}
                </span>
              </button>

              <div className="chat-item-actions">
                <button
                  type="button"
                  className={`chat-item-menu-button ${openMenuId === chat.id ? "open" : ""}`}
                  aria-label={`Open actions for ${chat.title}`}
                  onClick={(event) => handleMenuToggle(event, chat.id)}
                >
                  ...
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {openMenuId && menuCoords && createPortal(
        <div
          className="chat-item-menu"
          style={{ top: menuCoords.top, left: menuCoords.left }}
          onClick={(event) => event.stopPropagation()}
        >
          {(() => {
            const chat = sortedChats.find(c => c.id === openMenuId);
            if (!chat) return null;
            return (
              <>
                <button type="button" onClick={(event) => handleMenuAction(event, onRenameChat, chat.id)}>
                  Rename
                </button>
                <button type="button" onClick={(event) => handleMenuAction(event, onTogglePinChat, chat.id)}>
                  {chat.pinned ? "Unpin chat" : "Pin chat"}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={(event) => handleMenuAction(event, onDeleteChat, chat.id)}
                >
                  Delete
                </button>
              </>
            );
          })()}
        </div>,
        document.body
      )}

    </aside>
  );
}

export default Sidebar;
