// B2 end-to-end: Jira Run story points → invite line → starting Alignment.
import puppeteer from 'puppeteer'
const browser = await puppeteer.launch({ headless: true, args: ['--mute-audio'], defaultViewport: { width: 1600, height: 900 } })
const page = await browser.newPage()
await page.goto('http://localhost:5173/play', { waitUntil: 'domcontentloaded', timeout: 90000 })
// bank 1,700 story points as the Phase 2 receipt (→ 4 bars, the cap)
await page.evaluate(() => {
  const c = JSON.parse(localStorage.getItem('blocked.campaign.v1') ?? '{}')
  c.phase2 = { updatesDeposited: 4, storyPoints: 1700, distractionsSurvived: 9 }
  localStorage.setItem('blocked.campaign.v1', JSON.stringify(c))
})
await page.goto('http://localhost:5173/play/performance-review', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForFunction(() => document.body.innerText.includes('STARTS NOW'), { timeout: 60000 })
await page.evaluate(() => {
  const el = [...document.querySelectorAll('[style*="cursor: pointer"], [style*="cursor:pointer"]')].find((x) => /STARTS NOW/.test(x.innerText))
  el?.click()
})
await new Promise((r) => setTimeout(r, 600))
const invite = await page.evaluate(() => document.body.innerText)
const inviteOK = /Sprint credit: start with 4 Alignment/.test(invite) && /1,700 story points/.test(invite)
console.log(inviteOK ? '✓ invite shows the sprint credit (4 bars, 1,700 sp)' : '✗ invite line missing:\n' + invite.slice(0, 400))
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /JOIN MEETING/i.test(x.innerText))
  b?.click()
})
await new Promise((r) => setTimeout(r, 400))
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /Join now/i.test(x.innerText))
  b?.click()
})
await page.waitForFunction(() => window.__fight && window.__fight.fight.started, { timeout: 30000 })
const meter = await page.evaluate(() => window.__fight.leonard.meter)
console.log(meter === 4 ? '✓ fight starts with 4 Alignment bars' : `✗ meter is ${meter}, expected 4`)
await browser.close()
process.exit(inviteOK && meter === 4 ? 0 : 1)
