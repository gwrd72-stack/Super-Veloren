import crypto from 'node:crypto';

// Frontier research: proposed models are explicitly hypothetical, never discoveries.
const finite = x => typeof x === 'number' && Number.isFinite(x);
const identity = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cleanText = (s,max=500) => String(s??'').slice(0,max).trim();
function dataset(raw){
 if(!Array.isArray(raw)||raw.length<4||raw.length>5000) throw Error('Provide 4–5000 observations');
 return raw.map((r,i)=>{
  if(!r||!finite(r.x)||!finite(r.y))throw Error(`Observation ${i} requires finite numeric x and y`);
  if(Math.abs(r.x)>1e12||Math.abs(r.y)>1e12)throw Error('Observation exceeds numeric bounds');
  return {x:r.x,y:r.y};
 });
}
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const sum=a=>a.reduce((s,v)=>s+v,0);
function fitModel(rows,type){
 const xs=rows.map(r=>r.x),ys=rows.map(r=>r.y),n=xs.length;
 let predictions,coefficients,k;
 if(type==='constant'){coefficients={a:mean(ys)};predictions=xs.map(()=>coefficients.a);k=1;}
 else if(type==='linear'){
  const mx=mean(xs),my=mean(ys),ss=sum(xs.map(v=>(v-mx)**2));
  if(ss<1e-16)throw Error('Cannot fit linear model: x values insufficiently varied');
  const b=sum(xs.map((v,i)=>(v-mx)*(ys[i]-my)))/ss;
  coefficients={a:my-b*mx,b}; predictions=xs.map(x=>coefficients.a+b*x);k=2;
 } else if(type==='inverse'){
  if(xs.some(x=>Math.abs(x)<1e-12))throw Error('Inverse model requires nonzero x');
  const us=xs.map(x=>1/x),mu=mean(us),my=mean(ys),ss=sum(us.map(v=>(v-mu)**2));
  if(ss<1e-16)throw Error('Insufficient variation for inverse model');
  const b=sum(us.map((v,i)=>(v-mu)*(ys[i]-my)))/ss;
  coefficients={a:my-b*mu,b};predictions=xs.map(x=>coefficients.a+b/x);k=2;
 }else throw Error('Unsupported model');
 const sse=sum(ys.map((y,i)=>(y-predictions[i])**2));
 if(!finite(sse))throw Error('Numerical overflow');
 return {model:type,parameters:coefficients,rmse:Math.sqrt(sse/n),sse,complexity:k};
}
function split(rows){
 // interleave sorted x into both splits: ensures both test and train cover same domain, NOT extrapolation.
 const sorted=[...rows].sort((a,b)=>a.x-b.x);
 return {train:sorted.filter((_,i)=>i%4!==0),test:sorted.filter((_,i)=>i%4===0)};
}
function predict(m,x){let {a,b}=m.parameters;return m.model==='constant'?a:m.model==='linear'?a+b*x:a+b/x;}
export function compareModels(payload={}){
 try{
  const rows=dataset(payload.observations), {train,test}=split(rows);
  if(train.length<3||test.length<1)throw Error('Insufficient observations for holdout test');
  const results=[];
  for(const model of ['constant','linear','inverse']){
   try{
    const fit=fitModel(train,model);
    const holdoutRMSE=Math.sqrt(mean(test.map(r=>(r.y-predict(fit,r.x))**2)));
    if(!finite(holdoutRMSE))throw Error('Nonfinite test score');
    results.push({...fit,holdoutRMSE});
   }catch(e){results.push({model,error:e.message});}
  }
  const ranked=results.filter(r=>!r.error).sort((a,b)=>a.holdoutRMSE-b.holdoutRMSE);
  return {ok:true,status:'candidate-model-comparison-only',sampleSize:rows.length,trainingSize:train.length,holdoutSize:test.length,results,lowestHoldoutError:ranked[0]?.model??null,notes:['Comparative fit does not establish a physical mechanism or causal explanation.','Holdout selection uses interleaved sorted values; collect independent future measurements for genuine out-of-sample testing.','Evaluate units, confounders, calibration and domain boundaries before interpreting results.'],fingerprint:identity(rows)};
 }catch(e){return {ok:false,error:e.message};}
}
export function formulateFrontier(payload={}){
 try{
  const question=cleanText(payload.question,1000),observation=cleanText(payload.observation,1000);
  if(question.length<8||observation.length<8)throw Error('Provide a research question and a concrete observation (at least 8 characters each)');
  const mechanisms=[
   {id:'measurement-artifact',kind:'ordinary-control',hypothesis:'Apparent anomaly arises from instrumentation, environmental interference, or data-processing error.',prediction:'Effect changes or disappears after independent calibration and blinded duplicate measurement.',discriminator:'Repeat using a separately calibrated instrument, blank controls, and randomized order.'},
   {id:'missing-variable',kind:'ordinary-control',hypothesis:'An untracked variable explains the pattern.',prediction:'Residuals correlate with a measurable environmental or experimental covariate.',discriminator:'Measure temperature, vibration, supply variations and other plausible covariates alongside the primary signal.'},
   {id:'new-phenomenology',kind:'speculative',hypothesis:'A not-yet-established empirical relationship may describe the anomaly within a limited domain.',prediction:'A prespecified mathematical relationship predicts previously unseen measurements better than the baseline.',discriminator:'Collect a blinded, held-out dataset across a broader range, compare baselines, and disclose failures.'}
  ];
  return {ok:true,question,observation,status:'hypotheses-not-confirmed',hypotheses:mechanisms,protocol:['Define observable quantities, units and instrument resolution.','Document baseline, null hypothesis, positive and negative controls.','Prespecify what result would falsify each hypothesis.','Capture raw data with timestamps and provenance; retain failures.','Test candidate mathematical relationships on independent holdout data.','Attempt replication with independent personnel and apparatus.'],criticalQuestions:['Are units and conservation constraints internally consistent?','Could equipment, selection bias or confounders explain the result?','What measurable prediction distinguishes the speculative idea from conventional explanations?'],fingerprint:identity({question,observation})};
 }catch(e){return {ok:false,error:e.message};}
}
export function dimensionalAudit(payload={}){
 try{
  const left=payload.left,right=payload.right;
  const axes=['M','L','T','I','Theta','N','J'];
  if(!left||!right||typeof left!=='object'||typeof right!=='object')throw Error('Left and right dimensional exponent maps required');
  for(const side of [left,right])for(const key of Object.keys(side))if(!axes.includes(key))throw Error('Unknown dimension '+key);
  for(const side of [left,right])for(const key of axes)if(!Number.isInteger(side[key]??0)||Math.abs(side[key]??0)>12)throw Error('Dimension powers must be integers from -12 to 12');
  const delta=Object.fromEntries(axes.map(a=>[a,(left[a]??0)-(right[a]??0)]));
  return {ok:true,consistent:Object.values(delta).every(x=>x===0),delta,warning:'Dimensional consistency is necessary for many physical equations but never sufficient to prove a mechanism.'};
 }catch(e){return {ok:false,error:e.message};}
}
