import {loadPositions} from './authority.js';
import { mathRequest, executeMath, formatMath } from './math.js';
import { nanoid } from 'nanoid';
import { addRecord, getStore, loadKnowledge, setLastArtifact, saveStore } from './storage.js';
import fs from 'fs/promises';
import path from 'path';

const now = () => new Date().toISOString();
export const clean = (s='') => String(s ?? '').replace(/\s+/g,' ').trim();
export const normalize = (s='') => clean(s).toLowerCase().replace(/[^a-z0-9@.$%:/?+\-*()\s-]/g,' ').replace(/\s+/g,' ').trim();

const typoMap = new Map([
  ['supervail','super vel'], ['super veil','super vel'], ['supervel','super vel'], ['mxlc','mxcl'], ['mxlc','mxcl'],
  ['remeber','remember'], ['teh','the'], ['thru','through'], ['buld','build'], ['aponitment','appointment'],
  ['wokflow','workflow'], ['work flow','workflow'], ['crudpilot','crudepilot'], ['frondesk','frontdesk'],
  ['dont','do not'], ['aint','is not']
]);

export function repairText(text) {
  let out = clean(text);
  for (const [bad, good] of typoMap) out = out.replace(new RegExp(`\\b${bad}\\b`, 'gi'), good);
  return out;
}

const NUM_WORDS = new Map([
  ['zero',0],['one',1],['two',2],['three',3],['four',4],['five',5],['six',6],['seven',7],['eight',8],['nine',9],
  ['ten',10],['eleven',11],['twelve',12],['thirteen',13],['fourteen',14],['fifteen',15],['sixteen',16],['seventeen',17],['eighteen',18],['nineteen',19],
  ['twenty',20],['thirty',30],['forty',40],['fifty',50],['sixty',60],['seventy',70],['eighty',80],['ninety',90]
]);

function wordsToMath(s) {
  let t = ` ${s.toLowerCase()} `;
  const phrases = [
    ['divided by','/'],['multiplied by','*'],['plus','+'],['minus','-'],['times','*'],['x','*'],['over','/'],
    ['add','+'],['subtract','-'],['multiply','*'],['divide','/']
  ];
  for (const [k,v] of phrases) t = t.replaceAll(` ${k} `, ` ${v} `);
  for (const [w,n] of NUM_WORDS) t = t.replace(new RegExp(`\\b${w}\\b`, 'g'), String(n));
  return t.replace(/[^0-9+\-*/().%\s]/g,'').trim();
}

function safeMath(expr) {
  if (!/^[0-9+\-*/().%\s]+$/.test(expr) || !/[0-9]/.test(expr)) throw new Error('bad math');
  // This evaluates only digits and math operators after strict allow-list.
  // eslint-disable-next-line no-new-func
  const v = Function(`"use strict"; return (${expr});`)();
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('bad result');
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(8)));
}

function directAnswer(text, knowledge, store) {
  const fixed = repairText(text);
  const n = normalize(fixed);
  if (/^(hi|hello|hey|yo)\b/.test(n)) return 'Ready, Master X.';
  if (/^(thanks|thank you)\b/.test(n)) return 'Locked, Master X.';
  if (/(who are you|what are you)/.test(n)) return 'I am Super Vel, Master X’s MXCL-based private digital aide, eyes, ears, scribe, command router, and execution support.';
  if (/(what is mxcl|explain mxcl|define mxcl)/.test(n)) return 'MXCL is Master X’s meaning-bearing command code: 0 Source/Reset, 1 Create, 2 Split, 3 Structure, 4 Foundation, 5 Move, 6 Correct, 7 Search, 8 Amplify, 9 Complete/Return, then return to Source for permission to multiply, and 19 Crown.';
  if (/(what can you do|what does super vel do|what do you do)/.test(n)) {
    return `Super Vel can answer simple questions, route commands, process build requests through MXCL, save Master Laws, capture corrections, create draft artifacts, separate Draft Vault from Crowned Vault, crown approved cycles, multiply only after permission, and support Capital Blueprint / Bell / sigil / craft / hidden-knowledge / business execution lanes.`;
  }
  if (/(what version|which version|status)/.test(n)) return 'Super Vel Command Core V1 is running. It uses the CapBlue-style command router plus MXCL runtime.';
  if (/what did i just say/.test(n)) return store.memory?.[0]?.input ? `You just said: ${store.memory[0].input}` : 'No prior input is stored yet.';
  if (/list master laws|show master laws/.test(n)) {
    const laws = [...(knowledge.master_laws||[]), ...(store.masterLaws||[]).map(x=>x.text)].filter(Boolean);
    return laws.map((x,i)=>`${i+1}. ${x}`).join('\n') || 'No Master Laws saved yet.';
  }
  return null;
}

