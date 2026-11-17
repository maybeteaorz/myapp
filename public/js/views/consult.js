/* ================= 咨询工作 ================= */
(function () {
  const { esc, icon, today, fmtDate } = WB;
  let cid = null;

  function clients() { return WB.state.consult.clients; }
  function cur() {
    return clients().find(x => x.id === cid) || clients()[0] || null;
  }
  function sessionsOf(id) {
    return WB.state.consult.sessions.filter(s => s.clientId === id)
      .sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1);
  }

  function render(root) {
    const st = WB.calc.consultStats();

    if (!clients().length) {
      root.innerHTML = `<div class="wrap">
        <div class="page-head"><div><h1>咨询工作</h1><div class="sub">客户、每次沟通、待跟进，一处对照</div></div></div>
        <div class="card"><div class="empty" style="padding:48px 16px">
          <b>还没有客户</b>先建一个客户档案，之后每次沟通都挂在这个客户下面<br><br>
          <button class="btn primary" id="firstClient">${icon('plus', 15)} 新建客户</button>
        </div></div>
      </div>`;
      WB.qs('#firstClient', root).addEventListener('click', () => editClient(null));
      return;
    }

    const c = cur();
    if (!c) { cid = clients()[0].id; return render(root); }
    const list = sessionsOf(c.id);
    const pending = list.filter(s => s.followUp && !s.followDone);
    const totalMin = list.reduce((a, s) => a + (Number(s.duration) || 0), 0);

    root.innerHTML = `<div class="wrap">
      <div class="page-head">
        <div><h1>咨询工作</h1><div class="sub">${clients().length} 个客户 · 待跟进 ${st.pending} 件</div></div>
        <div class="head-actions"><button class="btn primary" id="newClient">${icon('plus', 15)} 新建客户</button></div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="stat-row">
          <div class="stat"><div class="v num">${clients().length}</div><div class="k">客户</div></div>
          <div class="stat"><div class="v num">${st.monthHours}<span style="font-size:11px;color:var(--ink-3);font-weight:400"> 小时</span></div><div class="k">本月工时</div></div>
          <div class="stat"><div class="v num">¥${st.monthFee.toLocaleString()}</div><div class="k">本月收入</div></div>
          <div class="stat"><div class="v num" style="${st.pending ? 'color:var(--amber)' : ''}">${st.pending}</div><div class="k">待跟进</div></div>
        </div>
      </div>

      <div class="split">
        <div class="side-list">
          <div class="side-list-head"><span>客户</span><span>${clients().length}</span></div>
          ${clients().map(x => {
            const p = WB.state.consult.sessions.filter(s => s.clientId === x.id && s.followUp && !s.followDone).length;
            return `<div class="side-item ${x.id === c.id ? 'active' : ''}" data-client="${x.id}">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.name)}</span>
              ${p ? `<span class="n" style="color:var(--amber);font-weight:600">${p}</span>` : ''}
            </div>`;
          }).join('')}
        </div>

        <div>
          <div class="card" style="margin-bottom:14px">
            <div class="card-head">
              <div>
                <h3 style="font-size:15px">${esc(c.name)} ${x1(c.company)}</h3>
                <div class="small muted" style="margin-top:2px">
                  ${esc(c.contact || '无联系方式')}${c.rate ? ` · 报价 ¥${Number(c.rate).toLocaleString()}${c.rateUnit || '/次'}` : ''}
                </div>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn sm" id="editClient">编辑</button>
                <button class="btn primary sm" id="addSession">${icon('plus', 13)} 记录一次沟通</button>
              </div>
            </div>
            ${c.note ? `<div style="padding:12px 16px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--ink-2);line-height:1.65;white-space:pre-wrap">${esc(c.note)}</div>` : ''}
            <div class="stat-row" style="border-top:1px solid var(--line)">
              <div class="stat"><div class="v num">${list.length}</div><div class="k">沟通次数</div></div>
              <div class="stat"><div class="v num">${(totalMin / 60).toFixed(1)}<span style="font-size:11px;color:var(--ink-3);font-weight:400"> 小时</span></div><div class="k">累计投入</div></div>
              <div class="stat"><div class="v num">¥${list.reduce((a, s) => a + (Number(s.fee) || 0), 0).toLocaleString()}</div><div class="k">累计费用</div></div>
              <div class="stat"><div class="v num" style="${pending.length ? 'color:var(--amber)' : ''}">${pending.length}</div><div class="k">待跟进</div></div>
            </div>
          </div>

          ${pending.length ? `<div class="card" style="margin-bottom:14px;border-color:#e8d9bf">
            <div class="card-head" style="background:var(--amber-soft)">
              <h3>待跟进</h3><span class="hint">${pending.length} 件</span>
            </div>
            ${pending.map(s => `<div class="line-item">
              <div class="grow">
                <div>${esc(s.topic || '（未填主题）')}</div>
                <div class="small muted">${s.nextAt ? '约定 ' + esc(s.nextAt) + ' 联系' : '还没约下次时间'}</div>
              </div>
              <button class="btn sm" data-done="${s.id}">已跟进</button>
              <button class="btn ghost icon sm" data-opensess="${s.id}">${icon('pen', 13)}</button>
            </div>`).join('')}
          </div>` : ''}

          <div class="card">
            <div class="card-head"><h3>沟通记录</h3><span class="hint">${list.length} 次</span></div>
            ${list.length ? list.map(s => `<div class="sess" data-sess="${s.id}" style="padding:12px 16px;border-bottom:1px solid #f1efe9;cursor:pointer">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline">
                <div style="font-weight:600;font-size:13px">${esc(s.topic || '（未填主题）')}</div>
                <div class="small muted num" style="white-space:nowrap">${esc(s.date || '')} · ${(Number(s.duration) || 0)} 分钟${s.fee ? ' · ¥' + Number(s.fee).toLocaleString() : ''}</div>
              </div>
              ${s.notes ? `<div style="margin-top:5px;font-size:12.5px;color:var(--ink-2);white-space:pre-wrap;line-height:1.65">${esc(s.notes)}</div>` : ''}
              <div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">
                ${s.followUp ? `<span class="tag ${s.followDone ? 'accent' : 'amber'}">${s.followDone ? '已跟进' : '待跟进' + (s.nextAt ? ' · ' + s.nextAt : '')}</span>` : ''}
                ${s.nextAt && !s.followUp ? `<span class="tag line">下次 ${esc(s.nextAt)}</span>` : ''}
              </div>
            </div>`).join('') : `<div class="empty"><b>还没有沟通记录</b>每次聊完顺手记三行，年底回看很有用</div>`}
          </div>
        </div>
      </div>
    </div>`;

    bind(root, c);
  }

  function x1(s) { return s ? `<span class="small muted" style="font-weight:400">· ${esc(s)}</span>` : ''; }

  function bind(root, c) {
    const wrap = WB.qs('.wrap', root);
    WB.qs('#newClient', wrap).addEventListener('click', () => editClient(null));
    WB.qs('#editClient', wrap).addEventListener('click', () => editClient(c));
    WB.qs('#addSession', wrap).addEventListener('click', () => editSession(null, c));

    WB.qsa('[data-client]', wrap).forEach(el => el.addEventListener('click', () => {
      cid = el.dataset.client; WB.refresh();
    }));

    wrap.addEventListener('click', e => {
      const d = e.target.closest('[data-done]');
      if (d) {
        const s = WB.state.consult.sessions.find(x => x.id === d.dataset.done);
        if (s) { s.followDone = true; WB.save(); WB.refresh(); WB.toast('已标记跟进完成'); }
        return;
      }
      const o = e.target.closest('[data-opensess]');
      if (o) {
        const s = WB.state.consult.sessions.find(x => x.id === o.dataset.opensess);
        if (s) editSession(s, c);
        return;
      }
      const s = e.target.closest('[data-sess]');
      if (s) {
        const item = WB.state.consult.sessions.find(x => x.id === s.dataset.sess);
        if (item) editSession(item, c);
      }
    });
  }

  function editClient(c) {
    const isNew = !c;
    const x = c || { id: WB.uid(), name: '', company: '', contact: '', note: '', rate: '', rateUnit: '/次', status: 'active' };
    WB.modal({
      title: isNew ? '新建客户' : '编辑客户',
      body: `
        <div class="row">
          <div class="field"><label>客户 / 姓名</label><input class="input" id="cName" value="${esc(x.name)}" maxlength="40"></div>
          <div class="field"><label>公司 / 项目</label><input class="input" id="cCompany" value="${esc(x.company || '')}" maxlength="60"></div>
        </div>
        <div class="row">
          <div class="field"><label>联系方式</label><input class="input" id="cContact" value="${esc(x.contact || '')}" placeholder="微信 / 手机 / 邮箱"></div>
          <div class="field"><label>报价</label><input type="number" class="input" id="cRate" value="${Number(x.rate) || ''}" placeholder="0"></div>
          <div class="field" style="flex:0 0 88px"><label>单位</label><select class="select" id="cRateUnit">
            ${['/次', '/小时', '/月', '/项目'].map(u => `<option ${u === (x.rateUnit || '/次') ? 'selected' : ''}>${u}</option>`).join('')}
          </select></div>
        </div>
        <div class="field"><label>背景备注</label><textarea class="textarea" id="cNote" rows="4" placeholder="对方在做什么、卡在哪、你最需要记住的事">${esc(x.note || '')}</textarea></div>
        ${isNew ? '' : `<button class="btn danger" id="delClient" style="align-self:flex-start">删除客户</button>`}`,
      okText: isNew ? '创建' : '保存',
      onMount: (body, close) => {
        const del = WB.qs('#delClient', body);
        if (del) del.addEventListener('click', async () => {
          const ok = await WB.confirm({ title: '删除客户', text: `「${x.name}」的沟通记录会一起删除，确定吗？`, danger: true, okText: '删除' });
          if (!ok) return;
          WB.state.consult.clients = WB.state.consult.clients.filter(y => y.id !== x.id);
          WB.state.consult.sessions = WB.state.consult.sessions.filter(s => s.clientId !== x.id);
          cid = null; WB.save(); WB.refresh(); close();
        });
      },
      onOk: body => {
        const name = WB.qs('#cName', body).value.trim();
        if (!name) { WB.toast('名字不能为空', true); return false; }
        x.name = name;
        x.company = WB.qs('#cCompany', body).value.trim();
        x.contact = WB.qs('#cContact', body).value.trim();
        x.rate = Number(WB.qs('#cRate', body).value) || '';
        x.rateUnit = WB.qs('#cRateUnit', body).value;
        x.note = WB.qs('#cNote', body).value;
        if (isNew) WB.state.consult.clients.push(x);
        cid = x.id;
        WB.save(); WB.refresh();
      }
    });
  }

  function editSession(s, client) {
    const isNew = !s;
    const x = s || {
      id: WB.uid(), clientId: client.id, clientName: client.name, date: today(),
      duration: 60, topic: '', notes: '', fee: '', followUp: false, followDone: false, nextAt: ''
    };
    WB.modal({
      title: isNew ? `记录沟通 · ${client.name}` : '编辑沟通记录',
      wide: true,
      body: `
        <div class="row">
          <div class="field"><label>日期</label><input type="date" class="input" id="sDate" value="${esc(x.date)}"></div>
          <div class="field"><label>时长（分钟）</label><input type="number" class="input" id="sDur" value="${Number(x.duration) || 0}" min="0" step="15"></div>
          <div class="field"><label>本次费用</label><input type="number" class="input" id="sFee" value="${Number(x.fee) || ''}" min="0" placeholder="可不填"></div>
        </div>
        <div class="field"><label>主题</label><input class="input" id="sTopic" value="${esc(x.topic || '')}" placeholder="这次聊了什么" maxlength="120"></div>
        <div class="field"><label>纪要 / 结论</label><textarea class="textarea" id="sNotes" rows="5" placeholder="对方的问题、你给的方案、需要你后续做的事">${esc(x.notes || '')}</textarea></div>
        <div class="field" style="flex-direction:row;align-items:center;gap:10px">
          <div class="check ${x.followUp ? 'on' : ''}" id="sFollow"></div>
          <label style="font-size:13px;color:var(--ink)">需要跟进</label>
          <input type="date" class="input" id="sNext" value="${esc(x.nextAt || '')}" style="width:150px;margin-left:auto">
        </div>`,
      okText: isNew ? '记录' : '保存',
      onMount: body => {
        let on = !!x.followUp;
        const ck = WB.qs('#sFollow', body);
        ck.addEventListener('click', () => { on = !on; ck.classList.toggle('on', on); });
        body.dataset.follow = on ? '1' : '';
      },
      onOk: body => {
        const topic = WB.qs('#sTopic', body).value.trim();
        x.date = WB.qs('#sDate', body).value || today();
        x.duration = Number(WB.qs('#sDur', body).value) || 0;
        x.fee = Number(WB.qs('#sFee', body).value) || '';
        x.topic = topic;
        x.notes = WB.qs('#sNotes', body).value;
        x.followUp = WB.qs('#sFollow', body).classList.contains('on');
        x.nextAt = WB.qs('#sNext', body).value;
        x.clientName = client.name;
        if (isNew) WB.state.consult.sessions.unshift(x);
        else if (x.followUp === false) x.followDone = false;
        WB.save(); WB.refresh(); WB.toast(isNew ? '已记录' : '已保存');
      }
    });
  }

  WB.register('consult', { render });
})();
