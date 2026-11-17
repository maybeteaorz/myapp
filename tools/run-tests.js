/**
 * 测试运行器：node tools/run-tests.js phase1|acceptance|all
 * 每个用例前重置为空白数据，用例内部自行造数，保证互不影响。
 */
const { launch, sleep } = require('./cdp');
const F = require('./fixtures');

const suiteName = process.argv[2] || 'all';
const SUITES = {
  phase1: () => require('./tests/phase1'),
  acceptance: () => require('./tests/acceptance'),
  acceptance2: () => require('./tests/acceptance2')
};

const list = [];
const t = {
  F,
  test(name, fn) { list.push({ name, fn }); },
  shot(name) { return `tools/shots/${name}.png`; }
};

async function main() {
  const ping = await fetch(F.BASE + '/').then(r => r.status).catch(() => 0);
  if (ping !== 200) {
    console.error('服务未启动，请先运行 node server.js');
    process.exit(1);
  }

  const names = suiteName === 'all' ? Object.keys(SUITES) : [suiteName];
  for (const n of names) {
    if (!SUITES[n]) { console.error('未知测试套件: ' + n); process.exit(1); }
    await SUITES[n]().run(t);
  }

  const { page, close } = await launch();
  t.page = page;
  let pass = 0;
  const fails = [];

  for (const item of list) {
    try {
      // 顺序很关键：先导航（让上一页挂起的防抖保存经 sendBeacon 落盘），
      // 再重置为空白数据，最后重载页面 —— 保证每个用例从干净的空数据开始。
      await page.goto(F.BASE + '/#/home');
      await F.blankWrite();
      await page.reload();
      await item.fn(t);
      pass++;
      console.log(`  ✓ ${item.name}`);
    } catch (e) {
      fails.push({ name: item.name, msg: e.message });
      console.log(`  ✗ ${item.name}\n      → ${e.message}`);
    }
  }

  const errs = page.consoleErrors.filter(e => !/favicon/i.test(e));
  console.log('\n' + '─'.repeat(60));
  console.log(`通过 ${pass} / ${list.length}`);
  if (fails.length) {
    console.log('失败用例：');
    fails.forEach(f => console.log(`  - ${f.name}: ${f.msg}`));
  }
  if (errs.length) console.log('页面控制台错误：\n  ' + errs.slice(0, 10).join('\n  '));

  await close();
  process.exit(fails.length || errs.length ? 1 : 0);
}

main().catch(e => { console.error('运行器异常:', e); process.exit(1); });
