import test from 'node:test';
import assert from 'node:assert/strict';
import type { Tool } from '../src/types.ts';
import { setupCommands } from '../src/setup-commands.ts';
const tool=(kind: Tool['kind'],id: string)=>({kind,id} as Tool);
test('하네스는 해당 ID만 준비하고 선택한 앱에 연결한다',()=>{
 assert.equal(setupCommands(tool('harness','frontend'),'macOS','Kiro Crew'),
  'cd "$HOME/agent/agent-harnesses"\nnode scripts/harness.ts setup frontend\n./scripts/link-kiro-crew.sh --id frontend');
 assert.equal(setupCommands(tool('harness','persona'),'Windows','Claude Code'),
  'Set-Location "$env:USERPROFILE\\agent\\agent-harnesses"\nnode scripts/harness.ts setup persona\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\link-claude.ps1 --id persona');
});
test('외부 스킬만 설치 단계를 포함하고 네 앱의 스크립트를 고른다',()=>{
 assert.match(setupCommands(tool('external','pdf'),'macOS','Kiro'),/install\.sh\n\.\/scripts\/link-kiro\.sh$/);
 assert.match(setupCommands(tool('external','pdf'),'Windows','Codex'),/install\.ps1\npowershell.exe .*link-codex\.ps1$/);
 assert.doesNotMatch(setupCommands(tool('custom','sedaily-git-pr'),'macOS','Codex'),/install\.sh/);
});
