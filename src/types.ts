export type ToolKind = 'harness'|'custom'|'external';
export interface Tool {id:string;title:string;kind:ToolKind;category:string;summary:string;when:string;prompt:string;promptExamples?:{title:string;prompt:string}[];note:string;callName:string;commands:string[];usage:string[];syncedAt:string;snapshotHash:string;source:ToolSource;files:Record<string,string>}
export interface Update {snapshotHash:string;status:'current'|'changed'|'unknown'|'error';reason:string;personal:'same'|'modified'|'unknown';checkedAt:string;latest?:string;latestAt?:string;baseline:string|null;path?:string;changes:FileChange[];lastSuccessAt?:string;changedSinceLastCheck?:boolean}
export interface Workflow {id:string;title:string;description:string;steps:string[]}

export type FileHashes = Record<string, string>;
export interface ToolSource {
 repo: string;
 local: string;
 baseline: string | null;
 paths?: string[];
 rootFiles?: string[];
}
export interface ExternalSource extends Omit<ToolSource, 'baseline'> { paths: string[] }
export interface SourceSelection { paths: string[]; rootFiles?: string[] }
export interface GitTreeEntry { path: string; sha: string; type: string }
export interface FileChange { path: string; type: 'added' | 'removed' | 'modified' }
export type SkillComparison = Pick<Update, 'status' | 'personal' | 'reason' | 'changes' | 'path'>;
export type EditorialEntry = Pick<Tool, 'id' | 'title' | 'kind' | 'category' | 'summary' | 'when' | 'prompt' | 'note'> & Partial<Pick<Tool, 'usage' | 'promptExamples'>>;
export type Guide = Partial<Omit<EditorialEntry, 'id' | 'kind'>>;
export interface Catalog { syncedAt: string; tools: Tool[]; workflows: Workflow[]; pendingSources?: string[] }
export interface UpdateCatalog { checkedAt?: string; tools: Record<string, Update> }
