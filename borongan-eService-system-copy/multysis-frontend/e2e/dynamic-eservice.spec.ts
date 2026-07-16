import { expect, type Page, test } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@eservice.gov.ph';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'borongan2026';
const adminUserId = '00000301-0301-4001-8001-000000000001';
const superAdminRoleId = '00000001-0001-4001-8001-000000000001';
const wildcardPath = '/admin/e-government/:serviceCode';

test('citizens can browse dynamic services and guests are blocked from resident-only certificates', async ({ page }) => {
  await page.goto('/portal/e-services');

  await expect(page).toHaveURL(/\/portal\/e-government$/);
  await expect(page.getByRole('heading', { name: 'E-Government Services' })).toBeVisible();
  await expect(page.getByText('Barangay Certificate Services')).toBeVisible();

  await page.getByRole('button', { name: 'View Services' }).click();
  await expect(page.getByText('Barangay Clearance').first()).toBeVisible();

  await page.getByRole('button', { name: 'Apply as Guest' }).nth(1).click();
  await expect(page).toHaveURL(/\/portal\/apply-as-guest\?serviceId=/);
  await expect(page.getByText('This certificate is for registered residents only')).toBeVisible();
  await expect(page.getByRole('button', { name: /Register as a Resident/ })).toBeVisible();
});

test('wildcard office role can open a dynamic service queue', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByRole('textbox', { name: 'Email Address' }).fill(adminEmail);
  await page.locator('input[placeholder="Enter your password"]').fill(adminPassword);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  await ensureWildcardAccess(page);
  await page.goto('/admin/dashboard');
  await expect(page.getByText('E-government')).toBeVisible();

  await page.goto('/admin/e-government/brgy-clearance');
  await expect(page.getByRole('heading', { name: 'Barangay Clearance' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Applications' })).toBeVisible();

  const serviceResponse = await page.request.get('/api/services/code/brgy-clearance');
  expect(serviceResponse.status()).toBe(200);

  const queueResponse = await page.request.get('/api/transactions/service/BRGY_CLEARANCE');
  expect(queueResponse.status()).toBe(200);
});

async function ensureWildcardAccess(page: Page) {
  await page.evaluate(
    async ({ adminUserId, superAdminRoleId, wildcardPath }) => {
      const request = async (url: string, options: RequestInit = {}) => {
        const response = await fetch(url, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
          ...options,
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(`${options.method || 'GET'} ${url} failed: ${response.status} ${JSON.stringify(body)}`);
        }
        return body;
      };

      const allowedPages = await request(`/api/users/${adminUserId}/allowed-pages`);
      if ((allowedPages.data || []).some((page: { path: string }) => page.path === wildcardPath)) return;

      const pages = await request('/api/pages?page=1&limit=1000');
      let wildcard = (pages.pages || []).find((page: { path: string }) => page.path === wildcardPath);

      if (!wildcard) {
        const created = await request('/api/pages', {
          method: 'POST',
          body: JSON.stringify({
            system: 'core',
            path: wildcardPath,
            name: 'E-Government Services',
          }),
        });
        wildcard = created.data;
      }

      const rolePages = await request(`/api/roles/${superAdminRoleId}/pages`);
      const pageIds = Array.from(new Set([...(rolePages.data || []).map((page: { id: string }) => page.id), wildcard.id]));
      await request(`/api/roles/${superAdminRoleId}/pages`, {
        method: 'PUT',
        body: JSON.stringify({ pageIds }),
      });
    },
    { adminUserId, superAdminRoleId, wildcardPath }
  );
}
