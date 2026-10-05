export type ToolKind = 'harness'|'custom'|'external';
export interface Tool {id:string;title:string;kind:ToolKind;category:string;summary:string;when:string;prompt:string;promptExamples?:{title:string;prompt:string}[];note:string;callName:string;commands:string[];usage:string[];syncedAt:string;snapshotHash:string;source:{repo:string;local:string;baseline:string|null;paths?:string[]};files:Record<string,string>}
export interface Update {snapshotHash:string;status:'current'|'changed'|'unknown'|'error';reason:string;personal:'same'|'modified'|'unknown';checkedAt:string;latest?:string;latestAt?:string;baseline:string|null;path?:string;changes:{path:string;type:string}[];lastSuccessAt?:string}
export interface Workflow {id:string;title:string;description:string;steps:string[]}
