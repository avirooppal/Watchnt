import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { semanticSearch } from '../../storage/embeddings.js';
import { callLLM } from '../../shared/llm.js';

export function ChatView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    const newMessages = [...messages, { role: 'user', content: userQuery }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Perform semantic search
      const cards = await semanticSearch(userQuery, 5);
      
      // 2. Format Context
      const context = cards.map(c => 
        `Source: ${c.source_title}\nSummary: ${c.summary}\nInsights: ${JSON.stringify(c.insights)}\n`
      ).join('\n\n');

      const systemPrompt = "You are a highly intelligent, conversational assistant helping a user explore their Watchn't knowledge library. You will be provided with semantic search results from their library. Answer their question strictly based on the provided context. If the answer is not in the context, say you cannot find it in their library. Be concise but detailed when necessary.";
      const userPrompt = `Library Context:\n${context}\n\nUser Question: ${userQuery}`;

      // 3. Call LLM
      const reply = await callLLM({
        system: systemPrompt,
        user: userPrompt,
        jsonMode: false
      });

      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <h2>Chat with your Library</h2>
            <p style={{ marginTop: '8px', fontSize: '14px', maxWidth: '400px', margin: '8px auto' }}>
              Ask anything. Watchn't will semantically search your captured videos, meetings, and podcasts, and use AI to answer you directly.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <div className="bubble-content">
              {m.role === 'assistant' ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble assistant">
            <div className="bubble-content typing">...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-area">
        <div className="chat-input-wrapper">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about your library..."
            autoFocus
          />
          <button type="submit" disabled={isLoading || !input.trim()} className="send-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
