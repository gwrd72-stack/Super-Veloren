import { scienceHealth } from './science-health.js';
import {listProjects,saveProject,appendProjectEvent} from './project-workspaces.js';
import {investigate192} from './investigation-192.js';
import {liveSearch as liveSearch192} from './live-retrieval.js';
import {evaluateFindings} from './mission-eval-191.js';
import {assessFrontier190,auditRetrieval190,autonomyGate190,securityAudit190} from './quality-190.js';
import {runIntelMission189} from './intel-189.js';
import {retrieveProvider188} from './provider-188.js';
import {corroborate187,planFollowups187,saveIntel187,readIntel187} from './intel-vault-187.js';
import {unifiedDiscovery} from './unified-discovery-186.js';
import {fetchKev,matchAdvisories} from './intel-connectors-185.js';
import {liveSearch} from './live-retrieval.js';
import {updateBeliefs182,chooseExperiment182,auditReasoning182} from './reasoning-182.js';
import {challenge181,discriminate181,selectTools181,executeTools181,frontierProposal181} from './reasoning-181.js';
import {advancedScience} from './advanced-engine.js';
import {prepareInvestigation179,executeAndRecord179,proposeInvestigation179} from './investigation-179.js';
import {researchCycle178,scoreReproducibility178} from './research-cycle-178.js';
import {signalDiagnostics,oscillatorDiagnostics,evidenceQuality,supervisedResearch,gradeCapabilities} from './capability-177.js';
import {startResearch,recordResearch,readResearch,searchResearch,runResearchTools,proposeResearch} from './research-176.js';
import {formulateInvestigation,independentReview,investigate175} from './autonomous-175.js';
import {assessPredictions,readinessGate,evidenceGate} from './assurance-174.js';
import {deviseMission,createMission,readMission,listMissions,addMissionEvidence,assessMission,researchBenchmark} from './mission-intelligence.js';
import {validateHoldout,assessSensitivity,challengeHypotheses} from './advanced-validation.js';
import {evaluateClaims,compareResearchModels,benchmarkGate} from './verification-lab.js';
import {createDossier,modifyDossier,getDossier,listDossiers} from './research-command.js';
import {planTarget,executeTarget,getTargetMissions,getTargetMission} from './target-retrieval.js';
import {investigateTarget,corroborate,exposureAssessment} from './intelligence-183.js';
import {addProvider,disableProvider,ingestThreatReport,threatStatus} from './threat-intel.js';
import {intelligenceBrief,compareSnapshots} from './fusion.js';
import 'dotenv/config';
import {authorityMiddleware,mountAuthority} from './authority.js';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { aiResponse, recordChat } from './ai.js';
import { getStore, loadKnowledge } from './storage.js';
import {physics} from './physics.js';
import { analyze, getCases, createCase, newEvidence, mutateCases } from './research.js';
import {getPlan,runMission,verify} from './investigator.js';
import {discovery} from './discovery.js';
import {executePlan,critiqueEvidence} from './reasoner.js';
import {investigate,planInvestigation} from './scientist.js';
import {compareModels,formulateFrontier,dimensionalAudit} from './frontier.js';
import {executeWorkbench,reviewResearch,reasonWithModel} from './intelligence.js';
import {addSource,removeSource,status as watchStatus,ingestReport,markRead,scan,startPolling} from './watch.js';
import {createReconCase,listReconCases,getReconCase,addReconSource,addReconNote,closeReconCase} from './recon.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 10000);

app.use(helmet({ contentSecurityPolicy:false }));
app.use(express.json({ limit:'2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(authorityMiddleware());
mountAuthority(app);

const asyncHandler = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);

// V1.5: server-side persistent project workspaces. Master-only, no browser credential storage.
app.get('/api/v15/projects',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);res.json({ok:true,projects:await listProjects()});}));
app.post('/api/v15/projects',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const result=await saveProject(req.body||{});res.status(result.ok?200:400).json(result);}));
app.post('/api/v15/projects/:id/events',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const result=await appendProjectEvent(req.params.id,req.body||{});res.status(result.ok?200:400).json(result);}));
// V17.8: enforce Master approval on all investigation/reasoning endpoints.
// Delegate research scopes alone must not expose privileged dossiers or model calls.
app.use(['/api/intelligence','/api/recon','/api/targets','/api/threat-intel','/api/fusion','/api/watch','/api/command','/api/frontier','/api/reason','/api/scientist','/api/research','/api/discovery','/api/investigator','/api/physics','/api/mission','/api/mission175','/api/v177','/api/v178','/api/v179','/api/v180','/api/v181','/api/v182','/api/v183','/api/v184','/api/v185','/api/v186','/api/v187','/api/v188','/api/v189','/api/v190','/api/v191','/api/v192'],(req,res,next)=>{
 if(req.principal?.role!=='master')return res.status(403).json({ok:false,error:'Master authorization required'});
 next();
});


