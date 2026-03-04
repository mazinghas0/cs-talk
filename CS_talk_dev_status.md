# CS_talk 프로젝트 개발 현황 (2026-03-05 기준)

## 🌐 배포 정보
- **프론트엔드**: [Cloudflare Pages](https://cs-chat-f3o.pages.dev) — `git push`시 자동 배포
- **백엔드/DB**: Supabase (프로젝트 ID: `cs-chat`)
- **GitHub 저장소**: `https://github.com/mazinghas0/cs-talk.git` (branch: `main`)
- **로컬 개발**: `npm run dev` → `localhost:5173`

---

## 🗂️ 프로젝트 구조

```
CS_talk/
├── src/
│   ├── components/
│   │   ├── auth/          # LoginPage 등 인증 UI
│   │   ├── chat/          # ChatArea.tsx / ChatArea.css
│   │   ├── layout/        # MainLayout.tsx / MainLayout.css
│   │   ├── profile/       # ProfileSettings.tsx (이름 설정 모달)
│   │   └── ticket/        # TicketList.tsx / TicketTabs.tsx / TicketList.css / TicketModal.css
│   ├── store/
│   │   ├── ticketStore.ts  # 티켓·메시지·안읽음·실시간 상태 관리 (Zustand)
│   │   └── authStore.ts    # 인증 + 프로필 상태 관리
│   ├── types/
│   │   └── ticket.ts       # Ticket, Message 인터페이스
│   └── lib/
│       └── supabase.ts     # Supabase 클라이언트
├── supabase_schema.sql     # DB 스키마 전체 정의 (참고용 파일 — 이미 DB에 적용됨)
├── AI_INSTRUCTIONS.md      # AI 작업 지침 파일
└── .env                    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

## 🗄️ Supabase DB 현황

### 테이블
| 테이블 | 설명 |
|---|---|
| `profiles` | 사용자 정보 (id, email, full_name, avatar_url, role) |
| `tickets` | 업무 요청 (title, description, status, priority, requesting_user_id 등) |
| `messages` | 채팅 메시지 (ticket_id, user_id, content, is_internal_note 등) |
| `profiles_tickets_reads` | **안읽음 추적용** (profile_id, ticket_id, last_read_at) — 최근 세션에서 직접 생성 완료 |

### Realtime 구독 테이블 (모두 활성화됨)
- `tickets` ✅
- `messages` ✅
- `profiles_tickets_reads` ✅

### Storage
- Bucket: `attachments` (public) — 이미지 첨부 업로드용

---

## ⚙️ 기술 스택
- **프레임워크**: React + Vite (TypeScript)
- **상태관리**: Zustand
- **DB/인증/실시간**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **아이콘**: lucide-react
- **날짜**: date-fns (한국어 locale)
- **배포**: Cloudflare Pages

---

## ✅ 구현 완료 기능

### 인증
- 이메일/패스워드 회원가입 & 로그인 (Supabase Auth)
- 회원가입 시 `profiles` 테이블 자동 생성 (DB Trigger)
- 프로필 이름 설정 모달 (ProfileSettings)

### 업무 관리 (티켓)
- 업무 등록 (제목, 우선순위, 설명, 이미지 첨부)
- [진행중] / [처리완료] 탭 전환
- 수정 / 삭제 (작성자 본인만 가능)
- 완료 처리: 작성자 → 직접 완료 / 관리자 → 작성자에게 완료 요청 플로우
- **중복 등록 방지**: Unique ID 기반 중복 필터링으로 Race Condition 해결

### 실시간 채팅
- 티켓별 독립 채팅방
- Supabase Realtime 구독 (INSERT/UPDATE/DELETE)
- 메시지 발신자 이름 표시 (full_name → email 앞부분 → '익명' 순서로 폴백)
- 이미지 첨부 전송 (파일 선택 / 붙여넣기 / 드래그 앤 드롭)
- 내부 메모(Admin 전용) 토글

### 안읽음 배지 (KakaoTalk 방식)
- 업무 목록에 안읽음 메시지 개수 빨간 배지 표시
- **내가 보낸 메시지는 카운트 제외** (`.neq('user_id', user.id)`)
- 채팅방 열면 즉시 0 초기화 (DB `profiles_tickets_reads` UPSERT)
- 다른 사람의 새 메시지 → 실시간으로 배지 증가
- 다른 디바이스에서 읽으면 내 배지도 실시간 동기화

### 우선순위 엠비언트 컬러
- 채팅창 배경에 우선순위별 은은한 그라데이션 글로우 효과
  - `urgent` → 빨강, `high` → 주황, `medium` → 인디고, `low` → 초록
- `ChatArea.css`의 `.chat-area::before { z-index: -1 }`로 콘텐츠 가림 문제 해결

### 모바일 UI/UX
- **반응형 레이아웃**: `matchMedia('(max-width: 768px)')` 기반으로 신뢰성 있는 모바일 감지
- **스택 전환**: 모바일에서 목록 → 채팅창 단계별 전환 (React 조건부 렌더링)
- **슬라이드 애니메이션**: 채팅창이 오른쪽에서 슬라이드인 (0.25s cubic-bezier)
- **바텀 내비게이션**: 엄지 영역 하단 탭 바 (업무 / 설정 / 프로필)
- **뒤로가기 버튼**: 채팅창 상단 좌측 `<` 버튼으로 목록 복귀
- **당겨서 새로고침**: 목록 영역을 아래로 당겨 데이터 동기화
- **새로고침 버튼**: 헤더 우측 🔄 아이콘 버튼

---

## 🐛 알려진 이슈 / 향후 개선 필요 사항

### 우선 확인 필요
- [ ] 실시간 채팅이 정상 복구됐는지 모바일에서 실제 테스트 필요 (최근 Supabase 테이블 생성 후 처음 배포)
- [ ] 안읽음 배지 로직이 실제 2명 이상 사용자 환경에서 정확히 작동하는지 검증

### 향후 개선 예정
- [ ] 사용자 이름 설정을 강제하는 온보딩 플로우 (현재 full_name이 null이면 email 폴백)
- [ ] 채팅 스크롤 개선 (새 메시지 도착 시 자동 스크롤 → 현재 맨 아래 있을 때만 동작하도록)
- [ ] 업무 검색 기능
- [ ] 전체 사용자 목록 관리 (Admin 페이지)
- [ ] 푸시 알림 (PWA 또는 Telegram 연동)
- [ ] 모바일 스와이프 제스처 (밀어서 완료 처리) — 현재 UI는 있지만 실제 기능 미연결

---

## 🔑 환경변수 (.env)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
> Cloudflare Pages 환경변수에도 동일하게 설정됨

---

## 📋 새 세션 시작 시 AI에게 전달할 사항
1. 이 파일(`CS_talk_dev_status.md`)을 먼저 읽게 하세요
2. `supabase_schema.sql` 파일도 함께 참조하게 하세요  
3. 주요 파일 경로: `src/store/ticketStore.ts`, `src/components/layout/MainLayout.tsx`, `src/components/chat/ChatArea.tsx`
4. 바로 이어서 개선할 수 있도록 현황 요약: **"실시간 채팅·안읽음 배지·모바일 반응형이 구현된 상태이며, 실제 다중 사용자 테스트가 필요합니다."**
