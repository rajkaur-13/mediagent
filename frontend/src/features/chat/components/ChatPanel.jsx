import React, { useState, useEffect, useRef } from 'react';

const ChatPanel = ({
  messages,
  loading,
  input,
  setInput,
  sendMessage,
  handleKeyPress,
  messagesEndRef
}) => {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAIToolsOpen, setIsAIToolsOpen] = useState(false);
  const messagesContainerRef = useRef(null);
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const textareaRef = useRef(null);

  const renderMessage = (text) => {
    return { __html: text };
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [input]);

  // Check if user is near bottom
  const isNearBottom = () => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const threshold = 150;
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Handle scroll events
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const nearBottom = isNearBottom();
    setIsUserScrolled(!nearBottom);
    setShowScrollButton(!nearBottom && messages.length > 3);
  };

  // Smart auto-scroll
  const scrollToBottom = (smooth = true) => {
    if (!messagesContainerRef.current) return;
    
    if (smooth) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom(true);
    } else if (messages.length > 0 && !isUserScrolled) {
      scrollToBottom(true);
    }
  }, [messages]);

  // Auto-scroll when loading starts
  useEffect(() => {
    if (loading && isNearBottom()) {
      scrollToBottom(true);
    }
  }, [loading]);

  // Handle sending message
  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage();
    setTimeout(() => scrollToBottom(true), 50);
  };

  // Handle Enter key
  const handleKeyPressWithScroll = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle AI Tools
  const handleAITool = (action) => {
    const actions = {
      summarize: 'Summarize the conversation',
      explain: 'Explain this in detail',
      improve: 'Improve this note',
      translate: 'Translate this',
      soap: 'Generate SOAP note'
    };
    setInput(actions[action] || action);
    setIsAIToolsOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // Handle voice recording
  const handleVoiceRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Start recording logic
      setTimeout(() => {
        setInput('Voice recording in progress...');
      }, 500);
    } else {
      // Stop recording logic
      setIsRecording(false);
    }
  };

  // Handle file attachment
  const handleAttachment = () => {
    // Trigger file upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.png,.dicom';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setInput(`Uploaded: ${file.name}`);
      }
    };
    input.click();
  };

  return (
    <div className="panel panel-chat">
      <div className="panel-header">💬 Conversation</div>
      
      <div 
        className="chat-messages" 
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.isUser ? 'user' : 'ai'}`}>
            <div className="message-avatar">{msg.isUser ? '👨‍⚕️' : '🤖'}</div>
            <div className="message-bubble">
              <div className="message-text" dangerouslySetInnerHTML={renderMessage(msg.text)} />
              <div className="message-time">{msg.timestamp?.toLocaleTimeString() || new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message ai">
            <div className="message-avatar">🤖</div>
            <div className="message-bubble">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
              <div className="typing-text">✨ AI is generating recommendations...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button 
          className="scroll-to-bottom-btn"
          onClick={() => {
            scrollToBottom(true);
            setShowScrollButton(false);
            setIsUserScrolled(false);
          }}
        >
          ⬇ New Messages
        </button>
      )}

      {/* ===== PREMIUM CHAT INPUT ===== */}
      <div className="chat-input-wrapper">
        <div className={`chat-input-container ${input ? 'has-text' : ''}`}>
          {/* Attachment Button */}
          <button 
            className="input-action-btn attachment-btn"
            onClick={handleAttachment}
            title="Upload file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            className="chat-input-premium"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPressWithScroll}
            placeholder="Ask MediAgent about this patient..."
            rows="1"
          />

          {/* AI Tools Button */}
          <div className="input-actions">
            <button 
              className={`input-action-btn ai-tools-btn ${isAIToolsOpen ? 'active' : ''}`}
              onClick={() => setIsAIToolsOpen(!isAIToolsOpen)}
              title="AI Tools"
            >
              ✨
            </button>

            {/* Voice Button */}
            <button 
              className={`input-action-btn voice-btn ${isRecording ? 'recording' : ''}`}
              onClick={handleVoiceRecording}
              title="Voice dictation"
            >
              {isRecording ? (
                <span className="recording-pulse">🎤</span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>

            {/* Send Button */}
            <button 
              className="send-btn-premium"
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <span className="send-loading"></span>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>

          {/* AI Tools Dropdown */}
          {isAIToolsOpen && (
            <div className="ai-tools-dropdown">
              <button onClick={() => handleAITool('summarize')}>
                <span>📝</span> Summarize
              </button>
              <button onClick={() => handleAITool('explain')}>
                <span>💡</span> Explain
              </button>
              <button onClick={() => handleAITool('improve')}>
                <span>✨</span> Improve Note
              </button>
              <button onClick={() => handleAITool('translate')}>
                <span>🌐</span> Translate
              </button>
              <button onClick={() => handleAITool('soap')}>
                <span>📋</span> Generate SOAP
              </button>
            </div>
          )}
        </div>

        {/* Helper Text */}
        <div className="chat-input-helper">
          <span>Press <kbd>Enter</kbd> to send • <kbd>Shift</kbd> + <kbd>Enter</kbd> for new line</span>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;