for(const [route,func] of [['/api/v181/challenge',challenge181],['/api/v181/discriminate',discriminate181],['/api/v181/select',selectTools181]])app.post(route,(req,res)=>{const r=func(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/v181/execute',asyncHandler(async(req,res)=>{const r=await executeTools181(req.body||{});res.status(r.ok?200:400).json(r);}));
app.post('/api/v181/propose',asyncHandler(async(req,res)=>{const r=await frontierProposal181(req.body||{});res.status(r.ok?200:400).json(r);}));
for(const [route,func] of [['/api/v182/beliefs',updateBeliefs182],['/api/v182/experiment',chooseExperiment182],['/api/v182/audit',auditReasoning182]])app.post(route,(req,res)=>{const r=func(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/v180/science',asyncHandler(async(req,res)=>{const r=await advancedScience(req.body||{});res.status(r.ok?200:400).json(r);}));
// V17.9: model proposals are never automatically executed; Master approves exact hashed plan.
app.post('/api/v179/prepare',(req,res)=>{const r=prepareInvestigation179(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/v179/propose',asyncHandler(async(req,res)=>{const r=await proposeInvestigation179(req.body||{});res.status(r.ok?200:400).json(r);}));
app.post('/api/v179/execute',asyncHandler(async(req,res)=>{const r=await executeAndRecord179(req.body||{});res.status(r.ok?200:400).json(r);}));
// V17.8: bounded research tool selection + checks; no model-generated code execution.
app.post('/api/v178/cycle',(req,res)=>{const result=researchCycle178(req.body||{});res.status(result.ok?200:400).json(result);});
app.post('/api/v178/reproducibility',(req,res)=>{const result=scoreReproducibility178(req.body||{});res.status(result.ok?200:400).json(result);});
// V17.7: authenticated, Master-only diagnostics and evidence-gated scorecard.
for(const [route,fn] of [['/api/v177/signal',signalDiagnostics],['/api/v177/oscillator',oscillatorDiagnostics],['/api/v177/evidence',evidenceQuality],['/api/v177/grade',gradeCapabilities]]) {
 app.post(route,(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=fn(req.body||{});res.status(r.ok?200:400).json(r);});
}
app.post('/api/v177/investigate',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=await supervisedResearch(req.body||{});res.status(r.ok?200:400).json(r);}));
// V17.6: Master-only research memory, proposals and allowlisted tool execution.
for(const [url,fn] of [['/api/research176/start',startResearch],['/api/research176/search',searchResearch],['/api/research176/propose',proposeResearch]])app.post(url,asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=await fn(req.body||{});res.status(r.ok?200:400).json(r);}));
app.get('/api/research176/:id',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=await readResearch(req.params.id);res.status(r.ok?200:404).json(r);}));
app.post('/api/research176/:id/events',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=await recordResearch(req.params.id,req.body||{});res.status(r.ok?200:400).json(r);}));
app.post('/api/research176/tools',(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=runResearchTools(req.body||{});res.status(r.ok?200:400).json(r);});

// V17.5: Master-controlled, bounded scientific planner and optional model analysis.
app.post('/api/mission175/plan',(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=formulateInvestigation(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/mission175/review',(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=independentReview(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/mission175/investigate',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await investigate175(req.body||{});res.status(r.ok?200:400).json(r);}));

// V17.4: Master-only evidence quality, prediction metrics and readiness checks.
for(const [route,fn] of [['/api/assurance/predictions',assessPredictions],['/api/assurance/readiness',readinessGate],['/api/assurance/evidence',evidenceGate]]){app.post(route,(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=fn(req.body||{});res.status(r.ok?200:400).json(r);});}
// V17.3 Master-directed scientific missions, provenance, and benchmark gates.
app.post('/api/mission/plan',(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=deviseMission(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/mission/create',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=await createMission(req.body||{});res.status(r.ok?201:400).json(r);}));
app.get('/api/mission/list',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);res.json(await listMissions());}));
app.get('/api/mission/:id',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=await readMission(req.params.id);res.status(r.ok?200:400).json(r);}));
app.post('/api/mission/:id/evidence',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=await addMissionEvidence(req.params.id,req.body||{});res.status(r.ok?201:400).json(r);}));
app.post('/api/mission/assess',(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=assessMission(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/mission/benchmark',(req,res)=>{if(req.principal.role!=='master')return res.sendStatus(403);const r=researchBenchmark(req.body||{});res.status(r.ok?200:400).json(r);});

// Owner-controlled research dossiers; no external operations or classified-network access.
app.post('/api/command/dossiers',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await createDossier(req.body||{});res.status(r.ok?201:400).json(r); }));
app.get('/api/command/dossiers',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});res.json(await listDossiers());}));
app.get('/api/command/dossiers/:id',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await getDossier(req.params.id);res.status(r.ok?200:404).json(r);}));
app.post('/api/command/dossiers/:id/entries',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await modifyDossier(req.params.id,req.body||{});res.status(r.ok?200:400).json(r);}));