export function classify(text) {
  const n = normalize(repairText(text));
  if (/^(master law|remember as master law|law:)/.test(n)) return 'master-law';
  if (/^(correction|correct:|fix this|no that is wrong|thats wrong|that is wrong)/.test(n)) return 'correction';
  if (/(crown this cycle|apply crown|19 crown|crown it|crown this)/.test(n)) return 'crown';
  if (/(multiply|next cycle|expand this cycle|permission to multiply)/.test(n)) return 'multiply';
  if (/(search|discover|hidden knowledge|find hidden|look up|research)/.test(n)) return 'search';
  if (/(bell|reality tapping|sigil|plate|craft|interdimensional|astral|channel changing|chakra|cnc|sensor|architecture sheet|build sheet)/.test(n)) return 'mxcl-build';
  if (/(capital blueprint|workflow|shortstop|fanpass|oil pilot|crudepilot|proposal|rep|candidate|sales|lead|campaign|business)/.test(n)) return 'business-command';
  if (/^(what|who|when|where|why|how|is|are|can|do|does)\b/.test(n) || n.endsWith('?')) return 'direct-question';
  return 'direct-chat';
}

function realms(text) {
  const n = normalize(text);
  const r = [];
  if (/bell|reality tapping/.test(n)) r.push('Bell / Reality Interface');
  if (/sigil|plate|19 ray|geometry|chakra/.test(n)) r.push('Sigil / Geometry / Plate System');
  if (/craft|interdimensional|carrier|shell/.test(n)) r.push('Interdimensional Craft / Carrier Architecture');
  if (/astral|channel|node|frequency/.test(n)) r.push('Astral / Channel-Changing Framework');
  if (/cnc|sensor|led|firmware|electronics|hardware|test|prototype/.test(n)) r.push('Physical Build / CNC / Electronics / Measurement');
  if (/hidden|search|discover|research/.test(n)) r.push('Hidden Knowledge Discovery');
  if (/capital blueprint|workflow|shortstop|fanpass|oil|rep|sales|lead|proposal/.test(n)) r.push('Business Empire Execution');
  if (!r.length) r.push('General MXCL Command');
  return r;
}

function artifactType(text) {
  const n = normalize(text);
  if (/bell/.test(n)) return 'Reality-Tapping Bell Architecture Sheet';
  if (/sigil|plate/.test(n)) return 'Sigil / Plate Design Sheet';
  if (/craft|interdimensional|carrier/.test(n)) return 'Interdimensional Craft / Carrier Architecture Sheet';
  if (/business|workflow|shortstop|proposal|rep|lead|sales/.test(n)) return 'Business Execution Pack';
  if (/search|hidden|discover/.test(n)) return 'Hidden Knowledge Discovery Report';
  return 'MXCL Command Artifact';
}

function vaultHits(knowledge, text) {
  const n = normalize(text);
  const hits = [];
  for (const item of knowledge.mxcl || []) if (n.includes(String(item.code)) || n.includes(item.name.toLowerCase().split('/')[0].trim())) hits.push(`${item.code} ${item.name}: ${item.behavior}`);
  for (const p of knowledge.products || []) {
    const all = [p.name, ...(p.aliases||[]), p.purpose].join(' ').toLowerCase();
    if (all.split(/\s+/).some(w => w.length > 3 && n.includes(w))) hits.push(`${p.name}: ${p.purpose}`);
  }
  return hits.slice(0, 8);
}

