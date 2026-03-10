# CS_talk 프로젝트 개발 현황 (2026-03-05 업데이트)

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
│   │   ├── onboarding/    # OnboardingView.tsx / OnboardingView.css (이름 강제 입력 온보딩)
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

---

## ✅ 구현 완료 기능

### 인증 & 온보딩 
- 이메일/패스워드 회원가입 & 로그인 (Supabase Auth)
- 회원가입 시 `profiles` 테이블 자동 생성 (DB Trigger)
- **온보딩 플로우**: 첫 로그인 시 `full_name` 설정을 강제함 (`OnboardingView.tsx`)
- 프로필 설정 모달: 이름 변경 및 알림 권한 설정 기능 포함 (`ProfileSettings.tsx`)

### 업무 관리 (티켓)
- 업무 등록 (제목, 우선순위, 설명, 이미지 첨부)
- [진행중] / [처리완료] 탭 전환
- 수정 / 삭제 (작성자 본인만 가능)
- 완료 처리: 작성자 → 직접 완료 / 관리자 → 작성자에게 완료 요청 플로우
- **업무 검색**: 제목/내용 실시간 필터링 (`TicketList.tsx`)
- **중복 등록 방지**: Unique ID 기반 중복 필터링으로 Race Condition 해결

### 실시간 채팅 & 알림
- 티켓별 독립 채팅방
- Supabase Realtime 구독 (INSERT/UPDATE/DELETE)
- **푸시 알림**: 새 메시지 도착 시 브라우저 알림 발송 (`ticketStore.ts` 및 `Notification API`)
- **스마트 스크롤**: 맨 아래일 때만 자동 스크롤, 위에 있을 때 "새 메시지 ↓" 토스트 표시
- 메시지 발신자 이름 표시 (full_name → email 앞부분 → '익명' 순서로 폴백)
- 이미지 첨부 전송 (파일 선택 / 붙여넣기 / 드래그 앤 드롭)
- 내부 메모(Admin 전용) 토글

### 안읽음 배지 (KakaoTalk 방식)
- 업무 목록에 안읽음 메시지 개수 빨간 배지 표시
- **내가 보낸 메시지는 카운트 제외** (`.neq('user_id', user.id)`)
- 채팅방 열면 즉시 0 초기화 (DB `profiles_tickets_reads` UPSERT)
- 다른 사람의 새 메시지 → 실시간으로 배지 증가
- 다른 디바이스에서 읽으면 내 배지도 실시간 동기화

### 어드민 기능 (Admin Panel)
- **사용자 관리**: 전체 사용자 목록 조회 및 권한 변경 (`AdminPanel.tsx`)
- **권한 관리**: 일반 사용자 ↔ 관리자 등급 상호 변경 가능
- **DB 보안**: 관리자만 다른 사용자의 role을 변경할 수 있도록 Supabase RLS 정책 적용 완료

### PWA & 모바일 UI
- **PWA 구현**: 홈 화면 추가(Installable), 서비스 워커 자동 업데이트, 앱 아이콘 설정 완료
- **설치 프로포절**: 앱 내 '앱 설치' 버튼 노출 및 설치 유도 로직 (`MainLayout.tsx`)
- **반응형 레이아웃**: `matchMedia` 기반 모바일 최적화
- **엠비언트 컬러**: 우선순위별 채팅창 그라데이션 글로우 효과

---

## 🐛 알려진 이슈 / 향후 개선 필요 사항

### 향후 개선 예정
- [ ] **모바일 스와이프 제스처 (7순위)**: 티켓 목록에서 옆으로 밀어서 바로 '완료' 처리하는 기능
- [ ] **고급 알림**: PWA가 꺼져 있을 때도 알림을 받을 수 있는 서비스 워커 백그라운드 푸시 보강
- [ ] **이미지 최적화**: 업로드 시 리사이징 또는 WebP 변환 로직 추가

---

## 📋 새 세션 시작 시 AI에게 전달할 사항
1. 이 파일(`CS_talk_dev_status.md`)과 `supabase_schema.sql`을 가장 먼저 읽으세요.
2. 현재 **Admin 페이지, PWA 설정, 실시간 알림**까지 모두 구현 및 배포(git push) 완료된 상태입니다.
3. 바로 이어서 진행할 작업은 **"7순위: 모바일 스와이프 제스처 (밀어서 완료 처리)"**입니다.
4. 주요 참조 파일:
   - `src/components/ticket/TicketList.tsx` (스와이프 기능 추가 대상)
   - `src/store/ticketStore.ts` (티켓 상태 업데이트 로직)
   - `src/components/layout/MainLayout.tsx` (전체 레이아웃 및 PWA 설치 로직)
5. **"어드민 권한(admin role)과 RLS 정책은 이미 Supabase에 적용되어 있습니다."**라고 알려주세요.

