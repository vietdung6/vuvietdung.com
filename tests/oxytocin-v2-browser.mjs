import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { chromium, devices } from 'playwright';

// Genuine Chromium E2E against a temporary SQLite file and PHP built-in HTTP server.
// This never connects to the production database or authenticates with a real password.
const root = mkdtempSync(join(tmpdir(), 'oxy-v2-e2e-'));
const env = {
  ...process.env,
  OXYTOCIN_V2_DB_PATH: join(root, 'temporary-oxytocin-v2.db'),
  OXYTOCIN_V2_TEST_MODE: '1'
};
function cli(...args) {
  const result = spawnSync('php', args, { env, encoding: 'utf8', timeout: 30_000 });
  assert.equal(result.status, 0, result.stderr + result.stdout);
}
let server;
let browser;
let serverOutput = '';
const origin = 'http://127.0.0.1:18179';
const at = pathname => origin + '/oxytocin/v2/' + pathname;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function ready() {
  for (let attempt = 0; attempt < 35; attempt++) {
    try {
      const response = await fetch(at('index.php'));
      if (response.status === 200) return;
    } catch (_) {}
    await sleep(200);
  }
  throw new Error('Local PHP server did not start: ' + serverOutput.slice(-2500));
}

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth
  }));
  assert(dimensions.scroll <= dimensions.viewport + 2,
    label + ': horizontal overflow: ' + JSON.stringify(dimensions));
}

