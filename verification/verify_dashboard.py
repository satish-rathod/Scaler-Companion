from playwright.sync_api import sync_playwright, expect

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            page.goto("http://localhost:5173")

            # Use a broader locator first to see what's loading, or increase timeout
            # The h1 has text "Scaler Companion V2".
            # Sometimes hydration takes a split second.
            expect(page.get_by_role("heading", name="Scaler Companion V2")).to_be_visible(timeout=10000)

            # Check for status message
            expect(page.get_by_text("Backend Status: healthy")).to_be_visible(timeout=10000)

            page.screenshot(path="verification/frontend_dashboard.png")
            print("Screenshot saved to verification/frontend_dashboard.png")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/frontend_error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
