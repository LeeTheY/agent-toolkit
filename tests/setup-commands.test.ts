import test from 'node:test';
import assert from 'node:assert/strict';
import type { Tool } from '../src/types.ts';
import { setupCommands } from '../src/setup-commands.ts';
const tool=(kind: Tool['kind'],id: string)=>({kind,id} as Tool);
test('하네스는 해당 ID만 준비하고 선택한 앱에 연결한다',()=>{
 assert.equal(setupCommands(tool('harness','frontend'),'macOS','Kiro Crew'),
  'cd "$HOME/agent/agent-harnesses"\nnode scripts/harness.ts setup frontend\n./scripts/link-kiro-crew.sh');
 assert.equal(setupCommands(tool('harness','persona'),'Windows','Claude Code'),
  'Set-Location "$env:USERPROFILE\\agent\\agent-harnesses"\nnode scripts/harness.ts setup persona\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\link-claude.ps1 --id persona');
});
test('외부 스킬만 설치 단계를 포함하고 네 앱의 스크립트를 고른다',()=>{
 assert.match(setupCommands(tool('external','pdf'),'macOS','Kiro'),/install\.sh\n\.\/scripts\/link-kiro\.sh$/);
 assert.match(setupCommands(tool('external','pdf'),'Windows','Codex'),/install\.ps1\npowershell.exe .*link-codex\.ps1$/);
 assert.doesNotMatch(setupCommands(tool('custom','sedaily-git-pr'),'macOS','Codex'),/install\.sh/);
});

test('Code Quality는 macOS에서 선택 설치하고 Windows에는 실행 명령을 제공하지 않는다',()=>{
 const quality=tool('harness','code-quality');
 assert.match(setupCommands(quality,'macOS','Codex'),/setup code-quality\n\.\/scripts\/link-codex\.sh --id code-quality$/);
 for(const app of ['Kiro','Kiro Crew','Codex','Claude Code'] as const){
  const command=setupCommands(quality,'Windows',app);
  assert.match(command,/macOS\/Linux/);
  assert.doesNotMatch(command,/node scripts|powershell\.exe|Set-Location/);
 }
});
test('Crew는 모든 하네스 연결 경로를 등록하며 지원하지 않는 ID 옵션을 넣지 않는다',()=>{
 for(const platform of ['macOS','Windows'] as const){
  const command=setupCommands(tool('harness','persona'),platform,'Kiro Crew');
  assert.match(command,/setup persona/);
  assert.match(command,/link-kiro-crew\.(sh|ps1)/);
  assert.doesNotMatch(command,/--id/);
 }
});
