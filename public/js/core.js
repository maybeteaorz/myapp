/* ================= 核心：状态、保存、路由、通用组件 ================= */
window.WB = (function () {
  const VIEWS = {};
  const NAV = [
    { key: 'home', label: '首页总览', icon: 'home' },
    { key: 'plan', label: '今日计划', icon: 'calendar' },
    { key: 'media', label: '自媒体', icon: 'pen' },
    { key: 'dev', label: '开发工作', icon: 'code' },
    { key: 'consult', label: '咨询工作', icon: 'case' },
    { key: 'fitness', label: '健身计划', icon: 'dumbbell' },
    { key: 'diet', label: '饮食计划', icon: 'bowl' },
    { key: 'games', label: '游戏娱乐', icon: 'game' },
    { key: 'settings', label: '数据与设置', icon: 'gear' }
  ];

  const ICONS = {
    home: '<path d="M3.6 11.2 12 4l8.4 7.2"/><path d="M5.8 9.8V19a1 1 0 0 0 1 1h3.4v-5h3.6v5h3.4a1 1 0 0 0 1-1V9.8"/>',
    calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/>',
    pen: '<path d="M4 20h3.6l9.2-9.2-3.6-3.6L4 16.4V20z"/><path d="M13.9 5.6l1.7-1.7a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2l-1.7 1.7"/>',
    code: '<path d="M9 7.5 4.5 12 9 16.5M15 7.5 19.5 12 15 16.5"/><path d="M12.8 4.5l-1.6 15"/>',
    case: '<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M8.5 7.5V5.6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1.9M3 12.5h18"/>',
    dumbbell: '<path d="M6.5 8.5v7M17.5 8.5v7M3.5 11v2M20.5 11v2M6.5 12h11"/>',
    bowl: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9.5 7.2c0-1.2 1.2-1.4 1.2-2.6M13.5 7.2c0-1.2 1.2-1.4 1.2-2.6"/>',
    game: '<rect x="2.5" y="7" width="19" height="10.5" rx="4.5"/><path d="M7 10.5v3.5M5.2 12.2h3.6"/><circle cx="15.8" cy="11.4" r="1"/><circle cx="18" cy="13.6" r="1"/>',
    gear: '<circle cx="12" cy="12" r="3.1"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4.5 7h15M9 7V4.8h6V7M6.5 7l.8 12.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7"/>',
    left: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    right: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>'
  };

  let state = null;
  let current = 'home';
  let saveTimer = null;
  let saving = false;

  /* ---------- 工具 ---------- */
  const pad = n => String(n).padStart(2, '0');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function today() { return ymd(new Date()); }
  function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function fmtDate(s, withWeek = true) {
    const d = parseYmd(s);
    const base = `${d.getMonth() + 1}月${d.getDate()}日`;
    return withWeek ? `${base} ${WEEK[d.getDay()]}` : base;
  }
  function fmtDateFull(s) {
    const d = parseYmd(s);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]}`;
  }
  function relDay(s) {
    const t = today();
    if (s === t) return '今天';
    if (s === addDays(t, 1)) return '明天';
    if (s === addDays(t, -1)) return '昨天';
    return fmtDate(s);
  }
  function startOfWeek(d = new Date()) {
    const x = new Date(d); const wd = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - wd); x.setHours(0, 0, 0, 0); return x;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function icon(name, size) {
    const s = size || 18;
    return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  /* ---------- 空数据 ---------- */
  function blank() {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      settings: { name: '', kcalGoal: 2000, proteinGoal: 120, waterGoal: 8 },
      memo: [],
      plan: {},
      media: { contents: [] },
      dev: { projects: [], tasks: [], bugs: [], snippets: [] },
      consult: { clients: [], sessions: [] },
      fitness: { templates: [], logs: [], body: [] },
      diet: { foods: [], logs: {} },
      games: { items: [], sessions: [] }
    };
  }

  /* ---------- 读写 ---------- */
  function setSaveState(kind, text) {
    const el = qs('#saveState');
    if (!el) return;
    el.className = 'save-state ' + kind;
    el.querySelector('span').textContent = text;
  }

  function save(immediate) {
    if (!state) return;
    clearTimeout(saveTimer);
    const doSave = async () => {
      if (saving) { saveTimer = setTimeout(doSave, 200); return; }
      saving = true;
      setSaveState('saving', '保存中…');
      try {
        const r = await fetch('/api/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state)
        });
        if (!r.ok) throw new Error((await r.json()).error || '保存失败');
        const t = new Date();
        setSaveState('saved', `已保存 ${pad(t.getHours())}:${pad(t.getMinutes())}`);
      } catch (e) {
        setSaveState('error', '保存失败：' + e.message);
        toast('保存失败，请检查服务是否在运行', true);
      } finally {
        saving = false;
      }
    };
    if (immediate) return doSave();
    saveTimer = setTimeout(doSave, 350);
  }

  async function load() {
    const r = await fetch('/api/data');
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    state = (j.data && j.data.version) ? j.data : blank();
    // 补齐结构，防止旧数据缺字段
    const b = blank();
    for (const k of Object.keys(b)) {
      if (state[k] === undefined) state[k] = b[k];
      else if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && !Array.isArray(state[k])) {
        for (const k2 of Object.keys(b[k])) if (state[k][k2] === undefined) state[k][k2] = b[k][k2];
      }
    }
    for (const k of Object.keys(b.settings)) if (state.settings[k] === undefined) state.settings[k] = b.settings[k];
    if (!j.exists) save(true);
    return state;
  }

  /* ---------- 提示 ---------- */
  function toast(msg, warn) {
    const root = qs('#toastRoot');
    const el = document.createElement('div');
    el.className = 'toast' + (warn ? ' warn' : '');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0'; el.style.transform = 'translateY(6px)';
      setTimeout(() => el.remove(), 260);
    }, 1900);
  }

  /* ---------- 弹窗 ---------- */
  function modal(opts) {
    const root = qs('#modalRoot');
    const mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = `
      <div class="modal ${opts.wide ? 'wide' : ''}" role="dialog">
        <div class="modal-head">
          <h3>${esc(opts.title || '')}</h3>
          <button class="btn ghost icon sm" data-close>✕</button>
        </div>
        <div class="modal-body">${opts.body || ''}</div>
        ${opts.footer === null ? '' : `<div class="modal-foot">
          <button class="btn" data-cancel>${esc(opts.cancelText || '取消')}</button>
          <button class="btn ${opts.danger ? 'danger' : 'primary'}" data-ok>${esc(opts.okText || '保存')}</button>
        </div>`}
      </div>`;
    root.appendChild(mask);
    const close = () => { mask.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    mask.addEventListener('mousedown', e => { if (e.target === mask) close(); });
    qsa('[data-close], [data-cancel]', mask).forEach(b => b.addEventListener('click', close));
    const okBtn = qs('[data-ok]', mask);
    if (okBtn && opts.onOk) {
      okBtn.addEventListener('click', async () => {
        okBtn.disabled = true;
        let keep = false;
        try { keep = (await opts.onOk(qs('.modal-body', mask), close)) === false; }
        finally { okBtn.disabled = false; }
        if (!keep) close();
      });
    }
    if (opts.onMount) opts.onMount(qs('.modal-body', mask), close, mask);
    setTimeout(() => {
      const first = qs('.modal-body input, .modal-body textarea, .modal-body select', mask);
      if (first && !opts.noAutofocus) first.focus();
    }, 30);
    return { close, el: mask };
  }

  function confirm(opts) {
    return new Promise(resolve => {
      let done = false;
      modal({
        title: opts.title || '确认',
        body: `<p style="font-size:13.5px;line-height:1.7;color:var(--ink-2)">${opts.html || esc(opts.text || '确定吗？')}</p>`,
        okText: opts.okText || '确定',
        danger: opts.danger,
        onOk: () => { done = true; resolve(true); },
        onMount: (b, close, mask) => {
          qsa('[data-cancel], [data-close]', mask).forEach(x => x.addEventListener('click', () => { if (!done) resolve(false); }));
        }
      });
    });
  }

  /* ---------- 路由 ---------- */
  function renderNav() {
    const nav = qs('#nav');
    const counts = countsForBadge();
    nav.innerHTML = NAV.map(n => {
      const c = counts[n.key];
      return `<a class="nav-item ${n.key === current ? 'active' : ''}" href="#/${n.key}">
        ${icon(n.icon, 17)}<span>${n.label}</span>
        ${c ? `<span class="badge">${c}</span>` : ''}
      </a>`;
    }).join('');
    const d = new Date();
    qs('#brandDate').textContent = `${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]}`;
  }

  function countsForBadge() {
    if (!state) return {};
    const t = today();
    const planLeft = (state.plan[t] || []).filter(x => !x.done).length;
    const mediaReady = state.media.contents.filter(c => c.status === 'ready').length;
    return { plan: planLeft || 0, media: mediaReady || 0 };
  }

  function route() {
    const hash = location.hash.replace(/^#\/?/, '') || 'home';
    const name = VIEWS[hash] ? hash : 'home';
    current = name;
    renderNav();
    const app = qs('#app');
    app.innerHTML = '';
    app.scrollTop = 0;
    VIEWS[name].render(app);
  }

  function go(name) { location.hash = '#/' + name; }

  function refresh() { renderNav(); VIEWS[current].render(qs('#app')); }

  /* ---------- 通用小片段 ---------- */
  function emptyBox(title, sub) {
    return `<div class="empty"><b>${esc(title)}</b>${esc(sub || '')}</div>`;
  }

  function statusTag(text, cls) { return `<span class="tag ${cls || ''}">${esc(text)}</span>`; }

  function minutesToText(m) {
    if (!m) return '0 分钟';
    const h = Math.floor(m / 60), r = m % 60;
    return h ? `${h} 小时${r ? ' ' + r + ' 分' : ''}` : `${r} 分钟`;
  }

  /* ---------- 派生统计（各页面共用，口径统一） ---------- */
  function weekStartStr() { return ymd(startOfWeek()); }

  const calc = {
    dietDay(d) {
      const log = (state.diet.logs || {})[d] || {};
      const meals = ['breakfast', 'lunch', 'dinner', 'snack'];
      const items = [];
      meals.forEach(m => (log[m] || []).forEach(x => items.push(x)));
      const sum = items.reduce((a, x) => {
        a.kcal += Number(x.kcal) || 0;
        a.protein += Number(x.protein) || 0;
        a.carb += Number(x.carb) || 0;
        a.fat += Number(x.fat) || 0;
        return a;
      }, { kcal: 0, protein: 0, carb: 0, fat: 0 });
      return { items, water: log.water || 0, note: log.note || '', mealCount: items.length, ...sum };
    },
    fitnessWeek() {
      const ws = weekStartStr();
      const logs = state.fitness.logs.filter(l => l.date >= ws && l.date <= today());
      return { count: logs.length, minutes: logs.reduce((a, l) => a + (Number(l.duration) || 0), 0), logs };
    },
    bodyLatest() {
      const list = [...state.fitness.body].sort((a, b) => a.date < b.date ? -1 : 1);
      return list.length ? list[list.length - 1] : null;
    },
    mediaStats() {
      const list = state.media.contents;
      const by = { idea: 0, writing: 0, ready: 0, published: 0 };
      list.forEach(c => { if (by[c.status] !== undefined) by[c.status]++; });
      const m = new Date();
      const monthPrefix = `${m.getFullYear()}-${pad(m.getMonth() + 1)}`;
      const pubThisMonth = list.filter(c => c.publishedAt && c.publishedAt.startsWith(monthPrefix)).length;
      const last = [...list].filter(c => c.status === 'published' && c.publishedAt)
        .sort((a, b) => a.publishedAt < b.publishedAt ? 1 : -1)[0] || null;
      const next = [...list].filter(c => c.status === 'ready' && c.publishAt)
        .sort((a, b) => a.publishAt > b.publishAt ? 1 : -1)[0] || null;
      return { by, total: list.length, pubThisMonth, last, next };
    },
    devStats() {
      const t = state.dev.tasks;
      const by = { todo: 0, doing: 0, done: 0 };
      t.forEach(x => { if (by[x.status] !== undefined) by[x.status]++; });
      const bugs = state.dev.bugs.filter(b => b.status !== 'closed').length;
      return {
        by, bugs, projects: state.dev.projects.length,
        activeProjects: state.dev.projects.filter(p => p.status !== 'archived').length,
        dueToday: t.filter(x => x.status !== 'done' && x.due === today()).length
      };
    },
    consultStats() {
      const m = new Date();
      const monthPrefix = `${m.getFullYear()}-${pad(m.getMonth() + 1)}`;
      const monthSessions = state.consult.sessions.filter(s => (s.date || '').startsWith(monthPrefix));
      const pending = state.consult.sessions.filter(s => s.followUp && !s.followDone);
      const nextAt = [...pending].filter(s => s.nextAt).sort((a, b) => a.nextAt > b.nextAt ? 1 : -1)[0];
      return {
        clients: state.consult.clients.length,
        pending: pending.length,
        nextAt: nextAt || null,
        monthHours: Math.round(monthSessions.reduce((a, s) => a + (Number(s.duration) || 0), 0) / 6) / 10,
        monthFee: monthSessions.reduce((a, s) => a + (Number(s.fee) || 0), 0)
      };
    },
    gameWeek() {
      const ws = weekStartStr();
      const s = state.games.sessions.filter(x => x.date >= ws);
      return {
        minutes: s.reduce((a, x) => a + (Number(x.minutes) || 0), 0),
        playing: state.games.items.filter(i => i.status === 'playing').length
      };
    },
    /** 某天"其他模块汇入"的只读事项（PRD 6.2）。首页与今日计划共用这一处口径。 */
    agenda(date) {
      const out = [];
      state.dev.tasks.filter(t => t.status !== 'done' && t.due === date)
        .forEach(t => out.push({ src: '开发任务', text: t.title, go: 'dev' }));
      state.media.contents.filter(c => c.status !== 'published' && c.publishAt === date)
        .forEach(c => out.push({ src: '待发布', text: c.title, go: 'media' }));
      state.consult.sessions.filter(s => s.followUp && !s.followDone && s.nextAt === date)
        .forEach(s => out.push({ src: '客户跟进', text: s.clientName || s.topic || '', go: 'consult' }));
      if (date === today()) {
        state.games.items.filter(i => i.status === 'playing')
          .forEach(i => out.push({ src: '在玩', text: i.title, go: 'games' }));
      }
      return out;
    }
  };

  return {
    VIEWS, NAV,
    calc, weekStartStr,
    get state() { return state; },
    get current() { return current; },
    register: (k, v) => { VIEWS[k] = v; },
    save, load, refresh, go, route, renderNav,
    blank, uid, today, ymd, addDays, fmtDate, fmtDateFull, relDay, parseYmd, startOfWeek, WEEK,
    esc, icon, qs, qsa, toast, modal, confirm, emptyBox, statusTag, minutesToText,
    notify: refresh,
    setCurrent: n => { current = n; }
  };
})();

/* ---------- 启动 ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const app = document.querySelector('#app');
  try {
    await WB.load();
  } catch (e) {
    app.innerHTML = `<div class="empty" style="margin-top:80px">
      <b>读不到数据</b>${WB.esc(e.message)}<br><br>
      请确认启动窗口还开着，然后刷新页面。
    </div>`;
    return;
  }
  window.addEventListener('hashchange', WB.route);
  if (!location.hash) location.hash = '#/home';
  else WB.route();

  // Alt + 1..9 快速切换
  document.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 9) {
      const target = WB.NAV[n - 1];
      if (target) { e.preventDefault(); WB.go(target.key); }
    }
  });
});

