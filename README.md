# CS_talk: 워크스페이스 기반 고도화 (Jenna's Worklog)

이곳은 케빈 님과 제나의 '빠른 실행 매뉴얼이자 작업 일지'입니다. 장식보다는 실질적인 정보 위주로 정리합니다.

## 🚀 빠른 시작
- **로컬 실행**: `npm run dev`
- **배포**: Cloudflare Pages (git push 시 자동 배포)
- **DB/백엔드**: Supabase (Auth, RLS, Edge Functions 연동)

## 🏗️ 시스템 핵심 로직 (Updated 2026-03-10)
1. **워크스페이스**: `workspaces` & `workspace_members` 테이블 기반 멀티 테넌시.
2. **티켓팅**: 고객용 시큐어 링크(PIN 인증) + 하이브리드 담당자 배정 시스템.
3. **협업**: 팀원 간 비공개 내부 메모 + PWA 백그라운드 푸시 알림 고도화.
4. **AI (BETA)**: 누적된 메시지 요약을 통한 'AI CS 브리핑' 서비스.

## 📅 작업 현황
- **[DONE]** 10회 심층 인터뷰를 통한 Blueprint(기획) 완료.
- **[DONE]** 워크스페이스 기반 멀티 테넌시 DB 설계 및 구현.
- **[DONE]** PIN 기반 고객 시큐어 링크 및 공유 시스템 구축.
- **[DONE]** 프리미엄 UI 폴리싱 및 전 기기 반응형 최적화.
- **[DONE]** AI CS 요약 브리핑 및 PWA 백그라운드 푸시 구현.

---
> 상세 세부 설계는 `brain/` 폴더 내의 `implementation_plan.md` 및 `walkthrough.md`를 참조하세요.
