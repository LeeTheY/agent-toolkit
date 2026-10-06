# agent-toolkit

내 하네스와 스킬을 찾고, 사용법을 확인하고, 추천 프롬프트를 복사하는 개인 웹사이트입니다.

- 하네스 6종, 커스텀 스킬 12종, 연결 대상 외부 스킬 31종
- 이름·용도·분야 검색, 유형 필터, 카드/목록 보기, 즐겨찾기
- 작업별 가이드, 상세 사용 순서, 맥락을 추가할 수 있는 프롬프트, 하네스·발표의 상황별 복사 프롬프트
- 외부 원본의 스킬 폴더 변경과 개인 수정 여부 구분
- 밝은/어두운 테마, 모바일 화면, 키보드 검색 단축키(⌘/Ctrl K)

## 시작하기

Node.js 24 LTS와 npm을 권장합니다. 최소 지원 버전은 Node.js 22.18.0입니다.

프론트엔드(`src/`)뿐 아니라 콘텐츠(`content/`), 동기화·업데이트 스크립트(`scripts/`), 테스트(`tests/`)도 TypeScript로 관리합니다. `npm run typecheck`는 브라우저와 Node 코드를 각각 strict 모드로 검사하며, 빌드 시에도 동일 검사를 실행합니다. Node 스크립트는 내장 타입 제거 기능으로 `.ts`를 직접 실행하므로 별도 런타임 패키지가 필요 없습니다.

```bash
npm ci
npm run dev
```

```bash
npm test
npm run build
npm run preview
```

## 로컬 원본 동기화

기본 원본 경로는 `$HOME/agent/agent-skills`, `$HOME/agent/agent-harnesses`입니다.

```bash
npm run sync
npm run check:updates
npm test
npm run build
```

다른 경로라면 다음 환경변수를 지정합니다.

```bash
AGENT_SKILLS_HOME="$HOME/agent/agent-skills" \
AGENT_HARNESSES_HOME="$HOME/agent/agent-harnesses" \
npm run sync
```

동기화는 원본 파일을 수정하지 않고 스킬 메타데이터와 파일 해시만 수집합니다. 하네스는 호출 스킬과 Git 추적 엔진 파일을 함께 확인합니다. 읽기 실패 시 기존 카탈로그를 유지합니다. 전체 외부 스킬 원문, 개인 실행 기록, 로그, 비밀값은 포함하지 않습니다. 도구별 한국어 소개와 프롬프트는 `content/entries.ts`와 `content/guides.ts`에서 관리합니다. 새로운 도구를 추가하면 이 파일과 `scripts/sources.ts`의 원본 매핑을 먼저 등록합니다.

`npm run sync` 뒤에는 반드시 `npm run check:updates`를 실행해 새 로컬 스냅샷 기준으로 비교합니다. 원본 매핑이나 로컬 파일이 바뀌면 기존 비교 결과는 화면에서 무효화됩니다. 변경된 `src/data/`를 커밋·push하면 사이트에 반영됩니다. 브라우저는 Mac 파일을 직접 읽거나 로컬 명령을 실행하지 않습니다. 즐겨찾기와 테마는 해당 브라우저에만 저장됩니다.

## Windows에서 두 저장소 연결

