import type { Tool } from './types.ts';

export type SetupPlatform = 'macOS' | 'Windows';
export type SetupApp = 'Kiro' | 'Kiro Crew' | 'Codex' | 'Claude Code';

const scriptName: Record<SetupApp, string> = {
  Kiro: 'kiro',
  'Kiro Crew': 'kiro-crew',
  Codex: 'codex',
  'Claude Code': 'claude',
};

export function setupCommands(tool: Tool, platform: SetupPlatform, app: SetupApp): string {
  if (tool.kind === 'harness' && tool.id === 'code-quality' && platform === 'Windows') {
    return '# Code Quality는 macOS/Linux에서만 실행할 수 있습니다.\n# macOS 환경에서 위 운영체제를 바꾸거나 Linux에서 원본 사용법을 확인하세요.';
  }
  const selection = tool.kind === 'harness' && app !== 'Kiro Crew' ? ` --id ${tool.id}` : '';
  const repo = tool.kind === 'harness' ? 'agent-harnesses' : 'agent-skills';
  const script = `link-${scriptName[app]}`;
  const steps = tool.kind === 'harness'
    ? [`node scripts/harness.ts setup ${tool.id}`]
    : tool.kind === 'external'
      ? [platform === 'macOS' ? './scripts/install.sh' : 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\install.ps1']
      : [];
  if (platform === 'macOS') {
    steps.push(`./scripts/${script}.sh${selection}`);
    return [`cd "$HOME/agent/${repo}"`, ...steps].join('\n');
  }
  steps.push(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\${script}.ps1${selection}`);
  return [`Set-Location "$env:USERPROFILE\\agent\\${repo}"`, ...steps].join('\n');
}
