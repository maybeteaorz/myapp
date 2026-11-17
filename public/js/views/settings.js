/* ================= 数据与设置 ================= */
(function () {
  const { esc, icon } = WB;

  async function render(root) {
    const s = WB.state;
    let info = { dataFile: '—', backupDir: '—', size: 0, updated: null, backups: [] };
    try { info = await (await fetch('/api/info')).json(); } catch (e) { /* 忽略 */ }

    const planCount = Object.values(s.plan).reduce((a, arr) => a + arr.length, 0);
    const dietDays = Object.keys(s.diet.logs).length;

    root.innerHTML = `<div class="wrap">
      <div class="page-head">
        <div><h1>数据与设置</h1><div class="sub">数据都在本机，这里能备份、能恢复</div></div>
        <div class="head-actions">
          <a class="btn" href="/api/export" download>导出备份</a>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>你的数据在哪</h3><span class="hint">纯本地，不经过任何服务器</span></div>
        <div class="setting-row">
          <div><div class="lbl">数据文件</div><div class="desc mono" style="word-break:break-all">${esc(info.dataFile)}</div></div>
          <span class="tag ${info.size ? 'accent' : 'line'}">${info.size ? (info.size / 1024).toFixed(1) + ' KB' : '空'}</span>
        </div>
        <div class="setting-row">
          <div><div class="lbl">自动备份目录</div><div class="desc mono" style="word-break:break-all">${esc(info.backupDir)}</div></div>
          <span class="small muted">每天首次保存时留一份</span>
        </div>
        <div class="setting-row">
          <div><div class="lbl">最后保存</div><div class="desc">${info.updated ? new Date(info.updated).toLocaleString('zh-CN') : '还没有保存过'}</div></div>
          <span class="tag line">自动保存已开启</span>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr;align-items:start;margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>个人信息</h3></div>
          <div style="padding:14px 18px;display:flex;flex-direction:column;gap:12px">
            <div class="field"><label>怎么称呼你</label>
              <input class="input" id="setName" value="${esc(s.settings.name || '')}" placeholder="留空就只显示问候语" maxlength="20"></div>
            <div class="row">
              <div class="field"><label>每日热量目标 kcal</label><input type="number" class="input" id="setKcal" value="${s.settings.kcalGoal || 2000}" min="500" step="50"></div>
              <div class="field"><label>蛋白目标 g</label><input type="number" class="input" id="setPro" value="${s.settings.proteinGoal || 120}" min="0" step="5"></div>
            </div>
            <div class="field"><label>每天喝几杯水</label><input type="number" class="input" id="setWater" value="${s.settings.waterGoal || 8}" min="1" max="20"></div>
            <button class="btn primary" id="saveSettings" style="align-self:flex-start">保存设置</button>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>数据概览</h3><span class="hint">全部存在这一份文件里</span></div>
          <table class="table">
            <tbody>
              <tr><td>计划条目</td><td class="num" style="text-align:right;font-weight:600">${planCount}</td></tr>
              <tr><td>快速备忘</td><td class="num" style="text-align:right;font-weight:600">${s.memo.length}</td></tr>
              <tr><td>自媒体内容</td><td class="num" style="text-align:right;font-weight:600">${s.media.contents.length}</td></tr>
              <tr><td>开发项目 / 任务 / bug</td><td class="num" style="text-align:right;font-weight:600">${s.dev.projects.length} / ${s.dev.tasks.length} / ${s.dev.bugs.length}</td></tr>
              <tr><td>客户 / 沟通记录</td><td class="num" style="text-align:right;font-weight:600">${s.consult.clients.length} / ${s.consult.sessions.length}</td></tr>
              <tr><td>训练日志 / 体重记录</td><td class="num" style="text-align:right;font-weight:600">${s.fitness.logs.length} / ${s.fitness.body.length}</td></tr>
              <tr><td>食物库 / 饮食记录天数</td><td class="num" style="text-align:right;font-weight:600">${s.diet.foods.length} / ${dietDays}</td></tr>
              <tr><td>游戏 / 时长记录</td><td class="num" style="text-align:right;font-weight:600">${s.games.items.length} / ${s.games.sessions.length}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>备份与恢复</h3><span class="hint">${info.backups.length} 份自动备份</span></div>
        <div class="setting-row">
          <div>
            <div class="lbl">导入备份文件</div>
            <div class="desc">选一个之前导出的 json，会用它的内容覆盖当前数据（覆盖前会自动留一份备份）</div>
          </div>
          <div style="display:flex;gap:8px">
            <input type="file" id="importFile" accept=".json,application/json" style="display:none">
            <button class="btn" id="pickImport">选择文件</button>
          </div>
        </div>
        ${info.backups.length ? `<div style="max-height:260px;overflow:auto">
          ${info.backups.map(b => `<div class="backup-item">
            <span class="mono" style="flex:1">${esc(b.name)}</span>
            <span class="small muted num">${(b.size / 1024).toFixed(1)} KB</span>
            <span class="small muted">${new Date(b.mtime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            <button class="btn sm" data-restore="${esc(b.name)}">恢复</button>
          </div>`).join('')}
        </div>` : `<div class="empty">还没有自动备份，正常保存过一次之后就会出现</div>`}
      </div>

      <div class="card" style="border-color:#eed3cf">
        <div class="card-head" style="background:var(--danger-soft)"><h3 style="color:var(--danger)">危险操作</h3></div>
        <div class="setting-row">
          <div>
            <div class="lbl">清空所有数据</div>
            <div class="desc">九个模块的记录全部删除，只保留设置项。执行前请先导出备份。</div>
          </div>
          <button class="btn danger" id="resetAll">清空</button>
        </div>
      </div>

      <div class="small muted" style="margin-top:16px;line-height:1.9">
        快捷键：<span class="kbd">Alt</span> + <span class="kbd">1</span>…<span class="kbd">9</span> 切换模块　·　关闭启动窗口即停止服务，数据已随时保存
      </div>
    </div>`;

    bind(root);
  }

  function bind(root) {
    const wrap = WB.qs('.wrap', root);

    WB.qs('#saveSettings', wrap).addEventListener('click', () => {
      const s = WB.state.settings;
      s.name = WB.qs('#setName', wrap).value.trim();
      s.kcalGoal = Number(WB.qs('#setKcal', wrap).value) || 2000;
      s.proteinGoal = Number(WB.qs('#setPro', wrap).value) || 120;
      s.waterGoal = Number(WB.qs('#setWater', wrap).value) || 8;
      WB.save(true);
      WB.toast('设置已保存');
      WB.renderNav();
    });

    const file = WB.qs('#importFile', wrap);
    WB.qs('#pickImport', wrap).addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const obj = JSON.parse(text);
        if (!obj || typeof obj !== 'object' || !obj.version) throw new Error('这不像是这个 App 的数据文件');
        const ok = await WB.confirm({
          title: '导入备份',
          text: `即将用「${f.name}」覆盖当前所有数据，确定吗？`,
          okText: '覆盖导入'
        });
        if (!ok) { file.value = ''; return; }
        const r = await fetch('/api/data', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj)
        });
        if (!r.ok) throw new Error('保存失败');
        await WB.load();
        WB.refresh();
        WB.toast('已导入');
      } catch (e) {
        WB.toast('导入失败：' + e.message, true);
      } finally {
        file.value = '';
      }
    });

    WB.qsa('[data-restore]', wrap).forEach(el => el.addEventListener('click', async () => {
      const ok = await WB.confirm({
        title: '恢复备份',
        text: `用「${el.dataset.restore}」覆盖当前数据？当前数据会先自动存一份 before-restore 备份。`,
        okText: '恢复'
      });
      if (!ok) return;
      try {
        const r = await fetch('/api/restore', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: el.dataset.restore })
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || '恢复失败');
        await WB.load();
        WB.refresh();
        WB.toast('已恢复到该备份');
      } catch (e) {
        WB.toast(e.message, true);
      }
    }));

    WB.qs('#resetAll', wrap).addEventListener('click', async () => {
      const ok = await WB.confirm({
        title: '清空所有数据',
        html: '九个模块的记录会全部删除，<b>不可撤销</b>。<br><br>如果还没导出备份，建议先点右上角「导出备份」。',
        danger: true, okText: '我确定清空'
      });
      if (!ok) return;
      const blank = WB.blank();
      blank.settings = { ...WB.state.settings };
      await fetch('/api/data', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(blank)
      });
      await WB.load();
      WB.refresh();
      WB.toast('已清空');
    });
  }

  WB.register('settings', { render });
})();
