# agent-toolkit

내 하네스와 스킬을 찾고, 사용법을 확인하고, 추천 프롬프트를 복사하는 개인 웹사이트입니다.

- 하네스 2종, 커스텀 스킬 11종, 연결 대상 외부 스킬 31종
- 이름·용도·분야 검색, 유형 필터, 카드/목록 보기, 즐겨찾기
- 작업별 가이드, 상세 사용 순서, 맥락을 추가할 수 있는 프롬프트, 하네스·발표의 상황별 복사 프롬프트
- 외부 원본의 스킬 폴더 변경과 개인 수정 여부 구분
- 밝은/어두운 테마, 모바일 화면, 키보드 검색 단축키(⌘/Ctrl K)

## 시작하기

Node.js 24 LTS와 npm을 권장합니다.

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

동기화는 원본 파일을 수정하지 않고 스킬 메타데이터와 파일 해시만 수집합니다. 읽기 실패 시 기존 카탈로그를 유지합니다. 전체 외부 스킬 원문, 개인 실행 기록, 로그, 비밀값은 포함하지 않습니다. 도구별 한국어 소개와 프롬프트는 `content/entries.mjs`와 `content/guides.mjs`에서 관리합니다. 새로운 도구를 추가하면 이 파일과 `scripts/sources.mjs`의 원본 매핑을 먼저 등록합니다.

`npm run sync` 뒤에는 반드시 `npm run check:updates`를 실행해 새 로컬 스냅샷 기준으로 비교합니다. 원본 매핑이나 로컬 파일이 바뀌면 기존 비교 결과는 화면에서 무효화됩니다. 변경된 `src/data/`를 커밋·push하면 사이트에 반영됩니다. 브라우저는 Mac 파일을 직접 읽거나 로컬 명령을 실행하지 않습니다. 즐겨찾기와 테마는 해당 브라우저에만 저장됩니다.

## 업데이트 판정

- 기준: `external/SOURCES.md`에 기록된 원본 저장소 커밋. 이 기록이 최신 설치를 반영하지 않으면 먼저 출처를 확인해야 합니다.
- 비교: 적용 기준과 원본 HEAD의 해당 스킬 폴더 전체 파일. 다른 스킬 변경은 제외합니다.
- 개인 수정: 기준 원본과 마지막 동기화한 로컬 파일의 차이. 수정 내용의 안전성 판정이 아닙니다.
- `writing-plans`: 원본은 `obra/superpowers/skills/writing-plans`로 연결되어 있습니다. 별도 설치라 설치 당시 커밋 기록이 없어 `설치 버전 미확인`으로 표시하고 자동 비교를 건너뜁니다. 여러 플랫폼 사본을 확정할 수 없는 경우의 `원본 경로 미확인`과 구분합니다.
- 통신·권한·API 제한은 확인 실패로 표시하고 종료 코드 1을 반환합니다. 72시간 이상 지난 확인 결과는 오래된 상태로 표시합니다.
- 원본 삭제·이동은 변경으로 표시합니다. 여러 플랫폼 사본은 전체 파일이 일치하는 유일한 원본을 우선하고 확정할 수 없으면 미확인으로 둡니다. 루트 스킬은 실제 설치 대상 파일만 비교합니다.
- 외부 스킬 다운로드·교체는 자동 실행하지 않습니다. 설치 스크립트로 갱신한 후 로컬 동기화를 다시 수행하세요. 기존 스킬 설치 스크립트는 writing-plans를 갱신하지 않습니다.

## GitHub Actions와 Vercel

`검증` workflow는 push/PR마다 테스트와 빌드를 수행합니다. `외부 스킬 업데이트 확인`은 매일 09:23 KST(UTC 00:23)에 원본을 확인하며 Actions에서 수동 실행할 수도 있습니다. 예약 실행은 GitHub 사정에 따라 지연될 수 있습니다. 해당 workflow는 조회 결과만 기본 브랜치에 저장합니다.

Vercel 프로젝트 이름은 `agent-toolkit`입니다. GitHub 저장소를 연결하고 Vite 프리셋, `npm run build`, `dist`를 사용합니다. 정적 배포이므로 빌드 시 로컬 원본 폴더나 GitHub 토큰이 필요하지 않습니다.

자동 상태 갱신 후 확실한 재배포를 위해 Vercel의 Git 설정에서 기본 브랜치용 Deploy Hook을 만들고 GitHub Actions secret `VERCEL_DEPLOY_HOOK`에 저장할 수 있습니다. Hook 미설정 시 Git 연동의 배포 결과를 확인해야 합니다. GitHub 토큰은 Actions의 기본 `GITHUB_TOKEN`만 사용합니다. 토큰을 `VITE_*` 변수나 클라이언트 코드에 저장하지 마세요.

개인 사이트는 Vercel Deployment Protection에서 프로덕션을 포함한 All Deployments를 보호해야 합니다. private GitHub 저장소와 noindex 메타 태그는 웹사이트 접근 제한을 대신하지 않습니다.

## 구조

```text
content/entries.mjs         한국어 소개·추천 프롬프트·작업별 가이드
content/guides.mjs          도구별 사용 순서·상황별 프롬프트
scripts/sources.mjs         외부 출처와 경로 매핑
scripts/sync-local.mjs      로컬 스냅샷 생성
scripts/check-updates.mjs   GitHub 원본 비교
scripts/lib.mjs             파일 해시·경로 선택·차이 계산
src/data/                  배포되는 카탈로그와 업데이트 상태
src/App.tsx                검색·목록·상세·즐겨찾기 화면
src/styles.css             반응형·테마·접근성 스타일
.github/workflows/         검증·정기 원본 확인
```

외부 도구의 이름과 출처는 각 원본 저장소에 귀속됩니다. 이 사이트의 사용 가이드는 개인 환경을 위한 별도 설명이며 원본 스킬과 런타임 자체를 재배포하지 않습니다.

## 원본 개선사항 대조

2026-10-06 점검에서 하네스 2종·커스텀 11종·외부 연결 대상 31종의 전체 파일 해시가 기존 카탈로그와 일치했습니다. 외부 런타임의 플랫폼별 중복 사본은 별도 도구로 세지 않습니다. 원본 커밋은 agent-skills `f0a5b418fd2b7484f65547b0c65da48b1558820f`, agent-harnesses `09d4a9e5b2b941dce146dc18a5c16a0448c4a75b`입니다.

누락되었던 웹 안내를 보강했습니다: 발표의 Q&A·템플릿 판단, 분석 근거·스냅샷 검증, PR 실행 증거, frontend 대기·재개·재평가, persona 실행·재채점·비교 절차. 원본 저장소 수정 금지 조건에 맞춰 웹의 하네스 추천 프롬프트는 설정·결과를 원본 저장소 밖에 저장하도록 안내합니다. 원본 스킬이나 하네스 자체를 실행·설치·수정하지 않습니다.
