# 요청 기반 원본 동기화

## 기준과 원본 보호

원본의 변경사항을 main에 병합한 뒤 프로젝트 갱신을 요청합니다. 원본 두 폴더의 파일·브랜치·설치 상태를 변경하지 않고 읽습니다. 자동 원본 동기화 workflow, 별도 PAT, SOURCE_REPOS_TOKEN 설정은 사용하지 않습니다.

| 원본 | 기본 로컬 경로 | GitHub |
| --- | --- | --- |
| 스킬 | `$HOME/agent/agent-skills` | `LeeTheY/agent-skills` |
| 하네스 | `$HOME/agent/agent-harnesses` | `LeeTheY/agent-harnesses` |

원본의 branch, HEAD, 작업 트리와 원격 main을 먼저 확인합니다. 로컬이 최신 main과 다르거나 수정 중이면 checkout/reset/pull하지 말고 임시 폴더에 main을 clone합니다. 외부 스킬은 원본 Git에서 제외되므로 로컬 `external/`과 `external/SOURCES.md`를 읽습니다. 임시 skills checkout을 쓸 때만 기존 external 폴더를 그 임시 checkout으로 복사합니다. 현재 설치 상태와 원격 main을 섞어 사용했다는 사실을 PR에 기록합니다. 외부 파일이 준비되지 않았으면 설치하거나 최신 버전으로 추정하지 말고 누락을 보고합니다.

사용자가 원격 main이 아니라 두 폴더의 현재 개발 내용을 반영하도록 요청한 경우에는 해당 로컬 작업 트리를 읽고 기준 branch·HEAD·staged/unstaged 여부를 기록합니다. 미커밋 기능을 원격 main에 반영된 것으로 설명하지 않습니다. 신규 하네스는 Git 추적(신규 staged 포함) 구현 파일이 있어야 등록할 수 있으며, 경로별 커밋 이력이 없으면 baseline은 null로 보존합니다. 파일 해시가 현재 내용을 식별하며 원본을 커밋해 이력을 만들지 않습니다.

외부 스킬 설치 기록 exporter나 별도 원본 PR 병합은 이 방식의 전제 조건이 아닙니다. 원본 스킬의 설치·업데이트는 별도로 요청받을 때만 수행합니다.

## 실행

기본 로컬 원본이 의도한 기준임을 확인한 뒤:

```bash
cd /Users/ldy/Desktop/Code/React/agent-toolkit
SYNC_REPORT=/private/tmp/agent-toolkit-sync-report.md npm run sync
npm run check:updates
npm test
npm run build
```

다른 checkout을 사용한다면 실제 경로를 `AGENT_SKILLS_HOME`, `AGENT_HARNESSES_HOME` 환경 변수로 지정합니다. `npm run sync`는 원본을 읽어 `src/data/catalog.json`만 갱신합니다. SYNC_REPORT를 지정하면 변경 도구와 등록 대기 목록도 작성합니다. 같은 입력은 시각을 포함한 불필요한 변경을 만들지 않습니다. 읽기 실패 시 기존 카탈로그를 보존합니다.

## PR 작성 전 편집

- 하네스는 호출 스킬과 `harnesses/<id>`의 Git 추적 구현 파일을 함께 비교합니다. 커스텀·외부 스킬은 폴더의 파일 해시를 비교합니다.
- `content/entries.ts`, `content/guides.ts`의 소개·사용법·추천 프롬프트를 실제 원본과 대조해 수정합니다. 스크립트는 이 문구를 자동 작성하지 않습니다. 편집 후 sync와 검증을 다시 실행합니다.
- 연결 스크립트나 운영체제 지원이 바뀌면 두 원본의 README와 toolkit README·도구별 사용 순서도 대조합니다. `.ps1` 연결 지원을 하네스 설치·실행 전체의 Windows 검증으로 설명하지 않습니다.
- 신규 스킬은 `pendingSources`와 보고서에 나타납니다. 외부 런타임에 포함된 중복 스킬도 후보에 포함될 수 있으므로 실제 독립 도구인지 확인합니다. 새 외부 도구는 `scripts/sources.ts` 매핑도 추가합니다.
- 기존 도구 누락은 오류로 멈춥니다. 삭제·이름 변경은 편집용 항목과 매핑을 함께 수정합니다.
- `npm run check:updates`는 GitHub의 공개 upstream을 비교합니다. 조회 실패 시 최신 상태라고 표시하지 말고 실패와 검증 한계를 PR에 기록합니다.
- 변경이 있을 때만 프로젝트의 새 브랜치에서 관련 파일을 커밋·push하고 일반 PR을 작성합니다. PR에는 원본별 기준 커밋, 외부 설치 기준, 변경 도구, 편집 내용, 검증 결과를 기록합니다. 자동 병합하지 않습니다.

사용자가 main에 병합하면 기존 Vercel Git 연동으로 배포됩니다. 기존 `외부 스킬 업데이트 확인` workflow는 매일 09:23 KST에 `updates.json`의 상태를 갱신하는 기능으로 유지합니다. 원본 파일이나 카탈로그 설명을 자동 반영하지 않습니다.

## 요청 예시

> 원본 두 저장소의 최신 main 변경사항을 agent-toolkit에 반영하고 일반 PR 올려줘. 원본 폴더는 읽기만 하고, 외부 스킬은 현재 로컬 설치 상태를 기준으로 확인해줘. 변경된 도구의 소개·사용법·추천 프롬프트도 점검하고 테스트와 빌드 결과를 PR에 남겨줘.
