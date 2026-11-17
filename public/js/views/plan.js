/* ================= 今日计划 ================= */
(function () {
  const { esc, icon, today, addDays, fmtDate, relDay } = WB;
  const TAGS = ['工作', '生活', '学习', '健康', '其他'];
  const PRIOS = [
    { v: 0, label: '普通', cls: '' },
    { v: 1, label: '重要', cls: 'p1' },
    { v: 2, label: '紧急', cls: 'p3' }
  ];
  let planDate = today();

  function listOf(date) { return WB.state.plan[date] || (WB.state.plan[date] = []); }
  function sorted(date) {
    return listOf(date).slice().sort((a, b) => {
      const sa = a.start || '99:99', sb = b.start || '99:99';
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
  }

  function nextHour() {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  }

  function render(root) {
    const items = sorted(planDate);
    const done = items.filter(x => x.done).length;
    const pct = items.length ? Math.round(done / items.length * 100) : 0;
    const isToday = planDate === today();
    const ag = WB.calc.agenda(planDate);

    root.innerHTML = `<div class="wrap">
      <div class="page-head">
        <div>
          <h1>今日计划</h1>
          <div class="sub">${esc(fmtDate(planDate))}${isToday ? '　·　就是今天' : `　·　${esc(relDay(planDate))}`}</div>
        </div>
        <div class="head-actions">
          <div class="date-nav">
            <button class="btn icon" data-nav="-1">${icon('left', 15)}</button>
            <span class="cur">${esc(fmtDate(planDate, false))}</span>
            <button class="btn icon" data-nav="1">${icon('right', 15)}</button>
          </div>
          <input type="date" class="input" id="datePick" value="${planDate}" style="width:150px">
          <button class="btn" id="backToday" ${isToday ? 'disabled' : ''}>回到今天</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="memo-add" style="border-top:0;border-radius:12px 12px 0 0;padding:12px">
          <input type="time" class="input" id="npStart" value="${nextHour()}" style="width:104px;flex:0 0 104px">
          <input class="input" id="npText" placeholder="要做什么？回车添加" maxlength="120">
          <select class="select" id="npTag" style="width:86px;flex:0 0 86px">
            ${TAGS.map(t => `<option>${t}</option>`).join('')}
          </select>
          <select class="select" id="npPrio" style="width:78px;flex:0 0 78px">
            ${PRIOS.map(p => `<option value="${p.v}">${p.label}</option>`).join('')}
          </select>
          <button class="btn primary" id="npAdd">添加</button>
        </div>
        <div style="padding:0 16px 10px">
          <div class="progress-line"><i style="width:${pct}%"></i></div>
          <div class="small muted" style="margin-top:6px;display:flex;justify-content:space-between">
            <span>完成 ${done} / ${items.length}</span>
            <span>${items.length ? pct + '%' : '还没有安排'}</span>
          </div>
        </div>
        <div id="planList">${listHtml(items)}</div>
      </div>

      <div class="card">
        <div class="card-head">
          <h3>其他模块今天关联的事</h3>
          <span class="hint">自动汇总，不在这里勾选</span>
        </div>
        ${ag.length ? `<div class="agenda-strip">${ag.map(a => `
          <div class="agenda-chip" data-go="${a.go}">
            <span class="src">${esc(a.src)}</span><span>${esc(a.text)}</span>
          </div>`).join('')}</div>`
        : `<div class="empty">今天没有开发任务到期、没有内容要发、也没有客户要跟进</div>`}
      </div>
    </div>`;

    bind(root);
  }

  function listHtml(items) {
    if (!items.length) {
      return `<div class="empty"><b>这一天还是空的</b>上面填一句就能加进来</div>`;
    }
    const nowHM = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    let soonest = null;
    return `<div>${items.map(p => {
      const pr = PRIOS[p.prio || 0];
      const isNow = planDate === today() && !p.done && !soonest && (p.start || '') >= nowHM;
      if (isNow) soonest = p.id;
      return `<div class="plan-row ${p.done ? 'done' : ''}" data-id="${p.id}" style="${isNow ? 'background:#f4f8f7' : ''}">
        <div class="prio ${pr.cls}"></div>
        <div class="p-time">${p.start ? esc(p.start) : '随时'}</div>
        <div class="check ${p.done ? 'on' : ''}" data-toggle="${p.id}"></div>
        <div class="p-main">
          <div class="p-text" data-edit="${p.id}">${esc(p.text)}</div>
          <div class="p-tags">
            ${p.tag ? `<span class="tag line">${esc(p.tag)}</span>` : ''}
            ${p.prio ? `<span class="tag ${p.prio === 2 ? 'danger' : 'amber'}">${pr.label}</span>` : ''}
            ${isNow ? '<span class="tag accent">接下来</span>' : ''}
          </div>
        </div>
        <button class="btn ghost icon sm p-del" data-del="${p.id}" title="删除">${icon('trash', 13)}</button>
      </div>`;
    }).join('')}</div>`;
  }

  function bind(root) {
    WB.qsa('[data-nav]', root).forEach(b => b.addEventListener('click', () => {
      planDate = addDays(planDate, Number(b.dataset.nav));
      WB.refresh();
    }));
    WB.qs('#datePick', root).addEventListener('change', e => {
      planDate = e.target.value || today();
      WB.refresh();
    });
    WB.qs('#backToday', root).addEventListener('click', () => { planDate = today(); WB.refresh(); });
    WB.qsa('[data-go]', root).forEach(el => el.addEventListener('click', () => WB.go(el.dataset.go)));

    const textIn = WB.qs('#npText', root);
    const add = () => {
      const text = textIn.value.trim();
      if (!text) return;
      listOf(planDate).push({
        id: WB.uid(),
        text,
        start: WB.qs('#npStart', root).value,
        tag: WB.qs('#npTag', root).value,
        prio: Number(WB.qs('#npPrio', root).value),
        done: false
      });
      WB.save();
      WB.refresh();
      setTimeout(() => {
        const el = WB.qs('#npText', document);
        if (el) el.focus();
      }, 20);
    };
    textIn.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    WB.qs('#npAdd', root).addEventListener('click', add);

    WB.qs('.wrap', root).addEventListener('click', e => {
      const toggle = e.target.closest('[data-toggle]');
      if (toggle) {
        const p = listOf(planDate).find(x => x.id === toggle.dataset.toggle);
        if (p) { p.done = !p.done; WB.save(); patch(); }
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        WB.state.plan[planDate] = listOf(planDate).filter(x => x.id !== del.dataset.del);
        WB.save(); WB.refresh();
        return;
      }
      const edit = e.target.closest('[data-edit]');
      if (edit) openEdit(edit.dataset.edit);
    });

    function patch() {
      WB.qs('#planList', root).innerHTML = listHtml(sorted(planDate));
      const items = sorted(planDate);
      const done = items.filter(x => x.done).length;
      const pct = items.length ? Math.round(done / items.length * 100) : 0;
      WB.qs('.progress-line > i', root).style.width = pct + '%';
      const stat = WB.qsa('.small.muted span', root);
      if (stat[0]) stat[0].textContent = `完成 ${done} / ${items.length}`;
      if (stat[1]) stat[1].textContent = items.length ? pct + '%' : '还没有安排';
      WB.renderNav();
    }
  }

  function openEdit(id) {
    const p = listOf(planDate).find(x => x.id === id);
    if (!p) return;
    WB.modal({
      title: '修改这件事',
      body: `
        <div class="field"><label>内容</label><input class="input" id="eText" value="${esc(p.text)}" maxlength="120"></div>
        <div class="row">
          <div class="field"><label>时间</label><input type="time" class="input" id="eStart" value="${esc(p.start || '')}"></div>
          <div class="field"><label>标签</label><select class="select" id="eTag">${TAGS.map(t => `<option ${t === p.tag ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="field"><label>优先级</label><select class="select" id="ePrio">${PRIOS.map(x => `<option value="${x.v}" ${x.v === (p.prio || 0) ? 'selected' : ''}>${x.label}</option>`).join('')}</select></div>
        </div>`,
      onOk: body => {
        const t = WB.qs('#eText', body).value.trim();
        if (!t) return false;
        p.text = t;
        p.start = WB.qs('#eStart', body).value;
        p.tag = WB.qs('#eTag', body).value;
        p.prio = Number(WB.qs('#ePrio', body).value);
        WB.save(); WB.refresh();
      }
    });
  }

  WB.register('plan', {
    render,
    resetDate() { planDate = today(); }
  });
})();
