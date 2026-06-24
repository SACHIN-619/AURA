import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = {hasError:false,error:null};
  static getDerivedStateFromError(e){return {hasError:true,error:e};}
  componentDidCatch(e,info){console.error('[AURA ErrorBoundary]',e,info.componentStack);}
  render(){
    if(!this.state.hasError) return this.props.children;
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'40vh',gap:'1rem',padding:'2rem',fontFamily:"'DM Sans',sans-serif",color:'rgba(255,248,220,0.5)'}}>
        <div style={{fontSize:'2rem',color:'rgba(212,175,55,0.3)'}}>✦</div>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:'1.3rem',color:'rgba(212,175,55,0.6)'}}>Something went wrong</h2>
        <p style={{fontFamily:"'Geist Mono',monospace",fontSize:'0.45rem',letterSpacing:'0.1em',textAlign:'center',maxWidth:360}}>{this.state.error?.message}</p>
        <button onClick={()=>this.setState({hasError:false,error:null})} style={{padding:'0.6rem 1.4rem',background:'rgba(212,175,55,0.08)',border:'1px solid rgba(212,175,55,0.3)',borderRadius:6,fontFamily:"'Geist Mono',monospace",fontSize:'0.48rem',letterSpacing:'0.18em',color:'#D4AF37',cursor:'pointer'}}>TRY AGAIN</button>
      </div>
    );
  }
}
