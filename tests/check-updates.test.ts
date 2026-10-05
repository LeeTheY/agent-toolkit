import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { UpdateCatalog } from '../src/types.ts';

test('TypeScript 업데이트 CLI가 모의 GitHub 응답과 조회 실패를 저장한다', async t => {
 const root=await mkdtemp(join(tmpdir(),'toolkit-updates-ts-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'src/data'),{recursive:true});
 await cp(new URL('../scripts/',import.meta.url),join(root,'scripts'),{recursive:true});
 await writeFile(join(root,'package.json'),JSON.stringify({type:'module'}));
 await writeFile(join(root,'src/data/catalog.json'),JSON.stringify({tools:[{
  id:'fixture',kind:'external',snapshotHash:'snapshot',files:{'SKILL.md':'old'},
  source:{repo:'fixture/skills',baseline:'a'.repeat(40),paths:['skills/fixture']}
 }]}));
 const mock=join(root,'mock.ts');
 await writeFile(mock,`
 globalThis.fetch = async (input: string | URL | Request) => {
  if(process.env.FIXTURE_FAIL==='1')return new Response('{}',{status:403});
  const url=String(input);
  if(url.includes('/commits/')){
   const sha=url.endsWith('/HEAD')?'b'.repeat(40):'a'.repeat(40);
   return Response.json({sha,commit:{tree:{sha},committer:{date:'2026-10-06T00:00:00Z'}}});
  }
  return Response.json({truncated:false,tree:[{path:'skills/fixture/SKILL.md',type:'blob',sha:url.includes('a'.repeat(40))?'old':'new'}]});
 };
 `);
 const run=(fail: boolean)=>spawnSync(process.execPath,['--import',mock,join(root,'scripts/check-updates.ts')],{cwd:root,encoding:'utf8',env:{...process.env,GITHUB_TOKEN:'',FIXTURE_FAIL:fail?'1':'0'}});
 const success=run(false);
 assert.equal(success.status,0,success.stderr);
 const good: UpdateCatalog=JSON.parse(await readFile(join(root,'src/data/updates.json'),'utf8'));
 assert.equal(good.tools.fixture.status,'changed');
 assert.equal(good.tools.fixture.personal,'same');
 assert.deepEqual(good.tools.fixture.changes,[{path:'SKILL.md',type:'modified'}]);
 const failure=run(true);
 assert.equal(failure.status,1,failure.stderr);
 const bad: UpdateCatalog=JSON.parse(await readFile(join(root,'src/data/updates.json'),'utf8'));
 assert.equal(bad.tools.fixture.status,'error');
 assert.match(bad.tools.fixture.reason,/조회 제한 또는 권한 오류/);
 assert.equal(bad.tools.fixture.lastSuccessAt,good.tools.fixture.checkedAt);
});
