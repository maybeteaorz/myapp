/**
 * v1.1 新功能验收套件：
 * 视觉改版不破坏结构（N0）、手动保存按钮（N1）、自媒体发布数据图表（N2）、
 * 开发模块醒目新增入口（N3）、客户删除入口（N4）、健身日历（N5）、饮食日历（N6）。
 */
const { sleep, modalOk, escapeAll, val, waitToast, waitSaveState } = require('./helpers');

exports.run = (t) => {
  const { F } = t;
  const todayStr = F.today();

  t.test('N0 视觉改版：骨架与关键类名完整、侧栏保存按钮可点', async ({ page }) => {
    await page.goto(F.BASE + '/#/home');
    const check = await page.eval(`
      const nav = document.querySelectorAll('.nav-item').length;
      const cards = document.querySelectorAll('.card').length;
      const btn = document.querySelector('#saveState');
      return {
        nav, cards,
        saveIsButton: btn && btn.tagName === 'BUTTON',
        saveClickable: btn && getComputedStyle(btn).cursor === 'pointer',
        darkSidebar: getComputedStyle(document.querySelector('.sidebar')).backgroundColor
      };`);
    if (check.nav !== 9) throw new Error('导航项不是 9 个: ' + check.nav);
    const sums = await page.eval(`return document.querySelectorAll('.sum-card').length;`);
    if (sums !== 6) throw new Error('首页摘要卡不是 6 张: ' + sums);
    if (check.cards < 2) throw new Error('首页卡片过少: ' + check.cards);
    if (!check.saveIsButton) throw new Error('#saveState 未改为可点击按钮');
    if (!check.saveClickable) throw new Error('#saveState 不可点击');
  });

  t.test('N1 手动保存：点按钮立即落盘并显示已保存', async ({ page }) => {
    await page.goto(F.BASE + '/#/plan');
    await page.fill('#npText', '手动保存验证条目', true);
    // 不等防抖，直接点保存按钮
    await page.click('#saveState');
    await waitSaveState(page, '已保存', 2000);
    // 验证真的写到了文件
    const data = await F.get();
    if (!data.plan[todayStr] || !data.plan[todayStr].some(p => p.text === '手动保存验证条目')) {
      throw new Error('点击保存按钮后数据没有落盘');
    }
  });

  t.test('N1b 手动保存：Ctrl+S 快捷键生效', async ({ page }) => {
    await page.goto(F.BASE + '/#/plan');
    await page.fill('#npText', '快捷键保存条目', true);
    await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })); return true;`);
    await waitSaveState(page, '已保存', 2000);
    const data = await F.get();
    if (!data.plan[todayStr] || !data.plan[todayStr].some(p => p.text === '快捷键保存条目')) {
      throw new Error('Ctrl+S 后数据没有落盘');
    }
  });

  t.test('N2 自媒体：发布数据图表渲染、切换指标、点柱子编辑', async ({ page }) => {
    const d = F.blank();
    d.media.contents = [
      { id: 'a1', title: '第一篇', platform: '公众号', status: 'published', body: '', publishAt: F.addDays(todayStr, -10), publishedAt: F.addDays(todayStr, -10), stats: { views: 3200, likes: 180, comments: 40 }, notes: '' },
      { id: 'a2', title: '第二篇', platform: '小红书', status: 'published', body: '', publishAt: F.addDays(todayStr, -5), publishedAt: F.addDays(todayStr, -5), stats: { views: 1500, likes: 95, comments: 12 }, notes: '' },
      { id: 'a3', title: '第三篇', platform: 'B站', status: 'published', body: '', publishAt: todayStr, publishedAt: todayStr, stats: { views: 800, likes: 60, comments: 5 }, notes: '' }
    ];
    await F.put(d);
    await page.goto(F.BASE + '/#/media');
    const bars = await page.eval(`return document.querySelectorAll('.chart-svg [data-bar]').length;`);
    if (bars !== 3) throw new Error('图表柱子数量不对: ' + bars);
    // 切换到点赞指标
    await page.click('[data-metric="likes"]');
    await page.waitFor(`!!document.querySelector('[data-metric="likes"].on')`);
    const barCount2 = await page.eval(`return document.querySelectorAll('.chart-svg [data-bar]').length;`);
    if (barCount2 !== 3) throw new Error('切换指标后柱子丢失');
    // 点柱子打开编辑弹窗（SVG 元素没有 .click()，用事件派发模拟真实点击）
    await page.eval(`
      const g = document.querySelector('.chart-svg [data-bar]');
      g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;`);
    await page.waitFor(`!!document.querySelector('#mTitle')`);
    const t1 = await page.eval(`return document.querySelector('#mTitle').value;`);
    if (t1 !== '第一篇') throw new Error('点柱子打开的不是对应内容: ' + t1);
    await escapeAll(page);
  });

  t.test('N2b 自媒体：没有已发内容时图表给引导文案', async ({ page }) => {
    await page.goto(F.BASE + '/#/media');
    const txt = await page.eval(`const c=[...document.querySelectorAll('.card')].find(x=>x.querySelector('h3') && x.querySelector('h3').textContent.includes('发布数据')); return c ? c.querySelector('.chart-box, .empty').textContent : '';`);
    if (!txt.includes('发布后这里会画出')) throw new Error('空态引导缺失: ' + txt);
  });

  t.test('N3 开发：醒目新增按钮随页签切换并可建任务', async ({ page }) => {
    const d = F.blank();
    d.dev.projects = [{ id: 'pr1', name: '测试项目', desc: '', status: 'active', color: '#2f6a63', repo: '' }];
    await F.put(d);
    await page.goto(F.BASE + '/#/dev');
    const label = await page.eval(`return document.querySelector('#quickAdd').textContent.trim();`);
    if (!label.includes('新增任务')) throw new Error('任务页签按钮文案不对: ' + label);
    await page.click('#quickAdd');
    await page.waitFor(`!!document.querySelector('#tTitle')`);
    await page.fill('#tTitle', '按钮新建的任务', true);
    await modalOk(page);
    await page.waitFor(`!!document.querySelector('[data-task]')`);
    const has = await page.eval(`return document.body.innerText.includes('按钮新建的任务');`);
    if (!has) throw new Error('通过醒目按钮新建任务失败');
    // 切到 Bug 页签，按钮文案应变化
    await page.click('[data-tab="bugs"]');
    const label2 = await page.eval(`return document.querySelector('#quickAdd').textContent.trim();`);
    if (!label2.includes('记一个 bug')) throw new Error('Bug 页签按钮文案不对: ' + label2);
    await page.click('#quickAdd');
    await page.waitFor(`!!document.querySelector('#bTitle')`);
    await escapeAll(page);
  });

  t.test('N4 咨询：卡片上直接删除客户（含沟通记录），二次确认', async ({ page }) => {
    const d = F.blank();
    d.consult.clients = [
      { id: 'c1', name: '要删的客户', company: '', contact: '', rate: 0, rateUnit: '/次', note: '', status: 'active' },
      { id: 'c2', name: '留下的客户', company: '', contact: '', rate: 0, rateUnit: '/次', note: '', status: 'active' }
    ];
    d.consult.sessions = [
      { id: 's1', clientId: 'c1', clientName: '要删的客户', date: todayStr, duration: 60, topic: '诊断', notes: '', fee: 0, followUp: false, followDone: false, nextAt: '' }
    ];
    await F.put(d);
    await page.goto(F.BASE + '/#/consult');
    await page.click('#delClientQuick');
    await page.waitFor(`!!document.querySelector('.modal-mask .modal')`);
    // 确认框出现，点确定
    await modalOk(page);
    await page.waitFor(`document.querySelectorAll('.side-item[data-client]').length === 1`);
    await waitSaveState(page, '已保存', 2500); // 删除走防抖保存，等落盘再验证文件
    const data = await F.get();
    if (data.consult.clients.length !== 1 || data.consult.clients[0].name !== '留下的客户') {
      throw new Error('客户删除结果不对');
    }
    if (data.consult.sessions.length !== 0) throw new Error('关联沟通记录没有一并删除');
  });

  t.test('N4b 咨询：删除确认框可取消', async ({ page }) => {
    const d = F.blank();
    d.consult.clients = [{ id: 'c1', name: '不删的客户', company: '', contact: '', rate: 0, rateUnit: '/次', note: '', status: 'active' }];
    await F.put(d);
    await page.goto(F.BASE + '/#/consult');
    await page.click('#delClientQuick');
    await page.waitFor(`!!document.querySelector('.modal-mask .modal')`);
    await page.eval(`
      const masks=[...document.querySelectorAll('.modal-mask')];
      const m=masks[masks.length-1];
      const c=m.querySelector('[data-cancel]') || m.querySelector('[data-close]');
      c.click(); return true;`);
    await sleep(150);
    const data = await F.get();
    if (data.consult.clients.length !== 1) throw new Error('取消后客户被误删');
    await escapeAll(page);
  });

  t.test('N5 健身日历：有训练的日子高亮，点开看动作明细，月份可翻', async ({ page }) => {
    const d = F.blank();
    d.fitness.logs = [
      { id: 'l1', date: todayStr, templateId: '', name: '推日', items: [
        { exercise: '卧推', sets: 4, reps: '8', weight: '60', done: true },
        { exercise: '上斜哑铃推', sets: 3, reps: '10', weight: '20', done: false }
      ], duration: 55, note: '' },
      { id: 'l2', date: F.addDays(todayStr, -2), templateId: '', name: '腿日', items: [
        { exercise: '深蹲', sets: 5, reps: '5', weight: '80', done: true }
      ], duration: 40, note: '' }
    ];
    await F.put(d);
    await page.goto(F.BASE + '/#/fitness');
    const fitCells = await page.eval(`return document.querySelectorAll('.cal-cell.fit').length;`);
    if (fitCells !== 2) throw new Error('高亮训练日数量不对: ' + fitCells);
    const todayMarked = await page.eval(`return !!document.querySelector('.cal-cell.fit.today');`);
    if (!todayMarked) throw new Error('今天没有被特别标记');
    // 点今天的格子 → 明细弹窗
    await page.click(`[data-calday="${todayStr}"]`);
    await page.waitFor(`!!document.querySelector('.modal .table')`);
    const detail = await page.eval(`return document.querySelector('.modal-body').innerText;`);
    if (!detail.includes('卧推') || !detail.includes('4 组 × 8')) throw new Error('明细缺少动作/组次: ' + detail.slice(0, 120));
    await escapeAll(page);
    // 翻到下个月
    const cur1 = await page.eval(`return document.querySelector('.cal-head-row .cur').textContent;`);
    await page.click('[data-calnav="1"]');
    const cur2 = await page.eval(`return document.querySelector('.cal-head-row .cur').textContent;`);
    if (cur1 === cur2) throw new Error('翻月无效: ' + cur2);
  });

  t.test('N6 饮食日历：热量超标标红、目标内标绿，点开看四餐明细', async ({ page }) => {
    const d = F.blank();
    const y = F.addDays(todayStr, -1);
    d.diet.logs = {
      [todayStr]: { breakfast: [{ id: 'e1', name: '鸡蛋', qty: 2, unit: '个', kcal: 156, protein: 12.6, carb: 1.2, fat: 10.6 }], lunch: [{ id: 'e2', name: '红烧肉', qty: 2, unit: '份', kcal: 2400, protein: 40, carb: 20, fat: 180 }], dinner: [], snack: [], water: 3, note: '' },
      [y]: { breakfast: [{ id: 'e3', name: '燕麦', qty: 1, unit: '碗', kcal: 380, protein: 13, carb: 60, fat: 8 }], lunch: [], dinner: [], snack: [], water: 6, note: '' }
    };
    await F.put(d);
    await page.goto(F.BASE + '/#/diet');
    const over = await page.eval(`return document.querySelectorAll('.cal-cell.over').length;`);
    const ok = await page.eval(`return document.querySelectorAll('.cal-cell.ok').length;`);
    if (over !== 1) throw new Error('超标日没有标红: ' + over);
    if (ok !== 1) throw new Error('目标内日没有标绿: ' + ok);
    // 点超标日 → 明细
    await page.click(`[data-calday="${todayStr}"]`);
    await page.waitFor(`!!document.querySelector('.modal-body')`);
    const detail = await page.eval(`return document.querySelector('.modal-body').innerText;`);
    if (!detail.includes('鸡蛋') || !detail.includes('红烧肉')) throw new Error('饮食明细不完整');
    await escapeAll(page);
  });
};
