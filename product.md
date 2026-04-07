# MAPC - Product Development Log

## Project Overview

**MAPC** (Multi-Agent Personal Canvas) = 누구나 손쉽게 멀티 에이전트 서비스 및 팀을 만들고 활용할 수 있는 플랫폼

- 채팅 기반 UI + 2D 가상 오피스 뷰를 겸비한 멀티 에이전트 플랫폼
- 비개발자도 쉽게 에이전트를 생성(Hire)하고 관리할 수 있는 것이 목표
- 에이전트별 독립된 대화 세션 및 기록 유지
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

## Current Architecture

```
[Browser]
    ↓
[Next.js App (port 8053)]
    ├── Chat 모드: 에이전트별 독립 채팅 UI
    ├── Office 모드: 2D Canvas 오피스 뷰
    └── /api/chat (API Route)
            ↓
        ┌───────────┴───────────┐
        │                       │
  [API Key 있음]          [API Key 없음]
        │                       │
  Anthropic SDK          Claude Code CLI
  (messages 배열)        (텍스트 조합)
        │                       │
        └───────────┬───────────┘
                    ↓
              [Claude 응답]
```

**에이전트 데이터 흐름:**
```
Agent 생성 (Hire)
  → 이름 + 역할 + 페르소나 정의
  → 시스템 프롬프트 자동 생성
  → 독립 대화 세션 시작

메시지 전송
  → 해당 에이전트의 전체 대화 기록(history) + 새 메시지
  → API Route에서 시스템 프롬프트 + history로 Claude 호출
  → 응답을 해당 에이전트의 기록에 추가

Agent 삭제 (Fire)
  → 경고 모달 확인
  → 에이전트 + 대화 기록 영구 삭제
```

---

## File Structure

```
acaw-chat/
├── src/app/
│   ├── page.tsx          # 메인 페이지 (Chat + Office 뷰, 에이전트 관리)
│   ├── layout.tsx        # 레이아웃 (메타데이터, 폰트)
│   ├── globals.css       # 글로벌 스타일
│   └── api/chat/
│       └── route.ts      # Claude 연동 API (CLI/SDK 이중 모드)
├── public/
│   └── logo.svg          # MAPC 로고 (SVG)
├── next.config.ts        # Next.js 설정 (allowedDevOrigins)
├── product.md            # 이 파일 (개발 로그)
├── package.json
└── tsconfig.json
```

---

## Backlog / Future Plans

- [ ] 에이전트 전체가 공유하는 지식 md 파일 시스템
- [ ] 대화 기록 영구 저장 (DB 연동)
- [ ] 팀 구성 기능 (여러 에이전트를 하나의 팀으로 묶기)
- [ ] 팀 내 에이전트 간 협업 (자동 라우팅)
- [ ] 업무 보고서 자동 생성
- [ ] 사용자 인증 (로그인/회원가입)
- [ ] 도메인 연결 및 프로덕션 배포
- [ ] 멀티채널 지원 (Slack, Discord 등)
- [ ] 에이전트 성능 파라미터 (temperature, 모델 선택)

---

## Known Issues & Decisions

| 항목 | 내용 |
|------|------|
| Cross-origin | Docker 내부 개발 시 `allowedDevOrigins` 설정 필수 |
| crypto.randomUUID | HTTP 환경에서 미지원 → `genId()` 대체 함수 사용 |
| 게임형 UI | Canvas 전용 페이지 대신 Chat/Office 토글 방식으로 결정 |
| 대화 기록 | 현재 클라이언트 메모리에만 저장 (새로고침 시 소실) |
| 에이전트 수 | Office 뷰 기준 최대 8개 (DESK_POSITIONS 배열) |
