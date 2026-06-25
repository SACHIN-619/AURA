// client/components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(e) { 
    return { hasError: true, error: e }; 
  }
  
  componentDidCatch(e, info) { 
    console.error('[AURA System Intercept]', e, info.componentStack); 
  }
  
  render() {
    if (!this.state.hasError) return this.props.children;
    
    return (
      <div style={E.container}>
        <div style={E.card}>
          <div style={E.sparkle}>✦</div>
          <h2 style={E.heading}>Aesthetic State Interrupted</h2>
          <p style={E.sub}>The marketplace execution thread encountered an unexpected variation.</p>
          
          <div style={E.terminalPayload}>
            <code style={E.codeText}>{this.state.error?.message || "Unknown State Exception"}</code>
          </div>

          <div style={E.actionRow}>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })} 
              style={E.btnPrimary}
            >
              RESET ENGINE
            </button>
            
            {/* Direct user context anchor over into your bottom-right system chatbot */}
            <button 
              onClick={() => window.AuraChatbot?.open?.() || alert('Aura Assistant is active in your bottom right workspace context.')} 
              style={E.btnSecondary}
            >
              ASK AURA ASSISTANT
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const E = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem', background: '#030204' },
  card: { width: '100%', maxWidth: 440, background: 'rgba(18,14,24,0.65)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: '2rem', backdropFilter: 'blur(20px)', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.8)' },
  sparkle: { fontSize: '1.8rem', color: '#D4AF37', marginBottom: '0.5rem', opacity: 0.7 },
  heading: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: '1.6rem', color: '#FFF2A8', margin: '0 0 0.5rem', letterSpacing: '0.04em' },
  sub: { fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: 'rgba(255, 248, 220, 0.5)', marginBottom: '1.5rem', lineHeight: 1.5 },
  terminalPayload: { background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.8rem', marginBottom: '1.5rem', textAlign: 'left', overflowX: 'auto' },
  codeText: { fontFamily: "'Geist Mono', monospace", fontSize: '0.52rem', letterSpacing: '0.05em', color: '#FF9E9E', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  actionRow: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  btnPrimary: { width: '100%', padding: '0.75rem', background: 'rgba(212,175,55,0.08)', border: '1px solid #D4AF37', borderRadius: 8, fontFamily: "'Geist Mono', monospace", fontSize: '0.52rem', letterSpacing: '0.15em', color: '#FFF2A8', cursor: 'pointer', transition: 'all 0.2s' },
  btnSecondary: { width: '100%', padding: '0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: "'Geist Mono', monospace", fontSize: '0.52rem', letterSpacing: '0.15em', color: 'rgba(255,248,220,0.4)', cursor: 'pointer', transition: 'all 0.2s' }
};