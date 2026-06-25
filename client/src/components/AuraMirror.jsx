// AURA Mirror — selfie upload → AI style recommendations
// Flow: gender context (optional, skippable) → upload → crop → analyze → result
// No hardcoded style list anywhere — every recommendation is generated live
// by the AI based on the actual photo and the gender context given.
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLOR, FONT } from '../utils/tokens';
import { API, useAura } from '../context/AuraContext';

const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'];

export default function AuraMirror({onClose,onBook}) {
  const { trackEvent, user, setAuthModalOpen, pushToast } = useAura();
  const [stage,setStage]=useState('gender'); // gender | upload | crop | analyzing | result | error
  const [gender,setGender]=useState(null);
  const [rawImage,setRawImage]=useState(null);   // original uploaded image (data URL)
  const [preview,setPreview]=useState(null);     // cropped/final image (data URL)
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const fileRef=useRef();
  const camRef=useRef();
  const imgRef=useRef();
  const cropBoxRef=useRef();

  useEffect(() => {
    if (!user) {
      pushToast('Please log in to use Aura Mirror', 'info');
      setAuthModalOpen(true);
    }
  }, [user]);

  // Simple drag-to-reposition crop state — keeps a square crop window,
  // user drags the image underneath it to choose what's centered.
  const [cropOffset,setCropOffset]=useState({x:0,y:0});
  const dragState=useRef(null);

  const chooseGender=(g)=>{ 
    if(!user) { setAuthModalOpen(true); return; }
    setGender(g); setStage('upload'); 
  };
  const skipGender=()=>{ 
    if(!user) { setAuthModalOpen(true); return; }
    setGender(null); setStage('upload'); 
  };

  const onFile=(e)=>{
    const file=e.target.files?.[0];
    if(!file) return;
    if(!file.type.startsWith('image/')){setError('Please upload a photo.');return;}
    if(file.size > 8*1024*1024){setError('Image too large — please use one under 8MB.');return;}
    const reader=new FileReader();
    reader.onload=(ev)=>{
      setRawImage(ev.target.result);
      setCropOffset({x:0,y:0});
      setStage('crop');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  // Drag handlers for repositioning the image inside the fixed crop window
  const onDragStart=(e)=>{
    const point = e.touches ? e.touches[0] : e;
    dragState.current = { startX: point.clientX, startY: point.clientY, origX: cropOffset.x, origY: cropOffset.y };
  };
  const onDragMove=(e)=>{
    if(!dragState.current) return;
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - dragState.current.startX;
    const dy = point.clientY - dragState.current.startY;
    setCropOffset({ x: dragState.current.origX + dx, y: dragState.current.origY + dy });
  };
  const onDragEnd=()=>{ dragState.current = null; };

  // Render the crop window's visible region onto a canvas → final base64 image
  const confirmCrop = useCallback(() => {
    const img = imgRef.current;
    const box = cropBoxRef.current;
    if (!img || !box) { setPreview(rawImage); setStage('preview'); return; }

    const boxRect = box.getBoundingClientRect();
    const naturalW = img.naturalWidth, naturalH = img.naturalHeight;
    const displayedW = img.clientWidth, displayedH = img.clientHeight;
    const scaleX = naturalW / displayedW, scaleY = naturalH / displayedH;

    // The image's top-left corner relative to the crop box, accounting for drag offset
    const imgLeftInBox = cropOffset.x;
    const imgTopInBox = cropOffset.y;

    // Source rectangle in natural image pixels
    const sx = Math.max(0, (-imgLeftInBox) * scaleX);
    const sy = Math.max(0, (-imgTopInBox) * scaleY);
    const sSize = Math.min(boxRect.width * scaleX, boxRect.height * scaleY, naturalW - sx, naturalH - sy);

    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, 512, 512);
    setPreview(canvas.toDataURL('image/jpeg', 0.9));
    setStage('preview');
  }, [cropOffset, rawImage]);

  const analyze=async()=>{
    if(!preview) return;
    setStage('analyzing'); setError('');
    try {
      const token = localStorage.getItem('aura_token');
      const headers = {'Content-Type':'application/json'};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res=await fetch(`${API}/api/mirror/analyze`,{
        method:'POST',
        headers,
        body:JSON.stringify({ imageBase64: preview.split(',')[1], gender }),
      });
      const data = await res.json();
      if(!res.ok || !data.success) throw new Error(data.error || 'Analysis failed');
      setResult(data);
      setStage('result');
      trackEvent('mirror_used', { metadata: { gender: gender || 'unspecified' } });
    } catch(e) {
      // Honest failure — no fake canned result pretending to be real analysis
      setError(e.message || 'Could not analyze your photo right now.');
      setStage('error');
    }
  };

  const reset=()=>{setStage('gender');setGender(null);setRawImage(null);setPreview(null);setResult(null);setError('');};
  const retryUpload=()=>{setStage('upload');setRawImage(null);setPreview(null);setError('');};

  return (
    <motion.div style={S.ov} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <div style={S.back} onClick={onClose}/>
      <motion.div style={S.box} initial={{scale:0.9,opacity:0,y:30}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.9,opacity:0}} transition={{type:'spring',stiffness:200,damping:22}}>
        <button style={S.close} onClick={onClose}>✕</button>
        <div style={{textAlign:'center',marginBottom:'1.3rem'}}>
          <div style={{fontSize:'2rem',color:COLOR.gold,marginBottom:'0.5rem'}}>◈</div>
          <h2 style={{fontFamily:FONT.display,fontSize:'1.6rem',fontWeight:300,color:COLOR.textPrimary,margin:0}}>AURA Mirror</h2>
          <p style={{fontFamily:FONT.mono,fontSize:'0.47rem',letterSpacing:'0.2em',color:COLOR.textMuted,marginTop:'0.3rem'}}>AI-powered style recommendations</p>
        </div>

        <AnimatePresence mode="wait">
          {!user && (
            <motion.div key="loginPrompt" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{textAlign: 'center', padding: '1rem 0'}}>
              <p style={{fontFamily:FONT.mono,fontSize:'0.46rem',letterSpacing:'0.12em',color:COLOR.textMuted,marginBottom:'1.5rem',lineHeight:1.7}}>
                Please log in to AURA to access the AI Mirror. We securely store your results so you can review them later.
              </p>
              <button 
                style={S.primBtn} 
                onClick={() => { onClose(); setAuthModalOpen(true); }}
              >
                Log In to Continue
              </button>
            </motion.div>
          )}

          {user && stage==='gender' && (
            <motion.div key="gen" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <p style={{fontFamily:FONT.mono,fontSize:'0.46rem',letterSpacing:'0.12em',color:COLOR.textMuted,textAlign:'center',marginBottom:'1.1rem',lineHeight:1.7}}>
                Help us tailor recommendations — this is optional and never shared.
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:'0.55rem',marginBottom:'0.9rem'}}>
                {GENDER_OPTIONS.map(g=>(
                  <button key={g} onClick={()=>chooseGender(g)} style={S.genderBtn}>{g}</button>
                ))}
              </div>
              <button style={S.skipLink} onClick={skipGender}>Skip this step →</button>
            </motion.div>
          )}

          {stage==='upload' && (
            <motion.div key="up" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem'}}>
                <div style={{...S.drop, flex:1, padding:'1.5rem 0.5rem'}} onClick={()=>fileRef.current?.click()}>
                  <div style={{fontSize:'2rem',marginBottom:'0.5rem',opacity:0.4}}>📸</div>
                  <div style={{fontFamily:FONT.display,fontSize:'1rem',color:COLOR.textPrimary}}>Upload</div>
                </div>
                <div style={{...S.drop, flex:1, padding:'1.5rem 0.5rem'}} onClick={()=>camRef.current?.click()}>
                  <div style={{fontSize:'2rem',marginBottom:'0.5rem',opacity:0.4}}>🤳</div>
                  <div style={{fontFamily:FONT.display,fontSize:'1rem',color:COLOR.textPrimary}}>Take Photo</div>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={onFile}/>
              <input ref={camRef} type="file" accept="image/*" capture="user" style={{display:'none'}} onChange={onFile}/>
              {error&&<p style={{fontFamily:FONT.mono,fontSize:'0.44rem',color:'#EF5350',textAlign:'center',marginTop:'0.5rem'}}>{error}</p>}
              <button style={S.skipLink} onClick={()=>setStage('gender')}>← Back</button>
            </motion.div>
          )}

          {/* Crop step — drag to reposition face inside the square frame */}
          {stage==='crop'&&rawImage&&(
            <motion.div key="crop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <p style={{fontFamily:FONT.mono,fontSize:'0.42rem',letterSpacing:'0.1em',color:COLOR.textGhost,textAlign:'center',marginBottom:'0.7rem'}}>
                Drag to center your face, then confirm
              </p>
              <div
                ref={cropBoxRef}
                style={S.cropBox}
                onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
                onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
              >
                <img
                  ref={imgRef}
                  src={rawImage}
                  alt="Position your photo"
                  draggable={false}
                  style={{
                    position:'absolute',
                    left: cropOffset.x, top: cropOffset.y,
                    maxWidth:'none', height:'100%',
                    cursor:'grab', userSelect:'none',
                  }}
                  onLoad={(e)=>{
                    // Center the image initially so the crop box starts on the middle of the photo
                    const el = e.currentTarget;
                    const box = cropBoxRef.current;
                    if (box) setCropOffset({ x: -(el.clientWidth - box.clientWidth)/2, y: -(el.clientHeight - box.clientHeight)/2 });
                  }}
                />
                <div style={S.cropOverlay}/>
              </div>
              <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem'}}>
                <button style={S.secBtn} onClick={retryUpload}>Choose another</button>
                <motion.button style={S.primBtn} onClick={confirmCrop} whileHover={{filter:'brightness(1.08)'}} whileTap={{scale:0.97}}>Use this photo</motion.button>
              </div>
            </motion.div>
          )}

          {/* Preview before sending to AI */}
          {stage==='preview'&&preview&&(
            <motion.div key="pv" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <div style={{width:200,height:200,borderRadius:'50%',overflow:'hidden',margin:'0 auto 1.2rem',border:'2px solid rgba(212,175,55,0.3)'}}>
                <img src={preview} alt="Your photo" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              </div>
              <div style={{display:'flex',gap:'0.75rem'}}>
                <button style={S.secBtn} onClick={retryUpload}>Try another</button>
                <motion.button style={S.primBtn} onClick={analyze} whileHover={{filter:'brightness(1.08)'}} whileTap={{scale:0.97}}>✦ Analyze my style</motion.button>
              </div>
            </motion.div>
          )}

          {/* Analyzing */}
          {stage==='analyzing'&&(
            <motion.div key="an" initial={{opacity:0}} animate={{opacity:1}} style={{textAlign:'center',padding:'2rem 0'}}>
              <div style={S.spinner}/>
              <div style={{fontFamily:FONT.display,fontSize:'1.1rem',color:COLOR.textPrimary,marginBottom:'0.3rem'}}>AI is reading your vibe…</div>
              <div style={{fontFamily:FONT.mono,fontSize:'0.46rem',letterSpacing:'0.15em',color:COLOR.textMuted}}>Matching you with Hyderabad's finest</div>
            </motion.div>
          )}

          {/* Honest error — no fake fallback result */}
          {stage==='error'&&(
            <motion.div key="err" initial={{opacity:0}} animate={{opacity:1}} style={{textAlign:'center',padding:'1.5rem 0'}}>
              <div style={{fontSize:'2rem',marginBottom:'0.8rem',opacity:0.5}}>⚠</div>
              <div style={{fontFamily:FONT.display,fontSize:'1.05rem',color:COLOR.textPrimary,marginBottom:'0.5rem'}}>Couldn't analyze your photo</div>
              <p style={{fontFamily:FONT.mono,fontSize:'0.43rem',letterSpacing:'0.08em',color:COLOR.textMuted,marginBottom:'1.2rem',lineHeight:1.7}}>{error}</p>
              <div style={{display:'flex',gap:'0.75rem'}}>
                <button style={S.secBtn} onClick={retryUpload}>Try another photo</button>
                <button style={S.primBtn} onClick={analyze}>Retry analysis</button>
              </div>
            </motion.div>
          )}

          {/* Result — every field is from the live AI response */}
          {stage==='result'&&result&&(
            <motion.div key="rs" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
              <div style={{textAlign:'center',padding:'1rem 0 0.8rem',borderBottom:'1px solid rgba(212,175,55,0.1)',marginBottom:'1rem'}}>
                <div style={{fontFamily:FONT.display,fontSize:'3.5rem',fontWeight:300,color:COLOR.gold,lineHeight:1}}>{result.score}</div>
                <div style={{fontFamily:FONT.mono,fontSize:'0.46rem',letterSpacing:'0.25em',color:COLOR.textMuted,marginBottom:'0.6rem'}}>AURA STYLE SCORE</div>
                {(result.reasons||[]).map((r,i)=><div key={i} style={{display:'inline-block',fontFamily:FONT.mono,fontSize:'0.44rem',letterSpacing:'0.1em',color:'rgba(212,175,55,0.7)',margin:'0.15rem 0.3rem'}}>✓ {r}</div>)}
              </div>
              <p style={{fontFamily:FONT.display,fontSize:'0.95rem',fontStyle:'italic',color:COLOR.textMuted,marginBottom:'0.6rem',lineHeight:1.6}}>{result.analysis}</p>
              {result.detectedContext&&<p style={{fontFamily:FONT.mono,fontSize:'0.4rem',letterSpacing:'0.08em',color:COLOR.textGhost,marginBottom:'0.4rem'}}>👁 {result.detectedContext}</p>}
              {result.aiProvider && <p style={{fontFamily:FONT.mono,fontSize:'0.35rem',letterSpacing:'0.05em',color:'rgba(255,255,255,0.2)',marginBottom:'1.2rem',textAlign:'right'}}>Powered by {result.aiProvider}</p>}
              <div style={{fontFamily:FONT.mono,fontSize:'0.44rem',letterSpacing:'0.22em',color:COLOR.textGhost,marginBottom:'0.7rem'}}>RECOMMENDED FOR YOU</div>
              <div className="mirror-styles-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem',marginBottom:'0.5rem'}}>
                {(result.styles||[]).map((st,i)=>(
                  <motion.div key={i} style={{border:'1px solid rgba(212,175,55,0.15)',borderRadius:8,overflow:'hidden',cursor:'pointer'}} whileHover={{scale:1.02,borderColor:'rgba(212,175,55,0.45)'}}>
                    <img
                      src={`https://picsum.photos/seed/${(st.searchKeyword||st.label||'style'+i).replace(/[^a-zA-Z0-9]/g,'')}/200/140`}
                      alt={st.label}
                      style={{width:'100%',height:80,objectFit:'cover',display:'block'}}
                      onError={e=>{e.target.style.display='none';}}
                    />
                    <div style={{fontFamily:FONT.mono,fontSize:'0.4rem',letterSpacing:'0.1em',color:COLOR.textMuted,padding:'0.35rem 0.4rem',textAlign:'center'}}>{st.label}</div>
                  </motion.div>
                ))}
              </div>
              <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem'}}>
                <button style={S.secBtn} onClick={reset}>Try again</button>
                <motion.button style={S.primBtn} onClick={()=>{onBook?.();onClose();}} whileHover={{filter:'brightness(1.08)'}} whileTap={{scale:0.97}}>★ Book matching salon</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

const S={
  ov:{position:'fixed',inset:0,zIndex:900,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'},
  back:{position:'absolute',inset:0,background:'rgba(3,2,4,0.88)',backdropFilter:'blur(12px)'},
  box:{position:'relative',width:'100%',maxWidth:520,background:'rgba(13,10,19,0.97)',border:'1px solid rgba(212,175,55,0.25)',borderRadius:16,padding:'clamp(1.2rem,5vw,2rem)',boxShadow:'0 30px 80px rgba(0,0,0,0.8)',maxHeight:'90vh',overflowY:'auto'},
  close:{position:'absolute',top:'0.9rem',right:'0.9rem',width:26,height:26,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,248,220,0.3)',cursor:'pointer',background:'transparent',border:'none',fontSize:'0.75rem'},
  drop:{border:'2px dashed rgba(212,175,55,0.2)',borderRadius:12,padding:'clamp(1.6rem,7vw,2.5rem) 1rem',textAlign:'center',cursor:'pointer',marginBottom:'1rem'},
  secBtn:{flex:1,padding:'0.72rem',background:'transparent',border:'1px solid rgba(212,175,55,0.2)',borderRadius:7,fontFamily:FONT.mono,fontSize:'0.48rem',letterSpacing:'0.18em',color:COLOR.textMuted,cursor:'pointer'},
  primBtn:{flex:2,padding:'0.72rem',background:'linear-gradient(135deg,#FFF2A8,#D4AF37)',border:'none',borderRadius:7,fontFamily:FONT.mono,fontSize:'0.5rem',letterSpacing:'0.18em',fontWeight:700,color:'#000',cursor:'pointer'},
  spinner:{width:40,height:40,border:'2px solid rgba(212,175,55,0.15)',borderTop:'2px solid #D4AF37',borderRadius:'50%',animation:'spin 0.9s linear infinite',margin:'0 auto 1.2rem'},
  genderBtn:{padding:'0.7rem',background:'rgba(212,175,55,0.04)',border:'1px solid rgba(212,175,55,0.18)',borderRadius:8,fontFamily:FONT.body,fontSize:'0.85rem',color:COLOR.textPrimary,cursor:'pointer',textAlign:'center',transition:'border-color 0.2s,background 0.2s'},
  skipLink:{display:'block',width:'100%',textAlign:'center',background:'none',border:'none',fontFamily:FONT.mono,fontSize:'0.44rem',letterSpacing:'0.14em',color:COLOR.textGhost,cursor:'pointer',padding:'0.5rem',marginTop:'0.3rem'},
  cropBox:{position:'relative',width:240,height:240,margin:'0 auto',borderRadius:'50%',overflow:'hidden',background:'#000',cursor:'grab',touchAction:'none'},
  cropOverlay:{position:'absolute',inset:0,border:'2px solid rgba(212,175,55,0.5)',borderRadius:'50%',pointerEvents:'none',boxShadow:'0 0 0 2000px rgba(3,2,4,0.6)'},
};


