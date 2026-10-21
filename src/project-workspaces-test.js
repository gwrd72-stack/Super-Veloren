import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const cwd=process.cwd();const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vel-project-test-'));
try{process.chdir(dir);const {listProjects,saveProject,appendProjectEvent}=await import('./project-workspaces.js?'+Date.now());
assert.deepEqual(await listProjects(),[]);
assert.equal((await saveProject({title:''})).ok,false);
const p=await saveProject({title:'Physics test',objective:'Verify orbital equation'});assert.equal(p.ok,true);
const id=p.project.id;assert.equal((await appendProjectEvent(id,{kind:'finding',text:'Sample evidence'})).ok,true);
assert.equal((await appendProjectEvent(id,{kind:'note',text:''})).ok,false);
const tasks=await Promise.all(Array.from({length:10},(_,i)=>appendProjectEvent(id,{kind:'note',text:'Test '+i})));
assert(tasks.every(t=>t.ok));const projects=await listProjects();assert.equal(projects[0].events.length,11);
assert.equal((await saveProject({id,title:'Updated',status:'paused'})).project.status,'paused');
assert.equal((await saveProject({id:'missing',title:'Fake'})).ok,false);
assert.equal((await appendProjectEvent('missing',{text:'nope'})).ok,false);
console.log('V1.5 project workspace assertions passed: 9');
}finally{process.chdir(cwd);await fs.rm(dir,{recursive:true,force:true});}
