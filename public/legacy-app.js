// Session-only credential: never stored in browser localStorage.
let superVelToken = '';
function authHeaders(extra={}) { return superVelToken ? {...extra,Authorization:`Bearer ${superVelToken}`} : extra; }
function requireToken(){ if(!superVelToken)superVelToken=window.prompt('Enter your SUPER VELOREN master or delegated access token:') || ''; return superVelToken; }
const $ = id => document.getElementById(id);
let history = [];

async function post(url, body={}) {
  requireToken(); const r = await fetch(url, { method:'POST', headers:authHeaders({'Content-Type':'application/json'}), body:JSON.stringify(body) });
  return r.json();
}
async function refreshStore() {
  requireToken(); const r = await fetch('/api/store',{headers:authHeaders()}); const s = await r.json();
  const laws = (s.masterLaws||[]).slice(0,8).map(x=>`<div class="law"><b>Law</b>: ${escapeHtml(x.text||'')}</div>`).join('');
  const corr = (s.corrections||[]).slice(0,5).map(x=>`<div class="law"><b>Correction</b>: ${escapeHtml(x.text||'')}</div>`).join('');
  const mem = (s.memory||[]).slice(0,8).map(x=>`<div class="law"><b>${escapeHtml(x.result?.intent||'input')}</b>: ${escapeHtml(x.input||'')}</div>`).join('');
  $('store').innerHTML = `<h3>Master Laws</h3>${laws||'<p>None yet.</p>'}<h3>Corrections</h3>${corr||'<p>None yet.</p>'}<h3>Recent Memory</h3>${mem||'<p>None yet.</p>'}`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
async function run(message) {
  $('answer').textContent = 'Working...';
  const data = await post('/api/chat', { message, history });
  if (!data.ok) { $('answer').textContent = data.error || 'error'; return; }
  const r = data.result;
  history.push({ role:'user', content:message }, { role:'assistant', content:r.answer });
  history = history.slice(-16);
  $('meta').textContent = `intent=${r.intent} | status=${r.status} | source=${r.source}`;
  $('answer').textContent = r.answer;
  refreshStore();
}
$('send').onclick = ()=>run($('message').value);
$('crown').onclick = async()=>{ const data = await post('/api/crown'); $('meta').textContent = `intent=${data.result.intent} | status=${data.result.status}`; $('answer').textContent = data.result.answer; refreshStore(); };
$('multiply').onclick = async()=>{ const data = await post('/api/multiply', { message:'Multiply this cycle into the next cycle' }); $('meta').textContent = `intent=${data.result.intent} | status=${data.result.status}`; $('answer').textContent = data.result.answer; refreshStore(); };
$('statusBtn').onclick = async()=>{ const r = await fetch('/api/health'); $('answer').textContent = JSON.stringify(await r.json(), null, 2); };
document.querySelectorAll('.quick').forEach(b=>b.onclick=()=>{ $('message').value=b.textContent; run(b.textContent); });
refreshStore();

$('researchRun').onclick = async()=>{
  try {
    const req=JSON.parse($('researchInput').value);
    req.operation=$('researchOp').value;
    const data=await post('/api/research/analyze',req);
    $('researchResult').textContent=JSON.stringify(data,null,2);
  } catch(e) { $('researchResult').textContent='Invalid data: '+e.message; }
};
$('caseCreate').onclick = async()=>{
  const r=await post('/api/research/cases',{title:$('caseTitle').value,hypothesis:$('caseHypothesis').value});
  $('caseResult').textContent=JSON.stringify(r,null,2);
};

const physicsDefaults={
 oscillator:{mass_kg:1,spring_n_per_m:4,damping_n_s_per_m:0.1,initial_displacement_m:1,duration_s:5,points:101},
 rlc:{resistance_ohm:1,inductance_h:1,capacitance_f:0.5,initial_capacitor_voltage_v:4,duration_s:10,points:101},
 projectile:{speed_m_s:20,angle_deg:45,gravity_m_s2:9.80665,initial_height_m:0,points:101},
 inverse_square:{source_strength:100,distances_m:[1,2,3,4,5]},
 resonance:{mass_kg:1,spring_n_per_m:100,damping_n_s_per_m:1,forcing_amplitude_n:1,frequencies_hz:[0,0.5,1,1.5,1.6,2,3,5]}
};
$('physicsOp').onchange=()=>{$('physicsInput').value=JSON.stringify(physicsDefaults[$('physicsOp').value],null,2);};
$('physicsRun').onclick=async()=>{
 try{
  const args=JSON.parse($('physicsInput').value);
  args.operation=$('physicsOp').value;
  const response=await post('/api/physics/simulate',args);
  $('physicsResult').textContent=JSON.stringify(response,null,2);
 }catch(e){$('physicsResult').textContent='Invalid parameters: '+e.message;}
};

// Authenticate again after a denied request by reloading the page.

$('intelligenceRun').onclick=async()=>{const el=$('intelligenceResult');el.textContent='Analyzing...';try{const r=await post('/api/intelligence/reason',{problem:$('intelligenceProblem').value});el.textContent=r.ok?r.answer:(r.error||JSON.stringify(r));}catch(e){el.textContent=e.message;}};
