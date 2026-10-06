import type { TestContext } from 'node:test';
import type { ToolKind, EditorialEntry } from '../src/types.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync as gitRun } from 'node:child_process';
import { buildCatalog } from '../scripts/catalog-sync.ts';
const hash='a'.repeat(40);
const record={id:'writing-plans',repo:'obra/superpowers',local:'external/development/writing-plans',path:'skills/writing-plans',baseline:hash,callName:'writing-plans',files:{'SKILL.md':hash}};
const entry=(id: string,kind: ToolKind): EditorialEntry=>({id,kind,title:id,category:'test',summary:'summary',when:'when',prompt:'실행해줘.',note:'note'});
async function fixture(t: TestContext){
 const root=await mkdtemp(join(tmpdir(),'toolkit-sync-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const skills=join(root,'skills'),harnesses=join(root,'harnesses');
 const put=async(root: string,path: string,body: string)=>{const target=join(root,path);await mkdir(join(target,'..'),{recursive:true});await writeFile(target,body);};
 for(const dir of [skills,harnesses]){await mkdir(dir);gitRun('git',['init','-q',dir]);}
 await put(skills,'custom/skills/sample/SKILL.md','---\nname: sample\n---\noriginal');
 await put(skills,'external/SOURCES.md',`- obra/superpowers: ${hash}\n`);
 await put(skills,record.local+'/SKILL.md','---\nname: writing-plans\n---\noriginal');
 await put(harnesses,'skills/frontend-harness/SKILL.md','---\nname: frontend-harness\n---\nwrapper');
 await put(harnesses,'harnesses/frontend/engine.ts','export const version=1;');
 const commit=(dir: string)=>{gitRun('git',['-C',dir,'add','.']);gitRun('git',['-C',dir,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']);};
 commit(skills);commit(harnesses);
 return {skills,harnesses,put,commit,entries:[entry('sample','custom'),entry('frontend','harness'),entry('writing-plans','external')],workflows:[],now:'2026-10-06T00:00:00Z'};
}
test('로컬 파일을 읽고 같은 입력은 시각과 내용을 유지한다',async t=>{
 const f=await fixture(t),first=await buildCatalog(f),previous=JSON.parse(JSON.stringify(first.catalog));
 const second=await buildCatalog({...f,previous,now:'2026-10-07T00:00:00Z'});
 assert.equal(second.unchanged,true);assert.deepEqual(second.catalog,previous);assert.equal(second.changed.length,0);
});
test('관련 없는 원본 커밋은 카탈로그를 변경하지 않는다',async t=>{
 const f=await fixture(t),before=await buildCatalog(f);
 await f.put(f.skills,'README.md','unrelated');f.commit(f.skills);
 assert.equal((await buildCatalog({...f,previous:before.catalog})).unchanged,true);
});
test('하네스 구현 수정과 새 스킬을 감지하되 편집한 소개는 보존한다',async t=>{
 const f=await fixture(t),before=await buildCatalog(f);
 await f.put(f.harnesses,'harnesses/frontend/engine.ts','export const version=2;');f.commit(f.harnesses);
 await f.put(f.skills,'custom/skills/new-skill/SKILL.md','---\nname: new-skill\n---');f.commit(f.skills);
 const after=await buildCatalog({...f,previous:before.catalog});
 assert.deepEqual(after.changed,['frontend']);assert.deepEqual(after.pending,['custom/skills/new-skill']);assert.equal(after.catalog.tools[0].summary,'summary');
});
test('미커밋 신규 하네스는 staged 구현을 읽고 적용 커밋을 추정하지 않는다',async t=>{
 const f=await fixture(t);
 await f.put(f.harnesses,'skills/engineering-harness/SKILL.md','---\nname: engineering-harness\n---\nwrapper');
 await f.put(f.harnesses,'harnesses/engineering/engine.ts','export const version=1;');
 gitRun('git',['-C',f.harnesses,'add','skills/engineering-harness','harnesses/engineering']);
 const before=await buildCatalog({...f,entries:[...f.entries,entry('engineering','harness')]});
 const tool=before.catalog.tools.find(t=>t.id==='engineering')!;
 assert.equal(tool.source.baseline,null);assert.ok(tool.files['engine/engine.ts']);
 assert.equal(tool.callName,'engineering-harness');
 assert.ok(!before.pending.includes('harnesses/skills/engineering-harness'));
 await f.put(f.harnesses,'harnesses/engineering/engine.ts','export const version=2;');
 const after=await buildCatalog({...f,entries:[...f.entries,entry('engineering','harness')],previous:before.catalog});
 assert.deepEqual(after.changed,['engineering']);
 assert.notEqual(after.catalog.tools.find(t=>t.id==='engineering')!.snapshotHash,tool.snapshotHash);
 assert.equal((await buildCatalog({...f,entries:[...f.entries,entry('engineering','harness')],previous:after.catalog,now:'2026-10-07T00:00:00Z'})).unchanged,true);
});
test('커밋이 없는 하네스도 Git 추적 구현이 없으면 등록하지 않는다',async t=>{
 const f=await fixture(t);
 await f.put(f.harnesses,'skills/missing-harness/SKILL.md','---\nname: missing-harness\n---');
 await f.put(f.harnesses,'harnesses/missing/engine.ts','untracked');
 await assert.rejects(buildCatalog({...f,entries:[...f.entries,entry('missing','harness')]}),/하네스 구현 누락/);
});
test('설치 기준 변경을 감지하고 기존 도구 삭제는 조용히 누락하지 않는다',async t=>{
 const f=await fixture(t),before=await buildCatalog(f);
 await f.put(f.skills,'external/SOURCES.md',`- obra/superpowers: ${'b'.repeat(40)}\n`);
 const after=await buildCatalog({...f,previous:before.catalog});assert.deepEqual(after.changed,['writing-plans']);
 await rm(join(f.skills,'custom/skills/sample/SKILL.md'));
 await assert.rejects(buildCatalog({...f,previous:after.catalog}),/ENOENT/);
});
test('새 외부 스킬을 등록 대기로 표시하고 기존 원문 변경을 감지한다',async t=>{
 const f=await fixture(t),before=await buildCatalog(f);
 await f.put(f.skills,'external/new/SKILL.md','new skill');
 await f.put(f.skills,record.local+'/SKILL.md','---\nname: writing-plans\n---\nchanged');
 const after=await buildCatalog({...f,previous:before.catalog});
 assert.deepEqual(after.pending,['external/new']);assert.deepEqual(after.changed,['writing-plans']);
 assert.equal(await readFile(join(f.skills,'external/new/SKILL.md'),'utf8'),'new skill');
});
