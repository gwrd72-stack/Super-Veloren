import crypto from 'node:crypto';
import {runResearchTools,searchResearch} from './research-176.js';
import {assessPredictions,evidenceGate} from './assurance-174.js';
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const fail=error=>({ok:false,error});
// Quantitative signal diagnostics with sample-rate validity and Nyquist constraints.
export function signalDiagnostics(v={}) {
 const y=v.samples,rate=v.sampleRate;
 if(!Array.isArray(y)||y.length<16||y.length>4096||!y.every(finite)||!finite(rate)||rate<=0||rate>1e9)return fail('Need 16-4096 finite samples and positive finite sampleRate');
 const n=y.length,mean=y.reduce((a,b)=>a+b,0)/n,center=y.map(x=>x-mean),rms=Math.sqrt(center.reduce((a,b)=>a+b*b,0)/n);
 const bins=[]; // Deterministic real-valued DFT; bounded quadratic workload.
 for(let k=1;k<=Math.floor(n/2);k++){
  let re=0,im=0;
  for(let i=0;i<n;i++){const theta=2*Math.PI*k*i/n;re+=center[i]*Math.cos(theta);im-=center[i]*Math.sin(theta);}
  const magnitude=Math.hypot(re,im)/n*(k===n/2?1:2);
  bins.push({frequency:k*rate/n,amplitude:magnitude});
 }
 bins.sort((a,b)=>b.amplitude-a.amplitude);
 return {ok:true,sampleCount:n,sampleRate:rate,mean,rms,nyquist:rate/2,frequencyResolution:rate/n,peaks:bins.slice(0,Math.min(5,bins.length)),limitations:['Discrete finite-window spectrum','Aliasing above Nyquist cannot be distinguished','Window leakage may bias peaks'],fingerprint:hash({y,rate})};
}
// Controlled second-order dynamics with numerical stability and energy drift diagnostics.
export function oscillatorDiagnostics(v={}){
 const {mass,stiffness,damping=0,x0=1,v0=0,dt=0.001,steps=500}=v;
 if(![mass,stiffness,damping,x0,v0,dt,steps].every(finite)||mass<=0||stiffness<=0||damping<0||dt<=0||steps<2||steps>20000||!Number.isInteger(steps))return fail('Invalid oscillator parameters');
 const omega=Math.sqrt(stiffness/mass);if(dt*omega>=0.2)return fail('Time step too large for validated numerical regime');
 let x=x0,velocity=v0;const initial=0.5*mass*velocity*velocity+0.5*stiffness*x*x;let maxEnergy=initial,minEnergy=initial;
 // Velocity Verlet for undamped, midpoint-like semi-implicit for damping.
 for(let i=0;i<steps;i++){
  const a=-(stiffness*x+damping*velocity)/mass;
  const half=velocity+0.5*dt*a;
  x+=dt*half;
  const a2=-(stiffness*x+damping*half)/mass;
  velocity=half+0.5*dt*a2;
  const energy=0.5*mass*velocity*velocity+0.5*stiffness*x*x;
  maxEnergy=Math.max(maxEnergy,energy);minEnergy=Math.min(minEnergy,energy);
 }
 const final=0.5*mass*velocity*velocity+0.5*stiffness*x*x;
 return {ok:true,x,velocity,initialEnergy:initial,finalEnergy:final,energyDrift:initial?((final-initial)/initial):0,maxEnergy,minEnergy,angularFrequency:omega,stableStepRatio:dt*omega,limitations:['Linear spring and viscous damping only','Numerical solution is not experimental verification']};
}
export function evidenceQuality(v={}){
 const claims=v.claims;
 if(!Array.isArray(claims)||claims.length<1||claims.length>30)return fail('Provide 1-30 claims');
 let valid=0,unsupported=0;const reviews=[];
 for(const c of claims){if(!c||typeof c.claim!=='string'||!c.claim.trim())return fail('Claim text required');
  const refs=Array.isArray(c.sources)?c.sources.filter(x=>typeof x==='string'&&/^https?:\/\//.test(x)&&x.length<2048).slice(0,20):[];
  const tested=c.independentlyReplicated===true && c.measured===true && refs.length>=2;
  if(tested)valid++;else unsupported++;
  reviews.push({claim:c.claim.slice(0,500),status:tested?'corroboration-reported':'unverified',validSourceUrls:refs.length,missing:[...(!c.measured?['measurements']:[]),...(!c.independentlyReplicated?['replication']:[]),...(refs.length<2?['two traceable sources']:[])]});
 }
 return {ok:true,claimCount:claims.length,corroborationReported:valid,unverified:unsupported,reviews,note:'Metadata claims are self-reported; URLs and replicability have not been externally verified.'};
}
export async function supervisedResearch(v={}){
 if(typeof v.objective!=='string'||v.objective.trim().length<10||v.objective.length>2000)return fail('Objective 10-2000 characters required');
 if(!Array.isArray(v.steps)||v.steps.length<1||v.steps.length>6)return fail('1-6 approved steps required');
 const executed=runResearchTools({steps:v.steps});
 const memory=typeof v.memoryQuery==='string'&&v.memoryQuery.trim().length>=2?await searchResearch({query:v.memoryQuery}):null;
 return {ok:executed.ok,objective:v.objective,executed,memory,requiresMasterApprovalForExternalActions:true,summary:executed.allPassed?'Calculations completed; hypotheses require further verification':'One or more steps need attention',fingerprint:hash({objective:v.objective,steps:v.steps})};
}
// Evidence-based gate: categories must have actual independently measured observations.
export function gradeCapabilities(v={}){
 const required=['mathematics','physics','scientific_research','frontier_discovery','ai_reasoning','experimental_verification','reconnaissance','targeted_retrieval','dark_web_intelligence','autonomous_research','persistent_memory','master_authority','security_reliability'];
 const results={};for(const name of required){const x=v[name];if(!x||!Number.isInteger(x.passed)||!Number.isInteger(x.total)||x.total<20||x.passed<0||x.passed>x.total||x.independent!==true){results[name]={status:'unverified',score:null,reason:'At least 20 independent measured tests required'};continue;}
 const score=Number((10*x.passed/x.total).toFixed(2));results[name]={status:score>=9?'meets-test-threshold':'below-test-threshold',score,passed:x.passed,total:x.total,warning:'Test-case score does not imply defense-grade performance'};
 }
 return {ok:true,allMeetNine:Object.values(results).every(x=>x.status==='meets-test-threshold'),categories:results};
}
