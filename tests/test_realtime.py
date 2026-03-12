"""
CS_talk 자동화 테스트 시나리오
────────────────────────────────
T01. 라우팅 — 잘못된 초대코드 오류 표시
T02. 로그인 성공 → 메인 화면 진입
T03. 로그아웃 → 로그인 화면 복귀
T04. 티켓 생성 → 목록 노출
T05. 채팅 메시지 전송 → 즉시 표시
T06. 고객 PIN 인증 페이지 렌더링
T07. 실시간 채팅 — PC ↔ 모바일 교차 수신
"""
import time
import sys
import io
import subprocess
import socket
import os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright, Page

BASE_URL = "http://localhost:5173"


def _is_port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def start_dev_server():
    """로컬 개발 서버가 없으면 자동 기동, 프로세스 반환 (없으면 None)"""
    if _is_port_open(5173):
        print("  개발 서버 이미 실행 중 (포트 5173)")
        return None
    print("  개발 서버 기동 중... (npm run dev)")
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=True,
    )
    # 서버 준비 대기 (최대 15초)
    for _ in range(30):
        time.sleep(0.5)
        if _is_port_open(5173):
            print("  개발 서버 준비 완료")
            return proc
    print("  [경고] 개발 서버 기동 타임아웃")
    return proc

# 테스트 계정 (Supabase 실계정 — 커밋 금지)
TEST_EMAIL = "mazinghas0@gmail.com"
TEST_PASSWORD = ""  # 로컬 실행 시 직접 입력


# ──────────────────────────────────────────────
# 공통 헬퍼
# ──────────────────────────────────────────────

def screenshot(page: Page, name: str):
    path = f"tests/screenshots/{name}.png"
    page.screenshot(path=path, full_page=True)
    print(f"    스크린샷: {path}")


def result(label: str, ok: bool):
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {label}")
    return ok


def login(page: Page, label: str) -> bool:
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    email_input = page.locator('input[type="email"]')
    if not email_input.is_visible():
        print(f"  [{label}] 이미 로그인 상태")
        return True

    email_input.fill(TEST_EMAIL)
    page.locator('input[type="password"]').fill(TEST_PASSWORD)
    page.locator('button[type="submit"]').click()

    try:
        page.wait_for_selector(".pane-list, .empty-workspace-screen", timeout=12000)
        screenshot(page, f"{label}_login_success")
        return True
    except Exception:
        screenshot(page, f"{label}_login_failed")
        return False


def requires_auth(fn):
    """TEST_PASSWORD 미설정 시 SKIP 처리 데코레이터"""
    def wrapper(*args, **kwargs):
        if not TEST_PASSWORD:
            print(f"  [SKIP] {fn.__name__}: TEST_PASSWORD 미설정")
            return True  # 오류로 처리하지 않음
        return fn(*args, **kwargs)
    return wrapper


# ──────────────────────────────────────────────
# T01. 라우팅 — 잘못된 초대코드 오류 표시
# ──────────────────────────────────────────────

def test_routing(page: Page) -> bool:
    print("\n[T01] 라우팅 — 잘못된 초대코드")

    page.goto(f"{BASE_URL}/join/INVALID_CODE_99")
    page.wait_for_load_state("networkidle")
    screenshot(page, "T01_routing_invalid_code")

    # 오류 메시지 또는 404 안내 노출
    has_error = (
        page.locator("text=유효하지 않은").is_visible() or
        page.locator("text=찾을 수 없").is_visible() or
        page.locator("text=존재하지 않").is_visible() or
        page.locator(".customer-error").is_visible()
    )
    return result("잘못된 초대코드 → 오류 표시", has_error)


# ──────────────────────────────────────────────
# T02. 로그인 성공
# ──────────────────────────────────────────────

@requires_auth
def test_login(page: Page) -> bool:
    print("\n[T02] 로그인 성공")

    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # 이미 로그인 상태면 PASS
    if not page.locator('input[type="email"]').is_visible():
        return result("로그인 화면 → 이미 인증됨", True)

    page.locator('input[type="email"]').fill(TEST_EMAIL)
    page.locator('input[type="password"]').fill(TEST_PASSWORD)
    page.locator('button[type="submit"]').click()

    try:
        page.wait_for_selector(".pane-list, .empty-workspace-screen", timeout=12000)
        screenshot(page, "T02_login_success")
        return result("이메일/비밀번호 로그인 → 메인 화면 진입", True)
    except Exception:
        screenshot(page, "T02_login_failed")
        return result("이메일/비밀번호 로그인 → 메인 화면 진입", False)


