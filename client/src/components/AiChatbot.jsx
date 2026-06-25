// AiChatbot — compact bottom-right chat widget using AURA design system.
// Uses inline styles (no Tailwind). Sends to the correct backend endpoint
// with the correct request body shape.
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../context/AuraContext';
import { COLOR, FONT } from '../utils/tokens';

export default function AiChatbot({ currentHub }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm AURA, your luxury Hyderabad grooming concierge. Ask me about salons, services, haircuts, or treatments near you."
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

  useEffect(() => {
    const handleOpenChat = (e) => {
      setIsOpen(true);
      if (e.detail?.query) {
        setInput(e.detail.query);
        // Focus the input if possible
        setTimeout(() => {
          const inputEl = document.querySelector('input[placeholder="Message AURA..."]');
          if (inputEl) inputEl.focus();
        }, 100);
      }
    };
    window.addEventListener('openAuraChat', handleOpenChat);
    return () => window.removeEventListener('openAuraChat', handleOpenChat);
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API}/api/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-6).map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })),
          userLocation: null,
        })
      });

      const data = await response.json();

      if (data.message || data.reply) {
        const reply = data.message || data.reply || '';
        const salons = Array.isArray(data.salons) ? data.salons : [];
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: reply,
          salons,
          aiProvider: data.aiProvider || null,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "I couldn't process that request right now. Try asking about a specific service like 'best haircut in Jubilee Hills'."
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Connection to the AURA concierge was interrupted. Please check your network and try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          style={S.fab}
          whileHover={{ scale: 1.06, boxShadow: '0 0 24px rgba(212,175,55,0.35)' }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <span style={S.fabIcon}>💬</span>
          <span style={S.fabPulse} />
        </motion.button>
      )}

      {/* Chat card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chatbot-card"
            style={S.card}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div style={S.header}>
              <div style={S.headerLeft}>
                <div style={S.headerIcon}>✦</div>
                <div>
                  <div style={S.headerTitle}>AURA Concierge</div>
                  <div style={S.headerSub}>📍 Serving {currentHub || 'Hyderabad'}</div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={S.closeBtn}>✕</button>
            </div>

            {/* Messages */}
            <div style={S.messagesWrap}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '0.6rem' }}>
                  <div style={msg.role === 'user' ? S.userBubble : S.aiBubble}>
                    <p style={S.msgText}>{msg.content}</p>
                    {msg.salons && msg.salons.length > 0 && (
                      <div style={S.salonList}>
                        <div style={S.salonListLabel}>Recommended:</div>
                        {msg.salons.slice(0, 3).map((s, i) => (
                          <a key={i} href={`/?hub=${s.hub || ''}`} style={S.salonChip}>
                            ✦ Book {s.name || 'Salon'}
                          </a>
                        ))}
                      </div>
                    )}
                    {msg.aiProvider && (
                      <div style={S.providerTag}>via {msg.aiProvider}</div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.6rem' }}>
                  <div style={S.aiBubble}>
                    <div style={S.dots}>
                      <span style={{ ...S.dot, animationDelay: '0ms' }} />
                      <span style={{ ...S.dot, animationDelay: '150ms' }} />
                      <span style={{ ...S.dot, animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={S.inputBar}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about haircuts, salons..."
                disabled={isLoading}
                style={S.input}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                style={{ ...S.sendBtn, opacity: (!input.trim() || isLoading) ? 0.4 : 1 }}
              >
                →
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const S = {
  // FAB
  fab: {
    width: 52, height: 52, borderRadius: '50%',
    background: 'rgba(13,10,19,0.92)', border: '1px solid rgba(212,175,55,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(16px)', position: 'relative',
  },
  fabIcon: { fontSize: '1.25rem' },
  fabPulse: {
    position: 'absolute', top: 4, right: 4, width: 8, height: 8,
    borderRadius: '50%', background: COLOR.gold,
    animation: 'livepulse 2s infinite',
  },

  // Card
  card: {
    position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1300,
    width: 440, height: 650, maxWidth: 'calc(100vw - 2rem)', maxHeight: '85vh',
    background: 'rgba(13,10,19,0.98)', border: '1px solid rgba(212,175,55,0.22)',
    borderRadius: 16, display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 64px rgba(0,0,0,0.85)', overflow: 'hidden',
    backdropFilter: 'blur(24px)',
  },

  // Header
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,175,55,0.1)',
    background: 'rgba(6,5,8,0.8)', flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  headerIcon: {
    width: 30, height: 30, borderRadius: '50%',
    background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: COLOR.gold, fontSize: '0.8rem', fontFamily: FONT.mono,
  },
  headerTitle: { fontFamily: FONT.body, fontSize: '0.9rem', fontWeight: 600, color: COLOR.textPrimary },
  headerSub: { fontFamily: FONT.mono, fontSize: '0.5rem', color: COLOR.textGhost, letterSpacing: '0.06em' },
  closeBtn: {
    width: 28, height: 28, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
    color: COLOR.textGhost, cursor: 'pointer', fontSize: '0.7rem',
    transition: 'all 0.15s',
  },

  // Messages
  messagesWrap: {
    flex: 1, overflowY: 'auto', padding: '0.75rem 0.8rem',
    display: 'flex', flexDirection: 'column',
  },
  userBubble: {
    maxWidth: '80%', padding: '0.55rem 0.8rem',
    background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)',
    borderRadius: '12px 12px 2px 12px', color: '#1a1410',
  },
  aiBubble: {
    maxWidth: '85%', padding: '0.55rem 0.8rem',
    background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.1)',
    borderRadius: '12px 12px 12px 2px', color: COLOR.textPrimary,
  },
  msgText: { fontFamily: FONT.body, fontSize: '0.85rem', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' },
  salonList: { marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(212,175,55,0.15)' },
  salonListLabel: { fontFamily: FONT.mono, fontSize: '0.42rem', letterSpacing: '0.1em', color: COLOR.goldDim, marginBottom: '0.4rem', textTransform: 'uppercase' },
  salonChip: {
    display: 'block', padding: '0.4rem 0.6rem', marginBottom: '0.3rem',
    background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 6, fontFamily: FONT.body, fontSize: '0.7rem', color: COLOR.gold, textDecoration: 'none', textAlign: 'center', fontWeight: 'bold'
  },
  providerTag: { fontFamily: FONT.mono, fontSize: '0.38rem', color: COLOR.textGhost, marginTop: '0.3rem', textAlign: 'right' },

  // Loading dots
  dots: { display: 'flex', gap: 4, padding: '0.2rem 0' },
  dot: {
    width: 6, height: 6, borderRadius: '50%', background: COLOR.gold,
    animation: 'ldpulse 1.2s infinite ease-in-out',
  },

  // Input
  inputBar: {
    display: 'flex', gap: '0.4rem', padding: '0.6rem 0.75rem',
    borderTop: '1px solid rgba(212,175,55,0.1)', background: 'rgba(6,5,8,0.8)',
    flexShrink: 0,
  },
  input: {
    flex: 1, padding: '0.6rem 0.8rem',
    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, outline: 'none', fontFamily: FONT.body, fontSize: '0.85rem',
    color: COLOR.textPrimary, boxSizing: 'border-box',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
    background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)',
    color: COLOR.gold, fontFamily: FONT.mono, fontSize: '1rem', fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
};