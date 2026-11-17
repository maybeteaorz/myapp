/** 阶段 1 测试：统一聚合口径、首页汇入条、圆环同步、长文本 */
const fs = require('fs');

const FOUR = ['开发任务:今天到期的任务', '待发布:今天要发的稿子', '客户跟进:陈总', '在玩:在玩的游戏'];

exports.run = async t => {
  t.test('P1-01 calc.agenda 四类来源齐全且顺序正确', async ({ page, F }) => {
    await F.put(F.fourSources());
    await page.goto(F.BASE + '/#/home');
    const got = await page.eval('const ag = WB.calc.agenda(WB.today()); return ag.map(a => a.src + ":" + a.text);');
    const a = JSON.stringify(got), b = JSON.stringify(FOUR);
    if (a !== b) throw new Error(`实际 ${a}，期望 ${b}`);
  });

  t.test('P1-02 其他日期不汇入"在玩"，已完成/已发布不计入', async ({ page, F }) => {
    await F.put(F.fourSources());
    await page.goto(F.BASE + '/#/home');
    const got = await page.eval('return WB.calc.agenda(WB.addDays(WB.today(),1)).map(a=>a.src+":"+a.text);');
    const expect = ['开发任务:明天到期的任务'];
    if (JSON.stringify(got) !== JSON.stringify(expect)) throw new Error(`明天应为 ${JSON.stringify(expect)}，实际 ${JSON.stringify(got)}`);
    const todayAll = await page.eval('return WB.calc.agenda(WB.today()).map(a=>a.text);');
    if (todayAll.includes('已完成的任务')) throw new Error('已完成任务不应汇入');
    if (todayAll.includes('今天已发布的稿子')) throw new Error('已发布内容不应汇入');
    if (todayAll.includes('李总')) throw new Error('已跟进的客户不应汇入');
  });

  t.test('P1-03 首页今日安排下方出现 4 个只读 chip', async ({ page, F }) => {
    await F.put(F.fourSources());
    await page.goto(F.BASE + '/#/home');
    const n = await page.count('.agenda-block .agenda-chip');
    if (n !== 4) throw new Error('chip 数量应为 4，实际 ' + n);
    const texts = await page.eval('return [...document.querySelectorAll(".agenda-block .agenda-chip")].map(e=>e.innerText.replace(/\\s+/g," ").trim());');
    for (const src of ['开发任务', '待发布', '客户跟进', '在玩']) {
      if (!texts.some(x => x.includes(src))) throw new Error('缺少来源：' + src);
    }
    const inside = await page.eval(`
      const plan = document.querySelector('#homePlan');
      const block = plan && plan.parentElement.querySelector('.agenda-block');
      return !!(block && block.parentElement === plan.parentElement);`);
    if (!inside) throw new Error('汇入条应位于"今日安排"卡片内、时间线下方');
    await page.shot('tools/shots/p1-home-agenda.png');
  });

  t.test('P1-04 点 chip 跳到对应模块', async ({ page, F }) => {
    await F.put(F.fourSources());
    await page.goto(F.BASE + '/#/home');
    await page.click('.agenda-chip[data-go="dev"]');
    await page.waitFor('location.hash === "#/dev"', 3000);
    const h1 = await page.text('#app h1');
    if (h1 !== '开发工作') throw new Error('应跳到开发工作页，实际标题：' + h1);
  });

  t.test('P1-05 计划页与首页的汇入事项完全一致', async ({ page, F }) => {
    await F.put(F.fourSources());
    await page.goto(F.BASE + '/#/home');
    const home = await page.eval('return [...document.querySelectorAll(".agenda-chip")].map(e=>e.innerText.replace(/\\s+/g," ").trim()).sort();');
    await page.goto(F.BASE + '/#/plan');
    const plan = await page.eval('return [...document.querySelectorAll(".agenda-chip")].map(e=>e.innerText.replace(/\\s+/g," ").trim()).sort();');
    if (JSON.stringify(home) !== JSON.stringify(plan)) {
      throw new Error('两页不一致\n首页: ' + JSON.stringify(home) + '\n计划: ' + JSON.stringify(plan));
    }
  });

  t.test('P1-06 首页勾选后圆环、数字、条幅三者同步', async ({ page, F }) => {
    await F.put(F.planTwo());
    await page.goto(F.BASE + '/#/home');
    const before = await page.eval('return {label:document.querySelector("#ringLabel").textContent, off:document.querySelector("#ringArc").getAttribute("stroke-dashoffset")};');
    if (before.label !== '1/2') throw new Error('初始圆环应为 1/2，实际 ' + before.label);

    await page.click('#homePlan [data-toggle="p2"]');
    await page.waitFor('document.querySelector("#ringLabel").textContent === "2/2"', 3000);

    const after = await page.eval(`return {
      label: document.querySelector('#ringLabel').textContent,
      off: document.querySelector('#ringArc').getAttribute('stroke-dashoffset'),
      meta: document.querySelector('.today-banner .meta').innerText,
      checked: document.querySelectorAll('#homePlan .check.on').length
    };`);
    if (after.label !== '2/2') throw new Error('勾选后圆环应 2/2，实际 ' + after.label);
    if (after.off === before.off) throw new Error('圆环弧长没有变化：' + after.off);
    if (Math.abs(Number(after.off)) > 0.2) throw new Error('全部完成时弧长应为 0，实际 ' + after.off);
    if (!after.meta.includes('今天安排了 2 件事')) throw new Error('条幅文案不对：' + after.meta);
    if (after.checked !== 2) throw new Error('列表勾选状态未同步，实际 ' + after.checked);
  });

  t.test('P1-07 超长文本不撑破布局（M2 前置）', async ({ page, F }) => {
    await F.put(F.longText());
    await page.goto(F.BASE + '/#/home');
    const m = await page.eval(`return {
      docOver: document.documentElement.scrollWidth - window.innerWidth,
      bad: [...document.querySelectorAll('.tl-text')].filter(e => e.scrollWidth > e.clientWidth + 1).length
    };`);
    if (m.docOver > 1) throw new Error('页面出现横向滚动，超出 ' + m.docOver + 'px');
    if (m.bad > 0) throw new Error(m.bad + ' 条时间线文本内部溢出');
    await page.shot('tools/shots/p1-longtext.png');
  });

  t.test('P1-08 没有汇入事项时不留空壳', async ({ page, F }) => {
    await F.put(F.blank());
    await page.goto(F.BASE + '/#/home');
    const n = await page.count('.agenda-block');
    if (n !== 0) throw new Error('无数据时不应渲染汇入块，实际 ' + n + ' 个');
  });

  t.test('P1-09 旧的 todayAgenda 死代码已移除', async () => {
    const src = fs.readFileSync('public/js/core.js', 'utf8');
    if (src.includes('todayAgenda')) throw new Error('core.js 仍存在 todayAgenda');
    if (!src.includes('agenda(date)')) throw new Error('core.js 缺少 calc.agenda');
    const planSrc = fs.readFileSync('public/js/views/plan.js', 'utf8');
    if (/function agenda\(/.test(planSrc)) throw new Error('plan.js 仍有本地 agenda 副本');
  });
};
