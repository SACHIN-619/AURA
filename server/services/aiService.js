// server/services/aiService.js — Gemini → Groq → HuggingFace → Krutrim cascade
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

let _gemini=null, _groq=null, _hf=null;
const getGemini = () => { if(!_gemini){ if(!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set'); _gemini=new GoogleGenerativeAI(process.env.GEMINI_API_KEY); } return _gemini; };
const getGroq   = () => { if(!_groq)  { if(!process.env.GROQ_API_KEY)   throw new Error('GROQ_API_KEY not set');   _groq=new Groq({apiKey:process.env.GROQ_API_KEY}); }   return _groq;   };
const getHF     = () => { if(!_hf)    { if(!process.env.HUGGINGFACE_API_KEY) throw new Error('HF key not set');    _hf=new HfInference(process.env.HUGGINGFACE_API_KEY); } return _hf;     };

const clean = (t) => { const c=t.replace(/```json\s*/gi,'').replace(/```/g,'').trim(); try{return JSON.parse(c);}catch{} const m=c.match(/\{[\s\S]+\}/); if(!m) return null; try{return JSON.parse(m[0]);}catch{return null;} };

async function callGemini(sys, msg) {
  const models = ['gemini-2.0-flash','gemini-1.5-flash-latest'];
  for(const m of models) {
    try {
      const model = getGemini().getGenerativeModel({model:m});
      const r = await model.generateContent(`${sys}\n\nUser: ${msg}`);
      const t = r.response.text();
      if(t) { console.log(`[AI:Gemini] ✅ ${m}`); return t; }
    } catch(e) { console.warn(`[AI:Gemini] ${m}: ${e.message}`); if(e.message?.includes('429')) return null; }
  }
  return null;
}

async function callGroq(sys, msg) {
  try {
    const r = await getGroq().chat.completions.create({
      model:'llama-3.3-70b-versatile',
      messages:[{role:'system',content:sys+'\nRespond ONLY with valid JSON.'},{role:'user',content:msg}],
      temperature:0.15, max_tokens:1024, response_format:{type:'json_object'},
    });
    const t = r.choices[0]?.message?.content;
    if(t) { console.log('[AI:Groq] ✅'); return t; }
  } catch(e) { console.warn('[AI:Groq]',e.message); }
  return null;
}

async function callHF(sys, msg) {
  try {
    const r = await getHF().chatCompletion({
      model:'Qwen/Qwen2.5-72B-Instruct',
      messages:[{role:'system',content:sys+'\nRespond ONLY with valid JSON.'},{role:'user',content:msg}],
      max_tokens:1024, temperature:0.15,
    });
    const t = r?.choices[0]?.message?.content;
    if(t) { console.log('[AI:HF] ✅'); return t; }
  } catch(e) { console.warn('[AI:HF]',e.message); }
  return null;
}

// Krutrim Cloud (Ola) — OpenAI-compatible chat completions endpoint, native
// Indian-language support (Hindi/Telugu/etc) is a genuine differentiator
// for a Hyderabad-specific app, hence it's worth the 4th-fallback slot
// rather than dropping it. Uses plain fetch — no new SDK dependency needed.
async function callKrutrim(sys, msg) {
  try {
    const r = await fetch('https://cloud.olakrutrim.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KRUTRIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'Krutrim-2',
        messages: [
          { role: 'system', content: sys + '\nRespond ONLY with valid JSON.' },
          { role: 'user', content: msg },
        ],
        temperature: 0.15,
        max_tokens: 1024,
      }),
    });
    if (!r.ok) { console.warn(`[AI:Krutrim] HTTP ${r.status}`); return null; }
    const data = await r.json();
    const t = data?.choices?.[0]?.message?.content;
    if (t) { console.log('[AI:Krutrim] ✅'); return t; }
  } catch(e) { console.warn('[AI:Krutrim]', e.message); }
  return null;
}

const PROVIDERS = [
  { name:'Gemini',      key:'GEMINI_API_KEY',      fn:callGemini  },
  { name:'Groq',        key:'GROQ_API_KEY',        fn:callGroq    },
  { name:'HuggingFace', key:'HUGGINGFACE_API_KEY', fn:callHF      },
  { name:'Krutrim',     key:'KRUTRIM_API_KEY',     fn:callKrutrim },
];

export const generateStructuredJSON = async (systemPrompt, userMessage) => {
  const tried = [];
  for(const p of PROVIDERS) {
    if(!process.env[p.key]) continue;
    tried.push(p.name);
    try {
      const raw = await p.fn(systemPrompt, userMessage);
      if(!raw) continue;
      const parsed = clean(raw);
      if(parsed && typeof parsed === 'object') return { parsed, provider: p.name };
    } catch(e) { console.warn(`[AI:${p.name}]`, e.message); }
  }
  const msg = tried.length === 0
    ? 'No AI providers configured — set GEMINI_API_KEY, GROQ_API_KEY, HUGGINGFACE_API_KEY, or KRUTRIM_API_KEY'
    : `All providers failed: [${tried.join(', ')}]`;
  throw new Error(msg);
};
