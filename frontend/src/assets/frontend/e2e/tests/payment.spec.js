const { test, expect } = require('@playwright/test');

test.describe('Payment / UPI flow', () => {
  test('verify UPI and complete mock payment', async ({ page, baseURL }) => {
    await page.goto('/payment');
    await page.locator('input[name="payment"][value="upi"]').check();
    await page.locator('text=Google Pay').click();
    await page.fill('input[placeholder="name@upi"]', 'alice@upi');

    const [verifyResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/ai/verify-upi') && resp.status() === 200),
      page.click('button:has-text("Verify UPI")')
    ]);

    const verifyJson = await verifyResp.json();
    expect(verifyJson).toHaveProperty('verified', true);

    await page.click('button.proceed-button');
    await expect(page.locator('.modal')).toBeVisible();

    const [processResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/ai/process-payment') && resp.status() === 200),
      page.click('button:has-text("Confirm Payment")')
    ]);

    const processJson = await processResp.json();
    expect(processJson).toHaveProperty('success', true);
    expect(processJson).toHaveProperty('txId');
    await expect(page.locator('.success-popup')).toBeVisible();
    await expect(page.locator('.success-popup')).toContainText('Payment Successful');
  });
});