// V17.2 Master-directed validation: computations only, no external access.
for(const [url,fn] of [['/api/command/holdout',validateHoldout],['/api/command/sensitivity',assessSensitivity],['/api/command/challenge',challengeHypotheses]]) {
 app.post(url,(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const result=fn(req.body||{});res.status(result.ok?200:400).json(result);});
}

// V17.1 verification laboratory: read-only computation under Master authentication.
app.post('/api/command/verify-claim',(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=evaluateClaims(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/command/compare-models',(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=compareResearchModels(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/command/benchmark-gate',(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});res.json(benchmarkGate(req.body||{}));});

app.post('/api/v192/investigate',asyncHandler(async(req,res)=>{if(req.principal?.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await investigate192(req.body||{},{search:liveSearch192});res.status(r.ok?200:400).json(r);}));

// V18.6 Master-directed multi-round public research.
app.post('/api/v186/investigate',asyncHandler(async(req,res)=>{
 if(req.principal?.role!=='master')return res.status(403).json({ok:false,error:'Master only'});
 const result=await unifiedDiscovery(req.body||{}, {persist:true});
 res.status(result.ok?200:400).json(result);
}));

// V18.9 Master-controlled provider search, objective ranking and optional encrypted archival.
app.post('/api/v191/evaluate',(req,res)=>{const r=evaluateFindings(req.body||{});res.status(r.ok?200:400).json(r);});
for(const [route,fn] of [['/api/v190/frontier-audit',assessFrontier190],['/api/v190/retrieval-audit',auditRetrieval190],['/api/v190/autonomy-gate',autonomyGate190],['/api/v190/security-audit',securityAudit190]])app.post(route,(req,res)=>{const r=fn(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/v189/mission',asyncHandler(async(req,res)=>{const r=await runIntelMission189(req.body||{});res.status(r.ok?200:400).json(r);}));

// V18.8 fixed-host, credentialed authorized threat-intelligence provider.
app.post('/api/v188/provider/search',asyncHandler(async(req,res)=>{const r=await retrieveProvider188(req.body||{});res.status(r.ok?200:502).json(r);}));

// V18.7 authenticated intelligence corroboration and encrypted archive.
app.post('/api/v187/corroborate',(req,res)=>{const r=corroborate187(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/v187/followups',(req,res)=>{const r=planFollowups187(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/v187/archive',asyncHandler(async(req,res)=>{const r=await saveIntel187(req.body||{});res.status(r.ok?201:400).json(r);}));
app.get('/api/v187/archive/:id',asyncHandler(async(req,res)=>{const r=await readIntel187(req.params.id);res.status(r.ok?200:404).json(r);}));

// V18.5 authorized, bounded public threat-intelligence source. Master authorization enforced.
app.post('/api/v185/kev/search',asyncHandler(async(req,res)=>{
 if(req.principal?.role!=='master')return res.status(403).json({ok:false,error:'Master only'});
 const data=await fetchKev({limit:req.body?.limit});
 if(!data.ok)return res.status(502).json(data);
 const result=Array.isArray(req.body?.terms)?matchAdvisories(data.incidents,req.body.terms):data;
 res.status(result.ok?200:400).json(result);
}));

// V18.4 real public-source search; Master-only; preapproved fixed provider hosts.
app.post('/api/v184/search',asyncHandler(async(req,res)=>{const result=await liveSearch(req.body||{});res.status(result.ok?200:400).json(result);}));

// V18.3 offline intelligence evaluation, strict Master access, no external collection.
for(const [url,fn] of [['/api/v183/corroborate',p=>corroborate(p.records)],['/api/v183/assess-exposure',exposureAssessment],['/api/v183/investigate',p=>investigateTarget(p.objective||{},p.documents)]]){
 app.post(url,(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=fn(req.body||{});res.status(r.ok?200:400).json(r);});
}

// Master-directed investigative retrieval; no covert or unauthorized system access.
app.post('/api/targets/plan',(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=planTarget(req.body||{});res.status(r.ok?200:400).json(r);});
app.post('/api/targets/execute',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await executeTarget(req.body||{});res.status(r.ok?200:400).json(r); }));
app.get('/api/targets/missions',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});res.json(await getTargetMissions());}));
app.get('/api/targets/missions/:id',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await getTargetMission(req.params.id);res.status(r.ok?200:404).json(r);}));

