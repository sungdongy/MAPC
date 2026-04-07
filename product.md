# ACAW - Product Development Log

## Project Overview

**ACAW** = 누구나 손쉽게 멀티 에이전트 서비스 및 팀을 만들고 활용할 수 있는 플랫폼

- 2D 가상 오피스 기반 멀티 에이전트 플랫폼 (개더타운 스타일)
- 비개발자도 쉽게 에이전트를 생성하고 팀을 구성할 수 있는 것이 목표
- 참고 서비스: [NanoClaw](https://github.com/qwibitai/nanoclaw) (개발자 중심 경량 AI 에이전트 프레임워크)

---

## Development Timeline

### Phase 1: MVP - 채팅 웹 앱 기본 구조 (2026-04-07)

**목표:** 간단한 채팅 형식의 웹 애플리케이션 구현

**기술 스택:**
- Frontend: Next.js (TypeScript) + Tailwind CSS
- Runtime: Node.js 20
- 프로젝트 경로: `/workspace/sd/projects/ACAW/acaw-chat`

**구현 내용:**
1. 채팅 UI (메시지 입력/전송, 시간 표시)
2. 에이전트 목록 사이드바
3. `+` 버튼으로 새 에이전트 추가 (이름, 역할 설정)
4. 에이전트 삭제 기능
5. 사이드바 토글
6. 다크모드 지원 (시스템 설정 자동 감지)
7. 환영 메시지 화면

**인프라:**
- Docker 컨테이너 내부에서 개발
- 포트 매핑: 컨테이너 8052 → 호스트 32777

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
   - **CLI 모드 (개발용):** API Key 없이 서버의 Claude Code CLI 사용 (Max Plan 활용, 추가 비용 없음)
   - **API Key 모드 (프로덕션용):** 사용자가 Anthropic API Key를 입력하면 `@anthropic-ai/sdk`로 직접 호출
   - 사이드바 하단에 연결 상태 표시 (초록: API Key 연결, 노랑: CLI 모드)
   - 설정 모달에서 API Key 입력/변경 가능

**기술 구현:**
- `@anthropic-ai/sdk` 패키지 설치
- API Route에서 `apiKey` 유무에 따라 분기 처리
- API Key 모드: `claude-sonnet-4-20250514` 모델 사용

---

### Phase 3: 게임형 2D 오피스 UI (2026-04-07)

**목표:** 채팅 UI를 개더타운 스타일의 2D 가상 오피스로 전환

**변경 동기:** 단순 채팅 형식보다 시각적으로 직관적이고 몰입감 있는 경험 제공

**구현 내용:**
1. **2D 오피스 맵** (HTML5 Canvas)
   - 탑뷰 시점의 오피스 공간 (벽, 바닥, 문, 화분 장식)
   - "ACAW Office" 간판
   - 타일 기반 그리드 (40px)
   - 맵 크기: 24x16 타일 (960x640px)

2. **에이전트 배치**
   - 책상 + 모니터 + 의자 구성
   - 에이전트 캐릭터가 책상에 앉아있는 형태 (원형 바디 + 머리 + 눈)
   - 이름표/역할 태그 표시
   - 최대 8개 책상 배치 가능

3. **플레이어 캐릭터**
   - 빨간색 캐릭터 ("나" 라벨)
   - WASD / 방향키로 이동
   - 벽 및 책상 충돌 처리
   - 그림자, 미소 등 디테일

4. **에이전트 클릭 → 채팅 패널**
   - 캔버스 위 에이전트 클릭 시 우측에 채팅 패널 슬라이드
   - 에이전트별 독립된 대화 기록 유지
   - Claude 연동 (CLI/API Key 이중 모드 유지)

5. **UI 구성**
   - 상단 바: 에이전트 수, 연결 상태, + 에이전트 버튼, 설정 버튼
   - 좌측: Canvas 오피스 뷰
   - 우측: 선택된 에이전트와의 채팅 패널 (접기 가능)

**기술 구현:**
- HTML5 Canvas + requestAnimationFrame 게임 루프
- useRef로 키 입력/플레이어 위치 관리 (불필요한 리렌더 방지)
- Canvas 클릭 좌표 → 에이전트 히트 판정 (거리 기반)

---

## Architecture

```
[Browser] → [Next.js Frontend (port 8052)]
                    ↓
            [/api/chat API Route]
                    ↓
        ┌───────────┴───────────┐
        │                       │
  [API Key 있음]          [API Key 없음]
        │                       │
  Anthropic SDK          Claude Code CLI
  (API 직접 호출)        (서버 CLI 호출)
```

---

## Backlog / Future Plans

- [ ] 대화 기록 저장 (DB 연동)
- [ ] 에이전트 페르소나 상세 설정 (성격, 톤, 전문 분야)
- [ ] 팀 구성 기능 (여러 에이전트를 하나의 팀으로 묶기)
- [ ] 팀 내 에이전트 간 협업 (자동 라우팅)
- [ ] 업무 보고서 자동 생성
- [ ] 사용자 인증 (로그인/회원가입)
- [ ] 도메인 연결 및 프로덕션 배포
- [ ] 멀티채널 지원 (Slack, Discord 등)
