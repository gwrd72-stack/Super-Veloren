"use strict";
// Session-only visualization: never asserts that an external source is true.
(()=>{
 const byId=id=>document.getElementById(id), notes=[], nodes=[], events=[];
 const safeUrl=value=>{try{const u=new URL(String(value));return /^https?:$/.test(u.protocol)?u:null}catch{return null}};
 const text=(id,value)=>{const el=byId(id);if(el)el.textContent=String(value)};
 const project=()=>byId('activeProject')?.value||'X-Files';
 const addEvent=(kind,description)=>{events.unshift({at:new Date().toISOString(),kind,description:String(description).slice(0,500)});if(events.length>150)events.pop();render()};
 function render(){const graph=byId('explorerGraph'),timeline=byId('explorerTimeline');if(!graph||!timeline)return;
 graph.replaceChildren();const root=document.createElement('button');root.className='root-node';root.textContent='◈ '+project();root.onclick=()=>text('explorerDetail','Project: '+project()+' — selected working context, not a verified claim.');graph.append(root);
 for(const n of nodes.slice(0,36)){const b=document.createElement('button');b.textContent=n.title.slice(0,80);b.title=n.host;b.onclick=()=>{const el=byId('explorerDetail');el.replaceChildren();const t=document.createElement('div');t.textContent=n.title+' — '+n.host+' — '+n.summary;const a=document.createElement('a');a.href=n.url;a.rel='noopener noreferrer';a.target='_blank';a.textContent='Open source ↗';el.append(t,a)};graph.append(b)};
 timeline.replaceChildren();for(const e of events.slice(0,60)){const row=document.createElement('article'),stamp=document.createElement('time'),content=document.createElement('div');stamp.textContent=new Date(e.at).toLocaleString()+' · '+e.kind;content.textContent=e.description;row.append(stamp,content);timeline.append(row)}if(!events.length)timeline.textContent='No events yet. Start an investigation.';
 text('explorerNodes',nodes.length);text('explorerDomains',new Set(nodes.map(n=>n.host)).size);text('explorerEvents',events.length);text('explorerProject',project());}
 window.addEventListener('vel-investigation-results',event=>{const findings=Array.isArray(event.detail?.findings)?event.detail.findings:[];let added=0;for(const f of findings){const u=safeUrl(f.reference||f.url);if(!u)continue;const url=u.href;if(nodes.some(n=>n.url===url))continue;nodes.push({url,title:String(f.title||'Untitled'),summary:String(f.summary||'').slice(0,500),host:u.hostname});added++}addEvent('Retrieved evidence',`${added} new source links collected for ${project()}; unverified until reviewed.`)});
 window.addEventListener('vel-task-start',event=>addEvent('Operation started',event.detail?.name||'Operation'));
 window.addEventListener('vel-task-end',event=>addEvent('Operation finished',event.detail?.name||'Operation'));
 byId('activeProject')?.addEventListener('change',()=>{addEvent('Project selection',project())});
 byId('explorerAddNote')?.addEventListener('click',()=>{const field=byId('explorerNote'),note=field.value.trim();if(!note)return;notes.push({project:project(),note});addEvent('Field note',note);field.value=''});
 byId('explorerClear')?.addEventListener('click',()=>{if(!confirm('Clear the current visual session? Unsaved notes and source links will be lost.'))return;nodes.length=0;events.length=0;notes.length=0;render()});
 byId('explorerExport')?.addEventListener('click',()=>{const report={version:'1.4',project:project(),exportedAt:new Date().toISOString(),warning:'Source presence does not prove source accuracy.',sources:nodes,events,notes};const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='super-veloren-evidence-session.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)});
 render();
})();
