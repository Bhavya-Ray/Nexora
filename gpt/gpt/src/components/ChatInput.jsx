import { useState, useRef, useEffect } from "react";

const ChatInput = ({
  text,
  setText,
  sendMessage,
  onStop,
  center,
  disabled,
  onFileUpload,
  isUploading,
  attachmentLoaded,
  attachedFileName,
  attachedFileType,
  attachedFilePreview,
  onRemovePdf,
  uploadProgress
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const uploadMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target)) {
        setIsUploadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!disabled && text.trim()) {
      sendMessage();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');

      setText(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Clear the input so the same file could be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form className={`chat-input ${center ? "center" : ""}`} onSubmit={handleSubmit}>
      <div className={`chat-input-inner ${isUploading || attachmentLoaded ? "has-attachment" : ""}`}>
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {attachedFileName && (
          <div className="pdf-upload-preview">
            <div className="pdf-icon-box" style={{ position: "relative", overflow: "hidden" }}>
              {isUploading ? (
                <div className="progress-overlay" style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.3)",
                  zIndex: 2
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                    <circle
                      cx="12" cy="12" r="10"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeDasharray="62.83"
                      strokeDashoffset={62.83 - (uploadProgress / 100) * 62.83}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 0.1s linear" }}
                    />
                  </svg>
                </div>
              ) : null}

              {attachedFileType === 'image' && attachedFilePreview ? (
                <img
                  src={attachedFilePreview}
                  alt="preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <svg xmlns="http://www.w3.org/2004/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              )}
            </div>
            <div className="pdf-info">
              <span className="pdf-name">{attachedFileName}</span>
              <span className="pdf-type">{attachedFileType === 'image' ? 'IMAGE' : 'PDF'}</span>
            </div>
            <button
              type="button"
              className="pdf-remove-btn"
              onClick={onRemovePdf}
              aria-label="Remove attachment"
            >
              <svg xmlns="http://www.w3.org/2004/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}

        <div className="chat-input-row" style={{ position: "relative" }}>
          <div className="upload-menu-container" ref={uploadMenuRef}>
            <button
              type="button"
              className="attach-button"
              onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
              aria-label="Upload menu"
              title="Add photos & files"
              disabled={isUploading}
            >
              <svg xmlns="http://www.w3.org/2004/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>

            {isUploadMenuOpen && (
              <div className="upload-dropdown-menu">
                <button
                  type="button"
                  className="upload-menu-item"
                  onClick={() => {
                    setIsUploadMenuOpen(false);
                    imageInputRef.current?.click();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2004/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2.5" ry="2.5" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <span>Photos</span>
                </button>
                <button
                  type="button"
                  className="upload-menu-item"
                  onClick={() => {
                    setIsUploadMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2004/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span>Files (PDF)</span>
                </button>
              </div>
            )}
          </div>

          <input
            value={text}
            placeholder={disabled ? "Nexora is writing..." : "Type a message..."}
            onChange={(event) => setText(event.target.value)}
            aria-label="Message input"
            disabled={false}
            autoFocus
          />

          <div className="chat-input-actions-right">
            <button
              type="button"
              className={`mic-button ${isListening ? "listening" : ""}`}
              onClick={toggleListening}
              aria-label="Toggle voice input"
              title="Voice input"
              disabled={isUploading}
            >
              {isListening ? (
                <svg xmlns="http://www.w3.org/2004/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
                  <rect x="9" y="9" width="6" height="6"></rect>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2004/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
              )}
            </button>

            {disabled ? (
              <button
                type="button"
                className="stop-button"
                onClick={onStop}
                aria-label="Stop generation"
                title="Stop responding"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                className={`send-button ${!text.trim() ? "hidden" : ""}`}
                disabled={!text.trim() || isUploading}
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2004/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

export default ChatInput;
