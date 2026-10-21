"use strict";
// Master-only project UI: token remains in app.js memory. Access via the existing
// authenticated request wrapper exposed solely to this same-origin UI.
(()=>{
const $=id=>document.getElementById(id);let projects=[],selected='';
const notify=message=>{$('v15ProjectStatusText').textContent=message;};
const request=async(url,body)=>{if(typeof window.velAuthorizedApi!=='function')throw Error('Master command interface unavailable');return window.velAuthorizedApi(url,body===undefined?{}:{body});};
function render(){const picker=$('v15ProjectPicker');picker.replaceChildren();const opt=document.createElement('option');opt.value='';opt.textContent='New project';picker.append(opt);for(const p of projects){const option=document.createElement('option');option.value=p.id;option.textContent=p.title;picker.append(option);}picker.value=selected;if(selected&&!projects.some(p=>p.id===selected))selected='';const p=projects.find(p=>p.id===selected);$('v15ProjectTitle').value=p?.title||'';$('v15ProjectGoal').value=p?.objective||'';$('v15ProjectStatus').value=p?.status||'active';const list=$('v15Events');list.replaceChildren();for(const e of [...(p?.events||[])].reverse()){const div=document.createElement('article');div.className='record';const head=document.createElement('b');head.textContent=e.kind.toUpperCase()+' · '+new Date(e.at).toLocaleString();const detail=document.createElement('p');detail.textContent=e.text;div.append(head,detail);list.append(div);}if(!p)list.textContent='Select or create a project to see its timeline.';}
async function refresh(){try{const r=await request('/api/v15/projects');projects=r.projects||[];render();notify(projects.length+' saved projects loaded.');}catch(e){notify('Unable to load projects: '+e.message);}}
$('v15ProjectPicker')?.addEventListener('change',e=>{selected=e.target.value;render();});
$('v15RefreshProjects')?.addEventListener('click',refresh);
$('v15SaveProject')?.addEventListener('click',async()=>{try{const r=await request('/api/v15/projects',{id:selected||undefined,title:$('v15ProjectTitle').value,objective:$('v15ProjectGoal').value,status:$('v15ProjectStatus').value});selected=r.project.id;await refresh();notify('Project saved to Master-protected server workspace.');}catch(e){notify(e.message)}});
$('v15AddEvent')?.addEventListener('click',async()=>{if(!selected){notify('Select and save a project first.');return;}try{await request('/api/v15/projects/'+encodeURIComponent(selected)+'/events',{kind:$('v15EventKind').value,text:$('v15EventText').value});$('v15EventText').value='';await refresh();notify('Project event saved.');}catch(e){notify(e.message)}});
$('v15ExportProject')?.addEventListener('click',()=>{const p=projects.find(p=>p.id===selected);if(!p){notify('Select a project first.');return;}const u=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='vel-project-'+p.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
// On entering the workspace, only request protected data after explicit interaction.
document.querySelector('[data-page="projects"]')?.addEventListener('click',refresh);
})();