// All monitoring modifications and manually triggered scans are master-only.
app.get('/api/threat-intel/status',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});res.json(await threatStatus());}));
app.post('/api/threat-intel/providers',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await addProvider(req.body||{});res.status(r.ok?201:400).json(r);}));
app.post('/api/threat-intel/providers/:id/disable',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});res.json(await disableProvider(req.params.id));}));
app.post('/api/threat-intel/reports',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await ingestThreatReport(req.body||{});res.status(r.ok?201:400).json(r);}));
app.post('/api/fusion/brief',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});res.json(await intelligenceBrief(req.body?.projects||[],req.body?.options||{}));}));
app.post('/api/fusion/compare',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});res.json(compareSnapshots(req.body?.before,req.body?.after));}));
app.get('/api/watch/status',asyncHandler(async(req,res)=>res.json(await watchStatus())));
app.post('/api/watch/sources',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await addSource(req.body||{});res.status(r.ok?201:400).json(r);}));
app.delete('/api/watch/sources/:id',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});res.json(await removeSource(req.params.id));}));
app.post('/api/watch/scan',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});res.json(await scan());}));
app.post('/api/watch/reports',asyncHandler(async(req,res)=>{if(req.principal.role!=='master')return res.status(403).json({ok:false,error:'Master only'});const r=await ingestReport(req.body||{});res.status(r.ok?201:400).json(r);}));
app.post('/api/watch/findings/:id/read',asyncHandler(async(req,res)=>res.json(await markRead(req.params.id))));


app.post('/api/intelligence/workbench',(req,res)=>{const r=executeWorkbench(req.body);res.status(r.ok?200:400).json(r);});
app.post('/api/intelligence/review',(req,res)=>{const r=reviewResearch(req.body);res.status(r.ok?200:400).json(r);});
app.post('/api/intelligence/reason',asyncHandler(async(req,res)=>{const r=await reasonWithModel(req.body);res.status(r.ok?200:400).json(r);}));

// Owner-directed intelligence casework. No automated scraping, intrusion, or covert collection.
app.get('/api/recon/cases',asyncHandler(async(req,res)=>res.json(await listReconCases())));
app.post('/api/recon/cases',asyncHandler(async(req,res)=>{const r=await createReconCase(req.body||{});res.status(r.ok?201:400).json(r); }));
app.get('/api/recon/cases/:id',asyncHandler(async(req,res)=>{const r=await getReconCase(req.params.id);res.status(r.ok?200:404).json(r);}));
app.post('/api/recon/cases/:id/sources',asyncHandler(async(req,res)=>{const r=await addReconSource(req.params.id,req.body||{});res.status(r.ok?201:400).json(r);}));
app.post('/api/recon/cases/:id/notes',asyncHandler(async(req,res)=>{const r=await addReconNote(req.params.id,req.body||{});res.status(r.ok?201:400).json(r);}));
app.post('/api/recon/cases/:id/close',asyncHandler(async(req,res)=>{const r=await closeReconCase(req.params.id);res.status(r.ok?200:404).json(r);}));
app.get('/api/health/science',asyncHandler(async(req,res)=>{if(req.principal?.role!=='master')return res.status(403).json({ok:false,error:'Master authorization required'});const state=await scienceHealth();res.status(state.ok?200:503).json(state);}));
app.get('/api/health', (req,res)=>res.json({ ok:true, name:'SUPER VELOREN V17.9 Investigation Control', time:new Date().toISOString() }));
app.get('/api/store', asyncHandler(async (req,res)=>res.json(await getStore())));
app.get('/api/knowledge', asyncHandler(async (req,res)=>res.json(await loadKnowledge())));

