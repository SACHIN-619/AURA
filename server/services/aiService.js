// server/services/aiService.js — Groq → HuggingFace → Gemini → Krutrim cascade
// Groq is tried first because it has the most generous free tier (unlimited on free plan).
// HuggingFace is second for the same reason. Gemini has a small daily quota so it
// comes third to avoid the "demo mode" toast after just 2–3 chat turns.
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

let _gemini=null, _groq=null, _hf=null;
const getGemini = () => { if(!_gemini){ if(!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set'); _gemini=new GoogleGenerativeAI(process.env.GEMINI_API_KEY); } return _gemini; };
const getGroq   = () => { if(!_groq)  { if(!process.env.GROQ_API_KEY)   throw new Error('GROQ_API_KEY not set');   _groq=new Groq({apiKey:process.env.GROQ_API_KEY}); }   return _groq;   };
const getHF     = () => { if(!_hf)    { if(!process.env.HUGGINGFACE_API_KEY) throw new Error('HF key not set');    _hf=new HfInference(process.env.HUGGINGFACE_API_KEY); } return _hf;     };

const clean = (t) => { const c=t.replace(/```json\s*/gi,'').replace(/```/g,'').trim(); try{return JSON.parse(c);}catch{} const m=c.match(/\{[\s\S]+\}/); if(!m) return null; try{return JSON.parse(m[0]);}catch{return null;} };

async function callGemini(sys, msg) {
  // gemini-2.0-flash-lite is the current free-tier text model (2025)
  const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];
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
  { name:'Groq',        key:'GROQ_API_KEY',        fn:callGroq    },
  { name:'HuggingFace', key:'HUGGINGFACE_API_KEY', fn:callHF      },
  { name:'Gemini',      key:'GEMINI_API_KEY',      fn:callGemini  },
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

// queryYourGeminiModel — used for translation, language list, and salon enrichment.
// Uses the same cascade as generateStructuredJSON but returns raw text (not parsed JSON).
// Order: Groq first (generous free tier) → HuggingFace → Gemini → Krutrim.
export async function queryYourGeminiModel({ prompt }) {
  // Try Groq first — most generous free tier, no daily quota issues
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = getGroq();
      const r = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.15,
        max_tokens: 1024,
      });
      const text = r.choices[0]?.message?.content;
      if (text) { console.log('[queryYourGeminiModel:Groq] ✅'); return text; }
    } catch (e) {
      console.warn('[queryYourGeminiModel:Groq]', e.message);
    }
  }

  // Try HuggingFace second
  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const hf = getHF();
      const r = await hf.chatCompletion({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.15,
      });
      const text = r?.choices[0]?.message?.content;
      if (text) { console.log('[queryYourGeminiModel:HF] ✅'); return text; }
    } catch (e) {
      console.warn('[queryYourGeminiModel:HF]', e.message);
    }
  }

  // Try Gemini last — small daily quota so we preserve it for urgent cases
  if (process.env.GEMINI_API_KEY) {
    try {
      const gemini = getGemini();
      // gemini-2.0-flash-lite = current free-tier model (1.5-flash/pro are 404)
      const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) { console.log('[queryYourGeminiModel:Gemini] ✅'); return text; }
    } catch (e) {
      console.warn('[queryYourGeminiModel:Gemini]', e.message);
    }
  }

  // Try Krutrim as final fallback
  if (process.env.KRUTRIM_API_KEY) {
    try {
      const text = await callKrutrim('You are a localized translation and language assistant.', prompt);
      if (text) { console.log('[queryYourGeminiModel:Krutrim] ✅'); return text; }
    } catch (e) {
      console.warn('[queryYourGeminiModel:Krutrim]', e.message);
    }
  }

  // Static fallbacks so the UI never fully breaks
  if (prompt.includes('localize-languages')) {
    return `[{"code":"en","native":"English","label":"GLOBAL"},{"code":"te","native":"తెలుగు","label":"LOCAL"},{"code":"hi","native":"हिन्दी","label":"NATIONAL"}]`;
  }
  if (prompt.includes('Classify its aesthetic')) {
    return 'luxury-grooming';
  }
  return '';
}
