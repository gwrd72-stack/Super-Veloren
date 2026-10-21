import fs from 'fs/promises';
import path from 'path';

const root = path.join(process.cwd(), 'data');
const storePath = path.join(root, 'runtime-store.json');
const knowledgePath = path.join(root, 'knowledge.json');

export async function loadKnowledge() {
  return JSON.parse(await fs.readFile(knowledgePath, 'utf8'));
}

export async function getStore() {
  try { return JSON.parse(await fs.readFile(storePath, 'utf8')); }
  catch { return { memory:[], masterLaws:[], corrections:[], drafts:[], crowned:[], lastArtifact:null }; }
}

export async function saveStore(store) {
  await fs.mkdir(root, { recursive:true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
  return store;
}

export async function addRecord(collection, record) {
  const store = await getStore();
  if (!Array.isArray(store[collection])) store[collection] = [];
  store[collection].unshift(record);
  await saveStore(store);
  return record;
}

export async function setLastArtifact(artifact) {
  const store = await getStore();
  store.lastArtifact = artifact;
  if (!Array.isArray(store.drafts)) store.drafts = [];
  store.drafts.unshift(artifact);
  await saveStore(store);
  return artifact;
}
