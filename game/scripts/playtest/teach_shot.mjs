import puppeteer from 'puppeteer'
const browser = await puppeteer.launch({
  headless: true,
  args: ['--window-size=1936,1180', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1920, height: 1080 },
})
const page = await browser.newPage()
await page.goto('http://localhost:5173/play/performance-review?photomode=priya', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => window.__fight && window.__fight.fight.started, { timeout: 45000 })
await new Promise((r) => setTimeout(r, 1500))
// hold block and wait to get grabbed
await page.keyboard.down('KeyS')
try {
  await page.waitForFunction(() => window.__fight.fight.teachGrabT > 60, { timeout: 30000 })
  await new Promise((r) => setTimeout(r, 120))
  const txt = await page.evaluate(() => document.body.innerText)
  const shown = /GRABBED — throws go THROUGH block/.test(txt)
  console.log(shown ? '✓ banner renders in the live HUD' : '✗ flag set but banner NOT in DOM')
  await page.screenshot({ path: 'playtest-captures/teach-grab-banner.png' })
  console.log('screenshot: playtest-captures/teach-grab-banner.png')
} catch {
  console.log('✗ never got grabbed while blocking (30s)')
}
await page.keyboard.up('KeyS')
await browser.close()
