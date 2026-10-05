import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { changes, compareSkill, blobHash } from '../scripts/lib.mjs';
const blob=(path,sha)=>({path,sha,type:'blob'});
test('같은 저장소의 다른 스킬 변경은 업데이트로 표시하지 않는다',()=>{
 const result=compareSkill([blob('skills/a/SKILL.md','one'),blob('skills/b/SKILL.md','old')],[blob('skills/a/SKILL.md','one'),blob('skills/b/SKILL.md','new')],{paths:['skills/a']},{'SKILL.md':'one'});
 assert.equal(result.status,'current');assert.equal(result.personal,'same');
});
test('참조 파일 추가·삭제·수정과 로컬 개인 수정을 분리한다',()=>{
 const result=compareSkill([blob('a/SKILL.md','one'),blob('a/references/old.md','old')],[blob('a/SKILL.md','two'),blob('a/scripts/new.py','new')],{paths:['a']},{'SKILL.md':'personal','references/old.md':'old'});
 assert.equal(result.status,'changed');assert.equal(result.personal,'modified');assert.deepEqual(result.changes.map(c=>c.type),['modified','removed','added']);
});
test('플랫폼 사본을 이름만으로 선택하지 않는다',()=>{
 const result=compareSkill([blob('a/SKILL.md','one'),blob('b/SKILL.md','two')],[],{paths:['a','b']},{'SKILL.md':'other'});
 assert.equal(result.status,'unknown');
});
test('원본 경로가 없어지면 변경으로 감지한다',()=>{
 const result=compareSkill([blob('a/SKILL.md','one')],[],{paths:['a']},{'SKILL.md':'one'});
 assert.equal(result.status,'changed');assert.match(result.reason,/삭제/);
});
test('내용이 일치하는 플랫폼 사본을 선택한다',()=>{
 const result=compareSkill([blob('a/SKILL.md','one'),blob('b/SKILL.md','two')],[blob('a/SKILL.md','one'),blob('b/SKILL.md','two')],{paths:['a','b']},{'SKILL.md':'two'});
 assert.equal(result.path,'b');assert.equal(result.status,'current');
});
test('Git blob 해시와 파일 삭제 비교가 안정적이다',()=>{
 assert.equal(blobHash(Buffer.from('test content\n')),'d670460b4b4aece5915caf5c68d12f560a9fe3e4');
 assert.deepEqual(changes({'old':'x'},{}),[{path:'old',type:'removed'}]);
});
test('44개 항목에 실제 호출명·프롬프트·파일 근거가 있고 경로가 노출되지 않는다',async()=>{
 const raw=await readFile(new URL('../src/data/catalog.json',import.meta.url),'utf8');const catalog=JSON.parse(raw);
 assert.equal(catalog.tools.length,44);assert.equal(new Set(catalog.tools.map(t=>t.id)).size,44);
 for(const kind of ['harness','custom','external'])assert.equal(catalog.tools.filter(t=>t.kind===kind).length,{harness:2,custom:11,external:31}[kind]);
 for(const t of catalog.tools){assert.ok(t.callName);assert.ok(t.prompt.startsWith('$'+t.callName));assert.ok(t.files['SKILL.md']);assert.ok(t.usage.length);assert.ok(t.source.repo);}
 assert.doesNotMatch(raw,/\/Users\/|ghp_|github_pat_/);
 assert.notEqual(catalog.tools.find(t=>t.id==='humanizer').callName,catalog.tools.find(t=>t.id==='korean-humanizer').callName);
 for(const w of catalog.workflows)for(const id of w.steps)assert.ok(catalog.tools.some(t=>t.id===id));
});
test('동일 SKILL 해시라도 전체 파일이 일치하는 사본을 선택한다',()=>{
 const tree=[blob('a/SKILL.md','one'),blob('a/scripts/extra.py','x'),blob('b/SKILL.md','one')];
 const result=compareSkill(tree,tree,{paths:['a','b']},{'SKILL.md':'one'});
 assert.equal(result.path,'b');assert.equal(result.personal,'same');
});
test('동일한 플랫폼 사본은 출처를 임의로 확정하지 않는다',()=>{
 const tree=[blob('a/SKILL.md','one'),blob('b/SKILL.md','one')];
 assert.equal(compareSkill(tree,tree,{paths:['a','b']},{'SKILL.md':'one'}).status,'unknown');
});
test('루트 스킬의 README와 CI 변경은 설치 범위에서 제외한다',()=>{
 const result=compareSkill([blob('SKILL.md','one'),blob('README.md','old')],[blob('SKILL.md','one'),blob('README.md','new'),blob('.github/ci.yml','new')],{paths:[''],rootFiles:['SKILL.md','references/','scripts/','assets/']},{'SKILL.md':'one'});
 assert.equal(result.status,'current');assert.equal(result.personal,'same');
});
test('동일 baseline이라도 로컬 수정이 달라지면 snapshot 식별자가 달라진다',async()=>{
 const {snapshotHash}=await import('../scripts/lib.mjs');const source={repo:'sample/skills',baseline:'abc'};
 assert.notEqual(snapshotHash(source,{'SKILL.md':'one'}),snapshotHash(source,{'SKILL.md':'two'}));
 assert.equal(snapshotHash(source,{b:'2',a:'1'}),snapshotHash(source,{a:'1',b:'2'}));
});
test('상황별 프롬프트는 호출명을 포함하고 도구별 사용 순서를 유지한다',async()=>{
 const {tools}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url),'utf8'));
 for(const tool of tools){
  if(tool.kind!=='external')assert.ok(tool.usage.length>=3);
  for(const example of tool.promptExamples??[]){assert.ok(example.title);assert.ok(example.prompt.startsWith('$'+tool.callName+'로 '));}
 }
 const presentation=tools.find(t=>t.id==='universal-project-presentation');
 assert.ok(presentation.promptExamples.some(p=>p.prompt.includes('qna 모드')&&p.prompt.includes('본편과 백업 슬라이드는 새로 만들지 마')));
 for(const id of ['frontend','persona'])assert.ok(tools.find(t=>t.id===id).prompt.includes('원본 저장소 밖'));
});
