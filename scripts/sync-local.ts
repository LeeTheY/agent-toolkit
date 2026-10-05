import type { Catalog } from '../src/types.ts';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { entries, workflows } from '../content/entries.ts';
import { buildCatalog } from './catalog-sync.ts';
if(process.argv.length>2)throw Error('지원하지 않는 옵션입니다. 로컬 원본 폴더를 준비하고 npm run sync를 실행하세요.');
const root=resolve(import.meta.dirname,'..');
const file=join(root,'src/data/catalog.json');
const previous: Catalog | null=await readFile(file,'utf8').then(JSON.parse).catch(()=>null);
const result=await buildCatalog({skills:process.env.AGENT_SKILLS_HOME||join(homedir(),'agent/agent-skills'),harnesses:process.env.AGENT_HARNESSES_HOME||join(homedir(),'agent/agent-harnesses'),entries,workflows,previous});
if(!result.unchanged){await mkdir(join(root,'src/data'),{recursive:true});await writeFile(file+'.tmp',JSON.stringify(result.catalog,null,2)+'\n');await rename(file+'.tmp',file);}
if(process.env.SYNC_REPORT){
 const lines=['# 원본 동기화 검토','', '원본 파일·버전 정보를 반영했습니다. 소개·사용법·추천 프롬프트는 자동으로 변경하지 않았습니다.','', '## 변경된 도구','',...result.changed.map(id=>`- ${id}: 소개·사용법·추천 프롬프트 검토 필요`),'','## 새 도구 등록 대기','',...(result.pending.length?result.pending.map(p=>`- ${p}`):['- 없음']),'','소개·사용법·추천 프롬프트를 검토한 뒤 npm run check:updates, npm test, npm run build를 실행하고 일반 PR을 작성합니다.'];
 await writeFile(process.env.SYNC_REPORT,lines.join('\n')+'\n');
}
console.log(result.unchanged?'카탈로그 변경 없음':`카탈로그 갱신: ${result.changed.length}종 변경, ${result.pending.length}종 등록 대기. 원본은 수정하지 않았습니다.`);
