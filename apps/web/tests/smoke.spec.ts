import { expect, test } from '@playwright/test';

const PRODUCT = '/adaezeprints/ankara-print-pattern-pack-40-designs';

test('store page: content, tags and JSON-LD', async ({ page }) => {
  const res = await page.goto('/adaezeprints');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Adaeze Prints');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Adaeze Prints on Nexa Hub',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://nexahub.app/adaezeprints',
  );
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld['@type']).toBe('ItemList');
  await expect(page.getByTestId('product-card-ankara-print-pattern-pack-40-designs')).toBeVisible();
});

test('product page: price in preview tags, Buy in the app, no checkout', async ({ page }) => {
  const res = await page.goto(PRODUCT);
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Ankara Print Pattern Pack (40 designs) – ₦4,500',
  );
  await expect(page.locator('meta[property="product:price:amount"]')).toHaveAttribute(
    'content',
    '4500.00',
  );
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld.offers).toMatchObject({ price: '4500.00', priceCurrency: 'NGN' });
  await expect(page.getByTestId('open-in-app')).toHaveText('Buy in the app');
  await expect(
    page.locator('form, input[type="password"], input[autocomplete="cc-number"]'),
  ).toHaveCount(0);
});

test('old slug → 308 to the new slug', async ({ request }) => {
  const res = await request.get('/adaezestudio', { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers().location).toBe('/adaezeprints');
});

for (const path of [
  '/lensbyemeka',
  '/no-such-store',
  '/adaezeprints/asoke-pattern-pack-coming-soon',
  '/@nobody_here',
]) {
  test(`404 + noindex: ${path}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
    await expect(page.getByTestId('not-found')).toContainText('Discover stores in the app');
  });
}

test('?ref= code is shown, copyable and passed to the store link', async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`${PRODUCT}?ref=ada25`);
  await expect(page.getByTestId('ref-box')).toContainText('Use code ADA25 when you sign up');
  await page.getByTestId('ref-copy').click();
  await expect(page.getByTestId('ref-copy')).toHaveText('Copied');
  if (info.project.name === 'android') {
    await expect(page.getByTestId('get-app')).toHaveAttribute('href', /referrer=ref%3DADA25/);
    await expect(page.getByTestId('open-in-app')).toHaveAttribute(
      'href',
      /^intent:\/\/nexahub\.app\/adaezeprints\/.*\?ref=ADA25#Intent;/,
    );
  }
});

test('Android gets its own dismissible banner; iPhone gets the Smart App Banner tag', async ({
  page,
}, info) => {
  await page.goto('/adaezeprints');
  await expect(page.locator('meta[name="apple-itunes-app"]')).toHaveAttribute(
    'content',
    /app-id=.*app-argument=https:\/\/nexahub\.app\/adaezeprints/,
  );
  if (info.project.name === 'android') {
    await page.getByTestId('android-banner-close').click();
    await expect(page.getByTestId('android-banner')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('store-meta')).toBeVisible();
    await expect(page.getByTestId('android-banner')).toHaveCount(0);
  } else {
    await expect(page.getByTestId('android-banner')).toHaveCount(0);
    await expect(page.getByTestId('open-in-app')).toHaveAttribute('href', 'nexahub://adaezeprints');
  }
});

test('sitemap, robots and well-known files', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.headers()['content-type']).toContain('xml');
  const xml = await sitemap.text();
  expect(xml).toContain('https://nexahub.app/adaezeprints</loc>');
  expect(xml).not.toContain('lensbyemeka');
  expect(xml).not.toContain('asoke-pattern-pack');
  expect(await (await request.get('/robots.txt')).text()).toContain(
    'Sitemap: https://nexahub.app/sitemap.xml',
  );
  for (const path of ['/.well-known/apple-app-site-association', '/.well-known/assetlinks.json']) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('application/json');
  }
});

test('profile page at /@username', async ({ page }) => {
  const res = await page.goto('/@adaeze');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Adaeze Okafor');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://nexahub.app/@adaeze',
  );
});
