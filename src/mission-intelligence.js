import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {planTarget,rankEvidence} from './target-retrieval.js';
import {reviewResearch} from './intelligence.js';
import {evaluateClaims} from './verification-lab.js';
const root=()=>path.resolve(process.env.SUPER_VEL_RESEARCH_DIR||path.join(process.cwd(),'data','mission-intelligence'));
const sha=(x)=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clean=(x,n=1000)=>typeof x==='string'?x.trim().slice(0,n):'';
const validId=(s)=>/^[a-f0-9-]{36}$/.test(String(s));
const indexFile=()=>path.join(root(),'index.json');
let queue=Promise.resolve();
const serialized=fn=>{let next=queue.then(fn);queue=next.catch(()=>{});return next;};
const decision=(claim,observation)=>({claim,observation,status:'unverified',requirement:'independent measurement, baseline, and replication'});
export function deviseMission(input={}){
 const objective=clean(input.objective,2000),context=clean(input.context,3500);
 if(objective.length<10)return {ok:false,error:'Specific mission objective required'};
 const type=/frequency|signal|spectrum|radio|acoustic/i.test(objective)?'signal':/propulsion|thrust|energy|force|magnetic|voltage|mechanic/i.test(objective)?'physics':/company|vendor|patent|publication|discover|find|search/i.test(objective)?'retrieval':'general';
 const planned=planTarget({objective,project:clean(input.project,100)});
 const steps=[
 {phase:'scope',action:'Document objective, limitations, permission scope and success metric',requiresApproval:false},
 {phase:'baseline',action:'Identify established baseline, measurement units and alternative explanations',requiresApproval:false},
 {phase:'collection',action:'Search authorized sources or import owner-provided measurements',requiresApproval:!input.authorizedSourcesConfirmed},
 {phase:'cross-check',action:'Evaluate independent sources, negative controls, provenance and uncertainty',requiresApproval:false},
 {phase:'review',action:'Run adversarial comparison and design a falsifiable next experiment',requiresApproval:false},
 {phase:'release',action:'Prepare findings and seek Master approval for any consequential external action',requiresApproval:true}
 ];
 return {ok:true,objective,context,project:clean(input.project,100),type,steps,searchPlan:planned.ok?planned:null,questions:['What observation would falsify the leading hypothesis?','What is the control or null explanation?','What is the smallest independent replication?'],authorization:'Planning only; never grants new authority',status:'proposed',fingerprint:sha({objective,context,type,steps})};
}
async function readIndex(){try{return JSON.parse(await fs.readFile(indexFile(),'utf8'));}catch(e){if(e.code==='ENOENT')return {version:1,missions:[]};throw e;}}
async function atomic(file,data){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+crypto.randomUUID();await fs.writeFile(tmp,JSON.stringify(data,null,2),{mode:0o600});await fs.rename(tmp,file);}
export async function createMission(input){const plan=deviseMission(input);if(!plan.ok)return plan;return serialized(async()=>{const idx=await readIndex();const id=crypto.randomUUID();const mission={id,createdAt:new Date().toISOString(),plan,entries:[],revision:0};mission.integrity=sha({id:mission.id,plan:mission.plan,entries:mission.entries,revision:mission.revision});await atomic(path.join(root(),id+'.json'),mission);idx.missions.push({id,createdAt:mission.createdAt,objective:plan.objective});await atomic(indexFile(),idx);return {ok:true,mission};});}
async function verified(id){if(!validId(id))return null;let m;try{m=JSON.parse(await fs.readFile(path.join(root(),id+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}let expected=sha({id:m.id,plan:m.plan,entries:m.entries,revision:m.revision});return {mission:m,integrityValid:expected===m.integrity};}
export async function readMission(id){const found=await verified(id);if(!found)return {ok:false,error:'Mission not found'};return {ok:found.integrityValid,...found,...(!found.integrityValid?{error:'Mission integrity mismatch; treat this record as compromised'}:{})};}
export async function listMissions(){const db=await readIndex();return {ok:true,missions:db.missions.slice(-250).reverse()};}
export async function addMissionEvidence(id,input={}){return serialized(async()=>{const record=await verified(id);if(!record)return {ok:false,error:'Mission not found'};if(!record.integrityValid)return {ok:false,error:'Integrity check failed; refusing mutation'};
 const kind=clean(input.kind,32),claim=clean(input.claim,1200),source=clean(input.source,700),observation=clean(input.observation,4000);
 if(!['observation','hypothesis','measurement','source','contradiction','review'].includes(kind)||!claim||!source)return {ok:false,error:'kind, claim and source required'};
 if(observation.length>3900)return {ok:false,error:'Observation too large'};
 const e={id:crypto.randomUUID(),kind,claim,source,observation,recordedAt:new Date().toISOString(),reliability:'unverified',sourceType:clean(input.sourceType,60)||'user-provided'};
 record.mission.entries.push(e);if(record.mission.entries.length>1000)return {ok:false,error:'Evidence limit reached'};
 record.mission.revision++;record.mission.integrity=sha({id:record.mission.id,plan:record.mission.plan,entries:record.mission.entries,revision:record.mission.revision});await atomic(path.join(root(),id+'.json'),record.mission);return {ok:true,entry:e,revision:record.mission.revision};});}
export function assessMission(input={}){
 const plan=deviseMission(input);if(!plan.ok)return plan;
 const evidence=Array.isArray(input.evidence)?input.evidence.slice(0,100):[];
 const outcomes=evidence.filter(x=>x&&typeof x==='object').map(x=>decision(clean(x.claim,800),clean(x.observation,800)));
 const supported=evidence.filter(x=>x?.source&&x?.claim&&x?.observation);
 const gaps=[];if(!supported.length)gaps.push('No source-linked observations');
 if(!evidence.some(x=>x?.kind==='control'))gaps.push('Control measurements not provided');
 if(!evidence.some(x=>x?.kind==='replication'))gaps.push('Independent replication not provided');
 return {ok:true,plan,evidenceCount:evidence.length,sourceLinked:supported.length,checks:outcomes,gaps,decision:'Insufficient basis for a verified discovery without independent validation',suggestedNext:'Collect baseline observations with documented measurement method and negative controls'};
}
export function researchBenchmark(input={}){
 const tasks=Array.isArray(input.tasks)?input.tasks:[];
 if(!tasks.length||tasks.length>100)return {ok:false,error:'Provide 1-100 benchmark tasks'};
 let passed=0;const checks=tasks.map((t,i)=>{const candidate=clean(t.candidate,10000),expected=clean(t.expected,10000);const ok=candidate.length>0&&expected.length>0&&candidate===expected;if(ok)passed++;return {index:i,ok};});
 return {ok:true,passed,total:tasks.length,accuracy:passed/tasks.length,checks,threshold:0.9,meets90Percent:passed/tasks.length>=0.9,warning:'This checks supplied answers only; tasks and expected answers need independent provenance and a representative sample.'};
}
export const missionResearchTools=Object.freeze({plan:deviseMission,assess:assessMission,benchmark:researchBenchmark,rank:rankEvidence,review:reviewResearch,claims:evaluateClaims});
