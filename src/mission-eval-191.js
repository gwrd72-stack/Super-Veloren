import crypto from 'node:crypto';
import {unifiedDiscovery} from './unified-discovery-186.js';
const tokenize=s=>[...new Set((String(s||'').toLowerCase().match(/[a-z0-9]{4,}/g)||[]).filter(x=>!new Set(['find','about','with','from','that','this','reports','information','sources','research']).has(x)))];
function normalize(r){try{const u=new URL(r.reference);if(u.protocol!=='https:'||u.username||u.password||u.hostname.endsWith('.onion'))return null;return {...r,host:u.hostname.replace(/^www\./,''),key:u.origin+u.pathname.replace(/\/$/,'')};}catch{return null}}
export function evaluateFindings({objective,findings=[],mustFind=[],minimumHosts=2}={}){
 if(typeof objective!=='string'||objective.trim().length<8||!Array.isArray(findings)||findings.length>200||!Array.isArray(mustFind)||mustFind.length>30||!Number.isInteger(minimumHosts)||minimumHosts<1||minimumHosts>10)return {ok:false,error:'Invalid evaluation input'};
 const valid=[],keys=new Set(),hosts=new Set();let duplicates=0,invalid=0;
 for(const r of findings){const doc=normalize(r);if(!doc){invalid++;continue}if(keys.has(doc.key)){duplicates++;continue}keys.add(doc.key);hosts.add(doc.host);valid.push(doc);}
 const expected=mustFind.map(x=>String(x).toLowerCase());const text=valid.map(x=>`${x.title||''} ${x.summary||''}`).join(' ').toLowerCase();const hits=expected.filter(x=>text.includes(x));
 const objTerms=tokenize(objective), covered=objTerms.filter(x=>text.includes(x));
 const trusted=valid.filter(x=>x.relevance>0 || objTerms.some(t=>`${x.title||''} ${x.summary||''}`.toLowerCase().includes(t)));
 return {ok:true,accepted:valid.length,duplicates,invalid,distinctHosts:hosts.size,hostDiversityMet:hosts.size>=minimumHosts,objectiveCoverage:objTerms.length?covered.length/objTerms.length:0,recall:expected.length?hits.length/expected.length:null,missingExpected:expected.filter(x=>!hits.includes(x)),relevancePrecision:valid.length?trusted.length/valid.length:0,limitations:'Host diversity is not proof of independent sourcing; exact-token ground truth applies only to defined benchmark cases.'};
}
export async function runBenchmark191({cases=[],search,minimumHosts=2}={}){
 if(!Array.isArray(cases)||cases.length<1||cases.length>25||typeof search!=='function')return {ok:false,error:'Supply 1-25 benchmark cases and a search adapter'};
 const reports=[];
 for(const c of cases){const result=await unifiedDiscovery({objective:c.objective,project:c.project||'Benchmark',rounds:2,providers:c.providers||['wikipedia']},{search});if(!result.ok){reports.push({id:c.id||'',passed:false,error:result.error});continue;}
  const evaluation=evaluateFindings({objective:c.objective,findings:result.findings,mustFind:c.mustFind||[],minimumHosts:c.minimumHosts||minimumHosts});
  const passed=evaluation.ok&&evaluation.recall===1&&evaluation.hostDiversityMet&&evaluation.invalid===0;
  reports.push({id:c.id||'',passed,...evaluation,rounds:result.rounds.length});
 }
 const passed=reports.filter(x=>x.passed).length;return {ok:true,passed,total:reports.length,passRate:passed/reports.length,reports,digest:crypto.createHash('sha256').update(JSON.stringify(reports)).digest('hex'),warning:'Offline benchmark assesses retrieval mechanics, not independent real-world search accuracy or defense-grade readiness.'};
}