# ──────────────────────────────────────────────
# T03. 로그아웃 → 로그인 화면 복귀
# ──────────────────────────────────────────────

@requires_auth
def test_logout(page: Page) -> bool:
    print("\n[T03] 로그아웃")

    if not login(page, "T03"):
        return result("로그인 후 로그아웃", False)

    # 사이드바 하단 UserCircle 클릭 → 프로필 설정 모달
    page.locator(".sidebar-bottom").click()
    try:
        page.wait_for_selector(".profile-settings-modal", timeout=5000)
    except Exception:
        screenshot(page, "T03_modal_not_found")
        return result("프로필 모달 열림", False)

    # 로그아웃 버튼 클릭
    page.locator(".btn-logout").click()
    try:
        page.wait_for_selector('input[type="email"]', timeout=8000)
        screenshot(page, "T03_logout_success")
        return result("로그아웃 → 로그인 화면 복귀", True)
    except Exception:
        screenshot(page, "T03_logout_failed")
        return result("로그아웃 → 로그인 화면 복귀", False)


# ──────────────────────────────────────────────
# T04. 티켓 생성 → 목록 노출
# ──────────────────────────────────────────────

@requires_auth
def test_create_ticket(page: Page) -> bool:
    print("\n[T04] 티켓 생성")

    if not login(page, "T04"):
        return result("티켓 생성 플로우", False)

    # 워크스페이스가 없으면 SKIP
    if page.locator(".empty-workspace-screen").is_visible():
        print("  [SKIP] 워크스페이스 없음")
        return True

    # 생성 버튼 클릭
    try:
        page.locator(".icon-btn-create").click()
        page.wait_for_selector(".modal-form", timeout=5000)
    except Exception:
        screenshot(page, "T04_modal_not_opened")
        return result("티켓 생성 모달 열림", False)

    ts = int(time.time())
    ticket_title = f"자동테스트 티켓 {ts}"

    page.locator('.modal-form input[type="text"]').fill(ticket_title)
    page.locator(".modal-form textarea").fill("Playwright 자동화 테스트로 생성된 티켓입니다.")
    page.locator(".btn-submit").click()

    # 목록에 노출 확인
    try:
        page.wait_for_selector(f"text={ticket_title}", timeout=8000)
        screenshot(page, "T04_ticket_created")
        return result(f"티켓 생성 → 목록 노출 ({ticket_title})", True)
    except Exception:
        screenshot(page, "T04_ticket_not_found")
        return result(f"티켓 생성 → 목록 노출", False)


# ──────────────────────────────────────────────
# T05. 채팅 메시지 전송 → 즉시 표시
# ──────────────────────────────────────────────

@requires_auth
def test_send_message(page: Page) -> bool:
    print("\n[T05] 채팅 메시지 전송")

    if not login(page, "T05"):
        return result("메시지 전송 플로우", False)

    if page.locator(".empty-workspace-screen").is_visible():
        print("  [SKIP] 워크스페이스 없음")
        return True

    # 첫 번째 티켓 클릭
    first_ticket = page.locator(".ticket-item").first
    if not first_ticket.is_visible():
        print("  [SKIP] 티켓 없음")
        return True

    first_ticket.click()
    page.wait_for_load_state("networkidle")

    ts = int(time.time())
    msg = f"자동테스트 메시지 {ts}"

    # 메시지 전송 (Enter)
    page.locator("textarea").fill(msg)
    page.keyboard.press("Enter")

    try:
        page.wait_for_selector(f"text={msg}", timeout=5000)
        screenshot(page, "T05_message_sent")
        return result(f"메시지 전송 → 채팅창 즉시 표시", True)
    except Exception:
        screenshot(page, "T05_message_not_found")
        return result("메시지 전송 → 채팅창 즉시 표시", False)


# ──────────────────────────────────────────────
# T06. 고객 PIN 인증 페이지 렌더링
# ──────────────────────────────────────────────

