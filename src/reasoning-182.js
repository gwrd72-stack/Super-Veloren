import crypto from 'node:crypto';
const hash = x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
const err=error=>({ok:false,error});
// Bayesian evidence updating with log likelihoods to avoid numerical underflow.
export function updateBeliefs182(input={}){
 const {hypotheses,evidence}=input;
 if(!Array.isArray(hypotheses)||hypotheses.length<2||hypotheses.length>12||!Array.isArray(evidence)||evidence.length<1||evidence.length>100)return err('Require 2–12 hypotheses and 1–100 evidence items');
 const ids=hypotheses.map(h=>h?.id);
 if(ids.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(id))||new Set(ids).size!==ids.length)return err('Hypothesis IDs must be distinct safe strings');
 if(!hypotheses.every(h=>finite(h.prior)&&h.prior>0&&h.prior<=1)||Math.abs(hypotheses.reduce((s,h)=>s+h.prior,0)-1)>1e-8)return err('Priors must be positive probabilities totaling one');
 if(!evidence.every(e=>plain(e)&&typeof e.id==='string'&&e.id.length<120&&plain(e.likelihoods)&&ids.every(id=>finite(e.likelihoods[id])&&e.likelihoods[id]>0&&e.likelihoods[id]<=1)))return err('Every evidence item needs likelihoods between zero and one for all hypotheses');
 if(new Set(evidence.map(e=>e.id)).size!==evidence.length)return err('Evidence IDs must be distinct');
 const scores=hypotheses.map(h=>Math.log(h.prior));
 for(const e of evidence)for(let i=0;i<hypotheses.length;i++)scores[i]+=Math.log(e.likelihoods[ids[i]]);
 const peak=Math.max(...scores),raw=scores.map(v=>Math.exp(v-peak)),total=raw.reduce((a,b)=>a+b,0);
 const posterior=hypotheses.map((h,i)=>({id:h.id,prior:h.prior,posterior:raw[i]/total})).sort((a,b)=>b.posterior-a.posterior);
 return {ok:true,posterior,mostSupported:posterior[0].id,assumptions:['Specified priors and likelihoods are supplied by the investigator, not independently validated','Evidence items assumed conditionally independent given each hypothesis; correlated evidence can overstate confidence','Posterior belief is not experimental proof'],auditHash:hash({hypotheses,evidence})};
}
function entropy(p){return -p.reduce((s,v)=>s+(v>0?v*Math.log2(v):0),0);}
export function chooseExperiment182(input={}){
 const {hypotheses,experiments}=input;
 if(!Array.isArray(hypotheses)||hypotheses.length<2||hypotheses.length>12||!Array.isArray(experiments)||experiments.length<1||experiments.length>30)return err('Require 2–12 hypotheses and 1–30 experiments');
 const ids=hypotheses.map(h=>h?.id);
 if(ids.some(x=>typeof x!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(x))||new Set(ids).size!==ids.length||!hypotheses.every(h=>finite(h.prior)&&h.prior>=0&&h.prior<=1)||Math.abs(hypotheses.reduce((s,h)=>s+h.prior,0)-1)>1e-8)return err('Invalid prior distribution');
 const ranked=[];
 for(const e of experiments){
  if(!plain(e)||typeof e.id!=='string'||e.id.length>120||!finite(e.cost)||e.cost<=0||!plain(e.outcomes))return err('Invalid experiment ID, cost, or outcomes');
  const outcomeIds=Object.keys(e.outcomes);
  if(outcomeIds.length<2||outcomeIds.length>20)return err('Each experiment requires 2–20 possible outcomes');
  const probabilities=ids.map(id=>outcomeIds.map(o=>e.outcomes[o]?.[id]));
  if(probabilities.some(row=>row.some(p=>!finite(p)||p<0||p>1)||Math.abs(row.reduce((a,b)=>a+b,0)-1)>1e-8))return err('Each hypothesis must define a normalized distribution over outcomes');
  const priors=hypotheses.map(h=>h.prior),start=entropy(priors);let after=0;
  for(let j=0;j<outcomeIds.length;j++){
   const likelihood=priors.reduce((s,p,i)=>s+p*probabilities[i][j],0);
   if(likelihood>0){const post=priors.map((p,i)=>p*probabilities[i][j]/likelihood);after+=likelihood*entropy(post);}
  }
  const informationBits=Math.max(0,start-after);
  ranked.push({id:e.id,informationBits:+informationBits.toFixed(8),cost:e.cost,informationPerCost:+(informationBits/e.cost).toFixed(8)});
 }
 ranked.sort((a,b)=>b.informationPerCost-a.informationPerCost);
 return {ok:true,ranked,preferred:ranked[0].id,limitations:['Expected information gain depends entirely on the supplied outcome probabilities','High information gain does not establish physical feasibility or safety'],auditHash:hash({hypotheses,experiments})};
}
export function auditReasoning182(input={}){
 const claims=input.claims;
 if(!Array.isArray(claims)||claims.length<1||claims.length>100)return err('Require 1–100 claims');
 const ids=new Set();const results=[];
 for(const c of claims){if(!plain(c)||typeof c.id!=='string'||c.id.length>100||ids.has(c.id)||typeof c.statement!=='string'||!c.statement.trim()||!['observation','hypothesis','inference','verified'].includes(c.status)||!Array.isArray(c.supports)||!Array.isArray(c.contradicts))return err('Malformed or duplicate claims');ids.add(c.id);}
 for(const c of claims){if([...c.supports,...c.contradicts].some(id=>!ids.has(id)||id===c.id))return err('Unresolved or self-referential claim IDs');const issues=[];if(c.status==='verified'&&c.supports.length===0)issues.push('Verified label lacks linked supporting claims');if(c.contradicts.length)issues.push('Contradictory claim references require resolution');if(c.status==='inference'&&c.supports.length===0)issues.push('Inference lacks evidential support');results.push({id:c.id,status:c.status,issues});}
 return {ok:true,results,flagged:results.filter(x=>x.issues.length).length,limitations:'This is a structural evidence audit, not semantic fact-checking or proof',auditHash:hash(claims)};
}
