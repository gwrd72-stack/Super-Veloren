import {executePlan,critiqueEvidence} from './reasoner.js';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function numericSeries(v,name){
 if(!Array.isArray(v)||v.length<16||v.length>4096||v.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>1e12))throw new Error(`${name} must contain 16-4096 finite bounded numbers`);
 return v;
}
export function planInvestigation(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Provide a research request');
 const question=String(body.question||'');if(question.length<10||question.length>1000)throw new Error('Question must be 10-1000 characters');
 const task=String(body.task||'').toLowerCase();
 if(!['signal','measurement','comparison','mechanics','electrical'].includes(task))throw new Error('Choose task signal, measurement, comparison, mechanics, or electrical');
 const steps=[];let assumptions=[];
 if(task==='signal'){
  const values=numericSeries(body.values,'values');const rate=body.sample_rate_hz;
  if(typeof rate!=='number'||!Number.isFinite(rate)||rate<=0||rate>1e8)throw new Error('Invalid sample rate');
  steps.push({engine:'research',reason:'Measure frequency peaks and spectral diagnostics',input:{operation:'spectral_diagnostics',values,sample_rate_hz:rate}});
  steps.push({engine:'research',reason:'Compare with independent FFT estimator',input:{operation:'spectrum',values,sample_rate_hz:rate}});
  assumptions=['Regularly sampled signal','Sensor calibration and noise baseline must be established externally','Spectral agreement does not prove an underlying mechanism'];
 } else if(task==='measurement'){
  const values=numericSeries(body.values,'values');steps.push({engine:'research',reason:'Measure distribution, spread and interval',input:{operation:'describe',values}});
  assumptions=['Independent representative observations required for confidence interval interpretation'];
 } else if(task==='comparison'){
  const values=numericSeries(body.values,'values'),other=numericSeries(body.other,'other');
  steps.push({engine:'research',reason:'Estimate group differences with Welch test',input:{operation:'compare',values,other}});
  steps.push({engine:'research',reason:'Describe group A',input:{operation:'describe',values}});
  steps.push({engine:'research',reason:'Describe group B',input:{operation:'describe',values:other}});
  assumptions=['Independent group observations','Confounders, multiple comparisons and study design still require review'];
 } else if(task==='mechanics'){
  const i=body.parameters||{};if(i.operation!=='oscillator'&&i.operation!=='resonance')throw new Error('Supported mechanics operations: oscillator, resonance');
  steps.push({engine:'physics',reason:'Run bounded mechanical model',input:i});assumptions=['Idealized mechanical system; results are predictions, not observations'];
 } else {
  const i=body.parameters||{};if(i.operation!=='rlc')throw new Error('Supported electrical operation: rlc');
  steps.push({engine:'physics',reason:'Run bounded electrical model',input:i});assumptions=['Ideal components; parasitics and nonlinearities omitted'];
 }
 return {question,task,steps,assumptions,plan_sha256:hash({question,task,steps})};
}
export async function investigate(body){
 let plan;try{plan=planInvestigation(body);}catch(e){return {ok:false,error:e.message};}
 const execution=await executePlan({question:plan.question,hypothesis:String(body.hypothesis||'').slice(0,1000),steps:plan.steps});
 const checks=[];
 if(plan.task==='signal'&&execution.results.every(x=>x.ok)){
  const a=execution.results[0].result.result,b=execution.results[1].result.result;
  const peak=a.dominant_frequency_hz,fft=b.peak_frequencies_hz[0],tolerance=Math.max(a.frequency_resolution_hz,Number.EPSILON);
  checks.push({method:'Welch vs FFT dominant frequency',pass:Math.abs(peak-fft)<=tolerance,observed_difference_hz:Math.abs(peak-fft),tolerance_hz:tolerance});
 }
 if(plan.task==='comparison'&&execution.results.every(x=>x.ok)){
  const r=execution.results,delta=r[1].result.result.mean-r[2].result.result.mean;
  checks.push({method:'Group means vs reported mean difference',pass:Math.abs(delta-r[0].result.result.mean_difference_a_minus_b)<1e-8});
 }
 return {ok:true,mode:'bounded deterministic autonomous tool planning; not an independent LLM researcher',plan,execution,checks,verification_status:execution.assessment.all_calculations_passed&&checks.every(c=>c.pass)?'computations completed; hypothesis unverified':'requires investigation',recommendations:plan.task==='signal'?['Acquire calibration signal and noise-only control','Repeat on independent instrument with changed sampling rate','Review aliasing and leakage']:['Repeat measurements independently','Document systematic errors and instrument calibration','Attempt to falsify the proposed mechanism']};
}
export function reviewEvidence(body){return critiqueEvidence(body);}
