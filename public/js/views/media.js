/* ================= 自媒体 ================= */
(function () {
  const { esc, icon, calc, today, fmtDate } = WB;
  const PLATFORMS = ['公众号', '小红书', '抖音', 'B站', '知乎', '视频号', '其他'];
  const COLS = [
    { key: 'idea', label: '选题', dot: '#b6b2a8', next: '开始写' },
    { key: 'writing', label: '写作中', dot: '#b1772b', next: '写完了' },
    { key: 'ready', label: '待发布', dot: '#3f6795', next: '已发布' },
    { key: 'published', label: '已发布', dot: '#2f6a63', next: null }
  ];
  let filter = '';
  let metric = 'views';
  const METRICS = { views: '阅读', likes: '点赞', comments: '评论' };
  const METRIC_COLORS = { views: '#2f6a63', likes: '#b1772b', comments: '#3f6795' };

  function items() {
    let list = WB.state.media.contents.slice();
    if (filter) list = list.filter(c => c.platform === filter);
    return list;
  }

  /** 已发内容表现柱状图（纯 SVG，无依赖）。按发布时间取最近 12 篇，横轴时间纵轴数值。 */
  function chartSvg(published) {
    const list = published.filter(c => c.publishedAt)
      .sort((a, b) => a.publishedAt < b.publishedAt ? -1 : 1).slice(-12);
    if (!list.length) {
      return `<div class="empty">发布后这里会画出阅读 / 点赞的变化，先发布一条并填上数据</div>`;
    }
    const W = 860, H = 210, padL = 46, padR = 14, padT = 18, padB = 40;
    const vals = list.map(c => Number((c.stats || {})[metric]) || 0);
    const max = Math.max(...vals, 1);
    const nice = max => {
      const p = Math.pow(10, Math.floor(Math.log10(max)));
      return Math.ceil(max / p) * p;
    };
    const top = nice(max);
    const iw = W - padL - padR, ih = H - padT - padB;
    const n = list.length;
    const slot = iw / n;
    const bw = Math.min(44, slot * 0.55);
    const color = METRIC_COLORS[metric];

    // 网格与刻度
    const rows = 4;
    let grid = '';
    for (let i = 0; i <= rows; i++) {
      const v = Math.round(top * i / rows);
      const y = padT + ih - (i / rows) * ih;
      grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#eeece6" stroke-width="1"/>
        <text x="${padL - 7}" y="${y + 3.5}" text-anchor="end" font-size="10" fill="#8d9299">${v.toLocaleString()}</text>`;
    }

    const bars = list.map((c, i) => {
      const v = vals[i];
      const h = top ? v / top * ih : 0;
      const x = padL + slot * i + (slot - bw) / 2;
      const y = padT + ih - h;
      const st = c.stats || {};
      const tip = `${esc(c.title)}（${esc(c.platform || '')} ${esc(c.publishedAt || '')}）\n阅读 ${Number(st.views) || 0} · 点赞 ${Number(st.likes) || 0} · 评论 ${Number(st.comments) || 0}`;
      return `<g class="bar" data-bar="${esc(c.id)}">
        <title>${tip}</title>
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 2).toFixed(1)}" rx="4" fill="${color}"/>
        <text x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="#5a6068">${v ? v.toLocaleString() : ''}</text>
        <text x="${(x + bw / 2).toFixed(1)}" y="${H - padB + 15}" text-anchor="middle" font-size="9.5" fill="#8d9299">${esc((c.publishedAt || '').slice(5))}</text>
      </g>`;
    }).join('');

    return `<div class="chart-box">
      <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        ${grid}${bars}
      </svg>
    </div>
    <div class="chart-note">最近 ${n} 篇已发内容 · 悬停看标题和数据，点柱子可编辑该条 · 数值取整刻度显示</div>`;
  }

  function render(root) {
    const s = calc.mediaStats();
    const list = items();
    const published = list.filter(c => c.status === 'published');
    const totalViews = published.reduce((a, c) => a + (Number((c.stats || {}).views) || 0), 0);
    const avg = published.length ? Math.round(totalViews / published.length) : 0;

    root.innerHTML = `<div class="wrap">
      <div class="page-head">
        <div>
          <h1>自媒体</h1>
          <div class="sub">从选题到发布，一条内容走完四步</div>
        </div>
        <div class="head-actions">
          <button class="btn primary" id="newContent">${icon('plus', 15)} 新建内容</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="stat-row">
          <div class="stat"><div class="v num">${s.by.idea + s.by.writing}</div><div class="k">在写 / 待写选题</div></div>
          <div class="stat"><div class="v num">${s.by.ready}</div><div class="k">待发布</div></div>
          <div class="stat"><div class="v num">${s.pubThisMonth}</div><div class="k">本月已发</div></div>
          <div class="stat"><div class="v num">${avg ? avg.toLocaleString() : 0}</div><div class="k">平均阅读（已发）</div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head">
          <h3>发布数据</h3>
          <div class="chip-row">
            ${Object.keys(METRICS).map(k => `<span class="chip ${metric === k ? 'on' : ''}" data-metric="${k}">${METRICS[k]}</span>`).join('')}
          </div>
        </div>
        ${chartSvg(published)}
      </div>

      <div class="chip-row" style="margin-bottom:12px">
        <span class="chip ${filter === '' ? 'on' : ''}" data-filter="">全部平台</span>
        ${PLATFORMS.map(p => `<span class="chip ${filter === p ? 'on' : ''}" data-filter="${esc(p)}">${esc(p)}</span>`).join('')}
      </div>

      <div class="kanban">
        ${COLS.map(col => {
          const cs = list.filter(c => c.status === col.key)
            .sort((a, b) => (a.publishAt || '') > (b.publishAt || '') ? 1 : -1);
          return `<div class="kcol">
            <div class="kcol-head"><span class="dot" style="background:${col.dot}"></span>${col.label}<span class="count">${cs.length}</span></div>
            <div class="kcol-body">
              ${cs.map(c => cardHtml(c, col)).join('')}
              <button class="btn ghost sm" data-add="${col.key}" style="justify-content:center;border:1px dashed var(--line-2);height:28px">${icon('plus', 13)} 添加</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

    bind(root);
  }

  function cardHtml(c, col) {
    const st = c.stats || {};
    return `<div class="kcard" data-open="${c.id}">
      <div class="t">${esc(c.title || '（未命名）')}</div>
      <div class="m">
        ${c.platform ? `<span class="tag blue">${esc(c.platform)}</span>` : ''}
        ${col.key === 'published'
          ? `<span class="d">${c.publishedAt ? esc(c.publishedAt) : '已发布'}</span>`
          : c.publishAt ? `<span class="d">${esc(c.publishAt)}</span>` : ''}
      </div>
      ${col.key === 'published' && (st.views || st.likes)
        ? `<div class="m" style="margin-top:7px">
             <span class="d num">阅读 ${Number(st.views) || 0}</span>
             <span class="d num">赞 ${Number(st.likes) || 0}</span>
             ${st.comments ? `<span class="d num">评 ${Number(st.comments)}</span>` : ''}
           </div>` : ''}
      ${col.key !== 'published' && c.body ? `<div class="note">${esc(c.body.slice(0, 60))}</div>` : ''}
      ${col.next ? `<div style="margin-top:8px">
        <button class="btn ghost sm" data-advance="${c.id}" style="height:22px;padding:0 6px;color:var(--accent)">${col.next} →</button>
      </div>` : ''}
    </div>`;
  }

  function bind(root) {
    const wrap = WB.qs('.wrap', root);
    WB.qs('#newContent', wrap).addEventListener('click', () => openEdit(null, 'idea'));
    WB.qsa('[data-filter]', wrap).forEach(el => el.addEventListener('click', () => {
      filter = el.dataset.filter; WB.refresh();
    }));
    WB.qsa('[data-add]', wrap).forEach(el => el.addEventListener('click', e => {
      e.stopPropagation(); openEdit(null, el.dataset.add);
    }));
    WB.qsa('[data-metric]', wrap).forEach(el => el.addEventListener('click', () => {
      metric = el.dataset.metric; WB.refresh();
    }));
    WB.qsa('[data-bar]', wrap).forEach(el => el.addEventListener('click', () => {
      openEdit(el.dataset.bar);
    }));
    wrap.addEventListener('click', e => {
      const adv = e.target.closest('[data-advance]');
      if (adv) {
        e.stopPropagation();
        const c = WB.state.media.contents.find(x => x.id === adv.dataset.advance);
        if (!c) return;
        const order = ['idea', 'writing', 'ready', 'published'];
        const i = order.indexOf(c.status);
        if (i < 0 || i >= order.length - 1) return;
        c.status = order[i + 1];
        if (c.status === 'published' && !c.publishedAt) c.publishedAt = today();
        if (c.status === 'ready' && !c.publishAt) c.publishAt = today();
        WB.save(); WB.refresh();
        WB.toast(`已移到「${COLS.find(x => x.key === c.status).label}」`);
        return;
      }
      const open = e.target.closest('[data-open]');
      if (open) openEdit(open.dataset.open);
    });
  }

  function openEdit(id, presetStatus) {
    const isNew = !id;
    const c = isNew
      ? { id: WB.uid(), title: '', platform: PLATFORMS[0], status: presetStatus || 'idea', body: '', publishAt: '', publishedAt: '', stats: {}, notes: '', createdAt: new Date().toISOString() }
      : WB.state.media.contents.find(x => x.id === id);
    if (!c) return;
    const st = c.stats || {};

    WB.modal({
      title: isNew ? '新建内容' : '编辑内容',
      wide: true,
      body: `
        <div class="field"><label>标题 / 选题</label>
          <input class="input" id="mTitle" value="${esc(c.title)}" placeholder="这条内容讲什么" maxlength="120"></div>
        <div class="row">
          <div class="field"><label>平台</label>
            <select class="select" id="mPlatform">${PLATFORMS.map(p => `<option ${p === c.platform ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
          <div class="field"><label>状态</label>
            <select class="select" id="mStatus">${COLS.map(x => `<option value="${x.key}" ${x.key === c.status ? 'selected' : ''}>${x.label}</option>`).join('')}</select></div>
        </div>
        <div class="row">
          <div class="field"><label>计划发布</label><input type="date" class="input" id="mPublishAt" value="${esc(c.publishAt || '')}"></div>
          <div class="field"><label>实际发布</label><input type="date" class="input" id="mPublishedAt" value="${esc(c.publishedAt || '')}"></div>
        </div>
        <div class="field"><label>正文 / 草稿</label>
          <textarea class="textarea" id="mBody" rows="8" placeholder="先把想写的丢进来，不用一次写好">${esc(c.body)}</textarea></div>
        <div class="row">
          <div class="field"><label>阅读</label><input type="number" class="input" id="mViews" value="${Number(st.views) || ''}" min="0"></div>
          <div class="field"><label>点赞</label><input type="number" class="input" id="mLikes" value="${Number(st.likes) || ''}" min="0"></div>
          <div class="field"><label>评论</label><input type="number" class="input" id="mComments" value="${Number(st.comments) || ''}" min="0"></div>
        </div>
        <div class="field"><label>备注 / 复盘</label>
          <textarea class="textarea" id="mNotes" rows="2" placeholder="这条为什么好 / 为什么一般">${esc(c.notes || '')}</textarea></div>`,
      okText: isNew ? '创建' : '保存',
      onOk: body => {
        const title = WB.qs('#mTitle', body).value.trim();
        if (!title) { WB.toast('标题不能为空', true); return false; }
        c.title = title;
        c.platform = WB.qs('#mPlatform', body).value;
        c.status = WB.qs('#mStatus', body).value;
        c.publishAt = WB.qs('#mPublishAt', body).value;
        c.publishedAt = WB.qs('#mPublishedAt', body).value;
        c.body = WB.qs('#mBody', body).value;
        c.notes = WB.qs('#mNotes', body).value;
        const v = WB.qs('#mViews', body).value, l = WB.qs('#mLikes', body).value, cm = WB.qs('#mComments', body).value;
        c.stats = { views: Number(v) || 0, likes: Number(l) || 0, comments: Number(cm) || 0 };
        if (c.status === 'published' && !c.publishedAt) c.publishedAt = today();
        if (isNew) WB.state.media.contents.unshift(c);
        WB.save(); WB.refresh();
        WB.toast(isNew ? '已创建' : '已保存');
      }
    });
  }

  WB.register('media', { render });
})();
