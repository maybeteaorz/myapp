/** 验收 F–M：自媒体、开发、咨询、健身、饮食、游戏、设置、边界 */
const { sleep, modalOk, escapeAll, val, valInput, valChange, waitToast } = require('./helpers');
const F = require('../fixtures');

exports.run = async t => {
  /* ---------- F 自媒体 ---------- */
  t.test('F1 新建内容出现在"选题"列', async ({ page }) => {
    await page.goto(F.BASE + '/#/media');
    await page.click('#newContent');
    await page.waitFor('!!document.querySelector("#mTitle")');
    await val(page, '#mTitle', 'F1 新内容');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("F1 新内容")');
    const inCol1 = await page.eval('return document.querySelectorAll(".kcol:nth-child(1) .kcard").length;');
    if (inCol1 !== 1) throw new Error('应落在选题列，实际 ' + inCol1 + ' 张卡');
  });

  t.test('F2 连续推进三列，发布自动补日期', async ({ page }) => {
    await page.goto(F.BASE + '/#/media');
    await page.click('#newContent');
    await val(page, '#mTitle', 'F2 推进内容');
    await modalOk(page);
    for (let col = 2; col <= 4; col++) {
      await page.click('[data-advance]');
      await page.waitFor(`document.querySelectorAll(".kcol:nth-child(${col}) .kcard").length === 1`, 4000);
    }
    const pub = await page.eval(`
      const card = document.querySelector('.kcol:nth-child(4) .kcard');
      return { date: card.querySelector('.m .d').textContent, today: WB.today() };`);
    if (pub.date !== pub.today) throw new Error(`实际发布日应为 ${pub.today}，实际显示 ${pub.date}`);
  });

  t.test('F3 编辑标题与阅读数，卡片与平均阅读同步', async ({ page }) => {
    const d = F.blank();
    d.media.contents.push({
      id: 'f3c', title: '旧标题', platform: '公众号', status: 'published',
      body: '', publishAt: F.today(), publishedAt: F.today(), stats: { views: 100, likes: 0, comments: 0 }, notes: ''
    });
    await F.put(d);
    await page.goto(F.BASE + '/#/media');
    await page.click('.kcard[data-open]');
    await page.waitFor('!!document.querySelector("#mTitle")');
    await val(page, '#mTitle', '新标题来了');
    await val(page, '#mViews', '300');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("新标题来了")');
    const avg = await page.eval(`
      const st = [...document.querySelectorAll('.stat-row .stat')];
      return { card: document.querySelector('.kcard .m .d.num').textContent, avg: st[3].querySelector('.v').textContent };`);
    if (!avg.card.includes('300')) throw new Error('卡片阅读数未更新: ' + avg.card);
    if (avg.avg.trim() !== '300') throw new Error('平均阅读未同步: ' + avg.avg);
  });

  t.test('F4 平台筛选与恢复', async ({ page }) => {
    const d = F.blank();
    d.media.contents = [
      { id: 'f4a', title: '公众号文章', platform: '公众号', status: 'idea', body: '', publishAt: '', publishedAt: '', stats: {}, notes: '' },
      { id: 'f4b', title: '小红书笔记', platform: '小红书', status: 'idea', body: '', publishAt: '', publishedAt: '', stats: {}, notes: '' }
    ];
    await F.put(d);
    await page.goto(F.BASE + '/#/media');
    if (await page.count('.kcard') !== 2) throw new Error('初始应有 2 张卡');
    await page.click('[data-filter="小红书"]');
    await page.waitFor('[...document.querySelectorAll(".kcard .t")].every(t=>t.textContent.includes("小红书"))');
    if (await page.count('.kcard') !== 1) throw new Error('筛选后应只剩 1 张卡');
    await page.click('[data-filter=""]');
    await page.waitFor('document.querySelectorAll(".kcard").length === 2');
  });

  /* ---------- G 开发工作 ---------- */
  t.test('G1 空态新建项目：自动选中并出现三个页签', async ({ page }) => {
    await page.goto(F.BASE + '/#/dev');
    await page.click('#firstProj');
    await page.waitFor('!!document.querySelector("#pName")');
    await val(page, '#pName', 'G1 项目');
    await modalOk(page);
    await page.waitFor('!!document.querySelector(".side-item.active")');
    const st = await page.eval(`
      return {
        name: document.querySelector('.side-item.active').textContent,
        tabs: document.querySelectorAll('[data-tab]').length,
        body: !!document.querySelector('#devBody')
      };`);
    if (!st.name.includes('G1 项目')) throw new Error('未自动选中: ' + st.name);
    if (st.tabs !== 3 || !st.body) throw new Error('页签或内容区缺失');
  });

  t.test('G2 在"进行中"列添加任务', async ({ page }) => {
    const d = F.blank();
    d.dev.projects.push({ id: 'g2p', name: 'G2 项目', desc: '', status: 'active', color: '#2f6a63', repo: '' });
    await F.put(d);
    await page.goto(F.BASE + '/#/dev');
    await page.click('[data-addtask="doing"]');
    await page.waitFor('!!document.querySelector("#tTitle")');
    await val(page, '#tTitle', '进行中的任务');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("进行中的任务")');
    const col = await page.eval('return document.querySelector(".kcol:nth-child(2) .kcard .t").textContent;');
    if (!col.includes('进行中的任务')) throw new Error('任务不在进行中列');
  });

  t.test('G3 截止日为昨天显示已逾期', async ({ page }) => {
    const d = F.blank();
    d.dev.projects.push({ id: 'g3p', name: 'G3 项目', desc: '', status: 'active', color: '#2f6a63', repo: '' });
    d.dev.tasks.push({ id: 'g3t', projectId: 'g3p', title: '逾期任务', status: 'todo', prio: 1, due: F.addDays(F.today(), -1), note: '' });
    await F.put(d);
    await page.goto(F.BASE + '/#/dev');
    await page.waitFor('document.body.innerText.includes("已逾期")');
  });

  t.test('G4 Bug 改已修复后未修计数归零', async ({ page }) => {
    const d = F.blank();
    d.dev.projects.push({ id: 'g4p', name: 'G4 项目', desc: '', status: 'active', color: '#2f6a63', repo: '' });
    d.dev.bugs.push({ id: 'g4b', projectId: 'g4p', title: 'G4 的 bug', severity: 'mid', status: 'open', repro: '', date: F.today() });
    await F.put(d);
    await page.goto(F.BASE + '/#/dev');
    await page.waitFor('document.body.innerText.includes("1 个 bug")');
    await page.click('[data-tab="bugs"]');
    await page.waitFor('!!document.querySelector("tr[data-bug]")');
    await page.click('tr[data-bug]');
    await page.waitFor('!!document.querySelector("#bStatus")');
    await val(page, '#bStatus', 'closed');
    await modalOk(page);
    await page.waitFor('!document.querySelector(".tag.danger")', 4000);
    const bugOpen = await page.eval('return WB.state.dev.bugs.some(b=>b.status!=="closed");');
    if (bugOpen) throw new Error('bug 状态未保存');
  });

  t.test('G5 代码备忘一键复制（剪贴板调用参数正确）', async ({ page }) => {
    const code = 'echo "hello G5"\nnode -v';
    const d = F.blank();
    d.dev.projects.push({ id: 'g5p', name: 'G5 项目', desc: '', status: 'active', color: '#2f6a63', repo: '' });
    d.dev.snippets.push({ id: 'g5s', projectId: 'g5p', title: 'G5 备忘', lang: 'bash', code, note: '', createdAt: new Date().toISOString() });
    await F.put(d);
    await page.goto(F.BASE + '/#/dev');
    await page.click('[data-tab="snippets"]');
    await page.waitFor('!!document.querySelector("[data-copy]")');
    await page.eval('window.__copied = null; navigator.clipboard.writeText = s => { window.__copied = s; return Promise.resolve(); }; return true;');
    await page.click('[data-copy]');
    await waitToast(page, '已复制');
    const got = await page.eval('return window.__copied;');
    if (got !== code) throw new Error('复制内容不完整: ' + JSON.stringify(got));
  });

  t.test('G6 删除项目连带任务、bug、代码备忘', async ({ page }) => {
    const d = F.blank();
    d.dev.projects.push({ id: 'g6p', name: 'G6 项目', desc: '', status: 'active', color: '#2f6a63', repo: '' });
    d.dev.tasks.push({ id: 'g6t', projectId: 'g6p', title: '任务', status: 'todo', prio: 0, due: '', note: '' });
    d.dev.bugs.push({ id: 'g6b', projectId: 'g6p', title: 'bug', severity: 'low', status: 'open', repro: '', date: F.today() });
    d.dev.snippets.push({ id: 'g6s', projectId: 'g6p', title: 's', lang: '', code: 'x', note: '', createdAt: new Date().toISOString() });
    await F.put(d);
    await page.goto(F.BASE + '/#/dev');
    await page.click('#editProj');
    await page.waitFor('!!document.querySelector("#delProj")');
    await page.click('#delProj');
    await page.waitFor('[...document.querySelectorAll(".modal-mask")].length === 2');
    await modalOk(page); // 确认框在最上层
    await escapeAll(page);
    const left = await page.eval(`
      return {
        projects: WB.state.dev.projects.length,
        tasks: WB.state.dev.tasks.length,
        bugs: WB.state.dev.bugs.length,
        snips: WB.state.dev.snippets.length
      };`);
    if (left.projects || left.tasks || left.bugs || left.snips) {
      throw new Error('级联删除不彻底: ' + JSON.stringify(left));
    }
    if (!(await page.eval('return document.body.innerText.includes("还没有项目");'))) {
      throw new Error('删除后应回到空状态引导');
    }
  });

  /* ---------- H 咨询工作 ---------- */
  t.test('H1 新建客户，四项统计为 0', async ({ page }) => {
    await page.goto(F.BASE + '/#/consult');
    await page.click('#firstClient');
    await page.waitFor('!!document.querySelector("#cName")');
    await val(page, '#cName', '陈总');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("陈总")');
    const stats = await page.eval('return [...document.querySelectorAll(".stat-row .stat .v")].map(e=>e.textContent.trim());');
    if (stats[0] !== '1') throw new Error('客户数应为 1: ' + stats.join(','));
    if (!stats[1].startsWith('0')) throw new Error('本月工时应为 0: ' + stats[1]);
    if (!stats[2].includes('0')) throw new Error('本月收入应为 0: ' + stats[2]);
    if (stats[3] !== '0') throw new Error('待跟进应为 0: ' + stats[3]);
  });

  t.test('H2 记一次沟通：工时、收入、时间线同步', async ({ page }) => {
    const d = F.blank();
    d.consult.clients.push({ id: 'h2c', name: '陈总', company: '', contact: '', rate: 0, rateUnit: '/次', note: '', status: 'active' });
    await F.put(d);
    await page.goto(F.BASE + '/#/consult');
    await page.click('#addSession');
    await page.waitFor('!!document.querySelector("#sDur")');
    await val(page, '#sDur', '90');
    await val(page, '#sFee', '1500');
    await val(page, '#sTopic', '投放结构诊断');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("投放结构诊断")');
    const stats = await page.eval('return [...document.querySelectorAll(".stat-row .stat .v")].map(e=>e.textContent.trim());');
    if (!stats[1].startsWith('1.5')) throw new Error('本月工时应为 1.5 小时: ' + stats[1]);
    if (!stats[2].includes('1,500')) throw new Error('本月收入应为 ¥1,500: ' + stats[2]);
  });

  t.test('H3 勾需要跟进+下次日期今天：待跟进+1 且汇入计划', async ({ page }) => {
    const d = F.blank();
    d.consult.clients.push({ id: 'h3c', name: '陈总', company: '', contact: '', rate: 0, rateUnit: '/次', note: '', status: 'active' });
    await F.put(d);
    await page.goto(F.BASE + '/#/consult');
    await page.click('#addSession');
    await page.waitFor('!!document.querySelector("#sFollow")');
    await page.click('#sFollow');
    await val(page, '#sNext', F.today());
    await val(page, '#sTopic', '跟进事项');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("待跟进")');
    const pending = await page.eval('return WB.calc.consultStats().pending;');
    if (pending !== 1) throw new Error('待跟进应为 1: ' + pending);
    await page.goto(F.BASE + '/#/plan');
    await page.waitFor('[...document.querySelectorAll(".agenda-chip")].some(c=>c.innerText.includes("客户跟进") && c.innerText.includes("陈总"))');
  });

  t.test('H4 点已跟进销账：待跟进-1、关联区消失', async ({ page }) => {
    const d = F.blank();
    d.consult.clients.push({ id: 'h4c', name: '李总', company: '', contact: '', rate: 0, rateUnit: '/次', note: '', status: 'active' });
    d.consult.sessions.push({
      id: 'h4s', clientId: 'h4c', clientName: '李总', date: F.today(), duration: 30,
      topic: 'H4 待跟进', notes: '', fee: 0, followUp: true, followDone: false, nextAt: F.today()
    });
    await F.put(d);
    await page.goto(F.BASE + '/#/consult');
    await page.waitFor('!!document.querySelector("[data-done]")');
    await page.click('[data-done]');
    await page.waitFor('WB.calc.consultStats().pending === 0', 4000);
    await page.goto(F.BASE + '/#/plan');
    const chips = await page.eval('return [...document.querySelectorAll(".agenda-chip")].map(e=>e.innerText);');
    if (chips.some(x => x.includes('客户跟进'))) throw new Error('销账后关联区仍显示');
  });

  t.test('H5 删除客户连带沟通记录', async ({ page }) => {
    const d = F.blank();
    d.consult.clients.push({ id: 'h5c', name: '王总', company: '', contact: '', rate: 0, rateUnit: '/次', note: '', status: 'active' });
    d.consult.sessions.push({ id: 'h5s', clientId: 'h5c', clientName: '王总', date: F.today(), duration: 60, topic: '', notes: '', fee: 0, followUp: false, followDone: false, nextAt: '' });
    await F.put(d);
    await page.goto(F.BASE + '/#/consult');
    await page.click('#editClient');
    await page.waitFor('!!document.querySelector("#delClient")');
    await page.click('#delClient');
    await page.waitFor('[...document.querySelectorAll(".modal-mask")].length === 2');
    await modalOk(page);
    await escapeAll(page);
    const left = await page.eval('return { c: WB.state.consult.clients.length, s: WB.state.consult.sessions.length };');
    if (left.c || left.s) throw new Error('未级联删除: ' + JSON.stringify(left));
  });

  /* ---------- I 健身计划 ---------- */
  t.test('I1 新建模板：摘要显示"动作 组×次 @重量"', async ({ page }) => {
    await page.goto(F.BASE + '/#/fitness');
    await page.click('#newTpl');
    await page.waitFor('!!document.querySelector("#tpName")');
    await val(page, '#tpName', '推日');
    await valInput(page, '[data-f="exercise"]', '卧推');
    await valInput(page, '[data-f="sets"]', '4');
    await valInput(page, '[data-f="reps"]', '8');
    await valInput(page, '[data-f="weight"]', '60');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("卧推 4×8 @60kg")');
  });

  t.test('I2 开始训练生成当日记录；重复开始被阻止', async ({ page }) => {
    const d = F.blank();
    d.fitness.templates.push({
      id: 'i2t', name: '推日', part: '胸',
      items: [{ exercise: '卧推', sets: 4, reps: '8', weight: '60' }, { exercise: '绳索夹胸', sets: 3, reps: '12', weight: '' }]
    });
    await F.put(d);
    await page.goto(F.BASE + '/#/fitness');
    await page.click('[data-start]');
    await page.waitFor('document.body.innerText.includes("0/2 动作完成")');
    const disabled = await page.eval('const b=document.querySelector("[data-start]"); return b && b.disabled;');
    if (!disabled) throw new Error('开始训练按钮未置灰');
    await page.eval('document.querySelector("[data-start]").click(); return true;');
    await sleep(200);
    const logs = await page.eval('return WB.state.fitness.logs.length;');
    if (logs !== 1) throw new Error('重复开始产生了第二条记录: ' + logs);
  });

  t.test('I3 勾动作+改时长：进度与本周时长同步', async ({ page }) => {
    const d = F.blank();
    d.fitness.templates.push({
      id: 'i3t', name: '推日', part: '胸',
      items: [{ exercise: '卧推', sets: 4, reps: '8', weight: '60' }, { exercise: '绳索夹胸', sets: 3, reps: '12', weight: '' }]
    });
    await F.put(d);
    await page.goto(F.BASE + '/#/fitness');
    await page.click('[data-start]');
    await page.waitFor('!!document.querySelector("#dur")');
    await page.click('#app [data-item="0"]');
    await page.waitFor('document.body.innerText.includes("1/2 动作完成")');
    await page.click('#app [data-item="1"]');
    await page.waitFor('document.body.innerText.includes("2/2 动作完成")');
    const w1 = await page.eval('return document.querySelector(".progress-line > i").style.width;');
    if (w1 !== '100%') throw new Error('动作进度条应 100%: ' + w1);
    await valChange(page, '#dur', '50');
    await page.click('#finishLog');
    await waitToast(page, '训练已记录');
    const mins = await page.eval(`
      const st = [...document.querySelectorAll('.stat-row .stat')];
      return st[2].querySelector('.v').textContent.trim();`);
    if (!mins.startsWith('50')) throw new Error('本周训练时长应 50 分钟: ' + mins);
  });

  t.test('I4 体重趋势：一条给提示，两条出折线', async ({ page }) => {
    await page.goto(F.BASE + '/#/fitness');
    await page.click('#addWeight');
    await page.waitFor('!!document.querySelector("#wWeight")');
    await val(page, '#wWeight', '70.5');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("记录两次以上才能画出趋势")');
    await page.click('#addWeight');
    await page.waitFor('!!document.querySelector("#wWeight")');
    await val(page, '#wWeight', '70.0');
    await val(page, '#wDate', F.addDays(F.today(), -1)); // 不同日期，避免同日覆盖
    await modalOk(page);
    await page.waitFor('!!document.querySelector("svg.spark path")');
    const pts = await page.eval('return WB.state.fitness.body.length;');
    if (pts !== 2) throw new Error('体重记录应为 2 条: ' + pts);
  });

  t.test('I5 连续两天训练显示连续打卡 2', async ({ page }) => {
    const d = F.blank();
    d.fitness.logs.push({
      id: 'i5y', date: F.addDays(F.today(), -1), templateId: '', name: '拉日',
      items: [{ exercise: '引体', sets: 4, reps: '8', weight: '', done: true }], duration: 40, note: ''
    });
    await F.put(d);
    await page.goto(F.BASE + '/#/fitness');
    await page.click('#manualLog');
    await page.waitFor('!!document.querySelector("#dur")');
    await page.click('#finishLog');
    await waitToast(page, '训练已记录');
    const streak = await page.eval(`
      const st = [...document.querySelectorAll('.stat-row .stat')];
      return st[1].querySelector('.v').textContent.trim();`);
    if (!streak.startsWith('2')) throw new Error('连续打卡应为 2 天: ' + streak);
  });

  /* ---------- J 饮食计划 ---------- */
  const RICE = { id: 'rice', name: '米饭', unit: '碗', kcal: 232, protein: 4.3, carb: 51, fat: 0.5 };
  function riceLibrary() {
    const d = F.blank();
    d.diet.foods.push(RICE);
    return d;
  }

  t.test('J1 新建食物可被搜索到', async ({ page }) => {
    await page.goto(F.BASE + '/#/diet');
    await page.click('#newFood');
    await page.waitFor('!!document.querySelector("#fName")');
    await val(page, '#fName', '鸡胸肉');
    await val(page, '#fKcal', '165');
    await val(page, '#fPro', '31');
    await modalOk(page);
    await page.waitFor('!!document.querySelector("#foodSearch")');
    await valInput(page, '#foodSearch', '鸡胸');
    await page.waitFor('document.querySelector("#foodList").innerText.includes("鸡胸肉")');
  });

  t.test('J2 午餐 2 份米饭：464 kcal、碳水同步', async ({ page }) => {
    await F.put(riceLibrary());
    await page.goto(F.BASE + '/#/diet');
    await page.click('[data-add="lunch"]');
    await page.waitFor('!!document.querySelector("#aQty")');
    await valInput(page, '#aQty', '2');
    await page.waitFor('document.querySelector("#aPreview").textContent.includes("464 kcal")');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("464 kcal")');
    const top = await page.eval(`
      const pad = document.querySelector('.card-pad');
      return { kcal: pad.querySelector('span.num').textContent, carb: pad.innerText.includes('102'), meal: pad.nextElementSibling ? '' : '' };`);
    if (top.kcal !== '464') throw new Error('顶部热量应 464: ' + top.kcal);
    if (!top.carb) throw new Error('碳水未同步到 102g');
    const meal = await page.eval(`
      const cards = [...document.querySelectorAll('.card')];
      const lunch = cards.find(c => c.querySelector('h3') && c.querySelector('h3').textContent.startsWith('午餐'));
      return lunch.innerText;`);
    if (!meal.includes('2碗') && !meal.includes('2 碗')) throw new Error('午餐条目份数不对: ' + meal);
  });

  t.test('J3 点第 5 个水格记 5，再点同一格回 4', async ({ page }) => {
    await F.put(riceLibrary());
    await page.goto(F.BASE + '/#/diet');
    await page.click('[data-water="5"]');
    await page.waitFor('document.body.innerText.includes("喝水 5 / 8 杯")');
    await page.click('[data-water="5"]');
    await page.waitFor('document.body.innerText.includes("喝水 4 / 8 杯")');
  });

  t.test('J4 摄入超过目标标红并显示已超', async ({ page }) => {
    const d = riceLibrary();
    d.settings.kcalGoal = 100;
    await F.put(d);
    await page.goto(F.BASE + '/#/diet');
    await page.click('[data-add="lunch"]');
    await page.waitFor('!!document.querySelector("#aQty")');
    await modalOk(page); // 默认 1 份米饭 232 > 100
    await page.waitFor('document.body.innerText.includes("已超 132")');
    const tag = await page.eval('const t=document.querySelector(".card-pad .tag"); return { text: t.textContent, cls: t.className };');
    if (!tag.cls.includes('danger')) throw new Error('超标标签未标红: ' + tag.cls);
  });

  t.test('J5 切到昨天添加不影响今天', async ({ page }) => {
    await F.put(riceLibrary());
    await page.goto(F.BASE + '/#/diet');
    await page.click('[data-add="lunch"]');
    await page.waitFor('!!document.querySelector("#aQty")');
    await modalOk(page);
    await page.waitFor('document.querySelector(".card-pad span.num").textContent === "232"');
    await page.click('[data-nav="-1"]');
    await page.waitFor('document.body.innerText.includes("还没记午餐")');
    await page.click('[data-add="lunch"]');
    await page.waitFor('!!document.querySelector("#aQty")');
    await modalOk(page);
    await page.waitFor('[...document.querySelectorAll(".card")].some(c=>c.querySelector("h3") && c.querySelector("h3").textContent.startsWith("午餐") && c.innerText.includes("232"))');
    await page.click('#backToday');
    await page.waitFor('document.querySelector(".card-pad span.num").textContent === "232"');
    const y = F.addDays(F.today(), -1);
    const log = await page.eval(`return (WB.state.diet.logs[${JSON.stringify(y)}] || { lunch: [] }).lunch.length;`);
    if (log !== 1) throw new Error('昨天的记录未保存');
  });

  /* ---------- K 游戏娱乐 ---------- */
  t.test('K1 添加游戏并设为在玩', async ({ page }) => {
    await page.goto(F.BASE + '/#/games');
    await page.click('#newGame');
    await page.waitFor('!!document.querySelector("#gmTitle")');
    await val(page, '#gmTitle', '艾尔登法环');
    await modalOk(page);
    await page.waitFor('[...document.querySelectorAll(".card")].some(c=>c.querySelector("h3") && c.querySelector("h3").textContent.includes("正在玩") && c.innerText.includes("艾尔登法环"))');
  });

  t.test('K2 +30 分：累计与本周柱图同步', async ({ page }) => {
    const d = F.blank();
    d.games.items.push({ id: 'k2g', title: '空洞骑士', platform: 'Steam', status: 'playing', rating: 5, progress: 40, note: '' });
    await F.put(d);
    await page.goto(F.BASE + '/#/games');
    await page.click('[data-addtime$=":30"]');
    await page.waitFor('document.querySelector(".stat-row .stat .v").textContent.startsWith("0.5")');
    await page.waitFor('!!document.querySelector(\'div[title="30 分钟"]\')');
  });

  t.test('K3 进度条改 60%：卡片与进度条同步', async ({ page }) => {
    const d = F.blank();
    d.games.items.push({ id: 'k3g', title: '空洞骑士', platform: 'Steam', status: 'playing', rating: 5, progress: 0, note: '' });
    await F.put(d);
    await page.goto(F.BASE + '/#/games');
    await page.click('[data-editgame]');
    await page.waitFor('!!document.querySelector("#gmProg")');
    await valInput(page, '#gmProg', '60');
    await page.waitFor('document.querySelector("#pgLabel").textContent === "60%"');
    await modalOk(page);
    await page.waitFor('document.body.innerText.includes("进度 60%")');
    const w = await page.eval('return document.querySelector(".bar > i").style.width;');
    if (w !== '60%') throw new Error('进度条宽度未同步: ' + w);
  });

  t.test('K4 已通关列表点重玩回到在玩', async ({ page }) => {
    const d = F.blank();
    d.games.items.push({ id: 'k4g', title: '塞尔达', platform: 'Switch', status: 'done', rating: 5, progress: 100, note: '' });
    await F.put(d);
    await page.goto(F.BASE + '/#/games');
    await page.waitFor('!!document.querySelector("[data-move]")');
    await page.click('[data-move]');
    await waitToast(page, '已移到「在玩」');
    const playing = await page.eval('return WB.state.games.items.filter(i=>i.status==="playing").length;');
    if (playing !== 1) throw new Error('重玩后应在玩: ' + playing);
  });

  t.test('K5 删除时长记录：周合计与柱图同步减少', async ({ page }) => {
    const d = F.blank();
    d.games.items.push({ id: 'k5g', title: '空洞骑士', platform: 'Steam', status: 'playing', rating: 5, progress: 40, note: '' });
    d.games.sessions.push({ id: 'k5s', date: F.today(), itemId: 'k5g', minutes: 90, note: '' });
    await F.put(d);
    await page.goto(F.BASE + '/#/games');
    await page.waitFor('document.querySelector(".stat-row .stat .v").textContent.startsWith("1.5")');
    await page.click('[data-delsess]');
    await page.waitFor('document.querySelector(".stat-row .stat .v").textContent.startsWith("0.0")');
    await page.waitFor('!document.querySelector(\'div[title="90 分钟"]\')');
  });

  /* ---------- L 设置 ---------- */
  t.test('L1 填称呼后首页问候带称呼', async ({ page }) => {
    await page.goto(F.BASE + '/#/settings');
    await val(page, '#setName', '阿泽');
    await page.click('#saveSettings');
    await waitToast(page, '设置已保存');
    await page.goto(F.BASE + '/#/home');
    const g = await page.eval('return document.querySelector(".greet").textContent;');
    if (!g.includes('阿泽')) throw new Error('问候未带称呼: ' + g);
    if (/[，,]\s*$/.test(g)) throw new Error('出现空标点: ' + g);
  });

  t.test('L2 热量目标改 1800：饮食页分母重算', async ({ page }) => {
    await page.goto(F.BASE + '/#/settings');
    await val(page, '#setKcal', '1800');
    await page.click('#saveSettings');
    await waitToast(page, '设置已保存');
    await page.goto(F.BASE + '/#/diet');
    await page.waitFor('document.body.innerText.includes("/ 1800 kcal")');
  });

  t.test('L3 数据概览与数据文件逐项一致', async ({ page }) => {
    const d = F.blank();
    d.memo.push({ id: 'l3m', text: '备忘', createdAt: new Date().toISOString(), done: false });
    d.plan[F.today()] = [{ id: 'l3p', text: '计划', start: '', tag: '', prio: 0, done: false }];
    d.media.contents.push({ id: 'l3c', title: '内容', platform: '公众号', status: 'idea', body: '', publishAt: '', publishedAt: '', stats: {}, notes: '' });
    d.dev.projects.push({ id: 'l3pr', name: '项目', desc: '', status: 'active', color: '#2f6a63', repo: '' });
    d.dev.tasks.push({ id: 'l3t', projectId: 'l3pr', title: '任务', status: 'todo', prio: 0, due: '', note: '' });
    d.dev.bugs.push({ id: 'l3b', projectId: 'l3pr', title: 'bug', severity: 'low', status: 'open', repro: '', date: F.today() });
    d.consult.clients.push({ id: 'l3cl', name: '客户', company: '', contact: '', rate: 0, rateUnit: '/次', note: '', status: 'active' });
    d.consult.sessions.push({ id: 'l3s', clientId: 'l3cl', clientName: '客户', date: F.today(), duration: 60, topic: '', notes: '', fee: 0, followUp: false, followDone: false, nextAt: '' });
    d.fitness.logs.push({ id: 'l3l', date: F.today(), templateId: '', name: '训练', items: [], duration: 30, note: '' });
    d.fitness.body.push({ id: 'l3w', date: F.today(), weight: 70, bodyfat: '', waist: '' });
    d.diet.foods.push(RICE);
    d.games.items.push({ id: 'l3g', title: '游戏', platform: 'Steam', status: 'playing', rating: '', progress: 0, note: '' });
    d.games.sessions.push({ id: 'l3gs', date: F.today(), itemId: 'l3g', minutes: 30, note: '' });
    await F.put(d);

    await page.goto(F.BASE + '/#/settings');
    const disk = await F.get();
    const expect = {
      '计划条目': Object.values(disk.plan).reduce((a, x) => a + x.length, 0),
      '快速备忘': disk.memo.length,
      '自媒体内容': disk.media.contents.length,
      '客户 / 沟通记录': disk.consult.clients.length + ' / ' + disk.consult.sessions.length,
      '训练日志 / 体重记录': disk.fitness.logs.length + ' / ' + disk.fitness.body.length,
      '游戏 / 时长记录': disk.games.items.length + ' / ' + disk.games.sessions.length
    };
    const rows = await page.eval(`
      return [...document.querySelectorAll('.table tbody tr')].map(tr => {
        const tds = tr.querySelectorAll('td');
        return tds[0].textContent.trim() + ' = ' + tds[1].textContent.trim();
      });`);
    const flat = rows.join('\n');
    for (const [k, v] of Object.entries(expect)) {
      const line = rows.find(r => r.startsWith(k + ' ='));
      if (!line) throw new Error('概览缺少行: ' + k);
      if (!line.endsWith('= ' + v)) throw new Error(`${k} 显示与数据文件不符：页面「${line}」应为 ${v}`);
    }
    if (!flat.includes('开发项目 / 任务 / bug = 1 / 1 / 1')) throw new Error('开发概览不符: ' + flat);
  });

  t.test('L4 清空全部：模块数据清空、设置保留', async ({ page }) => {
    const d = F.blank();
    d.settings.name = '要保留的称呼';
    d.memo.push({ id: 'l4m', text: '会被清掉', createdAt: new Date().toISOString(), done: false });
    await F.put(d);
    await page.goto(F.BASE + '/#/settings');
    await page.click('#resetAll');
    await page.waitFor('[...document.querySelectorAll(".modal-mask")].length === 1');
    await modalOk(page);
    await page.waitFor('WB.state.memo.length === 0', 5000);
    const st = await page.eval('return { memo: WB.state.memo.length, name: WB.state.settings.name, plan: Object.keys(WB.state.plan).length };');
    if (st.memo !== 0 || st.plan !== 0) throw new Error('未清空干净: ' + JSON.stringify(st));
    if (st.name !== '要保留的称呼') throw new Error('设置未保留: ' + st.name);
    const disk = await F.get();
    if (disk.memo.length !== 0 || disk.settings.name !== '要保留的称呼') throw new Error('落盘结果不对');
  });

  /* ---------- M 边界与健壮性 ---------- */
  t.test('M1 标题留空被拦截、弹窗不关闭', async ({ page }) => {
    await page.goto(F.BASE + '/#/media');
    await page.click('#newContent');
    await page.waitFor('!!document.querySelector("#mTitle")');
    // 不用 modalOk：这里被测行为就是"弹窗保持打开"
    await page.eval(`
      const masks = [...document.querySelectorAll('.modal-mask')];
      masks[masks.length - 1].querySelector('[data-ok]').click();
      return true;`);
    await waitToast(page, '标题不能为空');
    const still = await page.count('.modal-mask');
    if (still !== 1) throw new Error('弹窗应保持打开，实际 ' + still + ' 个');
    await escapeAll(page);
  });

  t.test('M2 超长正文在卡片内正常换行', async ({ page }) => {
    const d = F.blank();
    d.media.contents.push({
      id: 'm2c', title: '长正文', platform: '公众号', status: 'idea',
      body: 'X'.repeat(200) + '很长的中文'.repeat(30), publishAt: '', publishedAt: '', stats: {}, notes: ''
    });
    await F.put(d);
    await page.goto(F.BASE + '/#/media');
    await page.waitFor('!!document.querySelector(".kcard .note")');
    const m = await page.eval(`
      const n = document.querySelector('.kcard .note');
      return { over: document.documentElement.scrollWidth - window.innerWidth, noteOver: n.scrollWidth > n.clientWidth + 1 };`);
    if (m.over > 1) throw new Error('页面横向溢出 ' + m.over + 'px');
    if (m.noteOver) throw new Error('卡片正文未换行');
  });

  t.test('M3 注入脚本原样显示、不执行', async ({ page }) => {
    await page.goto(F.BASE + '/#/plan');
    await page.eval('window.__xss = 0; window.alert = () => { window.__xss++; }; return true;');
    await page.fill('#npText', '<script>alert(1)</script>', true);
    await page.waitFor('[...document.querySelectorAll(".plan-row .p-text")].some(e=>e.textContent.includes("alert(1)"))');
    const xss = await page.eval('return { n: window.__xss, raw: document.querySelector(".plan-row .p-text").textContent };');
    if (xss.n !== 0) throw new Error('脚本被执行了！');
    if (!xss.raw.includes('<script>')) throw new Error('文本未按原文显示: ' + xss.raw);
    const state = await page.eval('return WB.state.plan[WB.today()][0].text;');
    if (state !== '<script>alert(1)</script>') throw new Error('存储层不应改写用户输入: ' + state);
  });

  t.test('M4 1080px 宽：两栏并一栏、无横向滚动', async ({ page }) => {
    await page.setViewport(1080, 800);
    try {
      await page.goto(F.BASE + '/#/home');
      const m = await page.eval(`
        const g = getComputedStyle(document.querySelector('.home-grid'));
        return {
          over: document.documentElement.scrollWidth - window.innerWidth,
          cols: g.gridTemplateColumns.split(' ').length
        };`);
      if (m.over > 1) throw new Error('1080px 出现横向滚动: ' + m.over + 'px');
      if (m.cols !== 1) throw new Error('两栏未并成一栏: ' + m.cols);
    } finally {
      await page.setViewport(1440, 950);
    }
  });

  t.test('M5 一处改数据，另一处刷新即见最新', async ({ page }) => {
    await page.goto(F.BASE + '/#/home');
    const d = await F.get();
    d.memo.push({ id: 'm5x', text: 'M5 外部写入', createdAt: new Date().toISOString(), done: false });
    await F.put(d);
    await page.reload();
    await page.waitFor('document.body.innerText.includes("M5 外部写入")');
  });
};