Windows용 `link-codex.ps1`이 두 원본 저장소에 있습니다. Node.js 24 이상을 준비하고 실제 두 폴더를 사용자 폴더의 `agent` 아래에 복사한 뒤 PowerShell에서 실행합니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\agent\agent-skills\scripts\link-codex.ps1" --dry-run
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\agent\agent-harnesses\scripts\link-codex.ps1" --dry-run

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\agent\agent-skills\scripts\link-codex.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\agent\agent-harnesses\scripts\link-codex.ps1"
```

Mac의 `.sh` 명령은 유지합니다. Windows 명령은 Mac과 같은 스킬 43개·하네스 6개를 `.codex/skills`에 연결하며, 로컬 디렉터리 junction으로 관리자 권한 없이 연결합니다. 기존 폴더·다른 링크·끊어진 링크는 덮어쓰지 않습니다. 각 도구의 사용 순서에도 Windows 연결 명령을 제공합니다. 연결 과정에서 Node 실행 파일이 필요한 것과 개별 도구의 실행 의존성 설치는 별개입니다.

`agent-skills/external`은 Git 제외 폴더이므로 함께 복사해야 합니다. 한국어 Humanizer는 로컬 원본의 메타데이터 이름을 `korean-humanizer`로 구분해 49개 고유 이름을 확인했습니다. `install.sh`는 재설치·업데이트 후 한국어 Humanizer의 내부 이름을 `korean-humanizer`로 자동 보정하므로 영문 `humanizer`와의 충돌을 방지합니다. 스킬 링크·이름 보정의 macOS 회귀 검사 11개가 통과했으며 실제 Windows의 PowerShell 실행·junction 생성·하네스 전체 동작은 미검증입니다.

## 업데이트 판정

- 기준: `external/SOURCES.md`에 기록된 원본 저장소 커밋. 이 기록이 최신 설치를 반영하지 않으면 먼저 출처를 확인해야 합니다.
- 비교: 적용 기준과 원본 HEAD의 해당 스킬 폴더 전체 파일. 다른 스킬 변경은 제외합니다.
- 개인 수정: 기준 원본과 마지막 동기화한 로컬 파일의 차이. 수정 내용의 안전성 판정이 아닙니다.
- `writing-plans`: `obra/superpowers/skills/writing-plans`를 실제 설치하고 `brainstorming`과 같은 적용 커밋으로 비교합니다. Token Optimizer 5종은 설치 스크립트와 동일한 `plugins/token-optimizer/skills/` 경로로 고정합니다.
- 통신·권한·API 제한은 확인 실패로 표시하고 종료 코드 1을 반환합니다. 72시간 이상 지난 확인 결과는 오래된 상태로 표시합니다.
- 원본 삭제·이동은 변경으로 표시합니다. 여러 플랫폼 사본은 전체 파일이 일치하는 유일한 원본을 우선하고 확정할 수 없으면 미확인으로 둡니다. 루트 스킬은 실제 설치 대상 파일만 비교합니다.
- 외부 스킬 다운로드·교체는 자동 실행하지 않습니다. 설치 스크립트로 갱신한 후 로컬 동기화를 다시 수행하세요.

## GitHub Actions와 Vercel

`검증` workflow는 push/PR마다 테스트와 빌드를 수행합니다. `외부 스킬 업데이트 확인`은 매일 09:23 KST(UTC 00:23)에 원본을 확인하며 Actions에서 수동 실행할 수도 있습니다. 예약 실행은 GitHub 사정에 따라 지연될 수 있습니다. 해당 workflow는 조회 결과만 기본 브랜치에 저장합니다.

Vercel 프로젝트 이름은 `agent-toolkit`입니다. GitHub 저장소를 연결하고 Vite 프리셋, `npm run build`, `dist`를 사용합니다. 정적 배포이므로 빌드 시 로컬 원본 폴더나 GitHub 토큰이 필요하지 않습니다.

자동 상태 갱신 후 확실한 재배포를 위해 Vercel의 Git 설정에서 기본 브랜치용 Deploy Hook을 만들고 GitHub Actions secret `VERCEL_DEPLOY_HOOK`에 저장할 수 있습니다. Hook 미설정 시 Git 연동의 배포 결과를 확인해야 합니다. GitHub 토큰은 Actions의 기본 `GITHUB_TOKEN`만 사용합니다. 토큰을 `VITE_*` 변수나 클라이언트 코드에 저장하지 마세요.

개인 사이트는 Vercel Deployment Protection에서 프로덕션을 포함한 All Deployments를 보호해야 합니다. private GitHub 저장소와 noindex 메타 태그는 웹사이트 접근 제한을 대신하지 않습니다.

## 구조

```text
content/entries.ts         한국어 소개·추천 프롬프트·작업별 가이드
content/guides.ts          도구별 사용 순서·상황별 프롬프트
scripts/sources.ts         외부 출처와 경로 매핑
scripts/sync-local.ts      로컬 스냅샷 생성
scripts/check-updates.ts   GitHub 원본 비교
scripts/lib.ts             파일 해시·경로 선택·차이 계산
src/data/                  배포되는 카탈로그와 업데이트 상태
src/App.tsx                검색·목록·상세·즐겨찾기 화면
src/styles.css             반응형·테마·접근성 스타일
.github/workflows/         검증·정기 원본 확인
```

외부 도구의 이름과 출처는 각 원본 저장소에 귀속됩니다. 이 사이트의 사용 가이드는 개인 환경을 위한 별도 설명이며 원본 스킬과 런타임 자체를 재배포하지 않습니다.

## 원본 개선사항 대조

2026-10-06 두 원본 폴더의 현재 내용을 대조해 총 49개 도구(하네스 6종·커스텀 12종·외부 31종)를 반영했습니다.

- 신규 스킬: `scrum-weekly-report`. 실제 기간·업무 내용·진행 상태를 보존하는 개인 스크럼 보고서이며, 기본 출력은 A4 한 페이지 PDF와 편집 가능한 HTML입니다.
- 신규 하네스: `engineering`(허용 파일 실행·독립 acceptance), `audit-research`(정확한 문자열 주장·인용·추출·근거 갱신), `operations`(loopback 시험 서비스의 승인된 조건부 쓰기·영수증 확인), `lab`(fake/replay/live 계약 검사·회귀 비교). 각 사용 순서·예산·대기/실패·미확정 상태와 상황별 프롬프트를 추가했습니다.
- 기존 하네스: Frontend의 명시적 복원 계획·저장 교환 fixture 내보내기/재생, Persona의 `--concurrency 1..4`·독립 HTTP 세션 조건·fixture 출처와 재생 한계를 안내에 반영했습니다. 실제 개선·복원 적용은 별도 요청 범위에서만 사용합니다.

원본 기준은 agent-skills `966afb6364e24b1c5cb75c5b7e1b7a4093423df9`, agent-harnesses `daa0e9c`입니다. 독립 하네스 4종은 원격 main에 병합되었으며, 현재 작업 트리의 Windows 링크 지원과 한국어 Humanizer 이름 보정도 안내에 반영했습니다. 경로별 커밋 이력이 없는 신규 staged 하네스는 baseline을 null로 두고 실제 파일 해시로 스냅샷을 식별합니다. 이번 카탈로그의 신규 하네스에는 실제 적용 커밋이 기록되어 있습니다.

외부 스킬은 현재 로컬 설치본과 `external/SOURCES.md`의 9개 upstream 적용 커밋을 기준으로 수집했습니다. 외부 스킬 다운로드·재설치는 수행하지 않았습니다. `pendingSources`의 16개는 이미 등록된 Token Optimizer 계열의 런타임·플랫폼 사본이므로 별도 도구로 중복 등록하지 않았습니다. 삭제·이름 변경으로 인한 기존 등록 도구 누락은 없습니다.

검증은 `npm run sync`, `npm run check:updates`, `npm test`(21/21 통과), `npm run build`(타입 검사 포함)로 수행합니다. 최신 외부 조회 상태는 `src/data/updates.json`에 기록합니다. 미커밋 신규 하네스의 파일 수집·해시 변화·커밋 미추정과 Git 추적 구현 누락 거부를 회귀 검사합니다. 신규 5개와 기존 2개 상세 화면을 320/390/1440px에서 확인하고, 긴 용어로 생긴 모바일 가로 넘침을 보정했습니다. 신규 스킬 검색도 확인했습니다. 실제 API 품질·SaaS 운영 검증은 이번 웹 안내 반영 범위에 포함하지 않습니다.

## 요청할 때 원본 반영하기

두 원본 저장소를 참조해 필요할 때 로컬에서 카탈로그와 안내 문구를 갱신하고, `agent-toolkit`에 일반 PR을 올립니다. 사용자가 main에 병합하면 Vercel이 배포합니다. 별도 PAT나 원본 동기화용 GitHub Actions 설정은 필요하지 않습니다.

다음처럼 요청하면 됩니다.

> 원본 두 저장소의 최신 main 변경사항을 agent-toolkit에 반영하고 일반 PR 올려줘. 원본은 읽기만 하고 소개·사용법·추천 프롬프트도 점검해줘.

[동기화 절차와 복사 가능한 명령](docs/source-sync.md), [프로젝트 작업 지침](AGENTS.md)을 참고하세요. 기존 외부 스킬 업데이트 상태 확인은 유지하며, 설치된 스킬 자체를 자동으로 갱신하지 않습니다.
