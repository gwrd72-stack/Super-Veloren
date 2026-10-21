import crypto from 'node:crypto';
import {deviseMission,assessMission} from './mission-intelligence.js';
import {reasonWithModel} from './intelligence.js';
import {critiqueEvidence} from './reasoner.js';
import {evidenceGate} from './assurance-174.js';
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const text=(x,n=3000)=>typeof x==='string'?x.trim().slice(0,n):'';
/** Deterministic, bounded research itinerary. No network side effects. */
export function formulateInvestigation(input={}) {
 const objective=text(input.objective); if(objective.length<10)return {ok:false,error:'Specific research objective required'};
 const plan=deviseMission({objective,project:text(input.project,100),context:text(input.context),authorizedSourcesConfirmed:false});
 if(!plan.ok)return plan;
 const experiments=[
 {id:'baseline',purpose:'Establish a measurable baseline and document calibration',metric:'Observed quantity and measurement uncertainty',gate:'verified calibration and units'},
 {id:'alternatives',purpose:'Compare at least two competing explanations',metric:'Held-out predictive error and discriminating observations',gate:'alternative predictions supplied'},
 {id:'replication',purpose:'Repeat with independent instruments or observers',metric:'Replication agreement and confidence intervals',gate:'independent evidence provenance'},
 {id:'adversarial',purpose:'Attempt to disprove the leading hypothesis',metric:'Pre-registered falsification criterion',gate:'specified rejection threshold'}
 ];
 const leads=plan.searchPlan?.queries||[];
 return {ok:true,objective,project:plan.project,type:plan.type,missionPlan:plan,experiments,leads,stopConditions:['unverified source provenance','inconsistent units','missing controls','out-of-scope access'],permissions:'analysis-only; no autonomous external collection or operational authority',fingerprint:hash({objective,experiments,leads})};
}
/** Evidence must not be mistaken for scientific proof. All missing gates are surfaced. */
export function independentReview(input={}) {
 const plan=formulateInvestigation(input);if(!plan.ok)return plan;
 const evidence=Array.isArray(input.evidence)?input.evidence.slice(0,100):[];
 const items=evidence.filter(x=>x&&typeof x==='object').map(x=>({kind:text(x.kind,40),claim:text(x.claim,1000),source:text(x.source,700),observation:text(x.observation,2000),independent:x.independent===true,calibrated:x.calibrated===true}));
 const gaps=[];
 if(!items.length)gaps.push('No observations supplied');
 if(!items.some(x=>x.source&&x.observation))gaps.push('No source-linked measurements');
 if(!items.some(x=>x.kind==='control'))gaps.push('Negative or baseline control missing');
 if(!items.some(x=>x.independent))gaps.push('Independent replication missing');
 if(!items.some(x=>x.calibrated))gaps.push('Calibration record missing');
 const sources=new Set(items.map(x=>x.source).filter(Boolean));
 if(sources.size<2)gaps.push('Fewer than two distinct sources');
 const readyForReview=gaps.length===0;
 return {ok:true,plan,evidenceCount:items.length,independentSources:sources.size,gaps,readyForReview,scientificallyConfirmed:false,disposition:readyForReview?'Eligible for expert review, not verified':'Insufficient evidence for scientific confirmation',fingerprint:hash({objective:plan.objective,items,gaps})};
}
/** Optional AI reasoning is only a proposal, and does not autonomously execute actions. */
export async function investigate175(input={}){
 const plan=formulateInvestigation(input);if(!plan.ok)return plan;
 const review=independentReview(input);
 if(input.useModel!==true)return {...plan,review,modelStatus:'not_requested'};
 const model=await reasonWithModel({problem:plan.objective,constraints:'Develop two or more alternative mechanisms; clearly label assumptions and falsifiers. Suggest discriminating experiments. Do not claim physical validation or take external action.',observations:text(input.observations,3000)});
 return {...plan,review,modelStatus:model.ok?'proposal_generated':'unavailable',model};
}
