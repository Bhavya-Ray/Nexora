import { useState, useEffect } from "react";

function Message({ role, text = "", loading = false, attachment = null, onImageClick }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const label = role === "user" ? "You" : "Assistant";

  useEffect(() => {
    // If this message unmounts, or text changes, ensure we don't keep playing 
    // old audio if it was currently speaking this exact text.
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  const toggleSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Stop any other speech first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  return (
    <div className={`message-row ${role}`}>
      <article className="message-card">
        <div className="message-meta">
          {role === "assistant" && !loading && text && (
            <button
              type="button"
              className={`message-tts-button ${isPlaying ? "playing" : ""}`}
              onClick={toggleSpeech}
              title={isPlaying ? "Stop speaking" : "Read aloud"}
              aria-label={isPlaying ? "Stop speaking" : "Read aloud"}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2004/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2004/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
              )}
            </button>
          )}
        </div>
        <div className="message-body">
          {attachment && (
            <div className={`message-attachment ${attachment.type}`}>
              {attachment.type === 'image' ? (
                <img 
                  src={attachment.preview} 
                  alt={attachment.name} 
                  className="message-image-preview" 
                  onClick={() => onImageClick?.(attachment.preview)}
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <div className="message-pdf-preview">
                  <div className="pdf-icon-box">
                    <svg xmlns="http://www.w3.org/2004/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  </div>
                  <div className="pdf-info">
                    <span className="pdf-name">{attachment.name}</span>
                    <span className="pdf-type">PDF</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {loading ? (
            <div className="typing-indicator" aria-label="Assistant is typing">
              <span />
              <span />
              <span />
            </div>
          ) : (
            text
          )}
        </div>
      </article>
    </div>
  );
}

export default Message;
