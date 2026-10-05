import type { FileHashes, FileChange, GitTreeEntry, SourceSelection, SkillComparison } from '../src/types.ts';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
export const blobHash = (bytes: Uint8Array) => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
export async function localFiles(root: string, relative=''): Promise<FileHashes> {
 const files: FileHashes={};
 for(const entry of await readdir(join(root,relative),{withFileTypes:true})) {
  if(['.git','node_modules','.DS_Store','__pycache__'].includes(entry.name))continue;
  const path=relative?`${relative}/${entry.name}`:entry.name;
  if(entry.isDirectory()) Object.assign(files,await localFiles(root,path));
  else if(entry.isFile()) files[path]=blobHash(await readFile(join(root,path)));
 }
 return files;
}
export function treeFiles(tree: GitTreeEntry[],path: string): FileHashes {
 const prefix=path?`${path}/`:'';
 return Object.fromEntries(tree.filter(x=>x.type==='blob'&&x.path.startsWith(prefix)).map(x=>[x.path.slice(prefix.length),x.sha]));
}
export function changes(before: FileHashes,after: FileHashes): FileChange[] {
 return [...new Set([...Object.keys(before),...Object.keys(after)])].sort().filter(p=>before[p]!==after[p]).map(path=>({path,type:!before[path]?'added':!after[path]?'removed':'modified'}));
}
export function snapshotHash(source: unknown,files: FileHashes){return createHash('sha256').update(JSON.stringify({source,files:Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)))})).digest('hex');}
export function trackedFiles(tree: GitTreeEntry[],path: string,source: Pick<SourceSelection, 'rootFiles'>={}){
 const files=treeFiles(tree,path);
 const rules=source.rootFiles;
 if(path!==''||!rules)return files;
 return Object.fromEntries(Object.entries(files).filter(([name])=>rules.some(rule=>rule.endsWith('/')?name.startsWith(rule):name===rule)));
}
export function choosePath(tree: GitTreeEntry[],paths: string[],local: FileHashes,source: Pick<SourceSelection, 'rootFiles'>={}) {
 const viable=paths.filter(p=>trackedFiles(tree,p,source)['SKILL.md']);
 const exact=viable.filter(p=>changes(trackedFiles(tree,p,source),local).length===0);
 if(exact.length===1)return exact[0];
 if(exact.length>1)return null;
 return viable.length===1?viable[0]:null;
}

export function compareSkill(baseTree: GitTreeEntry[],latestTree: GitTreeEntry[],source: SourceSelection,local: FileHashes): SkillComparison {
 const path=choosePath(baseTree,source.paths,local,source);
 if(path===null)return {status:'unknown',reason:'적용 원본 경로를 확정할 수 없습니다. 출처 매핑을 확인하세요.',personal:'unknown',changes:[]};
 const base=trackedFiles(baseTree,path,source),latest=trackedFiles(latestTree,path,source);
 const delta=changes(base,latest);
 return {path,status:delta.length?'changed':'current',personal:changes(base,local).length?'modified':'same',changes:delta,reason:latest['SKILL.md']?'스킬 폴더 전체 파일 기준으로 비교했습니다.':'원본 경로가 삭제되거나 이동했습니다. 출처를 확인하세요.'};
}
