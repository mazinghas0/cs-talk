"""
CS_talk 실시간 채팅 테스트
- PC → 모바일 실시간 메시지 수신 검증
- 모바일 → PC 실시간 메시지 수신 검증
- 기본 라우팅(/ticket/:id, /join/:code) 검증
"""
import time
import sys
from playwright.sync_api import sync_playwright, Page

BASE_URL = "http://localhost:5173"

# 테스트 계정 (Supabase에 실제 존재하는 계정으로 변경 필요)
TEST_EMAIL = "mazinghas0@gmail.com"
TEST_PASSWORD = ""  # 테스트 실행 시 직접 입력 (커밋 금지)


def screenshot(page: Page, name: str):
    path = f"tests/screenshots/{name}.png"
    page.screenshot(path=path, full_page=True)
    print(f"  스크린샷: {path}")


def login(page: Page, label: str):
    print(f"[{label}] 로그인 중...")
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    screenshot(page, f"{label}_01_initial")

    # 로그인 폼 확인
    email_input = page.locator('input[type="email"]')
    if not email_input.is_visible():
        print(f"  [{label}] 이미 로그인 상태")
        return True

    email_input.fill(TEST_EMAIL)
    page.locator('input[type="password"]').fill(TEST_PASSWORD)
    page.locator('button[type="submit"]').click()

    # 로그인 완료 대기 (채팅 화면 진입)
    try:
        page.wait_for_selector(".pane-list, .empty-workspace-screen", timeout=10000)
        print(f"  [{label}] 로그인 성공")
        screenshot(page, f"{label}_02_after_login")
        return True
    except Exception:
        screenshot(page, f"{label}_02_login_failed")
        print(f"  [{label}] 로그인 실패")
        return False


def test_routing(page: Page):
    """기본 라우팅 테스트"""
    print("\n=== 라우팅 테스트 ===")

    # 잘못된 초대 코드
    page.goto(f"{BASE_URL}/join/INVALID")
    page.wait_for_load_state("networkidle")
    screenshot(page, "routing_join_invalid")

    has_error = page.locator("text=유효하지 않은").is_visible()
    print(f"  잘못된 초대코드 오류 표시: {'PASS' if has_error else 'FAIL'}")

    # 홈으로 이동
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")


def test_realtime_two_contexts(playwright):
    """PC ↔ 모바일 실시간 채팅 테스트 (두 브라우저 컨텍스트)"""
    if not TEST_PASSWORD:
        print("\n[SKIP] 실시간 테스트: TEST_PASSWORD가 비어 있습니다.")
        print("  tests/test_realtime.py의 TEST_PASSWORD를 설정하세요.")
        return

    print("\n=== 실시간 채팅 테스트 (PC ↔ 모바일) ===")

    # PC 브라우저
    browser_pc = playwright.chromium.launch(headless=True)
    page_pc = browser_pc.new_page(viewport={"width": 1280, "height": 800})

    # 모바일 브라우저 (iPhone 크기)
    browser_mobile = playwright.chromium.launch(headless=True)
    page_mobile = browser_mobile.new_page(
        viewport={"width": 390, "height": 844},
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
    )

    try:
        # 두 세션 로그인
        pc_ok = login(page_pc, "PC")
        mobile_ok = login(page_mobile, "Mobile")

        if not (pc_ok and mobile_ok):
            print("  로그인 실패로 실시간 테스트 건너뜀")
            return

        # 첫 번째 티켓 선택 (둘 다 같은 티켓 열기)
        first_ticket_pc = page_pc.locator(".ticket-item").first
        if not first_ticket_pc.is_visible():
            print("  티켓 없음 — 실시간 테스트 건너뜀")
            return

        ticket_text = first_ticket_pc.inner_text()
        print(f"  테스트 티켓: {ticket_text[:30]}")

        first_ticket_pc.click()
        page_pc.wait_for_load_state("networkidle")
        screenshot(page_pc, "realtime_pc_ticket_open")

        # 모바일도 같은 티켓 클릭
        page_mobile.locator(".ticket-item").first.click()
        page_mobile.wait_for_load_state("networkidle")
        screenshot(page_mobile, "realtime_mobile_ticket_open")

        # --- 테스트 1: PC → 모바일 ---
        print("\n  [테스트 1] PC → 모바일 전송")
        ts = int(time.time())
        msg_pc = f"PC 테스트 메시지 {ts}"

        # PC에서 메시지 전송
        page_pc.locator("textarea").fill(msg_pc)
        page_pc.keyboard.press("Enter")
        time.sleep(3)  # 실시간 전파 대기

        screenshot(page_mobile, "realtime_test1_mobile_after_pc_send")
        mobile_has_msg = page_mobile.locator(f"text={msg_pc}").is_visible()
        print(f"  PC→모바일 실시간: {'PASS' if mobile_has_msg else 'FAIL'}")

        # --- 테스트 2: 모바일 → PC ---
        print("\n  [테스트 2] 모바일 → PC 전송")
        msg_mobile = f"모바일 테스트 메시지 {ts}"

        page_mobile.locator("textarea").fill(msg_mobile)
        page_mobile.keyboard.press("Enter")
        time.sleep(3)

        screenshot(page_pc, "realtime_test2_pc_after_mobile_send")
        pc_has_msg = page_pc.locator(f"text={msg_mobile}").is_visible()
        print(f"  모바일→PC 실시간: {'PASS' if pc_has_msg else 'FAIL'}")

        # 최종 스크린샷
        screenshot(page_pc, "realtime_final_pc")
        screenshot(page_mobile, "realtime_final_mobile")

    finally:
        browser_pc.close()
        browser_mobile.close()


def main():
    import os
    os.makedirs("tests/screenshots", exist_ok=True)

    with sync_playwright() as p:
        # 기본 라우팅 테스트
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        test_routing(page)
        browser.close()

        # 실시간 채팅 테스트
        test_realtime_two_contexts(p)

    print("\n=== 테스트 완료 ===")
    print("스크린샷 위치: tests/screenshots/")


if __name__ == "__main__":
    main()
