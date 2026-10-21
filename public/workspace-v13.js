"use strict";
// V1.3 UX workbench: no credentials or sensitive documents stored in browser storage.
const velProject=document.getElementById('activeProject');
const velGoal=document.getElementById('workspaceGoal');
const velEvidence=document.getElementById('intelEvidence');
const velStages=document.getElementById('intelStages');
function velSetStage(stage){if(velStages)velStages.textContent=stage;}
function velSetProject(project){if(!project)return;const p=document.getElementById('intelProject');if(p)p.value=project;const title=document.getElementById('caseTitle');if(title&&!title.value)title.value=project+' Investigation';}
if(velProject){velProject.addEventListener('change',()=>velSetProject(velProject.value));velSetProject(velProject.value);}
document.getElementById('workspaceLaunch')?.addEventListener('click',()=>{
 const q=velGoal.value.trim();if(q.length<8){velGoal.focus();return;}document.getElementById('intelObjective').value=q;
 velSetProject(velProject.value);document.querySelector('[data-page="intel"]')?.click();document.getElementById('intelRun')?.click();
});
document.getElementById('workspaceCases')?.addEventListener('click',()=>document.querySelector('[data-page="vault"]')?.click());
window.addEventListener('vel-task-start',e=>{if(e.detail?.name==='intelRun')velSetStage('Retrieving approved public sources…');});
window.addEventListener('vel-task-end',e=>{if(e.detail?.name==='intelRun'&&!velStages.textContent.startsWith('Report'))velSetStage('Request finished — check the findings or any error.');});
window.addEventListener('vel-investigation-results',e=>{
 const report=e.detail||{};const findings=Array.isArray(report.findings)?report.findings:[];
 velEvidence.replaceChildren();let count=0;
 for(const f of findings.slice(0,25)){
   const link=String(f.reference||f.url||'');let safe=false;
   try{const parsed=new URL(link);safe=['https:','http:'].includes(parsed.protocol)}catch{}
   if(!safe)continue;
   const article=document.createElement('article');article.className='evidence-entry';
   const title=document.createElement('a');title.href=link;title.target='_blank';title.rel='noopener noreferrer';title.textContent=String(f.title||'Untitled source');
   const meta=document.createElement('small');meta.textContent=new URL(link).hostname+' · Source link (verify independently)';
   const description=document.createElement('p');description.textContent=String(f.summary||'').slice(0,500);
   article.append(title,meta,description);velEvidence.append(article);count++;
 }
 if(!count)velEvidence.textContent='No validated source links returned. Verify the provider connection.';
 velSetStage('Report ready · '+count+' source links · findings are not independently verified');
});
