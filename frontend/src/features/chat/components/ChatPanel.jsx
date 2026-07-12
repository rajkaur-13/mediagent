import React from 'react';

const ChatPanel = ({
  messages,
  loading,
  input,
  setInput,
  sendMessage,
  handleKeyPress,
  messagesEndRef
}) => {
  const renderMessage = (text) => {
    return { __html: text };
  };

  return (
    <div className="panel panel-chat">
      <div className="panel-header">💬 Conversation</div>
      <div className="chat-messages">
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
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here... (Press Enter to send)"
          rows="2"
        />
        <button className="send-btn" onClick={sendMessage}>📤 Send</button>
      </div>
    </div>
  );
};

export default ChatPanel;