function buildMXCL(text, knowledge, store) {
  const type = artifactType(text);
  const rs = realms(text);
  const hits = vaultHits(knowledge, text);
  const priorCorrections = (store.corrections || []).slice(0,3).map(c=>`- ${c.text}`).join('\n');
  let move = '';
  if (type.includes('Bell')) {
    move = `- Bell shell/body: mark dimensions pending unless Master X provides target size.
- Center node: crystal or center marker aligned to exact Bell centerline.
- Plate logic: 9 / center / 9 stack when the command calls for stacked architecture.
- 19-ray alignment: Crown-path geometry layer, not decoration.
- Electronics layer: optional LED/piezo/sensor ring for state logging.
- Measurement path: tone/strike/touch event, sensor value, time stamp, observation note.
- First proof: non-dangerous sensor/log prototype before any high-energy claim.`;
  } else if (type.includes('Business')) {
    move = `- Identify product lane.
- Identify buyer/problem/money leak.
- Produce clean public/business wording.
- Route pricing, legal, proposal, invoice, security, or guarantee language to admin review.
- Save serious lead/deal details if provided.`;
  } else {
    move = `- Produce the requested output in a usable draft.
- Separate canon from testable build path.
- Mark missing details as pending instead of guessing.`;
  }
  return `# ${type} — Super Vel Command Core Draft

## 0 — Source / Reset
- Master X signal received.
- Noise cleared.
- True command identified: ${clean(text)}

## 1 — Manifest / Create
- Manifest target: ${type}.
- The command must become useful output, not empty labels.

## 2 — Split / Divide
${rs.map(x=>`- ${x}`).join('\n')}

## 3 — Form / Structure
- Output structure selected: ${type}.
- Status: Draft until Master X crowns it.

## 4 — Stabilize / Foundation
- All Super Vel processing is based on MXCL.
- 0-9 is the active cycle.
- After 9, return to Source for Master X permission before multiplication.
- 19 Crown is applied only after Master X authorizes elevation.
- Draft Vault and Crowned Vault remain separate.
${hits.length ? `\n### Knowledge Hits\n${hits.map(x=>`- ${x}`).join('\n')}` : ''}

## 5 — Move / Change
${move}

## 6 — Balance / Correct
- Do not overclaim untested hardware, metaphysical, or business results as proven.
- Preserve Master X canon while marking test/proof steps clearly.
- Missing dimensions, materials, or final authority remain pending.
${priorCorrections ? `\n### Recent Corrections To Respect\n${priorCorrections}` : ''}

## 7 — Search / Discover
- Search local knowledge and memory first.
- If outside facts are needed, use lawful/authorized sources only.
- Report solid facts separately from uncertain or symbolic material.

## 8 — Amplify / Power
- Strengthen the draft inside current command limits.
- Do not multiply into a larger cycle until Master X authorizes it.

## 9 — Complete / Return
- Draft cycle completed.
- Returned to Source for permission before multiplication.
- 19 Crown status: pending Master X approval.

## 19 — Crown
- Pending. Apply only when Master X commands Crown.`;
}

function businessAnswer(text, knowledge) {
  const n = normalize(text);
  const products = knowledge.products || [];
  const p = products.find(p => [p.name, ...(p.aliases||[])].some(a => n.includes(a.toLowerCase()))) || null;
  if (p) return `${p.name}: ${p.purpose}\n\nSuper Vel route: business command detected. I can create a proposal, signer pack, outreach message, lead note, rep assignment, or war-room report from this lane.`;
  return `Business command detected. Active lanes include Capital Blueprint AI Solutions, Workflow Enterprise, Workflow Transit, Oil Pilot AI, Shortstop, and FanPass. Give me the target lane or command and I will produce the artifact.`;
}

async function saveExport(id, content) {
  const dir = path.join(process.cwd(), 'exports');
  await fs.mkdir(dir, { recursive:true });
  const safe = id.replace(/[^a-z0-9_-]/gi,'_').slice(0,40);
  await fs.writeFile(path.join(dir, `${safe}.md`), content);
  await fs.writeFile(path.join(dir, `${safe}.txt`), content);
}

function systemPrompt(knowledge, store) {
  return `You are Super Vel, Master X's MXCL-based private digital aide, eyes, ears, scribe, command router, and execution support.

You are not a generic chatbot. You use two gates:
1. Direct Answer Gate: simple questions get simple answers.
2. MXCL Runtime Gate: commands, Master Laws, corrections, builds, searches, crown, multiply, and artifacts run through MXCL.

MXCL:
0 Source/Reset, 1 Create, 2 Split, 3 Structure, 4 Foundation, 5 Move, 6 Correct, 7 Search, 8 Amplify, 9 Complete/Return, then return to Source for permission to multiply, 19 Crown after Master X approval.

Master Laws: ${JSON.stringify([...(knowledge.master_laws||[]), ...(store.masterLaws||[]).map(x=>x.text)]).slice(0,20000)}

Rules:
- Answer simple questions directly.
- Do not force 0-9 cycle on casual questions.
- Preserve Master X command structure.
- Drafts are not law until crowned.
- Corrections must update future behavior.
- Separate canon/symbolic/experiential claims from practical build/test claims when needed.
- Use available/local knowledge; do not pretend external live access unless connected.
- Keep output useful, direct, and not silent.`;
}

export async function localBrain(message, mode='super-vel') {
  const knowledge = await loadKnowledge();
  const store = await getStore();
  const fixed = repairText(message);
  const quick = fixed.match(/^what is (\d+|two|three|four|five|one) (plus|minus|times) (\d+|two|three|four|five|one)\??$/i);
  const simpleNums={one:1,two:2,three:3,four:4,five:5};
  const math = mathRequest(fixed) || (quick ? {operation:'calculate',expression:`${simpleNums[quick[1].toLowerCase()] ?? quick[1]} ${ {plus:'+',minus:'-',times:'*'}[quick[2].toLowerCase()] } ${simpleNums[quick[3].toLowerCase()] ?? quick[3]}`} : null);
  if (math) {
    const outcome = await executeMath(math);
    return {id:nanoid(),createdAt:now(),mode,intent:'mathematics',status:outcome.ok?'math_verified':'math_error',answer:formatMath(outcome),repairedInput:fixed,source:'super-vel-math-engine',math:outcome};
  }
  const intent = classify(fixed);
  let answer = directAnswer(fixed, knowledge, store);
  let status = 'answered';
  if (!answer) {
    if (intent === 'master-law') {
      const text = fixed.replace(/^(master law:|law:|remember as master law:?)/i,'').trim();
      await addRecord('masterLaws', { id:nanoid(), createdAt:now(), text });
      answer = `Master Law captured and saved:\n\n${text}`;
      status = 'master_law_saved';
    } else if (intent === 'correction') {
      const text = fixed.replace(/^(correction:|correct:)/i,'').trim();
      await addRecord('corrections', { id:nanoid(), createdAt:now(), text });
      answer = `Correction captured and saved:\n\n${text}`;
      status = 'correction_saved';
    } else if (intent === 'crown') {
      const s = await getStore();
      if (s.lastArtifact) {
        const crowned = { ...s.lastArtifact, crownedAt: now(), crownStatus: '19 Crown Applied' };
        if (!Array.isArray(s.crowned)) s.crowned = [];
        s.crowned.unshift(crowned);
        s.lastArtifact = crowned;
        await saveStore(s);
        answer = `19 Crown Applied.\n\nArtifact sealed into Crowned Vault:\n${crowned.title || crowned.id}`;
      } else answer = 'No active draft artifact found to crown.';
      status = 'crowned';
    } else if (intent === 'multiply') {
      const s = await getStore();
      const base = s.lastArtifact?.content || fixed;
      const content = `${buildMXCL(`Multiply next cycle from: ${base.slice(0,1000)}`, knowledge, s)}\n\n## Multiplication Status\n- Master X multiplication command received.\n- New cycle generated as draft.\n- 19 Crown remains pending.`;
      const art = { id:nanoid(), createdAt:now(), title:'Multiplied MXCL Next-Cycle Draft', intent:'multiply', content, crownStatus:'pending' };
      await setLastArtifact(art); await saveExport(art.id, content);
      answer = content;
      status = 'multiplied_pending_crown';
    } else if (intent === 'business-command') {
      answer = businessAnswer(fixed, knowledge);
      status = 'business_answer';
    } else if (intent === 'mxcl-build' || intent === 'search') {
      const content = buildMXCL(fixed, knowledge, store);
      const art = { id:nanoid(), createdAt:now(), title:artifactType(fixed), intent, content, crownStatus:'pending' };
      await setLastArtifact(art); await saveExport(art.id, content);
      answer = content;
      status = 'draft_pending_crown';
    } else {
      answer = 'Ready, Master X. I can answer directly or run the command through MXCL. Give me the command.';
      status = 'ready';
    }
  }
  return { id:nanoid(), createdAt:now(), mode, intent, status, answer, repairedInput: fixed, source:'super-vel-command-core-local' };
}

