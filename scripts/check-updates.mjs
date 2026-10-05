import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { compareSkill } from './lib.mjs';
const root=resolve(import.meta.dirname,'..');
const catalog=JSON.parse(await readFile(join(root,'src/data/catalog.json'),'utf8'));
const target=join(root,'src/data/updates.json');
let previous={tools:{}};try{previous=JSON.parse(await readFile(target,'utf8'));}catch{}
const token=process.env.GITHUB_TOKEN;
const cache=new Map();
async function api(path){
 if(!cache.has(path))cache.set(path,(async()=>{
  const response=await fetch(`https://api.github.com/repos/${path}`,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:`Bearer ${token}`}:{})},signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error(response.status===403||response.status===429?'GitHub 조회 제한 또는 권한 오류':`GitHub 조회 실패 (HTTP ${response.status})`);
  return response.json();
 })());return cache.get(path);
}
async function tree(repo,ref){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!(ref==='HEAD'||/^[a-f0-9]{40}$/.test(ref)))throw new Error('Invalid source');
 const commit=await api(`${repo}/commits/${ref}`);
 const data=await api(`${repo}/git/trees/${commit.commit.tree.sha}?recursive=1`);
 if(data.truncated)throw new Error('원본 파일 목록이 너무 커서 전체 비교를 완료하지 못했습니다.');
 return {sha:commit.sha,date:commit.commit.committer.date,tree:data.tree};
}
const tools={};
for(const item of catalog.tools.filter(x=>x.kind==='external')){
 const checkedAt=new Date().toISOString();const base={checkedAt,baseline:item.source.baseline,snapshotHash:item.snapshotHash};
 if(!item.source.baseline){tools[item.id]={...base,status:'unknown',personal:'unknown',changes:[],reason:'별도 설치 스킬입니다. 설치 당시 커밋이 기록되어 있지 않습니다.'};continue;}
 try{
  const installed=await tree(item.source.repo,item.source.baseline);
  const latest=await tree(item.source.repo,'HEAD');
  const result=compareSkill(installed.tree,latest.tree,item.source,item.files);
  const last=previous.tools[item.id];
  tools[item.id]={...base,...result,latest:latest.sha,latestAt:latest.date,changedSinceLastCheck:!!last?.latest&&last.latest!==latest.sha};
 }catch(error){
  const old=previous.tools[item.id];
  tools[item.id]={...base,status:'error',personal:'unknown',changes:[],reason:error.message,lastSuccessAt:old?.status==='error'?old.lastSuccessAt:old?.checkedAt};
 }
}
await writeFile(target+'.tmp',JSON.stringify({checkedAt:new Date().toISOString(),tools},null,2)+'\n');await rename(target+'.tmp',target);
console.log('외부 스킬 상태:',Object.values(tools).reduce((acc,x)=>(acc[x.status]=(acc[x.status]||0)+1,acc),{}));
if(Object.values(tools).some(t=>t.status==='error'))process.exitCode=1;
