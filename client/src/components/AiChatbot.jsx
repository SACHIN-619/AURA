import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, MapPin, ArrowUpRight } from 'lucide-react';

export default function AiChatbot({ currentHub, onNavigateToSalon }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am AURA, your luxury Hyderabad grooming concierge. I can analyze your needs, find specific salon services near your hub, or route you straight to the perfect booking. How can I perfect your look today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Safe JSON extraction loop without breaking syntax or lines
  const parseResponseContent = (text) => {
    let s = text.trim();
    if (s.startsWith('```')) {
      s = s.substring(3);
      if (s.toLowerCase().startsWith('json')) {
        s = s.substring(4);
      }
    }
    if (s.endsWith('```')) {
      s = s.substring(0, s.length - 3);
    }
    try {
      return JSON.parse(s.trim());
    } catch (e) {
      return { reply: text, directAction: null };
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          hubContext: currentHub || 'Banjara Hills', // Uses active user hub location context
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.reply,
          suggestedSalons: data.suggestedSalons || [] 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I ran into a minor issue checking our salon registry. Please let me know what service you are seeking, and I will locate it." 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Connection to the AURA concierge network was interrupted. Please check your network status." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans antialiased">
      
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-neutral-900 to-neutral-800 text-amber-400 border border-neutral-700/50 p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group"
          style={{ boxShadow: '0 10px 30px -10px rgba(217, 119, 6, 0.3)' }}
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-amber-400 group-hover:rotate-12 transition-transform"/>
            <span className="absolute top-0 right-0 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
          </div>
          <span className="text-sm font-medium tracking-wide text-neutral-100 pr-1 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out">
            Ask AURA
          </span>
        </button>
      )}

      
      {isOpen && (
        <div className="w-[380px] h-[520px] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          
          
          <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Sparkles className="w-4 h-4 text-amber-400"/>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-100 tracking-wide">AURA Concierge</h3>
                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                  <MapPin className="w-3 h-3 text-amber-500/70"/>
                  <span>Serving {currentHub || 'Hyderabad'}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-800/50 transition-colors"
            >
              <X className="w-5 h-5"/>
            </button>
          </div>

          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-neutral-900 to-neutral-950 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${msg.role === 'user' ? 'bg-amber-500 text-neutral-950 font-medium rounded-tr-none' 
                    : 'bg-neutral-800/80 text-neutral-200 border border-neutral-700/30 rounded-tl-none leading-relaxed'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  
                  {msg.suggestedSalons && msg.suggestedSalons.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-neutral-700/40 space-y-1.5">
                      <p className="text-[11px] uppercase tracking-wider text-amber-400/80 font-semibold">Recommended Outlets:</p>
                      {msg.suggestedSalons.map((salon) => (
                        <button
                          key={salon._id || salon.osmId}
                          onClick={() => onNavigateToSalon && onNavigateToSalon(salon._id || salon.osmId)}
                          className="w-full flex items-center justify-between text-left p-2 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-700/50 rounded-lg text-xs text-neutral-200 group transition-all"
                        >
                          <span className="font-medium truncate pr-2">{salon.name}</span>
                          <span className="text-amber-400 flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                            View <ArrowUpRight className="w-3 h-3"/>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-neutral-800/80 rounded-xl rounded-tl-none px-4 py-3 border border-neutral-700/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          
          <form onSubmit={handleSendMessage} className="p-3 bg-neutral-950 border-t border-neutral-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search services, haircuts, treatments..."
              disabled={isLoading}
              className="flex-1 bg-neutral-900 text-neutral-200 placeholder-neutral-500 text-sm px-3.5 py-2 rounded-xl border border-neutral-800 focus:outline-none focus:border-amber-500/50 disabled:opacity-60 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-neutral-800 border border-neutral-700/60 hover:bg-amber-500 hover:text-neutral-950 text-amber-400 p-2 rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-neutral-800 disabled:hover:text-amber-400 shrink-0"
            >
              <Send className="w-4 h-4"/>
            </button>
          </form>

        </div>
      )}
    </div>
  );
}