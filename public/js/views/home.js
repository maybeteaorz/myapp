/* ================= 首页总览 ================= */
(function () {
  const { esc, icon, calc, today, fmtDateFull } = WB;

  function greeting() {
    const h = new Date().getHours();
    const name = (WB.state.settings.name || '').trim();
    const who = name ? `，${name}` : '';
    if (h < 5) return '夜深了' + who;
    if (h < 11) return '早上好' + who;
    if (h < 14) return '中午好' + who;
    if (h < 18) return '下午好' + who;
    if (h < 23) return '晚上好' + who;
    return '夜深了' + who;
  }

  function ring(pct, label) {
    const r = 20, c = 2 * Math.PI * r;
    const off = c * (1 - Math.max(0, Math.min(1, pct)));
    return `<svg viewBox="0 0 48 48" width="48" height="48">
      <circle cx="24" cy="24" r="${r}" fill="none" stroke="#e8e5dd" stroke-width="4.5"/>
      <circle id="ringArc" cx="24" cy="24" r="${r}" fill="none" stroke="#2f6a63" stroke-width="4.5"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        stroke-linecap="round" transform="rotate(-90 24 24)"/>
      <text id="ringLabel" x="24" y="28" text-anchor="middle" font-size="12" font-weight="650" fill="#22252a">${label}</text>
    </svg>`;
  }

  function sumCard(key, iconName, title, big, unit, foot) {
    return `<div class="sum-card" data-go="${key}">
      <div class="top">${icon(iconName, 14)}<span>${esc(title)}</span></div>
      <div class="big">${big}${unit ? `<em>${esc(unit)}</em>` : ''}</div>
      <div class="foot">${foot}</div>
    </div>`;
  }

  function render(root) {
    const s = WB.state;
    const t = today();
    const plan = (s.plan[t] || []).slice().sort((a, b) => (a.start || '99') < (b.start || '99') ? -1 : 1);
    const doneCount = plan.filter(p => p.done).length;
    const pct = plan.length ? doneCount / plan.length : 0;

    const m = calc.mediaStats();
    const d = calc.devStats();
    const c = calc.consultStats();
    const f = calc.fitnessWeek();
    const diet = calc.dietDay(t);
    const g = calc.gameWeek();
    const body = calc.bodyLatest();
    const kcalGoal = s.settings.kcalGoal || 2000;
    const proteinGoal = s.settings.proteinGoal || 120;
    const waterGoal = s.settings.waterGoal || 8;

    const todayTemplate = (s.fitness.logs.find(l => l.date === t) || {}).name || '';
    const nextPub = m.next;

    root.innerHTML = `<div class="wrap">
      <div class="today-banner">
        <div>
          <div class="greet">${esc(greeting())}</div>
          <div class="meta">${fmtDateFull(t)}　·　${plan.length ? `今天安排了 ${plan.length} 件事` : '今天还没有安排'}</div>
        </div>
        <div class="ring-group">
          <div class="ring-item">${ring(pct, `${doneCount}/${plan.length}`)}<div class="k">今日完成</div></div>
          <div class="ring-item" style="text-align:left">
            <div style="font-size:17px;font-weight:650" class="num">${g.minutes ? (g.minutes / 60).toFixed(1) : 0}<span style="font-size:11px;font-weight:400;color:var(--ink-3)"> 小时</span></div>
            <div class="k">本周娱乐</div>
          </div>
          <div class="ring-item" style="text-align:left">
            <div style="font-size:17px;font-weight:650" class="num">${f.count}<span style="font-size:11px;font-weight:400;color:var(--ink-3)"> 次</span></div>
            <div class="k">本周训练</div>
          </div>
        </div>
      </div>

      <div class="summary-grid">
        ${sumCard('media', 'pen', '自媒体', m.by.ready, '篇待发',
          `本月已发 ${m.pubThisMonth} 篇 · ${nextPub ? '下次：' + esc(nextPub.publishAt) : '暂无排期'}`)}
        ${sumCard('dev', 'code', '开发工作', d.by.doing, '个进行中',
          `待办 ${d.by.todo} · 未修 bug ${d.bugs} · ${d.activeProjects} 个项目`)}
        ${sumCard('consult', 'case', '咨询工作', c.pending, '件待跟进',
          `${c.nextAt ? '下次联系 ' + esc(c.nextAt.nextAt) : '暂无约定'} · 本月 ${c.monthHours} 小时`)}
        ${sumCard('fitness', 'dumbbell', '健身计划', f.count, '次/本周',
          `${todayTemplate ? '今天：' + esc(todayTemplate) : '今天还没练'}${body ? ' · ' + body.weight + ' kg' : ''}`)}
        ${sumCard('diet', 'bowl', '饮食计划', diet.kcal, 'kcal',
          `蛋白 ${Math.round(diet.protein)}/${proteinGoal}g · 饮水 ${diet.water}/${waterGoal} 杯`)}
        ${sumCard('games', 'game', '游戏娱乐', (g.minutes / 60).toFixed(1), '小时/本周',
          `在玩 ${g.playing} 款 · 想玩 ${s.games.items.filter(i => i.status === 'wish').length} 款`)}
      </div>

      <div class="home-grid" style="margin-top:14px">
        <div class="card">
          <div class="card-head">
            <h3>今日安排</h3>
            <a class="btn ghost sm" href="#/plan">打开今日计划 →</a>
          </div>
          <div id="homePlan">${planHtml(plan)}</div>
          ${agendaHtml(calc.agenda(t))}
        </div>

        <div class="card">
          <div class="card-head">
            <h3>快速备忘</h3>
            <span class="hint">${s.memo.filter(x => !x.done).length} 条未处理</span>
          </div>
          <div id="memoList">${memoHtml()}</div>
          <div class="memo-add">
            <input class="input" id="memoInput" placeholder="想到什么随手记一笔，回车保存" maxlength="300">
            <button class="btn primary" id="memoAdd">记下</button>
          </div>
        </div>
      </div>
    </div>`;

    WB.qsa('[data-go]', root).forEach(el => el.addEventListener('click', () => WB.go(el.dataset.go)));

    const input = WB.qs('#memoInput', root);
    const add = () => {
      const v = input.value.trim();
      if (!v) return;
      WB.state.memo.unshift({ id: WB.uid(), text: v, createdAt: new Date().toISOString(), done: false });
      WB.save();
      input.value = '';
      WB.qs('#memoAdd', root).closest('.card').querySelector('.hint').textContent =
        `${WB.state.memo.filter(x => !x.done).length} 条未处理`;
      WB.qs('#memoList', root).innerHTML = memoHtml();
      bindMemo(root);
      input.focus();
    };
    WB.qs('#memoAdd', root).addEventListener('click', add);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });

    bindMemo(root);
    bindPlan(root);
  }

  function planHtml(plan) {
    if (!plan.length) {
      return `<div class="empty"><b>今天还没有安排</b>去「今日计划」把今天要做的事排一下</div>`;
    }
    const nowHM = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    let soonest = null;
    const rows = plan.map(p => {
      if (!p.done && !soonest && (p.start || '') >= nowHM) soonest = p.id;
      return `<div class="tl-item ${p.done ? 'done' : ''} ${p.id === soonest ? 'now' : ''}" data-id="${p.id}">
        <div class="tl-time">${p.start ? esc(p.start) : '—'}</div>
        <div class="tl-body">
          <div class="check ${p.done ? 'on' : ''}" data-toggle="${p.id}"></div>
          <div class="tl-text">${esc(p.text)}</div>
          ${p.tag ? `<span class="tag line">${esc(p.tag)}</span>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="timeline">${rows}</div>`;
  }

  /* 其他模块今天到期 / 待跟进 / 在玩的事，只读展示，点击去对应模块处理 */
  function agendaHtml(ag) {
    if (!ag.length) return '';
    return `<div class="agenda-block">
      <div class="agenda-title"><span>其他模块今天关联的事</span><span class="tip">只读，点击去处理</span></div>
      <div class="agenda-strip">${ag.map(a => `
        <div class="agenda-chip" data-go="${a.go}">
          <span class="src">${esc(a.src)}</span><span>${esc(a.text)}</span>
        </div>`).join('')}</div>
    </div>`;
  }

  function memoHtml() {    const list = WB.state.memo.slice()
      .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))
      .slice(0, 8);
    if (!list.length) return `<div class="empty" style="padding:22px 16px">还没有备忘，随手记一条试试</div>`;
    return `<div class="memo-list">${list.map(x => `
      <div class="memo-item ${x.done ? 'done' : ''}" data-id="${x.id}">
        <div class="check ${x.done ? 'on' : ''}" data-toggle="${x.id}"></div>
        <p>${esc(x.text)}</p>
        <button class="btn ghost icon sm p-del" data-del="${x.id}" title="删除">${icon('trash', 13)}</button>
      </div>`).join('')}</div>`;
  }

  function bindMemo(root) {
    const list = WB.qs('#memoList', root);
    WB.qsa('[data-toggle]', list).forEach(el => el.addEventListener('click', () => {
      const item = WB.state.memo.find(x => x.id === el.dataset.toggle);
      if (!item) return;
      item.done = !item.done;
      WB.save();
      list.innerHTML = memoHtml();
      bindMemo(root);
    }));
    WB.qsa('[data-del]', list).forEach(el => el.addEventListener('click', () => {
      WB.state.memo = WB.state.memo.filter(x => x.id !== el.dataset.del);
      WB.save();
      list.innerHTML = memoHtml();
      bindMemo(root);
    }));
  }

  /* 勾选后同步三处：列表、完成度圆环、条幅文案，避免要刷新才一致 */
  function paintHomePlan(root, arr) {
    const done = arr.filter(x => x.done).length;
    const total = arr.length;
    const c = 2 * Math.PI * 20;
    const arc = WB.qs('#ringArc', root);
    if (arc) arc.setAttribute('stroke-dashoffset', (c * (1 - (total ? done / total : 0))).toFixed(1));
    const label = WB.qs('#ringLabel', root);
    if (label) label.textContent = `${done}/${total}`;
    const meta = WB.qs('.today-banner .meta', root);
    if (meta) meta.textContent = `${fmtDateFull(today())}　·　${total ? `今天安排了 ${total} 件事` : '今天还没有安排'}`;
  }

  function bindPlan(root) {
    WB.qsa('#homePlan [data-toggle]', root).forEach(el => el.addEventListener('click', () => {
      const arr = WB.state.plan[today()] || [];
      const item = arr.find(x => x.id === el.dataset.toggle);
      if (!item) return;
      item.done = !item.done;
      WB.save();
      WB.qs('#homePlan', root).innerHTML = planHtml(arr.slice().sort((a, b) => (a.start || '99') < (b.start || '99') ? -1 : 1));
      paintHomePlan(root, arr);
      bindPlan(root);
    }));
  }

  WB.register('home', { render });
})();
