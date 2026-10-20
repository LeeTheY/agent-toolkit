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
  const repo = tool.kind === 'harness' ? 'agent-harnesses' : 'agent-skills';
  const script = `link-${scriptName[app]}`;
  const steps = tool.kind === 'harness'
    ? [`node scripts/harness.ts setup ${tool.id}`]
    : tool.kind === 'external'
      ? [platform === 'macOS' ? './scripts/install.sh' : 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\install.ps1']
      : [];
  if (platform === 'macOS') {
    steps.push(`./scripts/${script}.sh${tool.kind === 'harness' ? ` --id ${tool.id}` : ''}`);
    return [`cd "$HOME/agent/${repo}"`, ...steps].join('\n');
  }
  steps.push(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\${script}.ps1${tool.kind === 'harness' ? ` --id ${tool.id}` : ''}`);
  return [`Set-Location "$env:USERPROFILE\\agent\\${repo}"`, ...steps].join('\n');
}