export async function aiResponse({ message, history=[], mode='super-vel' }) {
  const fallback = await localBrain(message, mode);
  const apiKey = process.env.OPENAI_API_KEY;
  if (fallback.intent === 'mathematics' || !apiKey) return fallback;
  try {
    const knowledge = await loadKnowledge();
    const store = await getStore();
    const positions = (await loadPositions()).slice(-25).map(p=>({topic:p.topic,statement:p.statement}));
    const input = [
      { role:'system', content: systemPrompt(knowledge, store) + '\nConfirmed principal positions (context, not scientific evidence): '+JSON.stringify(positions) },
      ...history.slice(-10).map(m => ({ role:m.role === 'assistant' ? 'assistant':'user', content:String(m.content||'') })),
      { role:'user', content:`Input: ${message}\nLocal analysis: ${JSON.stringify({intent:fallback.intent,status:fallback.status,answer:fallback.answer.slice(0,2000)})}` }
    ];
    const r = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${apiKey}`},
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', input, temperature:0.12, max_output_tokens:2500 })
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const data = await r.json();
    const text = data.output_text || data.output?.flatMap(o=>o.content||[]).map(c=>c.text||'').join('\n') || fallback.answer;
    return { ...fallback, answer:text, source:'openai-api-plus-super-vel-local-core' };
  } catch (e) {
    return { ...fallback, answer:`${fallback.answer}\n\nSystem note: API route failed; local core answered. ${e.message}`, source:'super-vel-command-core-local' };
  }
}

export async function recordChat(message, result) {
  return addRecord('memory', { id:nanoid(), createdAt:now(), input:message, result });
}
