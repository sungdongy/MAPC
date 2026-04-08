# MAPC - Product Development Log

## Project Overview

**MAPC** (Multi-Agent Personal Canvas) = 누구나 손쉽게 멀티 에이전트 서비스 및 팀을 만들고 활용할 수 있는 플랫폼

- 채팅 기반 UI + 2D 가상 오피스 뷰를 겸비한 멀티 에이전트 플랫폼
- 비개발자도 쉽게 에이전트를 생성(Hire)하고 팀을 구성할 수 있는 것이 목표
- 에이전트별 독립된 대화 세션 및 팀 단위 협업 채팅 지원
- 참고 서비스: [NanoClaw](https://github.com/qwibitai/nanoclaw) (개발자 중심 경량 AI 에이전트 프레임워크)
- GitHub: [sungdongy/MAPC](https://github.com/sungdongy/MAPC)

---

## Tech Stack

| 구분 | 기술 |
|------|------|
| Frontend | Next.js 16 (TypeScript) + Tailwind CSS |
| Runtime | Node.js 20 (fnm) |
| AI (개발) | Claude Code CLI (Max Plan, 추가 비용 없음) |
| AI (프로덕션) | Anthropic SDK (`@anthropic-ai/sdk`, claude-sonnet-4-20250514) |
| 2D 그래픽 | HTML5 Canvas (requestAnimationFrame) |
| 인프라 | Docker 컨테이너 내 개발, 포트 8053 → 호스트 32776 |

---

## Development Timeline

### Phase 1: 채팅 웹 앱 기본 구조 (2026-04-07)

**목표:** 간단한 채팅 형식의 웹 애플리케이션 구현

**구현 내용:**
1. 채팅 UI (메시지 입력/전송, 시간 표시)
2. 에이전트 목록 사이드바
3. 에이전트 추가/삭제 기능
4. 사이드바 토글 (☰ 버튼)
5. 다크모드 지원 (시스템 설정 자동 감지)
6. 환영 메시지 화면

---

### Phase 2: Claude 연동 (2026-04-07)

**목표:** 에이전트가 실제 Claude를 통해 응답하도록 연동

**구현 내용:**
1. **Claude Code CLI 연동** (`/api/chat` API Route)
   - 서버에서 `claude -p --output-format text` CLI 호출
   - 에이전트별 이름/역할 기반 시스템 프롬프트 자동 생성
   - 응답 대기 중 로딩 애니메이션 (bounce dots)
   - 로딩 중 입력 비활성화

2. **이중 모드 지원 (개발/프로덕션)**
   - **CLI 모드 (개발용):** API Key 없이 서버의 Claude Code CLI 사용 (Max Plan 활용)
   - **API Key 모드 (프로덕션용):** Anthropic API Key 입력 → `@anthropic-ai/sdk`로 직접 호출
   - 사이드바 하단에 연결 상태 표시 (초록: API Key, 노랑: CLI 모드)
   - 설정 모달에서 API Key 입력/변경 가능

---

### Phase 3: 게임형 2D 오피스 UI 시도 및 디버깅 (2026-04-07)

**목표:** 개더타운 스타일의 2D 가상 오피스 구현

**경과:**
1. Canvas 기반 2D 오피스 구현 시도
2. 오피스 화면이 렌더링되지 않는 문제 발생
3. 다양한 디버깅 시도 (useCallback 구조 변경, callback ref 패턴 등)
4. **근본 원인 발견: Next.js cross-origin 차단**
   - 브라우저에서 `10.1.210.173:32776`으로 접속하지만, Next.js dev 서버는 `localhost:8053`에서 실행
   - Cross-origin 차단으로 **클라이언트 JavaScript 번들이 로드되지 않음**
   - 결과: React hydration 실패 → 모든 인터랙션 불가 (Canvas, 버튼 클릭 등)
5. **해결: `next.config.ts`에 `allowedDevOrigins: ["10.1.210.173"]` 추가**

**교훈:** Canvas 코드 자체에는 문제가 없었음. 인프라/환경 설정 문제를 먼저 확인할 것.

---

### Phase 4: 서비스 리네이밍 및 채팅 UI 안정화 (2026-04-07)

**변경 내용:**
1. **서비스명 변경:** ACAW → **MAPC** (Multi-Agent Personal Canvas)
2. **SVG 로고 제작:** 파란-보라 그라데이션 "M" 아이콘 + "MAPC" 텍스트
3. **채팅 UI 개선:**
   - 에이전트별 독립된 대화 기록 유지
   - 사이드바에서 에이전트 클릭 → 해당 에이전트와의 채팅으로 전환
   - 선택된 에이전트가 헤더에 표시
4. **GitHub 연동:** `sungdongy/MAPC` private repo에 push
5. **`crypto.randomUUID()` 에러 수정:** HTTP 환경에서 동작하지 않는 문제 → `genId()` 함수로 대체

---

### Phase 5: Office 뷰 + Chat 뷰 이중 모드 (2026-04-07)

**목표:** 채팅 UI를 유지하면서 Office 뷰를 추가 모드로 제공

**구현 내용:**
1. **Chat/Office 토글 버튼** (헤더 오른쪽)
   - Chat 모드에서 "Office" 버튼 표시 → 클릭 시 오피스 뷰로 전환
   - Office 모드에서 "Chat" 버튼 표시 → 클릭 시 채팅으로 복귀
2. **좌측 사이드바는 양쪽 모드에서 동일하게 유지**
3. **Office에서 에이전트 클릭 → 자동으로 Chat 모드로 전환 + 해당 에이전트 선택**

**Office 뷰 디자인 (개선된 픽셀아트 스타일):**
- 나무 바닥 패턴 (체크무늬 우드톤)
- 카펫 영역 (책상 줄 아래)
- 캐릭터 디테일: 머리카락, 눈 하이라이트, 팔, 입, 라운드 몸체, 에이전트별 다른 피부톤/머리색
- 책상: 그라데이션 표면, 키보드, 모니터 스탠드, 화면 그라데이션 효과
- 벽 장식: 화이트보드(MAPC 로고), 실시간 시계, 액자 2개
- 커피머신 (오른쪽 벽)
- 화분 (디테일 잎사귀 레이어)
- 문 (손잡이 포함)
- 벽 하이라이트 및 걸레받이

**기술 구현:**
- HTML5 Canvas + requestAnimationFrame
- callback ref 패턴으로 Canvas 마운트 시 게임 루프 시작
- agentsRef로 React state와 게임 루프 간 동기화
- WASD/방향키 이동, 벽/책상 충돌 처리
- Canvas 클릭 좌표 → 에이전트 히트 판정 (거리 기반)

---

### Phase 6: 에이전트 대화 맥락 유지 + 페르소나 + Hire/Fire (2026-04-07)

**구현 내용:**

1. **에이전트별 독립 대화 맥락**
   - 메시지 전송 시 해당 에이전트의 **전체 대화 기록(history)**을 API에 함께 전달
   - API Key 모드: Anthropic API의 `messages` 배열로 히스토리 전달
   - CLI 모드: 대화 기록을 User/Assistant 형식 텍스트로 조합하여 전달
   - 에이전트 A의 대화 기록은 에이전트 B에게 전달되지 않음 (완전 독립)

2. **페르소나 필드 추가**
   - Agent 타입에 `persona` 필드 추가
   - 에이전트 생성 시 textarea로 자유롭게 페르소나 정의 가능 (선택 사항)
   - 예: "친근하고 유머러스한 톤으로 대화하며, 복잡한 내용을 쉽게 설명해주는 성격"
   - 시스템 프롬프트에 "Your persona and communication style: ..." 형태로 주입

3. **Hire/Fire UX**
   - 사이드바 `+` 버튼 → **"Hire"** 버튼으로 변경 (파란색)
   - 헤더 오른쪽에 **"Fire"** 버튼 추가 (빨간색, 에이전트 선택 시에만 표시)
   - Fire 클릭 시 즉시 삭제가 아닌 **경고 모달** 표시
     - "해고 시 해당 에이전트와 나눈 모든 대화 기록이 영구적으로 삭제되며 복구할 수 없습니다"
   - 확인 시 에이전트 삭제 + 대화 기록 삭제 + 세션 종료
   - 에이전트가 1명일 경우 Fire 버튼 비표시 (최소 1명 유지)

---

### Phase 7: Team 기능 구현 (2026-04-07)

**목표:** 에이전트를 팀으로 묶어 공동 목표/규칙 기반의 슬랙 스타일 팀 채팅 제공

**구현 내용:**

1. **Team 데이터 모델**
   - `Team` 타입: id, name, goal, rules[], agentIds[], messages[]
   - `TeamMessage` 타입: id, role, content, senderName, mentionTarget, timestamp
   - 에이전트는 팀에 속하지 않을 수도 있고, 여러 팀에 속할 수도 있음

2. **사이드바 탭 UI**
   - 상단에 **[Agents] / [Teams]** 탭 전환 버튼
   - Agents 탭: 기존 에이전트 리스트 + Hire 버튼 (1:1 채팅)
   - Teams 탭: 팀 리스트 + Create 버튼. 팀 클릭 → Team chat 모드
   - 에이전트 선택 시 팀 선택 해제, 팀 선택 시 에이전트 선택 해제 (상호 배타)

3. **Team 생성 모달**
   - 팀 이름 (필수)
   - 핵심 목표 (textarea)
   - 규칙 (동적 추가/삭제 가능한 리스트, + 규칙 추가 / ✕ 삭제)
   - 멤버 선택 (기존 에이전트 중 체크박스로 선택, 아바타 + 이름 + 역할 표시)

4. **Team Chat (슬랙 스타일)**
   - **멘션 대상 드롭다운** (입력란 왼쪽): @전체 / @개별 에이전트 선택
   - **@전체**: 팀 내 모든 에이전트가 **순서대로** 각각 응답 (이전 에이전트의 응답을 다음 에이전트가 볼 수 있음)
   - **@특정 에이전트**: 해당 에이전트만 응답
   - 각 메시지에 **발신자 아바타/이름** + **멘션 대상** 표시
   - 사용자 메시지: "→ @Andy" 형태로 수신 대상 표시
   - 에이전트 응답: 아바타 + 이름 표시
   - 대화 기록이 모든 에이전트에게 공유됨 (팀 전체 맥락 유지)

5. **Team Settings 모달** (헤더의 "Settings" 버튼)
   - 핵심 목표 수정
   - 규칙 추가/수정/삭제
   - 멤버 추가/제거
   - 변경 즉시 반영 (다음 메시지부터 적용)

6. **헤더 변경**
   - Team 선택 시: 팀 아바타(T) + 팀 이름 + 멤버 수 + "Settings" 버튼
   - Agent 선택 시: 기존과 동일 (에이전트 아바타 + 이름 + Fire 버튼)

7. **시스템 프롬프트 확장**
   - `buildSystemPrompt`에 `teamContext` 파라미터 추가 (optional)
   - Team chat 시: 에이전트 개인 역할/페르소나 + 팀 이름/목표/규칙이 합쳐져서 전달
   - 프롬프트 구조:
     ```
     You are an AI agent named "Andy" with the role of "Data Analyst".
     
     You are a member of team "Marketing Team".
     Team goal: 2분기 마케팅 전략 수립
     Team rules you must follow:
     1. 데이터 기반으로 의견을 제시할 것
     2. 한국어로 답변할 것
     Always keep the team goal and rules in mind when responding.
     
     Your persona: 친근하고 유머러스한 톤
     ```
   - 1:1 개인 채팅은 기존과 동일하게 동작 (teamContext 없음)

---

### Phase 8: 프로젝트 폴더 구조 정리 (2026-04-07)

**변경 내용:**
- `ACAW/acaw-chat/` → `MAPC/mapc-agent/` 폴더명 변경
- Git 히스토리 및 코드는 그대로 유지

---

### Phase 9: Actionable Agent - 도구 실행 기능 (2026-04-08)

**목표:** 에이전트가 채팅뿐 아니라 실제 액션(파일 읽기/쓰기, 명령 실행, 웹 검색)을 수행할 수 있도록 업그레이드

**리서치 결과:**
- Anthropic SDK의 **Tool Use (Function Calling)** 기능을 활용 (이미 설치된 `@anthropic-ai/sdk`)
- NanoClaw, Claude Agent SDK, MCP는 향후 확장 시 도입 예정
- 현재는 별도 라이브러리 없이 SDK의 도구 정의 + 실행 루프로 구현

**구현 내용:**

1. **도구 5종 구현** (`/api/chat/route.ts`)
   - `list_files` - 디렉토리 파일 목록 조회 (이름, 타입, 크기)
   - `read_file` - 파일 내용 읽기 (최대 줄 수 제한 가능)
   - `write_file` - 파일 생성/수정
   - `run_command` - 셸 명령 실행 (위험 명령 블랙리스트 적용)
   - `web_search` - 웹 검색 (Claude Code CLI 경유)

2. **Tool Use 루프** (API Key 모드)
   - Claude가 `tool_use` 블록으로 도구 호출 요청
   - 서버에서 도구 실행 후 `tool_result`로 반환
   - Claude가 결과를 보고 추가 도구 호출 또는 최종 응답 생성
   - 최대 반복 횟수 10회 제한

3. **보안 조치**
   - 위험 명령 블랙리스트: `rm -rf /`, `shutdown`, `mkfs`, `dd` 등 차단
   - 명령 실행 타임아웃: 30초
   - 파일 읽기 줄 수 제한: 기본 200줄

4. **에이전트별 도구 권한**
   - Agent 타입에 `allowedTools: string[]` 필드 추가
   - 에이전트 생성(Hire) 시 체크박스로 허용 도구 선택
   - 카테고리별 그룹: 파일(목록/읽기/쓰기), 시스템(명령 실행), 웹(검색)
   - 도구가 없는 에이전트는 기존처럼 채팅만 가능

5. **채팅 UI 도구 호출 표시**
   - 에이전트 응답에 도구 호출이 포함된 경우 **접을 수 있는 블록**으로 표시
   - 🔧 도구명 클릭 → 입력 파라미터 + 실행 결과 확인 가능
   - `<details>/<summary>` HTML 태그 활용

6. **API 응답 확장**
   - 기존: `{ content: string }`
   - 변경: `{ content: string, toolCalls: ToolCall[] }`
   - ToolCall: `{ name, input, result }`

**기술 결정:**
- NanoClaw/Agent SDK 대신 Anthropic SDK Tool Use를 직접 사용
  - 이유: 이미 설치된 SDK로 충분, 별도 의존성 불필요, 빠른 구현
  - 향후 보안 강화 시 컨테이너 격리(NanoClaw 패턴) 도입 예정

---

### Phase 10: 안정성 개선 및 데이터 영속화 (2026-04-08)

**목표:** 연속 메시지 실패 해결, 동시 대화 지원, 데이터 영속화

**구현 내용:**

1. **연속 메시지 실패 해결**
   - 문제: `selectedAgent.messages`를 클로저로 캡처하여, 빠르게 메시지를 보내면 이전 응답이 반영되기 전의 오래된 history를 참조
   - 해결: state 업데이트를 함수형(`prev => ...`)으로 변경하여 항상 최신 상태 기반으로 처리
   - history도 전송 시점에 최신 상태에서 가져옴

2. **동시 대화 지원 (에이전트별 독립 로딩)**
   - 문제: 글로벌 `isLoading` boolean이 전체 UI를 차단하여, Agent A 응답 대기 중 Agent B에게 메시지 불가
   - 해결: `isLoading: boolean` → `loadingIds: Set<string>` (에이전트/팀 ID별 로딩 관리)
   - Agent A가 응답 중이어도 Agent B에게 메시지 전송 가능
   - 로딩 표시는 해당 에이전트/팀 채팅에서만 표시
   - 입력란이 더 이상 전역 비활성화되지 않음

3. **Team Chat 대화 맥락 공유 수정**
   - 문제: React 비동기 배치 업데이트로 인해 팀 채팅에서 이전 에이전트의 응답이 다음 에이전트에게 전달되지 않음
   - 해결: 로컬 변수(`localHistory`)로 대화 기록을 직접 관리
   - Agent A 응답 → localHistory에 추가 → Agent B가 A의 응답을 포함한 히스토리를 받음

4. **기본 에이전트 3명 구성**
   - Andy (Product Manager): 비즈니스 임팩트 중심, 구조적 커뮤니케이션
   - Brown (DevOps Engineer): 안정성/자동화 중시, 코드로 보여주는 스타일
   - Clark (Data Scientist): 데이터 기반 객관적 분석, 쉬운 설명, 탐구적 성격
   - 3명 모두 전체 도구 권한 부여

5. **localStorage 데이터 영속화**
   - 에이전트 (이름, 역할, 페르소나, 도구 권한, 대화 기록) → `mapc_agents`
   - 팀 (이름, 목표, 규칙, 멤버, 대화 기록) → `mapc_teams`
   - API Key → `mapc_apikey`
   - 자동 저장: `useEffect`로 state 변경 시 자동으로 localStorage에 기록
   - 자동 복원: 초기 state를 `localStorage`에서 로드 (없으면 기본값)
   - Date 객체 복원 처리 (JSON.parse 시 문자열 → Date 변환)

**한계:**
- 같은 PC, 같은 브라우저에서만 데이터 유지
- 브라우저 캐시 삭제 시 소실
- 향후 DB(서버 저장)로 전환 필요

---

### Phase 11: CLI 연속 메시지 버그 수정 및 UX 개선 (2026-04-08)

**목표:** `claude -p` CLI 모드에서 두 번째 이후 메시지가 실패하는 근본 원인 해결

**버그 분석 과정:**

1. **증상**: 같은 에이전트에게 첫 메시지는 성공, 두 번째 메시지부터 "에이전트 응답에 실패했습니다" 에러
2. **서버 로그 확인**: `code: 143, killed: true` — 프로세스가 타임아웃으로 강제 종료됨
3. **프롬프트 크기 배제**: 1078자에서 실패, 1218자에서 성공 → 크기 문제 아님
4. **동시 호출 배제**: 터미널에서 3개 동시 실행 성공
5. **프롬프트 형식 배제**: 터미널에서 동일 형식 프롬프트 성공

**근본 원인:** Node.js `execFile` + `stdin.write` 방식의 버퍼링/파이핑 문제
- `execFile`로 `claude` 프로세스를 생성하고 `proc.stdin.write(prompt)`로 프롬프트 전달
- 첫 호출은 성공하지만, 이후 호출에서 stdin 파이핑이 불안정하게 동작
- 프로세스가 입력을 제대로 받지 못해 60초 타임아웃까지 대기 후 kill됨

**해결:** 임시 파일 + `cat | claude -p` 파이프 방식으로 변경
```
// Before (불안정)
const proc = execFile("claude", ["-p"], ...);
proc.stdin.write(prompt);
proc.stdin.end();

// After (안정)
await writeFile(tmpFile, prompt);
exec(`cat "${tmpFile}" | claude -p --output-format text`, ...);
```

**추가 수정 사항:**
1. **React setState updater 비동기 문제 수정**: `setAgents` updater에서 히스토리를 읽는 것은 React 18에서 즉시 실행되지 않음 → `selectedAgent.messages`에서 직접 읽도록 변경
2. **Team 해체(Dissolve) 기능**: Team Settings 모달 하단에 빨간 Dissolve 버튼 추가, 경고 후 팀 삭제 (에이전트는 유지)
3. **한글 IME 버그 수정**: 한글 조합 중 Enter 입력 시 마지막 글자가 다음 입력란에 남는 문제 → `isComposing` 체크 추가
4. **에러 메시지 상세화**: API 에러 응답에 실제 에러 내용 포함
5. **히스토리 제한**: CLI 모드에서 최근 10개 메시지만 전달 (프롬프트 크기 관리)

**테스트 결과 (API 직접 호출):**

| 테스트 | 결과 |
|--------|------|
| 1번째 메시지 (히스토리 없음) | 성공 |
| 2번째 메시지 (히스토리 2개) | 성공 |
| 3번째 메시지 (히스토리 4개) | 성공 |
| Team chat (팀 컨텍스트 + 히스토리) | 성공 |

---

## Current Architecture

```
[Browser]
    ↓
[Next.js App (port 8053)]
    ├── Chat 모드
    │   ├── Agent 1:1 채팅 (에이전트별 독립 세션)
    │   └── Team 채팅 (슬랙 스타일, 멘션 기반)
    ├── Office 모드: 2D Canvas 오피스 뷰
    └── /api/chat (API Route)
            ↓
        ┌───────────┴───────────┐
        │                       │
  [API Key 있음]          [API Key 없음]
        │                       │
  Anthropic SDK          Claude Code CLI
  (Tool Use 루프)        (--allowedTools)
        │                       │
        └───────────┬───────────┘
                    ↓
        [시스템 프롬프트 구성]
        ├── 에이전트 역할 + 페르소나
        ├── (Team chat 시) 팀 목표 + 규칙
        └── 허용 도구 목록 (allowedTools)
                    ↓
              [Claude 응답]
                    ↓ (tool_use 시)
              [도구 실행 루프]
        ┌─────────┼─────────┐─────────┐
    list_files  read_file  run_cmd  web_search
        write_file
                    ↓
              [tool_result → Claude → 최종 응답]
```

**데이터 흐름:**
```
Agent 생성 (Hire) → 이름 + 역할 + 페르소나 → 독립 대화 세션
Agent 삭제 (Fire) → 경고 확인 → 에이전트 + 기록 영구 삭제

Team 생성 (Create) → 이름 + 목표 + 규칙 + 멤버 선택
Team 채팅 → @멘션 대상 선택 → 대상 에이전트에게 팀 컨텍스트 + 히스토리 전달 → 응답
Team 설정 (Settings) → 목표/규칙/멤버 수정 → 다음 메시지부터 반영

1:1 채팅 → 에이전트 history + 새 메시지 → Claude 호출 → 응답 추가
```

---

## File Structure

```
MAPC/                               ← 프로젝트 루트
└── mapc-agent/                     ← Next.js 앱
    ├── src/app/
    │   ├── page.tsx                # 메인 페이지 (Chat/Office 뷰, Agent/Team 관리)
    │   ├── layout.tsx              # 레이아웃 (메타데이터, 폰트)
    │   ├── globals.css             # 글로벌 스타일
    │   └── api/chat/
    │       └── route.ts            # Claude 연동 API (CLI/SDK 이중 모드, teamContext 지원)
    ├── public/
    │   └── logo.svg                # MAPC 로고 (SVG)
    ├── next.config.ts              # Next.js 설정 (allowedDevOrigins)
    ├── product.md                  # 이 파일 (개발 로그)
    ├── package.json
    └── tsconfig.json
```

---

## Backlog / Future Plans

- [ ] MCP 서버 연동 (PostgreSQL, GitHub, Slack)
- [ ] 컨테이너 격리 실행 (NanoClaw 패턴)
- [ ] 도구 실행 사용자 승인 워크플로
- [ ] 에이전트 전체가 공유하는 지식 md 파일 시스템
- [ ] 대화 기록 영구 저장 (DB 연동)
- [ ] 팀 내 에이전트 간 자동 협업 (라우팅)
- [ ] 업무 보고서 자동 생성
- [ ] 사용자 인증 (로그인/회원가입)
- [ ] 도메인 연결 및 프로덕션 배포
- [ ] 멀티채널 지원 (Slack, Discord 등)
- [ ] 에이전트 성능 파라미터 (temperature, 모델 선택)
- [ ] 팀 삭제 기능
- [ ] 에이전트 프로필 수정 기능
- [ ] 도구 실행 히스토리/감사 로그

---

## Known Issues & Decisions

| 항목 | 내용 |
|------|------|
| Cross-origin | Docker 내부 개발 시 `allowedDevOrigins` 설정 필수 |
| crypto.randomUUID | HTTP 환경에서 미지원 → `genId()` 대체 함수 사용 |
| 게임형 UI | Canvas 전용 페이지 대신 Chat/Office 토글 방식으로 결정 |
| 대화 기록 | 현재 클라이언트 메모리에만 저장 (새로고침 시 소실) |
| 에이전트 수 | Office 뷰 기준 최대 8개 (DESK_POSITIONS 배열) |
| Team @전체 | 에이전트가 순서대로 응답, 이전 응답이 다음 에이전트 컨텍스트에 포함됨 |
| 폴더 구조 | `ACAW/acaw-chat` → `MAPC/mapc-agent`로 변경 (2026-04-07) |
| Tool Use | Anthropic SDK 직접 사용, NanoClaw/Agent SDK는 향후 도입 |
| 도구 보안 | 블랙리스트 기반 차단, 향후 컨테이너 격리 필요 |
| 도구 실행 환경 | Next.js 서버 프로세스에서 직접 실행 (격리 없음) |