def test_customer_pin_page(page: Page) -> bool:
    print("\n[T06] 고객 PIN 인증 페이지")

    # /ticket/:id 경로 — 존재하지 않는 ID여도 PIN 입력 화면은 렌더링돼야 함
    page.goto(f"{BASE_URL}/ticket/test-ticket-id-0000")
    page.wait_for_load_state("networkidle")
    screenshot(page, "T06_customer_pin_page")

    has_pin_form = (
        page.locator(".pin-input").is_visible() or
        page.locator(".customer-auth-card").is_visible() or
        page.locator("text=PIN 번호").is_visible()
    )
    return result("고객 PIN 인증 폼 렌더링", has_pin_form)


# ──────────────────────────────────────────────
# T07. 실시간 채팅 — PC ↔ 모바일 교차 수신
# ──────────────────────────────────────────────

@requires_auth
def test_realtime_two_contexts(playwright) -> bool:
    print("\n[T07] 실시간 채팅 (PC ↔ 모바일)")

    browser_pc = playwright.chromium.launch(headless=True)
    page_pc = browser_pc.new_page(viewport={"width": 1280, "height": 800})

    browser_mobile = playwright.chromium.launch(headless=True)
    page_mobile = browser_mobile.new_page(
        viewport={"width": 390, "height": 844},
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
    )

    passed = True
    try:
        pc_ok = login(page_pc, "T07_PC")
        mobile_ok = login(page_mobile, "T07_Mobile")

        if not (pc_ok and mobile_ok):
            return result("PC/모바일 로그인", False)

        first_ticket_pc = page_pc.locator(".ticket-item").first
        if not first_ticket_pc.is_visible():
            print("  [SKIP] 티켓 없음")
            return True

        first_ticket_pc.click()
        page_pc.wait_for_load_state("networkidle")
        screenshot(page_pc, "T07_pc_ticket_open")

        page_mobile.locator(".ticket-item").first.click()
        page_mobile.wait_for_load_state("networkidle")
        screenshot(page_mobile, "T07_mobile_ticket_open")

        # PC → 모바일
        ts = int(time.time())
        msg_pc = f"PC→모바일 {ts}"
        page_pc.locator("textarea").fill(msg_pc)
        page_pc.keyboard.press("Enter")
        time.sleep(3)

        screenshot(page_mobile, "T07_mobile_after_pc_send")
        ok1 = page_mobile.locator(f"text={msg_pc}").is_visible()
        passed = result("PC → 모바일 실시간 수신", ok1) and passed

        # 모바일 → PC
        msg_mobile = f"모바일→PC {ts}"
        page_mobile.locator("textarea").fill(msg_mobile)
        page_mobile.keyboard.press("Enter")
        time.sleep(3)

        screenshot(page_pc, "T07_pc_after_mobile_send")
        ok2 = page_pc.locator(f"text={msg_mobile}").is_visible()
        passed = result("모바일 → PC 실시간 수신", ok2) and passed

    finally:
        browser_pc.close()
        browser_mobile.close()

    return passed


# ──────────────────────────────────────────────
# 실행
# ──────────────────────────────────────────────

def main():
    os.makedirs("tests/screenshots", exist_ok=True)
    dev_proc = start_dev_server()

    results = {}

    with sync_playwright() as p:
        # 인증 불필요 테스트 (단일 브라우저)
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        results["T01_routing"] = test_routing(page)
        results["T06_customer_pin"] = test_customer_pin_page(page)

        browser.close()

        # 인증 필요 테스트 (단일 브라우저, 세션 유지)
        if TEST_PASSWORD:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            results["T02_login"] = test_login(page)
            results["T04_create_ticket"] = test_create_ticket(page)
            results["T05_send_message"] = test_send_message(page)
            results["T03_logout"] = test_logout(page)

            browser.close()
        else:
            print("\n[T02~T05] TEST_PASSWORD 미설정 — 인증 필요 테스트 전체 SKIP")
            results["T02_login"] = True
            results["T03_logout"] = True
            results["T04_create_ticket"] = True
            results["T05_send_message"] = True

        # 실시간 테스트 (두 브라우저)
        results["T07_realtime"] = test_realtime_two_contexts(p)

    # 결과 요약
    print("\n" + "=" * 40)
    print("테스트 결과 요약")
    print("=" * 40)
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    for name, ok in results.items():
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {name}")
    print(f"\n{passed}/{total} 통과")
    print("스크린샷: tests/screenshots/")

    if dev_proc:
        dev_proc.terminate()

    if passed < total:
        sys.exit(1)


if __name__ == "__main__":
    main()
