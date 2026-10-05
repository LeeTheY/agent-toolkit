import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { entries, workflows } from '../content/entries.mjs';
import { externalSource } from './sources.mjs';
import { localFiles, snapshotHash } from './lib.mjs';
const root=resolve(import.meta.dirname,'..');
const skills=process.env.AGENT_SKILLS_HOME||join(homedir(),'agent/agent-skills');
const harnesses=process.env.AGENT_HARNESSES_HOME||join(homedir(),'agent/agent-harnesses');
const manifest=await readFile(join(skills,'external/SOURCES.md'),'utf8').catch(()=> '');
const commits=Object.fromEntries([...manifest.matchAll(/^- ([\w.-]+\/[\w.-]+): ([a-f0-9]{40})$/gm)].map(m=>[m[1],m[2]]));
const sourceCommit=dir=>execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const date=new Date().toISOString();
let previous;try{previous=JSON.parse(await readFile(join(root,'src/data/catalog.json'),'utf8'));}catch{}
const tools=[];
for(const entry of entries){
 let local,source,callName=entry.id,commands=[];
 if(entry.kind==='external'){
  const ref=externalSource(entry.id);local=join(skills,ref.local);
  source={...ref,baseline:commits[ref.repo]??null};
 }else if(entry.kind==='custom'){
  local=join(skills,'custom/skills',entry.id);source={repo:'LeeTheY/agent-skills',local:`custom/skills/${entry.id}`,baseline:sourceCommit(skills)};
 }else{
  local=join(harnesses,'skills',`${entry.id}-harness`);source={repo:'LeeTheY/agent-harnesses',local:`skills/${entry.id}-harness`,baseline:sourceCommit(harnesses)};
  callName=`${entry.id}-harness`;
  commands=[`cd "$HOME/agent/agent-harnesses"`,`node scripts/harness.ts setup ${entry.id}`,`./scripts/link-codex.sh --id ${entry.id}`];
 }
 const body=await readFile(join(local,'SKILL.md'),'utf8');
 const name=body.match(/^name:\s*["']?([^\n"']+)/m)?.[1]?.trim()||callName;
 if(!entry.id.startsWith('korean-')&&entry.kind!=='harness')callName=name;
 if(!commands.length)commands=['cd "$HOME/agent/agent-skills"','./scripts/link-codex.sh'];
 const files=await localFiles(local);
 const old=previous?.tools.find(t=>t.id===entry.id);
 const unchanged=old&&JSON.stringify(old.files)===JSON.stringify(files);
 tools.push({...entry,callName,commands,source,files,snapshotHash:snapshotHash(source,files),syncedAt:unchanged?old.syncedAt:date,prompt:`$${callName}로 ${entry.prompt}`,
  promptExamples:entry.promptExamples?.map(example=>({...example,prompt:`$${callName}로 ${example.prompt}`})),
  usage:entry.usage??(entry.kind==='harness'?['Node.js 24 이상을 준비하고 해당 하네스를 설치합니다.','Codex 또는 Claude Code에 호출 스킬을 연결합니다.','대상 프로젝트에서 프롬프트를 실행하고 결과와 미검증 범위를 확인합니다.']:['로컬 스킬 폴더와 연결 상태를 확인합니다.','작업할 프로젝트를 열고 필요한 자료를 첨부합니다.','추천 프롬프트를 복사하고 대상과 원하는 결과를 구체화합니다.'])});
}
if(new Set(tools.map(t=>t.id)).size!==tools.length)throw new Error('Duplicate tool IDs');
await mkdir(join(root,'src/data'),{recursive:true});
const file=join(root,'src/data/catalog.json');
await writeFile(file+'.tmp',JSON.stringify({syncedAt:date,tools,workflows},null,2)+'\n');await rename(file+'.tmp',file);
console.log(`로컬 카탈로그 동기화 완료: ${tools.length}개. 원본 파일은 수정하지 않았습니다.`);