for (const [route,handler] of [['/api/frontier/hypotheses',formulateFrontier],['/api/frontier/models',compareModels],['/api/frontier/dimensions',dimensionalAudit]]) {
 app.post(route,(req,res)=>{const result=handler(req.body||{});res.status(result.ok?200:400).json(result);});
}

app.post('/api/scientist/investigate',asyncHandler(async(req,res)=>{const r=await investigate(req.body);res.status(r.ok?200:400).json(r);}));
app.post('/api/scientist/plan',(req,res)=>{try{res.json({ok:true,plan:planInvestigation(req.body)});}catch(e){res.status(400).json({ok:false,error:e.message});}});

app.post('/api/reason/execute',asyncHandler(async(req,res)=>{const result=await executePlan(req.body);res.status(result.ok?200:400).json(result);}));
app.post('/api/reason/evidence',(req,res)=>{const result=critiqueEvidence(req.body);res.status(result.ok?200:400).json(result);});

app.post('/api/discovery/analyze',asyncHandler(async(req,res)=>{const r=await discovery(req.body);res.status(r.ok?200:400).json(r);}));

app.post('/api/investigator/verify',(req,res)=>{const r=verify(req.body);res.status(r.ok?200:400).json(r);});
app.get('/api/investigator/cases/:id/plan',asyncHandler(async(req,res)=>{const r=await getPlan(req.params.id);res.status(r.ok?200:404).json(r);}));
app.post('/api/investigator/cases/:id/missions',asyncHandler(async(req,res)=>{const r=await runMission(req.params.id,req.body);res.status(r.ok?201:400).json(r);}));

app.post('/api/physics/simulate', asyncHandler(async(req,res)=>{const result=await physics(req.body);res.status(result.ok?200:400).json(result);}));

// X-Files research laboratory: calculations and evidence are separated from conclusions.
app.post('/api/research/analyze', asyncHandler(async(req,res)=>res.json(await analyze(req.body))));
app.get('/api/research/cases',asyncHandler(async(req,res)=>res.json({ok:true,cases:await getCases()})));
app.post('/api/research/cases',asyncHandler(async(req,res)=>{
 const c=createCase(req.body||{});await mutateCases(list=>{list.push(c);return c;});res.status(201).json({ok:true,case:c});
}));
app.post('/api/research/cases/:id/evidence',asyncHandler(async(req,res)=>{
 const ev=newEvidence(req.body||{});const found=await mutateCases(list=>{const c=list.find(item=>item.id===req.params.id);if(!c)return null;c.evidence.push(ev);return c;});
 if(!found)return res.status(404).json({ok:false,error:'Unknown case'});res.status(201).json({ok:true,evidence:ev});
}));
app.post('/api/research/cases/:id/tests',asyncHandler(async(req,res)=>{
 const analysis=await analyze(req.body||{});if(!analysis.ok)return res.status(400).json(analysis);
 const result=await mutateCases(list=>{const c=list.find(item=>item.id===req.params.id);if(!c)return null;
 const record={id:crypto.randomUUID(),at:new Date().toISOString(),parameters:req.body,analysis};c.tests.push(record);return record;});
 if(!result)return res.status(404).json({ok:false,error:'Unknown case'});res.status(201).json({ok:true,test:result});
}));

app.post('/api/chat', asyncHandler(async (req,res)=>{
  const { message='', history=[], mode='super-vel' } = req.body || {};
  if (!String(message).trim()) return res.status(400).json({ ok:false, error:'message required' });
  const result = await aiResponse({ message, history, mode });
  await recordChat(message, result);
  res.json({ ok:true, result });
}));

app.post('/api/crown', asyncHandler(async (req,res)=>{
  const result = await aiResponse({ message:'Crown this cycle', history:[], mode:'super-vel' });
  await recordChat('Crown this cycle', result);
  res.json({ ok:true, result });
}));

app.post('/api/multiply', asyncHandler(async (req,res)=>{
  const result = await aiResponse({ message:req.body?.message || 'Multiply this cycle into the next cycle', history:[], mode:'super-vel' });
  await recordChat(result.repairedInput, result);
  res.json({ ok:true, result });
}));

app.get('/api/export/:file', (req,res)=>{
  const file = path.basename(req.params.file);
  res.download(path.join(process.cwd(), 'exports', file));
});

app.get('*', (req,res)=>res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.use((err, req, res, next)=>{
  console.error(err);
  res.status(500).json({ ok:false, error: err.message || 'server error' });
});

startPolling();
app.listen(PORT, '0.0.0.0', ()=>{
  console.log(`SUPER VELOREN listening on 0.0.0.0:${PORT}`);
});
