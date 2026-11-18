/* ================= 健身计划 ================= */
(function () {
  const { esc, icon, today, addDays, calc } = WB;
  const PARTS = ['胸', '背', '腿', '肩', '手臂', '核心', '有氧', '全身'];
  let logDate = today();
  const NOW = new Date();
  let calY = NOW.getFullYear(), calM = NOW.getMonth() + 1;

  function streak() {
    const dates = new Set(WB.state.fitness.logs.map(l => l.date));
    let n = 0, d = dates.has(today()) ? today() : addDays(today(), -1);
    while (dates.has(d)) { n++; d = addDays(d, -1); }
    return n;
  }

  /* ---------- 训练日历 ---------- */
  function fitCalHtml() {
    const byDate = {};
    WB.state.fitness.logs.forEach(l => { byDate[l.date] = l; });
    const t = today();
    const prefix = `${calY}-${String(calM).padStart(2, '0')}`;
    const weeks = WB.monthMatrix(calY, calM).filter(row => row.some(ds => ds.startsWith(prefix)));
    const dows = ['一', '二', '三', '四', '五', '六', '日'].map(d => `<div class="dow">${d}</div>`).join('');
    const cells = weeks.flat().map(ds => {
      const dayN = Number(ds.slice(8));
      if (!ds.startsWith(prefix)) return `<div class="cal-cell out"><div class="d">${dayN}</div></div>`;
      const log = byDate[ds];
      const cls = ['cal-cell', log ? 'fit' : '', ds === t ? 'today' : ''].filter(Boolean).join(' ');
      return `<div class="${cls}" data-calday="${ds}" title="${esc(ds)}">
        <div class="d">${dayN}</div>
        ${log ? `<div class="cal-name">${esc(log.name || '训练')}</div>
          <div class="cal-sub">${(log.items || []).length} 个动作${log.duration ? ' · ' + log.duration + ' 分' : ''}</div>`
        : ''}
      </div>`;
    }).join('');
    return `<div class="cal">${dows}${cells}</div>
      <div class="cal-legend">
        <span><i class="sw" style="background:var(--accent-soft);border:1px solid var(--line-2)"></i>有训练</span>
        <span>点日期看当天练了哪个部位、什么动作、几组几次</span>
      </div>`;
  }

  function showFitDay(ds) {
    const log = WB.state.fitness.logs.find(l => l.date === ds);
    if (!log) return;
    WB.modal({
      title: `训练详情 · ${WB.fmtDateFull(ds)}`,
      wide: true,
      body: `
        <div style="display:flex;gap:8px;align-items:center">
          <span class="tag accent">${esc(log.name || '训练')}</span>
          <span class="small muted">${log.duration || 0} 分钟 · ${(log.items || []).length} 个动作</span>
        </div>
        ${(log.items || []).length ? `<table class="table">
          <thead><tr><th>动作</th><th style="width:130px">组数 × 次数</th><th style="width:90px">重量</th><th style="width:60px">完成</th></tr></thead>
          <tbody>${log.items.map(i => `<tr>
            <td style="font-weight:600">${esc(i.exercise)}</td>
            <td class="num">${i.sets || '?'} 组 × ${i.reps || '?'}</td>
            <td class="num muted">${i.weight ? esc(i.weight) + ' kg' : '—'}</td>
            <td><span class="tag ${i.done ? 'accent' : 'line'}">${i.done ? '✓' : '未做'}</span></td>
          </tr>`).join('')}</tbody></table>
        <div class="cal-legend" style="padding:0">部位：${esc(log.part || log.name || '—')}</div>`
        : '<div class="empty">这条记录没有动作明细</div>'}`,
      footer: null
    });
  }

  function render(root) {
    const s = WB.state;
    const t = today();
    const todayLog = s.fitness.logs.find(l => l.date === t);
    const wk = calc.fitnessWeek();
    const body = calc.bodyLatest();
    const bodyList = s.fitness.body.slice().sort((a, b) => a.date < b.date ? -1 : 1).slice(-14);

    root.innerHTML = `<div class="wrap">
      <div class="page-head">
        <div><h1>健身计划</h1><div class="sub">模板定计划，日志记实际，体重看趋势</div></div>
        <div class="head-actions">
          <button class="btn" id="addWeight">${icon('plus', 15)} 记体重</button>
          <button class="btn primary" id="newTpl">${icon('plus', 15)} 新建训练模板</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="stat-row" style="grid-template-columns:repeat(4,1fr)">
          <div class="stat"><div class="v num">${wk.count}</div><div class="k">本周训练次数</div></div>
          <div class="stat"><div class="v num">${streak()}<span style="font-size:11px;color:var(--ink-3);font-weight:400"> 天</span></div><div class="k">连续打卡</div></div>
          <div class="stat"><div class="v num">${wk.minutes}<span style="font-size:11px;color:var(--ink-3);font-weight:400"> 分钟</span></div><div class="k">本周训练时长</div></div>
          <div class="stat"><div class="v num">${body ? body.weight : '—'}<span style="font-size:11px;color:var(--ink-3);font-weight:400">${body ? ' kg' : ''}</span></div><div class="k">最近体重${body ? ' · ' + esc(body.date.slice(5)) : ''}</div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="cal-head-row">
          <h3 style="font-size:13.5px">训练日历</h3>
          <div class="date-nav">
            <button class="btn icon sm" data-calnav="-1" title="上个月">${icon('left', 14)}</button>
            <span class="cur">${calY} 年 ${calM} 月</span>
            <button class="btn icon sm" data-calnav="1" title="下个月">${icon('right', 14)}</button>
            <button class="btn sm" data-caltoday>本月</button>
          </div>
        </div>
        ${fitCalHtml()}
      </div>

      <div class="grid" style="grid-template-columns:1.45fr 1fr;align-items:start">
        <div>
          <div class="card" style="margin-bottom:14px">
            <div class="card-head">
              <h3>今天练什么</h3>
              <span class="hint">${todayLog ? '已开始记录' : '从模板生成，或直接手加'}</span>
            </div>
            ${todayLog ? todayLogHtml(todayLog) : `
              <div class="empty" style="padding:24px 16px">
                <b>今天还没有训练记录</b>下面选一个模板开始，训练时勾动作就行
              </div>
              <div style="padding:0 16px 14px">
                <button class="btn sm" id="manualLog">不用模板，手动加</button>
              </div>`}
          </div>

          <div class="card" style="margin-bottom:14px">
            <div class="card-head"><h3>训练模板</h3><span class="hint">${s.fitness.templates.length} 个</span></div>
            ${s.fitness.templates.length ? s.fitness.templates.map(tp => `
              <div style="padding:11px 16px;border-bottom:1px solid #f1efe9">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                  <div style="font-weight:600;font-size:13px">${esc(tp.name)}${tp.part ? ` <span class="tag line">${esc(tp.part)}</span>` : ''}</div>
                  <div style="display:flex;gap:6px">
                    <button class="btn sm" data-start="${tp.id}" ${todayLog ? 'disabled' : ''}>开始训练</button>
                    <button class="btn ghost icon sm" data-edittpl="${tp.id}">${icon('pen', 13)}</button>
                  </div>
                </div>
                <div class="small muted" style="margin-top:5px;line-height:1.7">
                  ${(tp.items || []).map(i => `${esc(i.exercise)} ${i.sets || '?'}×${i.reps || '?'}${i.weight ? ' @' + i.weight + 'kg' : ''}`).join('　·　') || '还没有动作'}
                </div>
              </div>`).join('')
            : `<div class="empty"><b>还没有模板</b>把常练的组合存成模板，之后一键生成</div>`}
          </div>

          <div class="card">
            <div class="card-head"><h3>训练日志</h3><span class="hint">最近 30 条</span></div>
            ${s.fitness.logs.length ? `<table class="table">
              <thead><tr><th style="width:88px">日期</th><th>内容</th><th style="width:86px">时长</th><th style="width:60px">动作</th><th style="width:44px"></th></tr></thead>
              <tbody>${s.fitness.logs.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 30).map(l => `
                <tr data-log="${l.id}">
                  <td class="muted small">${esc(l.date.slice(5))}</td>
                  <td><span style="font-weight:600">${esc(l.name || '训练')}</span>
                    <span class="small muted">${(l.items || []).length} 个动作 · 完成 ${(l.items || []).filter(i => i.done).length}</span></td>
                  <td class="small num">${l.duration || 0} 分</td>
                  <td class="small muted num">${(l.items || []).length}</td>
                  <td><button class="btn ghost icon sm" data-dellog="${l.id}">${icon('trash', 13)}</button></td>
                </tr>`).join('')}</tbody></table>`
            : `<div class="empty"><b>还没有训练日志</b>练一次记一次，重量才有得对比</div>`}
          </div>
        </div>

        <div>
          <div class="card" style="margin-bottom:14px">
            <div class="card-head"><h3>体重趋势</h3><span class="hint">${bodyList.length} 条记录</span></div>
            <div style="padding:12px 16px 4px">
              ${spark(bodyList)}
            </div>
            <div style="padding:0 16px 12px">
              ${body ? `<div style="display:flex;gap:14px;font-size:12px;color:var(--ink-2)">
                <span>体重 <b class="num">${body.weight}</b> kg</span>
                ${body.bodyfat ? `<span>体脂 <b class="num">${body.bodyfat}</b>%</span>` : ''}
                ${body.waist ? `<span>腰围 <b class="num">${body.waist}</b> cm</span>` : ''}
                <span class="muted">${esc(body.date)}</span>
              </div>` : `<div class="small muted">还没有体重记录</div>`}
            </div>
            ${bodyList.length ? `<div style="border-top:1px solid var(--line);max-height:150px;overflow:auto">
              ${bodyList.slice().reverse().map(b => `<div class="line-item" style="padding:6px 16px">
                <span class="muted small num" style="flex:0 0 62px">${esc(b.date.slice(5))}</span>
                <span class="num" style="font-weight:600">${b.weight} kg</span>
                <span class="muted small num" style="margin-left:auto">${b.bodyfat ? b.bodyfat + '%' : ''}</span>
              </div>`).join('')}
            </div>` : ''}
          </div>

          <div class="card">
            <div class="card-head"><h3>本周节奏</h3></div>
            <div style="padding:14px 16px">
              ${weekGrid()}
            </div>
          </div>
        </div>
      </div>
    </div>`;

    bind(root, todayLog);
  }

  function todayLogHtml(log) {
    const total = (log.items || []).length;
    const done = (log.items || []).filter(i => i.done).length;
    return `<div style="padding:4px 0 8px">
      <div style="display:flex;align-items:center;gap:10px;padding:0 16px 8px">
        <span class="tag accent">${esc(log.name || '训练')}</span>
        <span class="small muted">${done}/${total} 动作完成</span>
        <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
          <input type="number" class="input" id="dur" value="${log.duration || 0}" min="0" style="width:70px;height:28px;padding:3px 8px" title="时长（分钟）">
          <span class="small muted">分钟</span>
        </div>
      </div>
      <div class="progress-line" style="margin:0 16px 6px"><i style="width:${total ? done / total * 100 : 0}%"></i></div>
      ${(log.items || []).map((it, idx) => `
        <div class="line-item">
          <div class="check ${it.done ? 'on' : ''}" data-item="${idx}"></div>
          <div class="grow">
            <div style="${it.done ? 'text-decoration:line-through;color:var(--ink-3)' : ''}">${esc(it.exercise)}</div>
          </div>
          <span class="sets">${it.sets || '?'} 组 × ${it.reps || '?'}${it.weight ? ' @ ' + it.weight + 'kg' : ''}</span>
          <button class="btn ghost icon sm" data-edititem="${idx}">${icon('pen', 12)}</button>
        </div>`).join('')}
      <div style="padding:8px 16px 0;display:flex;gap:8px">
        <button class="btn sm" data-additem="1">${icon('plus', 12)} 加动作</button>
        <button class="btn sm" id="finishLog">完成本次训练</button>
      </div>
    </div>`;
  }

  function weekGrid() {
    const ws = WB.startOfWeek();
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws); d.setDate(d.getDate() + i);
      const ds = WB.ymd(d);
      const log = WB.state.fitness.logs.find(l => l.date === ds);
      const isToday = ds === today();
      cells.push(`<div style="text-align:center">
        <div class="small muted" style="font-size:10.5px">${WB.WEEK[d.getDay()].slice(1)}</div>
        <div style="height:32px;border-radius:8px;margin-top:3px;display:grid;place-items:center;font-size:11px;
          background:${log ? 'var(--accent-soft)' : '#f4f2ec'};color:${log ? 'var(--accent)' : 'var(--ink-3)'};
          border:1px solid ${isToday ? 'var(--accent)' : 'transparent'};font-weight:${log ? 600 : 400}">
          ${log ? (log.items || []).length : '·'}
        </div>
      </div>`);
    }
    return `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">${cells.join('')}</div>
      <div class="small muted" style="margin-top:10px">空格子＝没练，数字＝当天动作数</div>`;
  }

  function spark(list) {
    if (list.length < 2) {
      return `<div class="empty" style="padding:14px 0">记录两次以上才能画出趋势</div>`;
    }
    const w = 300, h = 74, pad = 6;
    const ys = list.map(x => Number(x.weight) || 0);
    const min = Math.min(...ys) - 0.4, max = Math.max(...ys) + 0.4;
    const pts = list.map((x, i) => [
      pad + i * (w - 2 * pad) / (list.length - 1),
      h - pad - ((Number(x.weight) - min) / (max - min)) * (h - 2 * pad)
    ]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = `${d} L${pts[pts.length - 1][0].toFixed(1)} ${h - pad} L${pts[0][0].toFixed(1)} ${h - pad} Z`;
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <path d="${area}" fill="rgba(47,106,99,.09)"/>
      <path d="${d}" fill="none" stroke="#2f6a63" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="#2f6a63"/>
    </svg>`;
  }

  function bind(root, todayLog) {
    const wrap = WB.qs('.wrap', root);
    WB.qs('#newTpl', wrap).addEventListener('click', () => editTemplate(null));
    WB.qs('#addWeight', wrap).addEventListener('click', addWeight);

    WB.qsa('[data-start]', wrap).forEach(el => el.addEventListener('click', () => startFromTemplate(el.dataset.start)));
    WB.qsa('[data-calnav]', wrap).forEach(el => el.addEventListener('click', () => {
      calM += Number(el.dataset.calnav);
      if (calM < 1) { calM = 12; calY--; }
      if (calM > 12) { calM = 1; calY++; }
      WB.refresh();
    }));
    const calTodayBtn = WB.qs('[data-caltoday]', wrap);
    if (calTodayBtn) calTodayBtn.addEventListener('click', () => {
      const n = new Date(); calY = n.getFullYear(); calM = n.getMonth() + 1; WB.refresh();
    });
    WB.qsa('[data-calday]', wrap).forEach(el => el.addEventListener('click', () => {
      showFitDay(el.dataset.calday);
    }));
    WB.qsa('[data-edittpl]', wrap).forEach(el => el.addEventListener('click', () => {
      editTemplate(WB.state.fitness.templates.find(x => x.id === el.dataset.edittpl));
    }));
    const manual = WB.qs('#manualLog', wrap);
    if (manual) manual.addEventListener('click', () => startFromTemplate(null));

    if (!todayLog) return;

    const save = () => { WB.save(); WB.refresh(); };
    const dur = WB.qs('#dur', wrap);
    if (dur) dur.addEventListener('change', () => { todayLog.duration = Number(dur.value) || 0; WB.save(); });

    WB.qsa('[data-item]', wrap).forEach(el => el.addEventListener('click', () => {
      const i = Number(el.dataset.item);
      todayLog.items[i].done = !todayLog.items[i].done;
      save();
    }));
    WB.qsa('[data-edititem]', wrap).forEach(el => el.addEventListener('click', () => {
      const i = Number(el.dataset.edititem);
      editItem(todayLog, i);
    }));
    WB.qsa('[data-additem]', wrap).forEach(el => el.addEventListener('click', () => {
      todayLog.items.push({ exercise: '', sets: 3, reps: 10, weight: '', done: false });
      editItem(todayLog, todayLog.items.length - 1);
    }));
    WB.qs('#finishLog', wrap).addEventListener('click', () => {
      if (!todayLog.duration) todayLog.duration = 60;
      if (!todayLog.name) todayLog.name = '训练';
      WB.save(); WB.refresh();
      WB.toast('训练已记录');
    });

    WB.qsa('[data-log]', wrap).forEach(tr => {
      tr.addEventListener('click', () => {
        const log = WB.state.fitness.logs.find(l => l.id === tr.dataset.log);
        if (log) WB.modal({
          title: '训练详情 · ' + log.date,
          body: `<div class="small muted" style="margin-bottom:4px">${esc(log.name || '训练')} · ${log.duration || 0} 分钟</div>
            ${(log.items || []).map(i => `<div class="line-item" style="padding:7px 0;border-color:#f4f2ec">
              <span style="flex:1">${esc(i.exercise)}</span>
              <span class="sets">${i.sets || '?'}×${i.reps || '?'}${i.weight ? ' @' + i.weight + 'kg' : ''}</span>
              <span class="tag ${i.done ? 'accent' : 'line'}">${i.done ? '完成' : '未做'}</span>
            </div>`).join('')}
            ${log.note ? `<div class="small muted" style="margin-top:8px">${esc(log.note)}</div>` : ''}`,
          footer: null
        });
      });
    });
    WB.qsa('[data-dellog]', wrap).forEach(el => el.addEventListener('click', async e => {
      e.stopPropagation();
      const ok = await WB.confirm({ title: '删除训练记录', text: '确定删掉这一条吗？', danger: true, okText: '删除' });
      if (!ok) return;
      WB.state.fitness.logs = WB.state.fitness.logs.filter(l => l.id !== el.dataset.dellog);
      WB.save(); WB.refresh();
    }));
  }

  function startFromTemplate(tplId) {
    const t = today();
    if (WB.state.fitness.logs.some(l => l.date === t)) {
      WB.toast('今天已经有训练记录了', true); return;
    }
    const tpl = tplId ? WB.state.fitness.templates.find(x => x.id === tplId) : null;
    WB.state.fitness.logs.unshift({
      id: WB.uid(), date: t,
      templateId: tpl ? tpl.id : '',
      name: tpl ? tpl.name : '训练',
      items: tpl ? (tpl.items || []).map(i => ({ ...i, done: false })) : [],
      duration: 0, note: ''
    });
    WB.save(); WB.refresh();
  }

  function editItem(log, idx) {
    const it = log.items[idx];
    WB.modal({
      title: it.exercise ? '改这个动作' : '加一个动作',
      body: `
        <div class="field"><label>动作</label><input class="input" id="iEx" value="${esc(it.exercise || '')}" placeholder="卧推 / 深蹲 / 跑步" maxlength="40"></div>
        <div class="row">
          <div class="field"><label>组数</label><input type="number" class="input" id="iSets" value="${it.sets || ''}" min="1"></div>
          <div class="field"><label>次数</label><input class="input" id="iReps" value="${esc(it.reps || '')}" placeholder="10 / 力竭"></div>
          <div class="field"><label>重量 kg</label><input class="input" id="iW" value="${esc(it.weight || '')}" placeholder="可不填"></div>
        </div>`,
      onOk: body => {
        const ex = WB.qs('#iEx', body).value.trim();
        if (!ex) { log.items.splice(idx, 1); WB.save(); WB.refresh(); return; }
        it.exercise = ex;
        it.sets = Number(WB.qs('#iSets', body).value) || '';
        it.reps = WB.qs('#iReps', body).value.trim();
        it.weight = WB.qs('#iW', body).value.trim();
        WB.save(); WB.refresh();
      }
    });
  }

  function editTemplate(t) {
    const isNew = !t;
    const x = t || { id: WB.uid(), name: '', part: '胸', items: [{ exercise: '', sets: 3, reps: 10, weight: '' }] };
    WB.modal({
      title: isNew ? '新建训练模板' : '编辑训练模板',
      wide: true,
      body: `
        <div class="row">
          <div class="field" style="flex:2"><label>模板名</label><input class="input" id="tpName" value="${esc(x.name)}" placeholder="例如：胸+三头" maxlength="40"></div>
          <div class="field"><label>部位</label><select class="select" id="tpPart">${PARTS.map(p => `<option ${p === x.part ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>动作</label><div id="items"></div></div>
        <button class="btn sm" id="addRow" style="align-self:flex-start">${icon('plus', 12)} 加一行</button>
        ${isNew ? '' : `<button class="btn danger" id="delTpl" style="align-self:flex-start">删除模板</button>`}`,
      okText: isNew ? '创建' : '保存',
      onMount: (body, close) => {
        const box = WB.qs('#items', body);
        const rowHtml = (i) => `<div class="row" style="margin-bottom:7px" data-row>
          <input class="input" data-f="exercise" placeholder="动作" value="${esc(i.exercise || '')}" style="flex:2">
          <input class="input" data-f="sets" placeholder="组" value="${esc(i.sets || '')}" style="flex:0 0 58px">
          <input class="input" data-f="reps" placeholder="次" value="${esc(i.reps || '')}" style="flex:0 0 58px">
          <input class="input" data-f="weight" placeholder="kg" value="${esc(i.weight || '')}" style="flex:0 0 62px">
        </div>`;
        const paint = () => { box.innerHTML = x.items.map(rowHtml).join(''); };
        paint();
        WB.qs('#addRow', body).addEventListener('click', () => { x.items.push({ exercise: '', sets: 3, reps: 10, weight: '' }); paint(); });
        box.addEventListener('input', e => {
          const row = e.target.closest('[data-row]');
          if (!row) return;
          const idx = Array.from(box.children).indexOf(row);
          const f = e.target.dataset.f;
          if (x.items[idx]) x.items[idx][f] = e.target.value;
        });
        const del = WB.qs('#delTpl', body);
        if (del) del.addEventListener('click', () => {
          WB.state.fitness.templates = WB.state.fitness.templates.filter(y => y.id !== x.id);
          WB.save(); WB.refresh(); close();
        });
      },
      onOk: body => {
        const name = WB.qs('#tpName', body).value.trim();
        if (!name) { WB.toast('模板名不能为空', true); return false; }
        x.name = name;
        x.part = WB.qs('#tpPart', body).value;
        x.items = x.items.filter(i => (i.exercise || '').trim());
        if (!x.items.length) { WB.toast('至少填一个动作', true); return false; }
        if (isNew) WB.state.fitness.templates.push(x);
        WB.save(); WB.refresh();
      }
    });
  }

  function addWeight() {
    const last = calc.bodyLatest();
    WB.modal({
      title: '记录体重',
      body: `
        <div class="row">
          <div class="field"><label>日期</label><input type="date" class="input" id="wDate" value="${today()}"></div>
          <div class="field"><label>体重 kg</label><input type="number" step="0.1" class="input" id="wWeight" value="${last ? last.weight : ''}" placeholder="65.0"></div>
        </div>
        <div class="row">
          <div class="field"><label>体脂 %</label><input type="number" step="0.1" class="input" id="wFat" value="${last && last.bodyfat ? last.bodyfat : ''}" placeholder="可不填"></div>
          <div class="field"><label>腰围 cm</label><input type="number" step="0.1" class="input" id="wWaist" value="${last && last.waist ? last.waist : ''}" placeholder="可不填"></div>
        </div>`,
      okText: '记录',
      onOk: body => {
        const w = Number(WB.qs('#wWeight', body).value);
        if (!w) { WB.toast('体重填一下', true); return false; }
        const date = WB.qs('#wDate', body).value || today();
        const rec = {
          id: WB.uid(), date, weight: w,
          bodyfat: Number(WB.qs('#wFat', body).value) || '',
          waist: Number(WB.qs('#wWaist', body).value) || ''
        };
        const i = WB.state.fitness.body.findIndex(x => x.date === date);
        if (i >= 0) WB.state.fitness.body[i] = rec; else WB.state.fitness.body.push(rec);
        WB.save(); WB.refresh();
        WB.toast('已记录');
      }
    });
  }

  WB.register('fitness', { render });
})();
