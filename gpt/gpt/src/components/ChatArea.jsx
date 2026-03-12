import { useEffect, useRef, useState } from "react";
import ChatInput from "./ChatInput";
import Message from "./Message";

function ChatArea({
  chatId,
  chatTitle,
  isPinned,
  messages,
  setMessages,
  onTogglePinChat,
  onDeleteChat,
  onPreviewImage
}) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentLoaded, setAttachmentLoaded] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFileType, setAttachedFileType] = useState(""); // 'pdf' or 'image'
  const [attachedFilePreview, setAttachedFilePreview] = useState(""); // Base64 for images
  const [backendFilename, setBackendFilename] = useState(""); // Filename from server
  const [uploadProgress, setUploadProgress] = useState(0);
  const scrollRef = useRef(null);
  const menuRef = useRef(null);
  const dragCounter = useRef(0);
  const uploadIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    setText("");
    setIsLoading(false);
    setIsSessionMenuOpen(false);
    setAttachmentLoaded(false); // Reset context on a new chat
    setAttachedFileName("");
    setAttachedFileType("");
    setAttachedFilePreview("");
    setBackendFilename("");
    setUploadProgress(0);
  }, [chatId]);

  useEffect(() => {
    const scrollContainer = scrollRef.current;

    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: messages.length > 1 ? "smooth" : "auto"
    });
  }, [isLoading, messages]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast("");
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsSessionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const showToast = (message) => {
    setToast(message);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
      e.dataTransfer.clearData();
    }
  };

  const handleRemovePdf = () => {
    // If still uploading, cancel the request and interval
    if (isUploading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
      }
      setIsUploading(false);
    }
    setAttachmentLoaded(false);
    setAttachedFileName("");
    setAttachedFileType("");
    setAttachedFilePreview("");
    setBackendFilename("");
    setUploadProgress(0);
    showToast("Attachment removed. Chatting normally.");
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      showToast("Please select a valid PDF or image file.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setAttachedFileName(file.name);
    setAttachedFileType(isPdf ? 'pdf' : 'image');
    showToast(isPdf ? "Uploading and analyzing PDF..." : "Uploading image...");

    // Generate preview for images
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }

    // Create an AbortController to allow canceling the fetch
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) return 95;
        // Slow down progression as it gets closer to 95
        const increment = Math.max(1, (95 - prev) * 0.1);
        return prev + increment;
      });
    }, 500);
    uploadIntervalRef.current = interval;

    const formData = new FormData();
    formData.append(isPdf ? "pdf" : "image", file);

    try {
      const endpoint = isPdf ? "http://127.0.0.1:3000/upload-pdf" : "http://127.0.0.1:3000/upload-image";
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });

      const data = await res.json();

      if (res.ok) {
        clearInterval(interval);
        uploadIntervalRef.current = null;
        setUploadProgress(100);
        setAttachmentLoaded(true);
        setBackendFilename(data.filename);

        showToast(isPdf ? "PDF analyzed! You can now ask questions." : "Image uploaded! You can now ask questions.");
      } else {
        throw new Error(data.error || `Failed to process ${isPdf ? 'PDF' : 'image'}.`);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Upload aborted by user.");
      } else {
        console.error(error);
        if (uploadIntervalRef.current) clearInterval(interval);
        uploadIntervalRef.current = null;
        setUploadProgress(0);
        setAttachedFileName("");
        setAttachedFileType("");
        setAttachedFilePreview("");
        setIsUploading(false);
        showToast(error.message || "An error occurred during upload.");
      }
    } finally {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
      setTimeout(() => setIsUploading(false), 500);
      abortControllerRef.current = null;
    }
  };

  const shareChat = async () => {
    const transcript = messages.length
      ? messages
        .map((message) => `${message.role === "user" ? "You" : "Assistant"}: ${message.text}`)
        .join("\n\n")
      : `Chat: ${chatTitle}`;

    try {
      await navigator.clipboard.writeText(transcript);
      showToast("Chat copied to clipboard.");
    } catch (error) {
      console.error(error);
      showToast("Clipboard access failed.");
    }
  };

  const handleSessionAction = (action) => {
    setIsSessionMenuOpen(false);
    action();
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    const trimmedText = text.trim();

    if (!trimmedText || isLoading || isUploading) {
      return;
    }

    const userMsg = {
      role: "user",
      text: trimmedText,
      attachment: attachedFileName ? {
        name: attachedFileName,
        type: attachedFileType,
        preview: attachedFilePreview
      } : null
    };

    setMessages((prevMessages) => [...prevMessages, userMsg]);
    setText("");

    // Clear attachment state after sending
    setAttachedFileName("");
    setAttachedFileType("");
    setAttachedFilePreview("");
    setBackendFilename("");
    setAttachmentLoaded(false);

    setIsLoading(true);

    // Create a new AbortController for this chat request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("http://127.0.0.1:3000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: trimmedText,
          forceGeneralChat: false,
          imageFilename: backendFilename || null,
          chatId: chatId
        }),
        signal: controller.signal
      });

      const data = await res.json();
      const replyText = data.reply || "I could not generate a response.";

      const aiMsg = {
        role: "assistant",
        text: replyText
      };

      setMessages((prevMessages) => [...prevMessages, aiMsg]);

    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Generation aborted by user.");
      } else {
        console.error(error);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "assistant",
            text: "Error connecting to AI."
          }
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const chatStarted = messages.length > 0;

  return (
    <main
      className={`chat-area ${chatStarted ? "chat-started" : ""} ${isDragging ? "dragging-over" : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <svg xmlns="http://www.w3.org/2004/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
            <h2>Drop PDF here to analyze</h2>
          </div>
        </div>
      )}

      <div className="chat-shell">
        <header className="chat-topbar">
          <div className="chat-topbar-main">
            <button type="button" className="chat-mode-pill">
              Nexora <span></span>
            </button>
            <div className="chat-topbar-copy">
              <h2>{chatTitle}</h2>
              <p>{chatStarted ? "Responses stream into this conversation." : "Start a conversation below."}</p>
            </div>
          </div>

          <div className="chat-topbar-actions">
            <div className="chat-status">
              <span className="chat-status-dot" />
              {isLoading ? "Thinking..." : "Ready"}
            </div>

            <button type="button" className="session-action-button" onClick={shareChat}>
              Share
            </button>

            <div className="session-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className={`session-action-button session-menu-trigger ${isSessionMenuOpen ? "open" : ""}`}
                aria-label="Open session options"
                onClick={() => setIsSessionMenuOpen((current) => !current)}
              >
                ...
              </button>

              {isSessionMenuOpen && (
                <div className="session-menu">
                  <button type="button" onClick={() => handleSessionAction(() => showToast("Group chat is not available yet."))}>
                    Start a group chat
                  </button>
                  <button type="button" onClick={() => handleSessionAction(onTogglePinChat)}>
                    {isPinned ? "Unpin chat" : "Pin chat"}
                  </button>
                  <button type="button" onClick={() => handleSessionAction(() => showToast("Archive is not available yet."))}>
                    Archive
                  </button>
                  <button type="button" onClick={() => handleSessionAction(() => showToast("Report submitted locally."))}>
                    Report
                  </button>
                  <button type="button" className="danger" onClick={() => handleSessionAction(onDeleteChat)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="messages-scroll" ref={scrollRef}>
          {!chatStarted ? (
            <div className="home">
              <section className="home-card">
                <div className="eyebrow">Conversational Workspace</div>
                <h1>What&apos;s on your mind today?</h1>
                <p>
                  Ask for explanations, code help, brainstorming, summaries, or quick research-style answers.
                  The layout stays responsive while the assistant is preparing a reply.
                </p>
                <div className="suggestion-row">
                  <span className="suggestion-chip" onClick={() => setText("Explain a concept simply")}>Explain a concept simply</span>
                  <span className="suggestion-chip" onClick={() => setText("Write code from a prompt")}>Write code from a prompt</span>
                  <span className="suggestion-chip" onClick={() => setText("Summarize long text fast")}>Summarize long text fast</span>
                </div>
              </section>
            </div>
          ) : (
            <div className="messages">
              {messages.map((msg, index) => (
                <Message key={`${msg.role}-${index}-${msg.text.slice(0, 12)}`} role={msg.role} text={msg.text} attachment={msg.attachment} onImageClick={onPreviewImage} />
              ))}
              {isLoading && <Message role="assistant" loading />}
            </div>
          )}
        </div>

        <ChatInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          onStop={handleStopGeneration}
          center={!chatStarted}
          disabled={isLoading}
          onFileUpload={handleFileUpload}
          isUploading={isUploading}
          attachmentLoaded={attachmentLoaded}
          attachedFileName={attachedFileName}
          attachedFileType={attachedFileType}
          attachedFilePreview={attachedFilePreview}
          onRemovePdf={handleRemovePdf}
          uploadProgress={uploadProgress}
        />

        {toast && <div className="chat-toast">{toast}</div>}
      </div>
    </main>
  );
}

export default ChatArea;
