import type { Catalog, EditorialEntry, FileHashes, Tool, ToolSource, Workflow } from '../src/types.ts';
interface SyncOptions { skills: string; harnesses: string; entries: EditorialEntry[]; workflows: Workflow[]; previous?: Catalog | null; now?: string }
export interface SyncResult { catalog: Catalog; changed: string[]; pending: string[]; unchanged: boolean }
import { readFile, readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { localFiles, snapshotHash, blobHash } from './lib.ts';
import { externalSource } from './sources.ts';
const equal=(a: unknown,b: unknown)=>JSON.stringify(a)===JSON.stringify(b);
const sorted=(files: FileHashes)=>Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));
async function discover(dir: string,prefix=''): Promise<string[]>{
 const result: string[]=[];
 for(const e of await readdir(join(dir,prefix),{withFileTypes:true})){
  if(['.git','node_modules','.DS_Store','__pycache__'].includes(e.name))continue;
  const p=prefix?`${prefix}/${e.name}`:e.name;
  if(e.isDirectory())result.push(...await discover(dir,p));else if(e.isFile()&&e.name==='SKILL.md')result.push(prefix);
 }
 return result.sort();
}
export async function buildCatalog({skills,harnesses,entries,workflows,previous,now=new Date().toISOString()}: SyncOptions): Promise<SyncResult>{
 if(new Set(entries.map(t=>t.id)).size!==entries.length)throw Error('Duplicate tool IDs');
 const manifest=await readFile(join(skills,'external/SOURCES.md'),'utf8');
 const commits=Object.fromEntries([...manifest.matchAll(/^- ([\w.-]+\/[\w.-]+): ([a-f0-9]{40})$/gm)].map(m=>[m[1],m[2]]));
 const revision=(dir: string,paths: string[])=>execFileSync('git',['-C',dir,'log','-1','--format=%H','HEAD','--',...paths],{encoding:'utf8'}).trim();
 const tools: Tool[]=[];
 for(const entry of entries){
  let source: ToolSource; let files: FileHashes | undefined; let name: string | undefined; let callName=entry.id; let commands: string[]=[];
  if(entry.kind==='external'){
   const ref=externalSource(entry.id);
   source={...ref,baseline:commits[ref.repo]??null};
  }else{
   const repo=entry.kind==='harness'?'agent-harnesses':'agent-skills';
   const local=entry.kind==='harness'?`skills/${entry.id}-harness`:`custom/skills/${entry.id}`;
   source={repo:`LeeTheY/${repo}`,local,baseline:revision(entry.kind==='harness'?harnesses:skills,entry.kind==='harness'?[local,`harnesses/${entry.id}`]:[local])};
   if(!source.baseline)throw Error(`원본 Git 이력 누락: ${entry.id}`);
   if(entry.kind==='harness'){callName=`${entry.id}-harness`;commands=['cd "$HOME/agent/agent-harnesses"',`node scripts/harness.ts setup ${entry.id}`,`./scripts/link-codex.sh --id ${entry.id}`];}
  }
  if(!files){
   const dir=join(entry.kind==='harness'?harnesses:skills,source.local);
   if((await lstat(dir)).isSymbolicLink())throw Error(`원본 스킬 디렉터리 링크는 허용하지 않습니다: ${entry.id}`);
   const body=await readFile(join(dir,'SKILL.md'),'utf8');name=body.match(/^name:\s*["']?([^\n"']+)/m)?.[1]?.trim();files=await localFiles(dir);
   if(entry.kind==='harness'){
    const engine=`harnesses/${entry.id}`;
    const tracked=execFileSync('git',['-C',harnesses,'ls-files','-z','--',engine],{encoding:'utf8'}).split('\0').filter(Boolean);
    if(!tracked.length)throw Error(`하네스 구현 누락: ${entry.id}`);
    for(const path of tracked){const file=join(harnesses,path);if((await lstat(file)).isSymbolicLink())throw Error(`하네스 링크 파일: ${path}`);files[`engine/${path.slice(engine.length+1)}`]=blobHash(await readFile(file));}
   }
  }
  if(!entry.id.startsWith('korean-')&&entry.kind!=='harness')callName=name||callName;
  if(!commands.length)commands=['cd "$HOME/agent/agent-skills"','./scripts/link-codex.sh'];
  files=sorted(files);
  const old=previous?.tools.find(t=>t.id===entry.id);
  const hash=snapshotHash(source,files);
  tools.push({...entry,callName,commands,source,files,snapshotHash:hash,syncedAt:old?.snapshotHash===hash?old.syncedAt:now,prompt:`$${callName}로 ${entry.prompt}`,promptExamples:entry.promptExamples?.map(e=>({...e,prompt:`$${callName}로 ${e.prompt}`})),usage:entry.usage??(entry.kind==='harness'?['Node.js 24 이상을 준비하고 해당 하네스를 설치합니다.','Codex 또는 Claude Code에 호출 스킬을 연결합니다.','대상 프로젝트에서 프롬프트를 실행하고 결과와 미검증 범위를 확인합니다.']:['로컬 스킬 폴더와 연결 상태를 확인합니다.','작업할 프로젝트를 열고 필요한 자료를 첨부합니다.','추천 프롬프트를 복사하고 대상과 원하는 결과를 구체화합니다.'])});
 }
 const customs=await discover(join(skills,'custom/skills'));
 const harnessSkills=await discover(join(harnesses,'skills'));
 const externals=await discover(join(skills,'external'));
 const detected=[...customs.map(p=>`custom/skills/${p}`),...harnessSkills.map(p=>`harnesses/skills/${p}`),...externals.map(p=>`external/${p}`)];
 const known=new Set(tools.map(t=>t.kind==='harness'?`harnesses/${t.source.local}`:t.source.local));
 const pending=detected.filter(p=>!known.has(p));
 const same=equal(previous?.tools,JSON.parse(JSON.stringify(tools)))&&equal(previous?.workflows,workflows)&&equal(previous?.pendingSources??[],pending);
 const catalog: Catalog=JSON.parse(JSON.stringify({syncedAt:same&&previous?previous.syncedAt:now,tools,workflows,pendingSources:pending}));
 const changed=tools.filter(t=>{const old=previous?.tools.find(o=>o.id===t.id);return !equal(old,t);}).map(t=>t.id);
 return {catalog,changed,pending,unchanged:same};
}
