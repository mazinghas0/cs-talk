# CS_talk 프로젝트 개발 현황
## 마지막 업데이트: 2026-03-10

---

## 🌐 배포 정보
- **프론트엔드**: [Cloudflare Pages](https://cs-chat-f3o.pages.dev) — `git push` 시 자동 배포
- **백엔드/DB**: Supabase (프로젝트 ID: `xsnqesmfszadytziujuf`, 이름: `cs-chat`)
- **GitHub**: `https://github.com/mazinghas0/cs-talk.git` (branch: `main`)
- **로컬 개발**: `npm run dev` → `localhost:5173`

---

## 🗂️ 프로젝트 구조
```
CS_talk/
├── src/
│   ├── components/
│   │   ├── admin/         # AdminPanel.tsx — 사용자/권한 관리
│   │   ├── auth/          # AuthView.tsx — 로그인/회원가입
│   │   ├── chat/          # ChatArea.tsx — 채팅창
│   │   ├── layout/        # MainLayout.tsx / WorkspaceSwitcher.tsx
│   │   ├── onboarding/    # OnboardingView.tsx — 첫 로그인 이름 설정
│   │   ├── profile/       # ProfileSettings.tsx — 프로필 모달
│   │   └── ticket/        # TicketList.tsx / TicketTabs.tsx
│   ├── store/
│   │   ├── ticketStore.ts  # 티켓·메시지·안읽음·실시간 상태 관리
│   │   └── authStore.ts    # 인증·프로필·워크스페이스 상태 관리
│   ├── types/
│   │   └── ticket.ts       # Ticket, Message, Workspace 인터페이스
│   └── lib/
│       └── supabase.ts     # Supabase 클라이언트
├── supabase_schema.sql          # 초기 DB 스키마
├── migration_workspace.sql      # 워크스페이스 기능 마이그레이션
├── migration_customer_access.sql # 고객 PIN 접근 마이그레이션
└── migration_fixes.sql          # 버그 수정 마이그레이션 (2026-03-10 신규)
```

---

## 🗄️ Supabase DB 현황

### 테이블
| 테이블 | 설명 | 행 수 |
|---|---|---|
| `profiles` | 사용자 정보 (id, email, full_name, role) | 4 |
| `workspaces` | 팀 공간 (name, owner_id, plan_type) | 0 |
| `workspace_members` | 워크스페이스-사용자 N:M (role: leader/member) | 0 |
| `tickets` | 업무 요청 (title, status, priority, workspace_id 등) | 4 |
| `messages` | 채팅 메시지 (ticket_id, user_id, content 등) | 20 |
| `profiles_tickets_reads` | 안읽음 추적 (profile_id, ticket_id, last_read_at) | 12 |

> ⚠️ **참고**: 기존 티켓 4개는 `workspace_id`가 NULL 상태 (워크스페이스 기능 추가 전 생성된 데이터)

### 적용된 마이그레이션 (모두 Supabase에 적용 완료)
- ✅ `supabase_schema.sql` — 기본 스키마
- ✅ `migration_workspace.sql` — 워크스페이스 테이블
- ✅ `migration_customer_access.sql` — PIN 기반 고객 접근
- ✅ `migration_fixes.sql` — 버그 수정 (2026-03-10)

### 주요 DB 함수 / 트리거
| 이름 | 종류 | 역할 |
|---|---|---|
| `handle_new_user` | 트리거 | 회원가입 시 profiles 자동 생성 |
| `handle_new_workspace` | 트리거 | 워크스페이스 생성 시 owner를 leader로 자동 등록 |
| `get_unread_counts` | RPC 함수 | 안읽음 개수 일괄 조회 (N+1 해결) |
| `is_workspace_member` | 헬퍼 함수 | RLS 무한재귀 방지용 멤버 확인 |

---

## ⚙️ 기술 스택
| 역할 | 기술 |
|---|---|
| 프레임워크 | React 18 + TypeScript + Vite |
| 상태관리 | Zustand 5 |
| DB/인증/실시간 | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| 아이콘 | lucide-react |
| 날짜 | date-fns |
| 배포 | Cloudflare Pages |
| PWA | vite-plugin-pwa |

---

## ✅ 구현 완료 기능

### 인증 & 온보딩
- 이메일/패스워드 회원가입 & 로그인
- 첫 로그인 시 이름 강제 설정 (OnboardingView)
- 프로필 설정 모달 (이름 변경, 알림 권한)

### 워크스페이스
- 워크스페이스 생성/전환 (데스크톱 사이드바)
- **모바일 워크스페이스 전환** (하단 네비 → 바텀시트 모달)
- **워크스페이스 없을 때 빈 화면 안내** (신규)
- 워크스페이스 생성 UI: `window.prompt` → 인라인 입력창으로 교체

### 업무 관리 (티켓)
- 업무 등록 (제목, 우선순위, 설명, 이미지)
- [진행중] / [처리완료] 탭
- 수정 / 삭제 / 완료 처리
- 업무 검색 (실시간 필터링)
- 중복 등록 방지

### 실시간 채팅
- 티켓별 채팅방
- Supabase Realtime 구독
- 푸시 알림 (브라우저 Notification API)
- 스마트 스크롤 + "새 메시지 ↓" 토스트
- 이미지 첨부 (파일/붙여넣기/드래그앤드롭)
- 내부 메모 (Admin 전용)

### 안읽음 배지
- 카카오톡식 빨간 배지
- 내 메시지 카운트 제외
- 채팅방 열면 즉시 0 초기화
- 다기기 실시간 동기화

### 어드민
- 사용자 목록 조회
- 권한 변경 (user ↔ admin)

### PWA & 모바일
- 홈 화면 추가 (설치 가능)
- 서비스 워커 자동 업데이트
- 반응형 레이아웃
- 우선순위별 채팅창 그라데이션 효과

---

## 🔧 2026-03-10 버그 수정 내역

| 항목 | 원인 | 해결 |
|---|---|---|
| 워크스페이스 생성 실패 | workspace_members INSERT RLS 정책 누락 + 트리거 없음 | 트리거 + RLS 정책 추가 |
| 무한재귀 에러 | workspace_members SELECT 정책이 자기 자신 참조 | SECURITY DEFINER 함수로 분리 |
| 안읽음 N+1 쿼리 | 티켓마다 DB 개별 요청 | get_unread_counts RPC 함수로 통합 |
| isAdmin 값 고정 버그 | Zustand getter 패턴이 set() 호출 시 굳어버림 | 명시적 state 필드로 교체 |
| 타입 안전성 | as any 남용 | 명시적 인터페이스 적용 |
| WorkspaceSwitcher | @ts-ignore + window.prompt | 타입 수정 + 인라인 UI |
| 모바일 워크스페이스 전환 불가 | 사이드바가 모바일에서 숨겨짐 | 하단 네비 + 바텀시트 추가 |

---

## 🚀 앞으로 개선 방향 (우선순위 순)

### 1순위 — 핵심 기능 완성
- [ ] **기존 티켓 workspace_id 연결**: 티켓 4개가 워크스페이스 없이 떠 있는 상태. 워크스페이스 생성 후 기존 티켓을 연결하는 마이그레이션 또는 UI 필요
- [ ] **워크스페이스 멤버 초대**: 현재 본인만 사용 가능. 이메일로 팀원 초대 기능 필요 (invite_tokens 테이블 + 초대 링크 방식 추천)

### 2순위 — UX 개선
- [ ] **티켓 담당자 지정 (assignee)**: DB 컬럼은 있으나 UI 미구현. 티켓에 담당자를 배정하면 책임 소재가 명확해짐
- [ ] **모바일 스와이프 제스처**: 티켓 목록에서 옆으로 밀어서 '완료 처리' (touch event 기반)
- [ ] **티켓 정렬/필터 강화**: 우선순위별, 담당자별, 날짜별 정렬 옵션

### 3순위 — 알림 강화
- [ ] **백그라운드 푸시 알림**: PWA가 꺼져 있을 때도 알림 수신 (Web Push API + VAPID 키 설정)
- [ ] **이메일 알림**: 새 업무 배정 시 이메일 발송 (Supabase Edge Function + Resend 연동)

### 4순위 — 고객 접근 기능 (PIN)
- [ ] **PIN 발급 UI**: 티켓에 PIN 부여 버튼 (DB 컬럼은 있으나 UI 미구현)
- [ ] **고객 전용 뷰**: PIN 입력 → 해당 티켓 채팅만 접근 가능한 별도 페이지

### 5순위 — 운영/관리
- [ ] **워크스페이스 설정**: 이름 변경, 멤버 목록 보기, 멤버 제거
- [ ] **이미지 최적화**: 업로드 시 리사이징 또는 WebP 변환
- [ ] **티켓 통계 대시보드**: 처리량, 평균 응답시간 등 어드민용 통계

---

## 💡 Claude의 추가 아이디어 제안

### A. 티켓 템플릿
자주 쓰는 업무 유형을 미리 템플릿으로 저장해두고 클릭 한 번으로 등록. 예: "서버 장애 보고", "신규 기능 요청" 등

### B. 업무 상태 커스터마이징
현재 in_progress / resolved 두 단계만 존재. 워크스페이스별로 상태를 자유롭게 추가 가능하게 하면 팀마다 맞는 워크플로 구성 가능 (예: 접수→검토중→개발중→완료)

### C. 멘션(@) 기능
채팅에서 @이름 입력 시 해당 유저에게 별도 알림 발송. 팀이 커질수록 유용

### D. 읽음 표시
메시지 옆에 팀원 아바타로 "누가 읽었는지" 표시 (카카오톡 숫자 방식)

### E. 첨부파일 미리보기 개선
현재 이미지만 지원. PDF, 엑셀 등 문서 파일도 업로드 가능하게 확장

---

## 📋 다음 세션 시작 시 Claude에게 전달할 사항

1. **이 파일(`CS_talk_dev_status.md`)을 가장 먼저 읽으세요.**
2. **현재 상태**: 워크스페이스 생성 버그 수정 완료, 코드 품질 개선 완료, 배포 완료.
3. **바로 이어서 할 작업**: `1순위 — 핵심 기능 완성` 항목부터 진행 (기존 티켓 workspace_id 연결 또는 워크스페이스 멤버 초대)
4. **Supabase 프로젝트 ID**: `xsnqesmfszadytziujuf`
5. **주요 참조 파일**:
   - `src/store/authStore.ts` (워크스페이스 로직)
   - `src/store/ticketStore.ts` (티켓/메시지 로직)
   - `src/components/layout/WorkspaceSwitcher.tsx` (워크스페이스 UI)
   - `src/components/ticket/TicketList.tsx` (티켓 목록 UI)
6. **모든 마이그레이션은 Supabase에 이미 적용 완료** — 추가 SQL 실행 불필요
7. **어드민 권한과 RLS 정책 모두 정상 적용된 상태**
