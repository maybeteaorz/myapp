/* ================= 游戏娱乐 ================= */
(function () {
  const { esc, icon, today, addDays, minutesToText, calc } = WB;
  const STATUS = {
    playing: { label: '在玩', cls: 'accent' },
    wish: { label: '想玩', cls: 'blue' },
    done: { label: '已通关', cls: '' },
    dropped: { label: '弃坑', cls: 'line' }
  };
  const PLAT = ['Steam', 'Switch', 'PS', '手游', '主机', '其他'];

  function totalMinutes(itemId) {
    return WB.state.games.sessions.filter(s => s.itemId === itemId)
      .reduce((a, s) => a + (Number(s.minutes) || 0), 0);
  }

  function render(root) {
    const s = WB.state;
    const wk = calc.gameWeek();
    const playing = s.games.items.filter(i => i.status === 'playing');
    const others = s.games.items.filter(i => i.status !== 'playing');

    root.innerHTML = `<div class="wrap">
      <div class="page-head">
        <div><h1>游戏娱乐</h1><div class="sub">玩了什么、玩到哪、花了多少时间</div></div>
        <div class="head-actions">
          <button class="btn" id="addTimeQuick">${icon('plus', 15)} 记一次游戏时间</button>
          <button class="btn primary" id="newGame">${icon('plus', 15)} 添加游戏</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="grid" style="grid-template-columns:1fr 1.4fr;align-items:center;gap:0">
          <div class="stat-row" style="grid-template-columns:repeat(2,1fr);border-right:1px solid var(--line)">
            <div class="stat"><div class="v num">${(wk.minutes / 60).toFixed(1)}<span style="font-size:11px;color:var(--ink-3);font-weight:400"> 小时</span></div><div class="k">本周娱乐</div></div>
            <div class="stat"><div class="v num">${wk.playing}</div><div class="k">在玩</div></div>
            <div class="stat" style="border-top:1px solid var(--line)"><div class="v num">${s.games.items.filter(i => i.status === 'done').length}</div><div class="k">已通关</div></div>
            <div class="stat" style="border-top:1px solid var(--line)"><div class="v num">${s.games.items.filter(i => i.status === 'wish').length}</div><div class="k">想玩</div></div>
          </div>
          <div style="padding:14px 18px">
            ${weekBars()}
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>正在玩</h3><span class="hint">${playing.length} 款</span></div>
        ${playing.length ? `<div style="padding:12px 14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(258px,1fr));gap:12px">
          ${playing.map(g => gameCard(g)).join('')}
        </div>` : `<div class="empty"><b>没有在玩的游戏</b>从下面的库挪一款上来，或者添加新游戏</div>`}
      </div>

      ${['wish', 'done', 'dropped'].map(st => {
        const list = others.filter(i => i.status === st);
        if (!list.length) return '';
        return `<div class="card" style="margin-bottom:14px">
          <div class="card-head"><h3>${STATUS[st].label}</h3><span class="hint">${list.length} 款</span></div>
          ${list.map(g => `<div class="line-item">
            <div class="grow">
              <div style="font-weight:600">${esc(g.title)}${g.rating ? ` <span class="small muted">${'★'.repeat(Number(g.rating))}</span>` : ''}</div>
              <div class="small muted">${esc(g.platform || '')}${totalMinutes(g.id) ? ' · 累计 ' + minutesToText(totalMinutes(g.id)) : ''}${g.note ? ' · ' + esc(g.note.slice(0, 40)) : ''}</div>
            </div>
            <button class="btn sm" data-move="${g.id}">${st === 'done' ? '重玩' : '开始玩'}</button>
            <button class="btn ghost icon sm" data-editgame="${g.id}">${icon('pen', 13)}</button>
          </div>`).join('')}
        </div>`;
      }).join('')}

      <div class="card">
        <div class="card-head"><h3>最近记录</h3><span class="hint">${s.games.sessions.length} 条</span></div>
        ${s.games.sessions.length ? `<table class="table">
          <thead><tr><th style="width:80px">日期</th><th>游戏</th><th style="width:80px">时长</th><th>备注</th><th style="width:44px"></th></tr></thead>
          <tbody>${s.games.sessions.slice().sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1).slice(0, 12).map(x => {
            const g = s.games.items.find(i => i.id === x.itemId);
            return `<tr>
              <td class="muted small">${esc((x.date || '').slice(5))}</td>
              <td>${esc(g ? g.title : '已删除的游戏')}</td>
              <td class="small num">${minutesToText(x.minutes)}</td>
              <td class="small muted">${esc(x.note || '')}</td>
              <td><button class="btn ghost icon sm" data-delsess="${x.id}">${icon('trash', 12)}</button></td>
            </tr>`;
          }).join('')}</tbody></table>`
        : `<div class="empty"><b>还没有游戏记录</b>玩完顺手记一笔，就能看到时间都去哪了</div>`}
      </div>
    </div>`;

    bind(root);
  }

  function gameCard(g) {
    const total = totalMinutes(g.id);
    const pct = Math.max(0, Math.min(100, Number(g.progress) || 0));
    return `<div style="border:1px solid var(--line);border-radius:11px;padding:12px 13px;background:var(--panel-2)">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
        <div>
          <div style="font-weight:650;font-size:13.5px">${esc(g.title)}</div>
          <div class="small muted" style="margin-top:1px">${esc(g.platform || '')}${g.rating ? ' · ' + '★'.repeat(Number(g.rating)) : ''}</div>
        </div>
        <button class="btn ghost icon sm" data-editgame="${g.id}">${icon('pen', 13)}</button>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink-3);margin:9px 0 4px">
        <span>进度 ${pct}%</span><span class="num">累计 ${total ? minutesToText(total) : '0 分钟'}</span>
      </div>
      <div class="bar" style="height:5px"><i style="width:${pct}%;background:var(--accent)"></i></div>
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn sm" data-addtime="${g.id}:30">+30 分</button>
        <button class="btn sm" data-addtime="${g.id}:60">+1 小时</button>
        <button class="btn ghost sm" style="margin-left:auto" data-custom="${g.id}">记一笔</button>
      </div>
    </div>`;
  }

  function weekBars() {
    const ws = WB.startOfWeek();
    const days = [];
    let max = 60;
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws); d.setDate(d.getDate() + i);
      const ds = WB.ymd(d);
      const m = WB.state.games.sessions.filter(s => s.date === ds).reduce((a, s) => a + (Number(s.minutes) || 0), 0);
      days.push({ ds, m, wd: WB.WEEK[d.getDay()] });
      if (m > max) max = m;
    }
    return `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;height:74px">
      ${days.map(d => `<div style="flex:1;text-align:center">
        <div style="height:52px;display:flex;align-items:flex-end;justify-content:center">
          <div title="${d.m} 分钟" style="width:100%;max-width:22px;height:${Math.max(3, d.m / max * 52)}px;border-radius:4px 4px 2px 2px;background:${d.m ? 'var(--accent)' : '#e8e5dd'}"></div>
        </div>
        <div class="small muted" style="font-size:10px;margin-top:3px">${d.wd.slice(1)}</div>
      </div>`).join('')}
    </div>`;
  }

  function bind(root) {
    const wrap = WB.qs('.wrap', root);
    WB.qs('#newGame', wrap).addEventListener('click', () => editGame(null));
    WB.qs('#addTimeQuick', wrap).addEventListener('click', () => {
      if (!WB.state.games.items.length) { WB.toast('先添加一款游戏', true); return; }
      quickTime(WB.state.games.items.find(i => i.status === 'playing') || WB.state.games.items[0]);
    });

    WB.qsa('[data-addtime]', wrap).forEach(el => el.addEventListener('click', () => {
      const [id, m] = el.dataset.addtime.split(':');
      addSession(id, Number(m));
    }));
    WB.qsa('[data-custom]', wrap).forEach(el => el.addEventListener('click', () => {
      quickTime(WB.state.games.items.find(i => i.id === el.dataset.custom));
    }));
    WB.qsa('[data-move]', wrap).forEach(el => el.addEventListener('click', () => {
      const g = WB.state.games.items.find(i => i.id === el.dataset.move);
      if (g) { g.status = 'playing'; WB.save(); WB.refresh(); WB.toast('已移到「在玩」'); }
    }));
    WB.qsa('[data-editgame]', wrap).forEach(el => el.addEventListener('click', () => {
      editGame(WB.state.games.items.find(i => i.id === el.dataset.editgame));
    }));
    WB.qsa('[data-delsess]', wrap).forEach(el => el.addEventListener('click', () => {
      WB.state.games.sessions = WB.state.games.sessions.filter(x => x.id !== el.dataset.delsess);
      WB.save(); WB.refresh();
    }));
  }

  function addSession(itemId, minutes, note) {
    WB.state.games.sessions.unshift({
      id: WB.uid(), date: today(), itemId, minutes: Number(minutes) || 0, note: note || ''
    });
    WB.save(); WB.refresh();
    WB.toast('已记录 ' + minutesToText(minutes));
  }

  function quickTime(g) {
    if (!g) return;
    WB.modal({
      title: '记游戏时间 · ' + g.title,
      body: `
        <div class="row">
          <div class="field"><label>日期</label><input type="date" class="input" id="gDate" value="${today()}"></div>
          <div class="field"><label>时长（分钟）</label><input type="number" class="input" id="gMin" value="60" min="1" step="15"></div>
        </div>
        <div class="field"><label>备注</label><input class="input" id="gNote" placeholder="打到哪了 / 和谁玩" maxlength="80"></div>`,
      okText: '记录',
      onOk: body => {
        const m = Number(WB.qs('#gMin', body).value);
        if (!m) { WB.toast('时长要大于 0', true); return false; }
        WB.state.games.sessions.unshift({
          id: WB.uid(), date: WB.qs('#gDate', body).value || today(),
          itemId: g.id, minutes: m, note: WB.qs('#gNote', body).value.trim()
        });
        WB.save(); WB.refresh();
        WB.toast('已记录');
      }
    });
  }

  function editGame(g) {
    const isNew = !g;
    const x = g || { id: WB.uid(), title: '', platform: 'Steam', status: 'playing', rating: '', progress: 0, note: '' };
    WB.modal({
      title: isNew ? '添加游戏' : '编辑游戏',
      body: `
        <div class="field"><label>名称</label><input class="input" id="gmTitle" value="${esc(x.title)}" maxlength="60"></div>
        <div class="row">
          <div class="field"><label>平台</label><select class="select" id="gmPlat">${PLAT.map(p => `<option ${p === x.platform ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
          <div class="field"><label>状态</label><select class="select" id="gmStatus">
            ${Object.keys(STATUS).map(k => `<option value="${k}" ${k === x.status ? 'selected' : ''}>${STATUS[k].label}</option>`).join('')}
          </select></div>
          <div class="field"><label>评分</label><select class="select" id="gmRate">
            <option value="">未评</option>
            ${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${Number(x.rating) === n ? 'selected' : ''}>${'★'.repeat(n)}</option>`).join('')}
          </select></div>
        </div>
        <div class="field"><label>进度 <span class="muted" id="pgLabel">${Number(x.progress) || 0}%</span></label>
          <input type="range" id="gmProg" min="0" max="100" step="5" value="${Number(x.progress) || 0}" style="width:100%">
        </div>
        <div class="field"><label>备注 / 攻略笔记</label><textarea class="textarea" id="gmNote" rows="3" placeholder="卡在哪、想玩什么、通关感受">${esc(x.note || '')}</textarea></div>
        ${isNew ? '' : `<button class="btn danger" id="delGame" style="align-self:flex-start">删除这款游戏</button>`}`,
      okText: isNew ? '添加' : '保存',
      onMount: (body, close) => {
        const r = WB.qs('#gmProg', body), lbl = WB.qs('#pgLabel', body);
        r.addEventListener('input', () => lbl.textContent = r.value + '%');
        const del = WB.qs('#delGame', body);
        if (del) del.addEventListener('click', () => {
          WB.state.games.items = WB.state.games.items.filter(y => y.id !== x.id);
          WB.state.games.sessions = WB.state.games.sessions.filter(y => y.itemId !== x.id);
          WB.save(); WB.refresh(); close();
        });
      },
      onOk: body => {
        const title = WB.qs('#gmTitle', body).value.trim();
        if (!title) { WB.toast('游戏名不能为空', true); return false; }
        x.title = title;
        x.platform = WB.qs('#gmPlat', body).value;
        x.status = WB.qs('#gmStatus', body).value;
        x.rating = Number(WB.qs('#gmRate', body).value) || '';
        x.progress = Number(WB.qs('#gmProg', body).value) || 0;
        x.note = WB.qs('#gmNote', body).value;
        if (isNew) WB.state.games.items.unshift(x);
        WB.save(); WB.refresh();
      }
    });
  }

  WB.register('games', { render });
})();
