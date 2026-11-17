/** 验收 A–E：启动运行、数据不丢、备份恢复、首页、今日计划 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { sleep, modalOk, val, valInput, waitSaveState, ROOT } = require('./helpers');

exports.run = async t => {
  /* ---------- A 启动与运行 ---------- */
  t.test('A1 双击启动能起服务、页面有九个入口（等效验证：服务+页面）', async ({ page }) => {
    const bat = fs.readFileSync(path.join(ROOT, '启动.bat'), 'utf8');
    if (!bat.includes('server.js')) throw new Error('启动.bat 未包含 node server.js');
    const n = await page.count('#nav .nav-item');
    if (n !== 9) throw new Error('导航入口应为 9 个，实际 ' + n);
  });

  t.test('A2 刷新后停在原页面', async ({ page }) => {
    await page.goto(F.BASE + '/#/dev');
    await page.reload();
    const hash = await page.eval('return location.hash;');
    if (hash !== '#/dev') throw new Error('刷新后应停在 #/dev，实际 ' + hash);
    const h1 = await page.eval('return document.querySelector("#app h1").textContent;');
    if (h1 !== '开发工作') throw new Error('刷新后页面内容不对：' + h1);
  });

  t.test('A3 端口被占用自动换 5189', async () => {
    const child = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, NO_OPEN: '1' }, stdio: 'ignore' });
    try {
      let up = false;
      for (let i = 0; i < 40; i++) {
        const s = await fetch('http://127.0.0.1:5189/').then(r => r.status).catch(() => 0);
        if (s === 200) { up = true; break; }
        await sleep(150);
      }
      if (!up) throw new Error('第二实例未在 5189 起来');
      const info = await fetch('http://127.0.0.1:5189/api/info').then(r => r.json());
      if (!info.dataFile) throw new Error('5189 接口异常');
    } finally { child.kill(); await sleep(300); }
  });

  t.test('A4 Alt+1~9 依次切换九个模块', async ({ page }) => {
    await page.goto(F.BASE + '/#/home');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const expect = ['home', 'plan', 'media', 'dev', 'consult', 'fitness', 'diet', 'games', 'settings'];
    for (let i = 0; i < keys.length; i++) {
      await page.eval(`
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(keys[i])}, altKey: true, bubbles: true }));
        return true;`);
      await sleep(120);
      const hash = await page.eval('return location.hash;');
      if (hash !== '#/' + expect[i]) throw new Error(`Alt+${keys[i]} 应到 #/${expect[i]}，实际 ${hash}`);
    }
  });

  /* ---------- B 数据不丢 ---------- */
  t.test('B1 添加计划后 1 秒内显示已保存', async ({ page }) => {
    await page.goto(F.BASE + '/#/plan');
    await page.fill('#npText', 'B1 测试条目', true);
    await waitSaveState(page, '已保存', 1500);
  });

  t.test('B2 刷新后条目仍在原位', async ({ page }) => {
    await page.goto(F.BASE + '/#/plan');
    await page.fill('#npText', 'B2 持久条目', true);
    await waitSaveState(page, '已保存', 1500);
    await page.reload();
    const has = await page.eval('return document.body.innerText.includes("B2 持久条目");');
    if (!has) throw new Error('刷新后条目丢失');
  });

  t.test('B3+B5 服务进程重启后数据完整（等效于重启电脑的数据链路）', async () => {
    const tag = 'B3 重启存活 ' + Date.now();
    const d = F.blank();
    d.memo.push({ id: 'bm3', text: tag, createdAt: new Date().toISOString(), done: false });
    const child1 = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, NO_OPEN: '1' }, stdio: 'ignore' });
    try {
      let port = null;
      for (let i = 0; i < 40; i++) {
        const s5189 = await fetch('http://127.0.0.1:5189/').then(r => r.status).catch(() => 0);
        if (s5189 === 200) { port = 5189; break; }
        await sleep(150);
      }
      if (!port) throw new Error('临时实例未启动');
      const r = await fetch(`http://127.0.0.1:${port}/api/data`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d)
      });
      if (!r.ok) throw new Error('写入失败');
    } finally { child1.kill(); await sleep(400); }

    // 进程已死，重新拉起一个，数据必须还在
    const child2 = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, NO_OPEN: '1' }, stdio: 'ignore' });
    try {
      let ok = false;
      for (let i = 0; i < 40; i++) {
        const s = await fetch('http://127.0.0.1:5189/api/data').then(r => r.json()).catch(() => null);
        if (s && s.exists && s.data.memo.some(m => m.text === tag)) { ok = true; break; }
        await sleep(150);
      }
      if (!ok) throw new Error('进程重启后数据丢失');
    } finally { child2.kill(); await sleep(300); }
  });

  t.test('B4 记事本可直接读 data.json（UTF-8、中文不转义）', async ({ page, F }) => {
    await page.goto(F.BASE + '/#/home');
    const text = 'B4 中文持久化';
    await page.eval(`
      WB.state.memo.push({ id: 'bm4', text: ${JSON.stringify(text)}, createdAt: new Date().toISOString(), done: false });
      WB.save();
      return true;`);
    await waitSaveState(page, '已保存', 2000);
    const raw = fs.readFileSync(path.join(ROOT, 'data/data.json'), 'utf8');
    if (!raw.includes(text)) throw new Error('文件里找不到该条中文');
    if (raw.includes('\\u')) throw new Error('中文被转义成了 \\u 序列');
    JSON.parse(raw);
  });

  /* ---------- C 备份与恢复 ---------- */
  t.test('C1 当天首次保存后出现 data-YYYY-MM-DD.json', async () => {
    const name = 'data-' + F.today() + '.json';
    const p = path.join(ROOT, 'data/backups', name);
    if (!fs.existsSync(p)) throw new Error('缺少 ' + name);
    JSON.parse(fs.readFileSync(p, 'utf8'));
  });

  t.test('C2 设置页备份数量与目录一致、显示最后保存时间', async ({ page, F }) => {
    await page.goto(F.BASE + '/#/settings');
    const disk = fs.readdirSync(path.join(ROOT, 'data/backups')).filter(f => f.endsWith('.json')).length;
    const info = await fetch(F.BASE + '/api/info').then(r => r.json());
    if (info.backups.length !== disk) throw new Error(`接口 ${info.backups.length} 与磁盘 ${disk} 不一致`);
    const shown = await page.eval(`
      const h = [...document.querySelectorAll('.hint')].find(x => x.textContent.includes('份自动备份'));
      const items = document.querySelectorAll('[data-restore]').length;
      return { hint: h ? parseInt(h.textContent) : -1, items };`);
    if (shown.hint !== disk || shown.items !== disk) {
      throw new Error(`页面显示 ${shown.hint}/${shown.items} 与磁盘 ${disk} 不一致`);
    }
    if (!(await page.eval('return document.body.innerText.includes("最后保存");'))) throw new Error('缺最后保存时间');
  });

  t.test('C3 恢复备份：二次确认 + 数据回退 + 留 before-restore 底', async ({ page, F }) => {
    const { val: v, modalOk } = require('./helpers');
    // 快照 S 的内容取当前备份文件；再把当前数据改成不同的内容
    const backupName = 'data-' + F.today() + '.json';
    const backupPath = path.join(ROOT, 'data/backups', backupName);
    if (!fs.existsSync(backupPath)) throw new Error('当天备份不存在');
    const snap = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    const changed = F.blank();
    changed.memo.push({ id: 'c3x', text: 'C3 恢复前的新数据', createdAt: new Date().toISOString(), done: false });
    await F.put(changed);

    await page.goto(F.BASE + '/#/settings');
    const btn = await page.eval(`return !!document.querySelector('[data-restore="${backupName}"]');`);
    if (!btn) throw new Error('设置页找不到恢复按钮');
    await page.click(`[data-restore="${backupName}"]`);
    await page.waitFor('document.querySelectorAll(".modal-mask").length === 1');
    await modalOk(page);
    await page.waitFor('!!window.WB && WB.state.memo.filter(m=>m.text.includes("C3")).length === ' +
      (snap.memo ? snap.memo.filter(m => m.text.includes('C3')).length : 0), 6000);
    const now = await F.get();
    if (JSON.stringify(now.memo.map(m => m.id).sort()) !== JSON.stringify((snap.memo || []).map(m => m.id).sort())) {
      throw new Error('恢复后数据与快照不一致');
    }
    const before = fs.readdirSync(path.join(ROOT, 'data/backups')).filter(f => f.startsWith('before-restore_'));
    if (!before.length) throw new Error('恢复前没有留 before-restore 备份');
    JSON.parse(fs.readFileSync(path.join(ROOT, 'data/backups', before[before.length - 1]), 'utf8'));
  });

  t.test('C4 导出 → 清空 → 导入，数据完整恢复', async ({ page, F }) => {
    const seeded = F.blank();
    seeded.memo.push({ id: 'c4m', text: 'C4 导入导出往返', createdAt: new Date().toISOString(), done: false });
    seeded.settings.name = '往返测试';
    await F.put(seeded);

    const exported = await fetch(F.BASE + '/api/export').then(r => r.text());
    JSON.parse(exported);
    if (!exported.includes('C4 导入导出往返')) throw new Error('导出内容与数据不一致');

    await F.blankWrite();
    let cur = await F.get();
    if (cur.memo.length !== 0) throw new Error('清空失败');

    await page.goto(F.BASE + '/#/settings');
    await page.eval(`
      const text = ${JSON.stringify(exported)};
      const dt = new DataTransfer();
      dt.items.add(new File([text], 'backup.json', { type: 'application/json' }));
      const input = document.querySelector('#importFile');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;`);
    await page.waitFor('[...document.querySelectorAll(".modal-mask")].length === 1 && [...document.querySelectorAll(".modal-mask")].pop().innerText.includes("覆盖当前所有数据")', 5000);
    await modalOk(page);
    await page.waitFor('WB.state.memo.some(m => m.text === "C4 导入导出往返")', 6000);
    cur = await F.get();
    if (cur.settings.name !== '往返测试') throw new Error('导入后设置丢失');
  });

  t.test('C5 备份保留 40 份上限并滚动删除最旧（等效验证两天≥2份）', async () => {
    const dir = path.join(ROOT, 'data/backups');
    const fakes = [];
    for (let i = 0; i < 45; i++) {
      const d = new Date(2026, 0, 1 + i);
      const name = 'data-' + d.toISOString().slice(0, 10) + '.json';
      const p = path.join(dir, name);
      fs.writeFileSync(p, JSON.stringify({ version: 1, fake: name }), 'utf8');
      fakes.push(name);
    }
    try {
      await F.blankWrite(); // 触发一次真实写入 → 触发保留策略
      const list = fs.readdirSync(dir).filter(f => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
      if (list.length > 40) throw new Error('备份数超上限：' + list.length);
      if (!list.includes('data-' + F.today() + '.json')) throw new Error('当天快照丢失');
      if (list.includes('data-2026-01-01.json')) throw new Error('最旧备份未被清理');
      if (list.length < 2) throw new Error('应至少保留两天的备份');
    } finally {
      for (const f of fakes) {
        const p = path.join(dir, f);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    }
  });

  /* ---------- D 首页 ---------- */
  t.test('D1 六张摘要卡分别跳对模块', async ({ page, F }) => {
    await page.goto(F.BASE + '/#/home');
    const pairs = { media: '#/media', dev: '#/dev', consult: '#/consult', fitness: '#/fitness', diet: '#/diet', games: '#/games' };
    for (const [key, hash] of Object.entries(pairs)) {
      await page.click(`.sum-card[data-go="${key}"]`);
      await page.waitFor(`location.hash === "${hash}"`, 3000);
      await page.goto(F.BASE + '/#/home');
    }
  });

  t.test('D2 计划页勾一条，回首页完成度分子 +1', async ({ page, F }) => {
    await F.put(F.planTwo()); // 1/2，p1 已完成、p2 未完成
    await page.goto(F.BASE + '/#/plan');
    await page.click('#planList [data-toggle="p2"]'); // 勾的是未完成那条
    await page.waitFor('document.querySelectorAll("#planList .check.on").length === 2');
    await page.goto(F.BASE + '/#/home');
    const label = await page.eval('return document.querySelector("#ringLabel").textContent;');
    if (label !== '2/2') throw new Error('首页圆环应 2/2，实际 ' + label);
  });

  t.test('D3 备忘回车即存，刷新仍在', async ({ page, F }) => {
    await page.goto(F.BASE + '/#/home');
    await page.fill('#memoInput', 'D3 随手记', true);
    await page.waitFor('[...document.querySelectorAll("#memoList .memo-item p")].some(p=>p.textContent.includes("D3 随手记"))');
    await page.goto(F.BASE + '/#/home');
    const has = await page.eval('return document.body.innerText.includes("D3 随手记");');
    if (!has) throw new Error('刷新后备忘丢失');
  });

  t.test('D4 勾选备忘：划线保留、未处理数减 1', async ({ page, F }) => {
    await page.goto(F.BASE + '/#/home');
    await page.fill('#memoInput', 'D4 待办备忘', true);
    await page.waitFor('document.querySelectorAll("#memoList .memo-item").length === 1');
    const before = await page.eval(`
      return {
        hint: document.querySelector('.home-grid .card:nth-child(2) .card-head .hint').textContent,
        done: document.querySelectorAll('#memoList .memo-item.done').length
      };`);
    if (!before.hint.includes('1 条未处理')) throw new Error('未处理数应为 1：' + before.hint);
    await page.click('#memoList .memo-item .check');
    await page.waitFor('document.querySelectorAll("#memoList .memo-item.done").length === 1');
    const after = await page.eval(`
      return {
        hint: document.querySelector('.home-grid .card:nth-child(2) .card-head .hint').textContent,
        item: document.querySelector('#memoList .memo-item.done p').textContent
      };`);
    if (!after.hint.includes('0 条未处理')) throw new Error('勾选后未处理数应为 0：' + after.hint);
    if (!after.item.includes('D4 待办备忘')) throw new Error('勾选后条目应保留在列表');
  });

  t.test('D5 不填称呼时问候语无空标点', async ({ page, F }) => {
    await page.goto(F.BASE + '/#/home');
    const g = await page.eval('return document.querySelector(".greet").textContent;');
    if (/，\s*$/.test(g) || g.includes('，，')) throw new Error('问候语出现空逗号：' + g);
    if (g.includes('undefined') || g.includes('null')) throw new Error('问候语出现 undefined/null：' + g);
  });

  /* ---------- E 今日计划 ---------- */
  t.test('E1 前后翻日与选日期，数据不串', async ({ page, F }) => {
    const t0 = F.today(), y0 = F.addDays(t0, -1);
    const d = F.blank();
    d.plan[t0] = [{ id: 'e1a', text: '今天的任务', start: '09:00', tag: '工作', prio: 0, done: false }];
    d.plan[y0] = [{ id: 'e1b', text: '昨天的任务', start: '09:00', tag: '工作', prio: 0, done: false }];
    await F.put(d);
    await page.goto(F.BASE + '/#/plan');
    await page.click('[data-nav="-1"]');
    await page.waitFor('document.body.innerText.includes("昨天的任务")');
    const [yy, mm, dd] = y0.split('-');
    const cur = await page.eval('return document.querySelector(".date-nav .cur").textContent;');
    if (!cur.includes(`${parseInt(mm)}月${parseInt(dd)}日`)) throw new Error(`翻日日期不对：${cur}，应为 ${parseInt(mm)}月${parseInt(dd)}日`);
    await page.click('[data-nav="1"]');
    await page.waitFor('document.body.innerText.includes("今天的任务")');
    await page.eval(`
      const e = document.querySelector('#datePick');
      e.value = ${JSON.stringify(y0)};
      e.dispatchEvent(new Event('change', { bubbles: true })); return true;`);
    await page.waitFor('document.body.innerText.includes("昨天的任务")');
  });

  t.test('E2 连续回车加三条：默认下一整点、输入框回焦', async ({ page, F }) => {
    await page.goto(F.BASE + '/#/plan');
    for (const s of ['第一条', '第二条', '第三条']) {
      await page.fill('#npText', s, true);
      await page.waitFor(`document.body.innerText.includes("${s}")`);
    }
    const rows = await page.eval(`
      return [...document.querySelectorAll('.plan-row .p-text')].map(e => e.textContent);`);
    if (rows.length !== 3) throw new Error('应有 3 条，实际 ' + rows.length);
    const focusOk = await page.eval(`
      const d = new Date();
      d.setMinutes(0,0,0); d.setHours(d.getHours()+1);
      const hh = String(d.getHours()).padStart(2,'0') + ':00';
      return document.activeElement && document.activeElement.id === 'npText' &&
        [...document.querySelectorAll('.plan-row .p-time')].every(t => t.textContent === hh);`);
    if (!focusOk) throw new Error('回车后未回焦或默认时间不是下一个整点');
  });

  t.test('E3 点文字编辑：改内容/时间/标签/优先级立即生效', async ({ page, F }) => {
    await page.goto(F.BASE + '/#/plan');
    await page.fill('#npText', '原始内容', true);
    await page.waitFor('document.querySelectorAll(".plan-row").length === 1');
    await page.click('.plan-row .p-text');
    await page.waitFor('!!document.querySelector("#eText")');
    await val(page, '#eText', '修改后的内容');
    await val(page, '#eStart', '15:30');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("修改后的内容")');
    const row = await page.eval(`
      const r = document.querySelector('.plan-row');
      return { time: r.querySelector('.p-time').textContent, tag: r.querySelector('.p-tags').textContent };`);
    if (!row.time.includes('15:30')) throw new Error('时间未更新：' + row.time);
    if (!row.tag.includes('工作')) throw new Error('标签未更新：' + row.tag);
  });

  t.test('E4 勾选后完成数、百分比、进度条一致', async ({ page, F }) => {
    const d = F.blank();
    const t0 = F.today();
    d.plan[t0] = [
      { id: 'e4a', text: '任务A', start: '09:00', tag: '工作', prio: 0, done: false },
      { id: 'e4b', text: '任务B', start: '10:00', tag: '工作', prio: 0, done: false }
    ];
    await F.put(d);
    await page.goto(F.BASE + '/#/plan');
    await page.click('#planList [data-toggle="e4a"]');
    await page.waitFor('document.querySelectorAll("#planList .check.on").length === 1');
    await page.click('#planList [data-toggle="e4b"]');
    await page.waitFor('document.querySelectorAll("#planList .check.on").length === 2');
    const stat = await page.eval(`
      return {
        spans: [...document.querySelectorAll('.small.muted span')].map(s => s.textContent),
        width: document.querySelector('.progress-line > i').style.width
      };`);
    if (!stat.spans.some(s => s.includes('完成 2 / 2'))) throw new Error('完成数不对: ' + stat.spans.join(' | '));
    if (!stat.spans.some(s => s.includes('100%'))) throw new Error('百分比不对');
    if (stat.width !== '100%') throw new Error('进度条宽度不对: ' + stat.width);
  });

  t.test('E5+E6 开发任务与待发布内容汇入计划页关联区', async ({ page, F }) => {
    await F.put(F.fourSources());
    await page.goto(F.BASE + '/#/plan');
    const chips = await page.eval('return [...document.querySelectorAll(".agenda-chip")].map(e=>e.innerText.replace(/\\s+/g," ").trim());');
    if (!chips.some(x => x.includes('开发任务') && x.includes('今天到期的任务'))) throw new Error('E5 开发任务未汇入: ' + chips.join(' | '));
    if (!chips.some(x => x.includes('待发布') && x.includes('今天要发的稿子'))) throw new Error('E6 待发布未汇入');
    await page.click('.agenda-chip[data-go="dev"]');
    await page.waitFor('location.hash === "#/dev"', 3000);
  });
};

// 引用共享夹具
const F = require('../fixtures');
