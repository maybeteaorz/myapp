/* ================= 开发工作 ================= */
(function () {
  const { esc, icon, today } = WB;
  const TASK_COLS = [
    { key: 'todo', label: '待办', dot: '#b6b2a8' },
    { key: 'doing', label: '进行中', dot: '#b1772b' },
    { key: 'done', label: '完成', dot: '#2f6a63' }
  ];
  const PRIO = { 0: { label: '普通', cls: '' }, 1: { label: '重要', cls: 'amber' }, 2: { label: '紧急', cls: 'danger' } };
  const SEV = { low: { label: '低', cls: '' }, mid: { label: '中', cls: 'amber' }, high: { label: '高', cls: 'danger' }, fatal: { label: '致命', cls: 'danger' } };
  const COLORS = ['#2f6a63', '#3f6795', '#b1772b', '#8a5c8f', '#b4483e', '#4a7c59'];

  let pid = null;
  let tab = 'tasks';

  function projects() { return WB.state.dev.projects; }
  function cur() {
    const p = projects().find(x => x.id === pid);
    if (p) return p;
    return projects()[0] || null;
  }

  function render(root) {
    if (!projects().length) {
      root.innerHTML = `<div class="wrap">
        <div class="page-head"><div><h1>开发工作</h1><div class="sub">按项目分开管：任务、bug、代码备忘</div></div></div>
        <div class="card"><div class="empty" style="padding:48px 16px">
          <b>还没有项目</b>先建一个，比如「个人博客」「小程序 X」<br><br>
          <button class="btn primary" id="firstProj">${icon('plus', 15)} 新建项目</button>
        </div></div>
      </div>`;
      WB.qs('#firstProj', root).addEventListener('click', () => editProject(null));
      return;
    }

    const p = cur();
    if (!p) { pid = projects()[0].id; return render(root); }

    const tasks = WB.state.dev.tasks.filter(t => t.projectId === p.id);
    const bugs = WB.state.dev.bugs.filter(b => b.projectId === p.id);
    const snips = WB.state.dev.snippets.filter(s => s.projectId === p.id);
    const openBugs = bugs.filter(b => b.status !== 'closed').length;

    root.innerHTML = `<div class="wrap">
      <div class="page-head">
        <div><h1>开发工作</h1><div class="sub">${projects().length} 个项目 · 当前：${esc(p.name)}</div></div>
        <div class="head-actions"><button class="btn primary" id="newProj">${icon('plus', 15)} 新建项目</button></div>
      </div>

      <div class="split">
        <div class="side-list">
          <div class="side-list-head"><span>项目</span><span>${projects().length}</span></div>
          ${projects().map(x => {
            const n = WB.state.dev.tasks.filter(t => t.projectId === x.id && t.status !== 'done').length;
            return `<div class="side-item ${x.id === p.id ? 'active' : ''}" data-proj="${x.id}">
              <span class="swatch" style="background:${x.color || '#2f6a63'}"></span>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.name)}</span>
              ${x.status === 'archived' ? '<span class="tag line" style="height:16px;font-size:10px">归档</span>' : (n ? `<span class="n">${n}</span>` : '')}
            </div>`;
          }).join('')}
        </div>

        <div>
          <div class="card" style="margin-bottom:14px">
            <div class="card-head" style="padding:15px 18px">
              <div>
                <h3 style="font-size:15px">${esc(p.name)}</h3>
                <div class="small muted" style="margin-top:2px">${esc(p.desc || '没有描述')}${p.repo ? ` · <span class="mono">${esc(p.repo)}</span>` : ''}</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <span class="tag ${p.status === 'archived' ? 'line' : 'accent'}">${p.status === 'archived' ? '已归档' : p.status === 'paused' ? '暂停' : '进行中'}</span>
                <span class="tag line">${tasks.filter(t => t.status === 'done').length}/${tasks.length} 任务完成</span>
                ${openBugs ? `<span class="tag danger">${openBugs} 个 bug</span>` : ''}
                <button class="btn sm" id="editProj">编辑</button>
              </div>
            </div>
            <div style="display:flex;gap:4px;padding:0 14px;border-bottom:1px solid var(--line)">
              ${[['tasks', '任务', tasks.length], ['bugs', 'Bug', openBugs], ['snippets', '代码备忘', snips.length]].map(([k, l, n]) => `
                <button class="btn ghost sm" data-tab="${k}" style="border-radius:8px 8px 0 0;border-bottom:2px solid ${tab === k ? 'var(--accent)' : 'transparent'};color:${tab === k ? 'var(--ink)' : 'var(--ink-3)'};font-weight:${tab === k ? '650' : '400'};height:34px">
                  ${l}<span class="muted" style="font-weight:400">${n}</span>
                </button>`).join('')}
            </div>
          </div>
          <div id="devBody">${tabBody(p, tasks, bugs, snips)}</div>
        </div>
      </div>
    </div>`;

    bind(root);
  }

  function tabBody(p, tasks, bugs, snips) {
    if (tab === 'tasks') {
      return `<div class="kanban cols-3">${TASK_COLS.map(col => {
        const list = tasks.filter(t => t.status === col.key)
          .sort((a, b) => (a.due || '9999') < (b.due || '9999') ? -1 : 1);
        return `<div class="kcol">
          <div class="kcol-head"><span class="dot" style="background:${col.dot}"></span>${col.label}<span class="count">${list.length}</span></div>
          <div class="kcol-body">
            ${list.map(t => {
              const pr = PRIO[t.prio || 0];
              const overdue = t.due && t.due < today() && t.status !== 'done';
              return `<div class="kcard" data-task="${t.id}">
                <div class="t" style="${t.status === 'done' ? 'text-decoration:line-through;color:var(--ink-3)' : ''}">${esc(t.title)}</div>
                <div class="m">
                  ${t.prio ? `<span class="tag ${pr.cls}">${pr.label}</span>` : ''}
                  ${t.due ? `<span class="d" style="${overdue ? 'color:var(--danger);font-weight:600' : ''}">${overdue ? '已逾期 ' : ''}${esc(t.due.slice(5))}</span>` : ''}
                </div>
                ${t.note ? `<div class="note">${esc(t.note)}</div>` : ''}
              </div>`;
            }).join('')}
            <button class="btn ghost sm" data-addtask="${col.key}" style="justify-content:center;border:1px dashed var(--line-2);height:28px">${icon('plus', 13)} 添加</button>
          </div>
        </div>`;
      }).join('')}</div>`;
    }

    if (tab === 'bugs') {
      if (!bugs.length) return `<div class="card"><div class="empty"><b>没有 bug 记录</b>踩到坑就记一条，附上复现步骤</div></div>`;
      return `<div class="card"><table class="table">
        <thead><tr><th style="width:60px">级别</th><th>问题</th><th style="width:110px">状态</th><th style="width:90px">日期</th><th style="width:44px"></th></tr></thead>
        <tbody>${bugs.slice().sort((a, b) => (a.status === 'closed' ? 1 : 0) - (b.status === 'closed' ? 1 : 0))
          .map(b => `<tr data-bug="${b.id}">
            <td><span class="tag ${SEV[b.severity] ? SEV[b.severity].cls : ''}">${SEV[b.severity] ? SEV[b.severity].label : '中'}</span></td>
            <td>
              <div style="font-weight:600;${b.status === 'closed' ? 'text-decoration:line-through;color:var(--ink-3)' : ''}">${esc(b.title)}</div>
              ${b.repro ? `<div class="small muted" style="margin-top:2px;white-space:pre-wrap">${esc(b.repro.slice(0, 120))}</div>` : ''}
            </td>
            <td><span class="tag ${b.status === 'closed' ? 'accent' : b.status === 'fixing' ? 'amber' : 'line'}">${b.status === 'closed' ? '已修复' : b.status === 'fixing' ? '修复中' : '待处理'}</span></td>
            <td class="muted small">${esc(b.date || '')}</td>
            <td><button class="btn ghost icon sm" data-delbug="${b.id}">${icon('trash', 13)}</button></td>
          </tr>`).join('')}</tbody></table>
        <div style="padding:10px 14px;border-top:1px solid var(--line)">
          <button class="btn sm" id="addBug">${icon('plus', 13)} 记一个 bug</button>
        </div>
      </div>`;
    }

    return `<div>
      ${snips.length ? snips.slice().sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? 1 : -1).map(s => `
        <div class="card" style="margin-bottom:12px">
          <div class="card-head">
            <div style="display:flex;align-items:center;gap:8px">
              <h3>${esc(s.title)}</h3>
              ${s.lang ? `<span class="tag line">${esc(s.lang)}</span>` : ''}
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn sm" data-copy="${s.id}">复制</button>
              <button class="btn ghost icon sm" data-delsnip="${s.id}">${icon('trash', 13)}</button>
            </div>
          </div>
          <div style="padding:12px 14px">
            ${s.note ? `<div class="small muted" style="margin-bottom:8px">${esc(s.note)}</div>` : ''}
            <pre class="code" style="max-height:260px;overflow:auto">${esc(s.code)}</pre>
          </div>
        </div>`).join('') : `<div class="card"><div class="empty"><b>还没有代码备忘</b>常用命令、坑点写法、配置片段都可以存这里</div></div>`}
      <button class="btn" id="addSnip">${icon('plus', 13)} 新增代码备忘</button>
    </div>`;
  }

  function bind(root) {
    const wrap = WB.qs('.wrap', root);
    WB.qs('#newProj', wrap).addEventListener('click', () => editProject(null));
    const p = cur();

    WB.qsa('[data-proj]', wrap).forEach(el => el.addEventListener('click', () => {
      pid = el.dataset.proj; tab = 'tasks'; WB.refresh();
    }));
    WB.qsa('[data-tab]', wrap).forEach(el => el.addEventListener('click', () => {
      tab = el.dataset.tab; WB.refresh();
    }));
    WB.qs('#editProj', wrap).addEventListener('click', () => editProject(p));

    const body = WB.qs('#devBody', wrap);
    body.addEventListener('click', e => {
      const addT = e.target.closest('[data-addtask]');
      if (addT) { editTask(null, p.id, addT.dataset.addtask); return; }
      const t = e.target.closest('[data-task]');
      if (t) { editTask(t.dataset.task, p.id); return; }
      const ab = e.target.closest('#addBug');
      if (ab) { editBug(null, p.id); return; }
      const bg = e.target.closest('[data-bug]');
      if (bg) { editBug(bg.dataset.bug, p.id); return; }
      const db = e.target.closest('[data-delbug]');
      if (db) {
        e.stopPropagation();
        WB.state.dev.bugs = WB.state.dev.bugs.filter(x => x.id !== db.dataset.delbug);
        WB.save(); WB.refresh(); return;
      }
      const as = e.target.closest('#addSnip');
      if (as) { editSnip(null, p.id); return; }
      const ds = e.target.closest('[data-delsnip]');
      if (ds) {
        WB.state.dev.snippets = WB.state.dev.snippets.filter(x => x.id !== ds.dataset.delsnip);
        WB.save(); WB.refresh(); return;
      }
      const cp = e.target.closest('[data-copy]');
      if (cp) {
        const s = WB.state.dev.snippets.find(x => x.id === cp.dataset.copy);
        if (s) {
          navigator.clipboard.writeText(s.code).then(
            () => WB.toast('已复制到剪贴板'),
            () => WB.toast('复制失败，请手动选中', true)
          );
        }
      }
    });
  }

  function editProject(p) {
    const isNew = !p;
    const x = p || { id: WB.uid(), name: '', desc: '', status: 'active', color: COLORS[0], repo: '' };
    WB.modal({
      title: isNew ? '新建项目' : '编辑项目',
      body: `
        <div class="field"><label>项目名</label><input class="input" id="pName" value="${esc(x.name)}" placeholder="例如：个人博客" maxlength="40"></div>
        <div class="field"><label>一句话说明</label><input class="input" id="pDesc" value="${esc(x.desc || '')}" placeholder="这个项目要解决什么" maxlength="120"></div>
        <div class="row">
          <div class="field"><label>状态</label><select class="select" id="pStatus">
            <option value="active" ${x.status === 'active' ? 'selected' : ''}>进行中</option>
            <option value="paused" ${x.status === 'paused' ? 'selected' : ''}>暂停</option>
            <option value="archived" ${x.status === 'archived' ? 'selected' : ''}>已归档</option>
          </select></div>
          <div class="field"><label>路径 / 仓库</label><input class="input" id="pRepo" value="${esc(x.repo || '')}" placeholder="可选"></div>
        </div>
        <div class="field"><label>颜色</label>
          <div class="chip-row">${COLORS.map(c => `<span class="chip" data-color="${c}" style="background:${c};width:26px;height:26px;padding:0;border-radius:8px;border:2px solid ${c === x.color ? 'var(--ink)' : 'transparent'}"></span>`).join('')}</div>
        </div>
        ${isNew ? '' : `<button class="btn danger" id="delProj" style="align-self:flex-start">删除这个项目</button>`}`,
      okText: isNew ? '创建' : '保存',
      onMount: (body, close) => {
        let color = x.color || COLORS[0];
        WB.qsa('[data-color]', body).forEach(el => el.addEventListener('click', () => {
          color = el.dataset.color;
          WB.qsa('[data-color]', body).forEach(y => y.style.border = '2px solid transparent');
          el.style.border = '2px solid var(--ink)';
        }));
        body.dataset.color = color;
        const del = WB.qs('#delProj', body);
        if (del) del.addEventListener('click', async () => {
          const ok = await WB.confirm({ title: '删除项目', text: `「${x.name}」下的任务、bug、代码备忘都会一起删掉，确定吗？`, danger: true, okText: '删除' });
          if (!ok) return;
          WB.state.dev.projects = WB.state.dev.projects.filter(y => y.id !== x.id);
          WB.state.dev.tasks = WB.state.dev.tasks.filter(y => y.projectId !== x.id);
          WB.state.dev.bugs = WB.state.dev.bugs.filter(y => y.projectId !== x.id);
          WB.state.dev.snippets = WB.state.dev.snippets.filter(y => y.projectId !== x.id);
          pid = null; WB.save(); WB.refresh(); close();
          WB.toast('项目已删除');
        });
      },
      onOk: body => {
        const name = WB.qs('#pName', body).value.trim();
        if (!name) { WB.toast('项目名不能为空', true); return false; }
        x.name = name;
        x.desc = WB.qs('#pDesc', body).value.trim();
        x.status = WB.qs('#pStatus', body).value;
        x.repo = WB.qs('#pRepo', body).value.trim();
        x.color = body.dataset.color || x.color;
        if (isNew) WB.state.dev.projects.push(x);
        pid = x.id;
        WB.save(); WB.refresh();
      }
    });
  }

  function editTask(id, projectId, presetStatus) {
    const isNew = !id;
    const t = isNew
      ? { id: WB.uid(), projectId, title: '', status: presetStatus || 'todo', prio: 0, due: '', note: '' }
      : WB.state.dev.tasks.find(x => x.id === id);
    if (!t) return;
    WB.modal({
      title: isNew ? '新增任务' : '编辑任务',
      body: `
        <div class="field"><label>任务</label><input class="input" id="tTitle" value="${esc(t.title)}" placeholder="要做什么" maxlength="120"></div>
        <div class="row">
          <div class="field"><label>状态</label><select class="select" id="tStatus">
            ${TASK_COLS.map(c => `<option value="${c.key}" ${c.key === t.status ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select></div>
          <div class="field"><label>优先级</label><select class="select" id="tPrio">
            ${Object.keys(PRIO).map(k => `<option value="${k}" ${Number(k) === (t.prio || 0) ? 'selected' : ''}>${PRIO[k].label}</option>`).join('')}
          </select></div>
          <div class="field"><label>截止</label><input type="date" class="input" id="tDue" value="${esc(t.due || '')}"></div>
        </div>
        <div class="field"><label>备注</label><textarea class="textarea" id="tNote" rows="2">${esc(t.note || '')}</textarea></div>
        ${isNew ? '' : `<button class="btn danger" id="delTask" style="align-self:flex-start">删除任务</button>`}`,
      okText: isNew ? '添加' : '保存',
      onMount: (body, close) => {
        const del = WB.qs('#delTask', body);
        if (del) del.addEventListener('click', () => {
          WB.state.dev.tasks = WB.state.dev.tasks.filter(x => x.id !== t.id);
          WB.save(); WB.refresh(); close();
        });
      },
      onOk: body => {
        const title = WB.qs('#tTitle', body).value.trim();
        if (!title) { WB.toast('任务内容不能为空', true); return false; }
        t.title = title;
        t.status = WB.qs('#tStatus', body).value;
        t.prio = Number(WB.qs('#tPrio', body).value);
        t.due = WB.qs('#tDue', body).value;
        t.note = WB.qs('#tNote', body).value;
        if (isNew) WB.state.dev.tasks.push(t);
        WB.save(); WB.refresh();
      }
    });
  }

  function editBug(id, projectId) {
    const isNew = !id;
    const b = isNew
      ? { id: WB.uid(), projectId, title: '', severity: 'mid', status: 'open', repro: '', date: today() }
      : WB.state.dev.bugs.find(x => x.id === id);
    if (!b) return;
    WB.modal({
      title: isNew ? '记一个 bug' : '编辑 bug',
      body: `
        <div class="field"><label>问题</label><input class="input" id="bTitle" value="${esc(b.title)}" maxlength="140"></div>
        <div class="row">
          <div class="field"><label>严重程度</label><select class="select" id="bSev">
            ${Object.keys(SEV).map(k => `<option value="${k}" ${k === b.severity ? 'selected' : ''}>${SEV[k].label}</option>`).join('')}
          </select></div>
          <div class="field"><label>状态</label><select class="select" id="bStatus">
            <option value="open" ${b.status === 'open' ? 'selected' : ''}>待处理</option>
            <option value="fixing" ${b.status === 'fixing' ? 'selected' : ''}>修复中</option>
            <option value="closed" ${b.status === 'closed' ? 'selected' : ''}>已修复</option>
          </select></div>
        </div>
        <div class="field"><label>复现步骤 / 原因</label>
          <textarea class="textarea" id="bRepro" rows="4" placeholder="怎么必现？报错信息？最后怎么修的？">${esc(b.repro || '')}</textarea></div>`,
      okText: isNew ? '记录' : '保存',
      onOk: body => {
        const title = WB.qs('#bTitle', body).value.trim();
        if (!title) { WB.toast('问题不能为空', true); return false; }
        b.title = title;
        b.severity = WB.qs('#bSev', body).value;
        b.status = WB.qs('#bStatus', body).value;
        b.repro = WB.qs('#bRepro', body).value;
        if (isNew) WB.state.dev.bugs.unshift(b);
        WB.save(); WB.refresh();
      }
    });
  }

  function editSnip(id, projectId) {
    const isNew = !id;
    const s = isNew
      ? { id: WB.uid(), projectId, title: '', lang: '', code: '', note: '', createdAt: new Date().toISOString() }
      : WB.state.dev.snippets.find(x => x.id === id);
    if (!s) return;
    WB.modal({
      title: isNew ? '新增代码备忘' : '编辑代码备忘',
      wide: true,
      body: `
        <div class="row">
          <div class="field" style="flex:2"><label>标题</label><input class="input" id="sTitle" value="${esc(s.title)}" placeholder="这条备忘是干什么的" maxlength="80"></div>
          <div class="field"><label>语言</label><input class="input" id="sLang" value="${esc(s.lang || '')}" placeholder="js / sql / bash"></div>
        </div>
        <div class="field"><label>说明</label><input class="input" id="sNote" value="${esc(s.note || '')}" maxlength="160"></div>
        <div class="field"><label>代码</label><textarea class="textarea mono" id="sCode" rows="10" placeholder="粘代码或命令">${esc(s.code)}</textarea></div>`,
      okText: isNew ? '保存' : '保存',
      onOk: body => {
        const title = WB.qs('#sTitle', body).value.trim();
        const code = WB.qs('#sCode', body).value;
        if (!title || !code.trim()) { WB.toast('标题和代码都要填', true); return false; }
        s.title = title; s.lang = WB.qs('#sLang', body).value.trim();
        s.note = WB.qs('#sNote', body).value; s.code = code;
        if (isNew) WB.state.dev.snippets.unshift(s);
        WB.save(); WB.refresh();
      }
    });
  }

  WB.register('dev', { render });
})();
