import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const store=path.join(process.cwd(),'data','v15-projects.json');
let queue=Promise.resolve();
const serialize=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
async function read(){try{const rows=JSON.parse(await fs.readFile(store,'utf8'));if(!Array.isArray(rows))throw Error('Corrupt project store');return rows;}catch(e){if(e.code==='ENOENT')return [];throw e;}}
async function write(rows){await fs.mkdir(path.dirname(store),{recursive:true,mode:0o700});const tmp=store+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(tmp,JSON.stringify(rows,null,2),{mode:0o600});await fs.rename(tmp,store);}catch(e){await fs.rm(tmp,{force:true}).catch(()=>{});throw e;}}
const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
export async function listProjects(){return read();}
export async function saveProject(input){return serialize(async()=>{const title=clean(input.title,120),objective=clean(input.objective,3000);if(!title)return {ok:false,error:'Project title required'};const rows=await read();let item=rows.find(p=>p.id===input.id);if(input.id&&!item)return {ok:false,error:'Unknown project'};if(!item){if(rows.length>=100)return {ok:false,error:'Project limit reached'};item={id:crypto.randomUUID(),createdAt:new Date().toISOString(),events:[]};rows.push(item);}item.title=title;item.objective=objective;item.status=['active','paused','complete'].includes(input.status)?input.status:'active';item.updatedAt=new Date().toISOString();await write(rows);return {ok:true,project:item};});}
export async function appendProjectEvent(id,input){return serialize(async()=>{const rows=await read(),item=rows.find(p=>p.id===id);if(!item)return {ok:false,error:'Project not found'};const text=clean(input.text,1500);if(!text)return {ok:false,error:'Event text required'};const kind=['note','finding','milestone','question'].includes(input.kind)?input.kind:'note';if(item.events.length>=1000)return {ok:false,error:'Event limit reached: export or create a new project'};const event={id:crypto.randomUUID(),kind,text,at:new Date().toISOString()};item.events.push(event);item.updatedAt=event.at;await write(rows);return {ok:true,event};});}
