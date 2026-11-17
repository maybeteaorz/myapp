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

  function items() {
    let list = WB.state.media.contents.slice();
    if (filter) list = list.filter(c => c.platform === filter);
    return list;
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