try {
  cli('oxytocin/v2/init.php');
  cli('tests/oxytocin-v2-reader-fixture.php');
  server = spawn('php', ['-S', '127.0.0.1:18179', '-t', '.'], { env, stdio: ['ignore','ignore','pipe'] });
  server.stderr.on('data', data => { serverOutput += data.toString(); });
  await ready();

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(at('index.php'));
  assert.equal(await page.locator('.v2-parts-grid > a.v2-part-card').count(), 1,
    'Homepage contains one published Part as an actual link');
  assert.equal(await page.locator('details, summary').count(), 0,
    'Homepage must navigate to another page, never expand in place');
  assert.equal(await page.locator('#toc-title').innerText(), 'Mục lục',
    'Editorial table-of-contents heading exists');
  assert((await page.locator('.v2-library-title').evaluate(node =>
    getComputedStyle(node).fontFamily)).includes('Cormorant Garamond'),
    'Vietnamese section heading uses original novel typography');
  assert((await page.locator('.v2-part-card .arc-card-title').evaluate(node =>
    getComputedStyle(node).fontFamily)).includes('Cinzel'),
    'Original cover-title typography is restored');
  assert.equal(await page.locator('svg').count(), 0,
    'No decorative SVG icons appear on the reader');
  assert.equal(await page.locator('.v2-library-eyebrow, .v2-card-open').count(), 0,
    'Cover has no repeated category label or decorative open prompt');
  assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).fontSize), '16.5px',
    'Default reading typography is slightly smaller');
  assert(!(await page.locator('body').innerText()).includes('Trang riêng của phần'));
  assert(!(await page.locator('body').innerText()).includes('SECRET_DRAFT_SHOULD_NOT_LEAK'));
  await assertNoOverflow(page, 'Desktop cover');
  await page.locator('.v2-part-card').click();
  assert(page.url().includes('part.php?id=1'), 'Clicking a Part opens a separate page');
  assert.equal(await page.locator('.v2-arc-shelf .episode-card').count(), 2,
    'Part page shows the original episode cards');
  assert.equal(await page.locator('.ep-card-badge').count(), 0,
    'Episode numbers appear once; do not repeat them in a badge');
  assert.equal(await page.locator('svg').count(), 0, 'Part page has no SVG icons');
  await page.locator('.v2-arc-heading a').click();
  assert(page.url().includes('arc.php?id=1'), 'Arc heading navigates to the Arc page');
  assert.equal(await page.locator('.episode-cards .episode-card').count(), 2,
    'Arc page contains episode cards');
  assert.equal(await page.locator('svg').count(), 0, 'Arc page has no SVG icons');
  await page.locator('.episode-card').first().click();
  assert(page.url().includes('episode.php?id=1'), 'Episode card navigates to chapter list');
  assert.equal(await page.locator('.chapter-list a').count(), 2,
    'Episode page contains only published chapters');
  assert.equal(await page.locator('.v2-episode-chapter-heading .reader-primary').count(), 1,
    'One inline read-the-entire-episode action accompanies the chapter list');
  assert.equal(await page.locator('.ep-label-badge').count(), 0,
    'Episode header does not repeat the part badge');
  assert.equal(await page.locator('.chapter-list a').first().evaluate(node => getComputedStyle(node).display), 'grid',
    'Chapter links form compact two-column editorial rows');
  assert.equal(await page.locator('svg').count(), 0, 'Episode page has no SVG icons');
  await page.goto(at('episode.php?id=1'));
  assert.equal(await page.locator('.chapter-list a').count(), 2, 'Episode lists only published chapters');
  await page.locator('a.reader-primary').click();
  assert.equal(await page.locator('section.v2-full-chapter').count(), 2,
    'Full episode shows two published chapters');
  assert.equal(await page.locator('.v2-chapter-divider').count(), 1,
    'Exactly one understated rule separates two chapters');
  assert.equal(await page.locator('.v2-full-heading').count(), 0,
    'Continuous reading does not repeat large chapter headers');
  assert.equal(await page.locator('section.v2-full-chapter[aria-label^="Chương"]').count(), 2,
    'Chapter boundaries remain accessible for assistive technology');
  assert.equal(await page.locator('.v2-chapter-divider').evaluate(node =>
    getComputedStyle(node).height), '1px', 'Chapter separator is a hairline');
  assert.equal(await page.locator('article').filter({ hasText: 'PUBLIC_ONE_UNIQUE' }).count(), 1);
  assert.equal(await page.locator('article').filter({ hasText: 'PUBLIC_TWO_UNIQUE' }).count(), 1);
  assert(!(await page.content()).includes('SECRET_DRAFT_SHOULD_NOT_LEAK'));

  // Global chapter navigation works across episode boundaries.
  await page.goto(at('chapter.php?id=1'));
  assert.equal(await page.locator('a[rel="next"]').getAttribute('href'), 'chapter.php?id=3');
  await page.locator('a[rel="next"]').click();
  assert(page.url().endsWith('chapter.php?id=3'));
  assert.equal(await page.locator('a[rel="next"]').getAttribute('href'), 'chapter.php?id=4');
  assert.equal(await page.locator('.v2-backlinks, .reader-tools a').count(), 0,
    'Reader no longer duplicates table-of-contents and return links');
  const breadcrumbLinkStyle = await page.locator('.v2-breadcrumb a').first().evaluate(node => ({
    linkColor: getComputedStyle(node).color,
    breadcrumbColor: getComputedStyle(node.closest('.v2-breadcrumb')).color,
    textDecoration: getComputedStyle(node).textDecorationLine
  }));
  assert.equal(breadcrumbLinkStyle.linkColor, breadcrumbLinkStyle.breadcrumbColor,
    'Visited breadcrumb uses the same neutral color as surrounding navigation');
  assert.equal(breadcrumbLinkStyle.textDecoration, 'none',
    'Breadcrumb is not a browser-default purple underlined link');

  // Reader settings use the original floating controls after scrolling.
  await page.evaluate(() => {
    scrollTo({ top: 440, behavior: 'instant' });
    dispatchEvent(new Event('scroll'));
  });
  await page.waitForFunction(() => document.querySelector('.reader-tools')?.classList.contains('visible'));
  assert.equal(await page.locator('.reader-tools svg').count(), 5,
    'Only theme, font size, and fullscreen controls remain');
  assert.equal(await page.locator('svg:not(.reader-tools svg)').count(), 0,
    'No icons appear in titles, cards, breadcrumbs or other reader UI');
  await page.locator('#readerTheme').click();
  await page.locator('#readerFont').click();
  await page.goto(at('chapter.php?id=1'));
  assert(await page.locator('body').evaluate(node => node.classList.contains('theme-light')),
    'Light background persisted');
  assert(await page.locator('body').evaluate(node => node.classList.contains('font-large')),
    'Larger font persisted');
  // Fullscreen expands the reading page and hides surrounding navigation.
  await page.evaluate(() => {
    scrollTo({ top: 440, behavior: 'instant' });
    dispatchEvent(new Event('scroll'));
  });
  await page.waitForFunction(() => document.querySelector('.reader-tools')?.classList.contains('visible'));
  await page.locator('#readerFullscreen').click();
  assert(await page.locator('body').evaluate(node => node.classList.contains('reader-immersive')),
    'Fullscreen button enters distraction-free reading mode');
  assert.equal(await page.locator('#readerFullscreen').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.reader-topbar').evaluate(node => getComputedStyle(node).display), 'none',
    'Fullscreen hides non-reading navigation');
  assert.equal(await page.locator('.reader-tools svg').count(), 5,
    'Fullscreen changes the visible glyph without creating additional icons');
  assert.equal(await page.locator('.icon-expand').evaluate(node => getComputedStyle(node).display),
    'none', 'Expanded reader displays the collapse glyph');
  assert.equal(await page.locator('.icon-collapse').evaluate(node => getComputedStyle(node).display),
    'block');
  await page.locator('#readerFullscreen').click();
  await page.waitForFunction(() => !document.fullscreenElement);
  assert(!await page.locator('body').evaluate(node => node.classList.contains('reader-immersive')),
    'Reader exits fullscreen without changing saved font or theme');
  assert.equal(await page.locator('.icon-expand').evaluate(node => getComputedStyle(node).display),
    'block', 'Normal mode restores the expand glyph');

  // Restore reading position in the second chapter of full-episode mode.
  await page.goto(at('episode-read.php?id=1'));
  await page.evaluate(() => {
    const second = document.querySelector('#chapter-3');
    const target = second.getBoundingClientRect().top + window.scrollY + 80;
    // The existing OXYTOCIN stylesheet sets scroll-behavior:smooth;
    // force instant movement to make the scroll-position check deterministic.
    window.scrollTo({ top: target, behavior: 'instant' });
    window.dispatchEvent(new Event('scroll'));
  });
  await page.waitForFunction(() => {
    const stored = localStorage.getItem('oxytocin:v2:reading-progress');
    return stored && JSON.parse(stored).chapterId === 3;
  }, null, { timeout: 5000 });
  await page.reload();
  await page.waitForTimeout(450);
  const savedY = await page.evaluate(() => window.scrollY);
  assert(savedY > 500, 'Full-episode reading position must restore into chapter two');
  await page.goto(at('index.php'));
  const continueLink = page.locator('#continueReading');
  assert(await continueLink.isVisible(), 'Continue-reading link appears');
  assert.equal(await continueLink.getAttribute('href'), 'episode-read.php?id=1');

  // Author flow reuses the existing OXYTOCIN PHPSESSID.
  const admin = await context.newPage();
  admin.on('dialog', dialog => dialog.accept());
  admin.on('pageerror', error => errors.push('admin: ' + error.message));
  await admin.goto(at('admin.php'));
  assert.equal(await admin.locator('#chapterForm').count(), 0, 'Unauthenticated author cannot edit');
  assert(await admin.getByRole('link', { name: 'Đăng nhập admin OXYTOCIN' }).isVisible());
  await admin.goto(origin + '/tests/oxytocin-v2-legacy-login.php');
  assert((await admin.locator('body').innerText()).includes('TEST SESSION READY'));
  await admin.goto(at('admin.php'));
  assert.equal(await admin.locator('#chapterForm').count(), 1, 'Existing admin session unlocks v2');
  assert.equal(await admin.locator('.sidebar nav a span').count(), 0,
    'Admin tabs do not duplicate numeric totals shown in the dashboard');
  await admin.goto(at('admin.php?tab=arcs'));
  assert(await admin.getByText('Arc số mấy trong phần?').isVisible(),
    'Arc field identifies a position in its Part, not a count');
  await admin.goto(at('admin.php?tab=episodes'));
  assert(await admin.getByText('Tập số mấy trong Arc?').isVisible(),
    'Episode field identifies a position in its Arc, not a count');
  assert.equal(await admin.locator('table thead th').count(), 3,
    'Episode list does not contain an empty status column');
  assert((await admin.locator('table thead').textContent()).includes('Số hiển thị'),
    'Admin table explains that the first column is a displayed number');

  // The restored Settings tab edits site metadata and synopsis without publishing a chapter.
  await admin.goto(at('admin.php?tab=settings'));
  assert(await admin.getByRole('link', { name: /Cài đặt trang/ }).isVisible(),
    'Settings tab is visible in the navigation');
  assert.equal(await admin.locator('#siteSettingsForm').count(), 1,
    'Settings form is available even before any new content');
  await admin.locator('#siteSettingsForm input[name="site_genre"]').fill('PSYCHOLOGICAL NOIR');
  await admin.locator('#siteSettingsForm textarea[name="synopsis"]')
    .fill('SITE_SYNOPSIS_VISIBLE\\n\\n**Nhấn mạnh** và *màu đỏ*');
  await admin.getByRole('button', { name: 'Lưu cài đặt' }).click();
  await admin.waitForURL(/tab=settings/);
  assert((await admin.locator('#siteSettingsForm textarea[name="synopsis"]').inputValue())
    .includes('SITE_SYNOPSIS_VISIBLE'));
  await page.goto(at('index.php'));
  assert((await page.locator('.synopsis').innerText()).includes('SITE_SYNOPSIS_VISIBLE'),
    'Saved synopsis appears on v2 homepage');
  assert((await page.locator('.meta').innerText()).includes('PSYCHOLOGICAL NOIR'),
    'Saved website metadata appears on homepage');
  assert.equal(await page.locator('.synopsis .highlight-bright').count(), 1);
  assert.equal(await page.locator('.synopsis .highlight-red').count(), 1);
  await admin.goto(at('admin.php?tab=chapters'));
  assert.equal(await admin.locator('#chapterForm').count(), 1,
    'Switching back to Chapter editor retains existing CRUD');

  // Device-local automatic recovery must not publish.
  const editor = admin.locator('#chapterEditor');
  await editor.fill('RECOVER_ME_LOCAL');
  await admin.waitForTimeout(1000);
  assert((await admin.evaluate(() => localStorage.getItem('oxytocin:v2:chapter:new')))
    ?.includes('RECOVER_ME_LOCAL'), 'Local recovery snapshot exists');
  await admin.reload();
  assert(await admin.locator('#recoveryBanner').isVisible(), 'Recover prompt appears');
  await admin.locator('#recoverDraft').click();
  assert((await admin.locator('#chapterEditor').innerText()).includes('RECOVER_ME_LOCAL'));

  await admin.locator('#chapterForm input[name="title"]').fill('BROWSER_DRAFT');
  await admin.locator('#chapterEditor').fill('BROWSER_DRAFT_EDITOR');
  await admin.locator('#chapterForm select[name="episode_id"]').selectOption('1');
  const popupWait = admin.waitForEvent('popup');
  await admin.locator('button[formaction="preview.php"]').click();
  const popup = await popupWait;
  await popup.waitForLoadState('domcontentloaded');
  assert((await popup.locator('.episode-body').innerText()).includes('BROWSER_DRAFT_EDITOR'),
    'Preview reflects unsaved editor text');
  assert((await popup.locator('body').innerText()).includes('BẢN XEM TRƯỚC'),
    'Preview clearly labeled');
  await popup.close();

  await page.goto(at('index.php'));
  assert(!(await page.content()).includes('BROWSER_DRAFT'),
    'Preview did not make draft public');
  await admin.locator('button[name="chapter_intent"][value="save"]').click();
  await admin.waitForURL(/saved=1/);
  await page.reload();
  assert(!(await page.content()).includes('BROWSER_DRAFT'),
    'Save draft never publishes');
  const draftRow = admin.locator('tr').filter({ hasText: 'BROWSER_DRAFT' });
  const href = await draftRow.locator('a[href*="edit="]').getAttribute('href');
  const id = Number(new URL(href, at('admin.php')).searchParams.get('edit'));
  assert(Number.isSafeInteger(id) && id > 0);
  await admin.goto(at('admin.php?tab=chapters&edit=' + id));
  await admin.locator('button[name="chapter_intent"][value="save_publish"]').click();
  await admin.waitForURL(/saved=1/);
  await page.reload();
  assert(!(await page.content()).includes('BROWSER_DRAFT'),
    'Home stays a Part-only index, even after another chapter is published');
  await page.goto(at('episode.php?id=1'));
  assert((await page.content()).includes('BROWSER_DRAFT'),
    'Published chapter appears in its separate Episode page');
  const exposed = await page.request.get(at('chapter.php?id=' + id));
  assert.equal(exposed.status(), 200);
  assert((await exposed.text()).includes('BROWSER_DRAFT_EDITOR'));

  // Update published chapter is a separate confirmed operation.
  await admin.locator('#chapterEditor').fill('BROWSER_PUBLISHED_UPDATE');
  await admin.locator('button[name="chapter_intent"][value="update_published"]').click();
  await admin.waitForURL(/saved=1/);
  assert((await (await page.request.get(at('chapter.php?id=' + id))).text())
    .includes('BROWSER_PUBLISHED_UPDATE'));

  // Revoke publication; direct stale URL becomes unavailable.
  await admin.goto(at('admin.php?tab=chapters'));
  await admin.locator('tr').filter({ hasText: 'BROWSER_DRAFT' })
    .getByRole('button', { name: 'Hủy đăng' }).click();
  assert.equal((await page.request.get(at('chapter.php?id=' + id))).status(), 404);
  await context.close();

  // A second viewport catches layout regressions in the mobile reading experience.
  const mobileContext = await browser.newContext({ ...devices['iPhone 13'] });
  const mobile = await mobileContext.newPage();
  mobile.on('pageerror', error => errors.push('mobile: ' + error.message));
  await mobile.goto(at('index.php'));
  await assertNoOverflow(mobile, 'Mobile cover');
  await mobile.locator('.v2-part-card').click();
  await assertNoOverflow(mobile, 'Mobile Part');
  await mobile.locator('.v2-arc-heading a').click();
  await assertNoOverflow(mobile, 'Mobile Arc');
  assert.equal(await mobile.locator('svg').count(), 0, 'Mobile reader has no SVG icons');
  await mobile.goto(at('episode.php?id=1'));
  await assertNoOverflow(mobile, 'Mobile episode page');
  await mobile.locator('a.reader-primary').click();
  await assertNoOverflow(mobile, 'Mobile full episode');
  assert.equal(await mobile.locator('section.v2-full-chapter').count(), 2);
  await mobile.evaluate(() => {
    scrollTo({ top: 440, behavior: 'instant' });
    dispatchEvent(new Event('scroll'));
  });
  await mobile.waitForFunction(() => document.querySelector('.reader-tools')?.classList.contains('visible'));
  assert.equal(await mobile.locator('.reader-tools button, .reader-tools a').count(), 3,
    'Mobile reading controls have just three compact actions');
  assert.equal(await mobile.locator('svg:not(.reader-tools svg)').count(), 0,
    'Mobile navigation outside reading controls stays icon-free');
  await mobile.locator('#readerFont').click();
  assert(await mobile.locator('body').evaluate(node => node.classList.contains('font-large')));
  // Force the no-Fullscreen-API path (e.g. iPhone Safari) in mobile Chromium.
  await mobile.evaluate(() => Object.defineProperty(document, 'fullscreenEnabled',
    { configurable: true, value: false }));
  await mobile.locator('#readerFullscreen').click();
  assert(await mobile.locator('body').evaluate(node => node.classList.contains('reader-immersive')),
    'iPhone fallback keeps a distraction-free reader without browser fullscreen');
  assert.equal(await mobile.locator('#readerFullscreen').getAttribute('aria-pressed'), 'true');
  await assertNoOverflow(mobile, 'Mobile immersive reading mode');
  await mobile.locator('#readerFullscreen').click();
  assert(!await mobile.locator('body').evaluate(node => node.classList.contains('reader-immersive')));
  await mobileContext.close();

  assert.deepEqual(errors, [], 'No uncaught browser JavaScript errors: ' + errors.join(' | '));
  console.log('PASS: Chromium desktop/mobile reading, responsive layouts, preferences, resume, admin login, local recovery, preview, draft/publish/update/unpublish, no draft leakage');
} finally {
  if (browser) await browser.close();
  if (server) server.kill('SIGTERM');
  rmSync(root, { recursive: true, force: true });
}
