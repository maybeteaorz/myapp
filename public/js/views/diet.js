/* ================= 饮食计划 ================= */
(function () {
  const { esc, icon, today, addDays, fmtDate, calc } = WB;
  const MEALS = [
    { key: 'breakfast', label: '早餐', hint: '一天的开头' },
    { key: 'lunch', label: '午餐', hint: '' },
    { key: 'dinner', label: '晚餐', hint: '' },
    { key: 'snack', label: '加餐 / 零食', hint: '' }
  ];
  let date = today();

  function logOf(d, create) {
    if (!WB.state.diet.logs[d] && create) {
      WB.state.diet.logs[d] = { breakfast: [], lunch: [], dinner: [], snack: [], water: 0, note: '' };
    }
    return WB.state.diet.logs[d] || { breakfast: [], lunch: [], dinner: [], snack: [], water: 0, note: '' };
  }

  function render(root) {
    const day = calc.dietDay(date);
    const kcalGoal = WB.state.settings.kcalGoal || 2000;
    const proteinGoal = WB.state.settings.proteinGoal || 120;
    const waterGoal = WB.state.settings.waterGoal || 8;
    const pct = Math.min(100, Math.round(day.kcal / kcalGoal * 100));
    const left = kcalGoal - day.kcal;

    root.innerHTML = `<div class="wrap">
      <div class="page-head">
        <div>
          <h1>饮食计划</h1>
          <div class="sub">${esc(fmtDate(date))}　·　记吃了什么，比算得精准更重要</div>
        </div>
        <div class="head-actions">
          <div class="date-nav">
            <button class="btn icon" data-nav="-1">${icon('left', 15)}</button>
            <span class="cur">${esc(fmtDate(date, false))}</span>
            <button class="btn icon" data-nav="1">${icon('right', 15)}</button>
          </div>
          <button class="btn" id="backToday" ${date === today() ? 'disabled' : ''}>今天</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-pad" style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:240px">
            <div style="display:flex;align-items:baseline;gap:8px">
              <span class="num" style="font-size:26px;font-weight:650;letter-spacing:-.03em">${Math.round(day.kcal)}</span>
              <span class="muted small">/ ${kcalGoal} kcal</span>
              <span class="tag ${left < 0 ? 'danger' : 'line'}" style="margin-left:auto">${left < 0 ? '已超 ' + Math.abs(Math.round(left)) : '还剩 ' + Math.round(left)}</span>
            </div>
            <div class="bar" style="margin-top:9px;height:7px"><i style="width:${pct}%;background:${left < 0 ? 'var(--danger)' : 'var(--accent)'}"></i></div>
            <div style="display:flex;gap:18px;margin-top:10px;font-size:11.5px;color:var(--ink-3)">
              <span>蛋白 <b class="num" style="color:var(--ink-2)">${Math.round(day.protein)}</b> / ${proteinGoal}g</span>
              <span>碳水 <b class="num" style="color:var(--ink-2)">${Math.round(day.carb)}</b>g</span>
              <span>脂肪 <b class="num" style="color:var(--ink-2)">${Math.round(day.fat)}</b>g</span>
            </div>
          </div>
          <div style="flex:0 0 auto">
            <div class="small muted" style="margin-bottom:5px">喝水 ${day.water} / ${waterGoal} 杯</div>
            <div style="display:flex;gap:4px">
              ${Array.from({ length: waterGoal }, (_, i) => `
                <div data-water="${i + 1}" style="width:15px;height:24px;border-radius:4px;cursor:pointer;border:1px solid ${i < day.water ? 'var(--blue)' : 'var(--line-2)'};background:${i < day.water ? 'var(--blue-soft)' : 'transparent'}"></div>`).join('')}
            </div>
            <div class="small muted" style="margin-top:4px">点格子记一杯，再点同一格可减</div>
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1.5fr 1fr;align-items:start">
        <div>
          ${MEALS.map(m => {
            const items = logOf(date)[m.key] || [];
            const sum = items.reduce((a, x) => a + (Number(x.kcal) || 0), 0);
            return `<div class="card" style="margin-bottom:12px">
              <div class="card-head">
                <h3>${m.label}<span class="hint" style="margin-left:8px">${items.length ? Math.round(sum) + ' kcal' : ''}</span></h3>
                <button class="btn sm" data-add="${m.key}">${icon('plus', 12)} 添加</button>
              </div>
              ${items.length ? items.map((x, i) => `
                <div class="line-item">
                  <span class="grow">${esc(x.name)}</span>
                  <span class="sets">${x.qty ? esc(x.qty) + (x.unit || '份') : ''}</span>
                  <span class="num small" style="width:66px;text-align:right">${Math.round(Number(x.kcal) || 0)} kcal</span>
                  <button class="btn ghost icon sm" data-del="${m.key}:${i}" title="删除">${icon('trash', 12)}</button>
                </div>`).join('')
              : `<div class="empty" style="padding:16px">还没记${m.label}</div>`}
            </div>`;
          }).join('')}
        </div>

        <div class="card">
          <div class="card-head">
            <h3>食物库</h3>
            <button class="btn sm" id="newFood">${icon('plus', 12)} 新建</button>
          </div>
          <div style="padding:10px 12px;border-bottom:1px solid var(--line)">
            <input class="input" id="foodSearch" placeholder="搜一下常吃的">
          </div>
          <div id="foodList" style="max-height:420px;overflow:auto">${foodListHtml()}</div>
          <div class="small muted" style="padding:9px 14px;border-top:1px solid var(--line);line-height:1.55">
            新建食物时填「每份」的营养，添加时只填几份，热量自动算。
          </div>
        </div>
      </div>
    </div>`;

    bind(root, day);
  }

  function foodListHtml(kw) {
    const list = WB.state.diet.foods.filter(f => !kw || f.name.includes(kw));
    if (!list.length) {
      return `<div class="empty" style="padding:22px 14px">${WB.state.diet.foods.length ? '没有匹配的食物' : '还没有食物，先建几个常吃的'}</div>`;
    }
    return list.map(f => `<div class="line-item" style="padding:8px 14px">
      <span class="grow">${esc(f.name)}</span>
      <span class="num small muted">${f.kcal} kcal</span>
      <span class="num small muted" style="width:52px;text-align:right">${f.protein || 0}g 蛋白</span>
      <button class="btn ghost icon sm" data-editfood="${f.id}">${icon('pen', 12)}</button>
    </div>`).join('');
  }

  function bind(root, day) {
    const wrap = WB.qs('.wrap', root);
    WB.qsa('[data-nav]', wrap).forEach(b => b.addEventListener('click', () => {
      date = addDays(date, Number(b.dataset.nav)); WB.refresh();
    }));
    WB.qs('#backToday', wrap).addEventListener('click', () => { date = today(); WB.refresh(); });

    WB.qsa('[data-water]', wrap).forEach(el => el.addEventListener('click', () => {
      const n = Number(el.dataset.water);
      const log = logOf(date, true);
      log.water = log.water === n ? n - 1 : n;
      WB.save(); WB.refresh();
    }));

    WB.qsa('[data-add]', wrap).forEach(el => el.addEventListener('click', () => addFood(el.dataset.add)));
    WB.qsa('[data-del]', wrap).forEach(el => el.addEventListener('click', () => {
      const [meal, idx] = el.dataset.del.split(':');
      const log = logOf(date, true);
      log[meal].splice(Number(idx), 1);
      WB.save(); WB.refresh();
    }));

    const search = WB.qs('#foodSearch', wrap);
    search.addEventListener('input', () => {
      WB.qs('#foodList', wrap).innerHTML = foodListHtml(search.value.trim());
      bindFoodList(root);
    });
    WB.qs('#newFood', wrap).addEventListener('click', () => editFood(null));
    bindFoodList(root);
  }

  function bindFoodList(root) {
    WB.qsa('[data-editfood]', root).forEach(el => el.addEventListener('click', () => {
      editFood(WB.state.diet.foods.find(f => f.id === el.dataset.editfood));
    }));
  }

  function addFood(mealKey) {
    const foods = WB.state.diet.foods;
    if (!foods.length) {
      WB.toast('先去右边食物库建一个常吃的食物', true);
      return;
    }
    let selected = foods[0];
    WB.modal({
      title: `添加到${MEALS.find(m => m.key === mealKey).label}`,
      body: `
        <div class="field"><label>选择食物</label>
          <input class="input" id="aSearch" placeholder="搜索" style="margin-bottom:7px">
          <div id="aList" style="max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:8px"></div>
        </div>
        <div class="row">
          <div class="field"><label>几份</label><input type="number" step="0.5" class="input" id="aQty" value="1" min="0.1"></div>
          <div class="field" style="flex:2"><label>预计</label>
            <div class="input" id="aPreview" style="background:var(--panel-2);color:var(--ink-2)">—</div></div>
        </div>`,
      okText: '添加',
      onMount: (body) => {
        const list = WB.qs('#aList', body);
        const qty = WB.qs('#aQty', body);
        const prev = WB.qs('#aPreview', body);
        const paint = (kw) => {
          const arr = foods.filter(f => !kw || f.name.includes(kw));
          list.innerHTML = arr.length ? arr.map(f => `
            <div class="line-item" data-pick="${f.id}" style="cursor:pointer;padding:8px 11px;${f.id === selected.id ? 'background:var(--accent-soft)' : ''}">
              <span class="grow" style="font-size:12.5px">${esc(f.name)}</span>
              <span class="num small muted">${f.kcal}/份</span>
            </div>`).join('') : `<div class="empty" style="padding:16px">没有匹配</div>`;
          WB.qsa('[data-pick]', list).forEach(el => el.addEventListener('click', () => {
            selected = foods.find(f => f.id === el.dataset.pick);
            WB.qsa('[data-pick]', list).forEach(x => x.style.background = 'transparent');
            el.style.background = 'var(--accent-soft)';
            update();
          }));
        };
        const update = () => {
          const q = Number(qty.value) || 0;
          prev.textContent = `${Math.round(selected.kcal * q)} kcal · 蛋白 ${(Math.round((selected.protein || 0) * q * 10) / 10)}g`;
        };
        paint('');
        update();
        WB.qs('#aSearch', body).addEventListener('input', e => paint(e.target.value.trim()));
        qty.addEventListener('input', update);
      },
      onOk: body => {
        const q = Number(WB.qs('#aQty', body).value) || 0;
        if (!q) { WB.toast('份数要大于 0', true); return false; }
        const log = logOf(date, true);
        log[mealKey].push({
          id: WB.uid(), name: selected.name, qty: q, unit: selected.unit || '份',
          kcal: (selected.kcal || 0) * q,
          protein: (selected.protein || 0) * q,
          carb: (selected.carb || 0) * q,
          fat: (selected.fat || 0) * q
        });
        WB.save(); WB.refresh();
      }
    });
  }

  function editFood(f) {
    const isNew = !f;
    const x = f || { id: WB.uid(), name: '', unit: '份', kcal: '', protein: '', carb: '', fat: '' };
    WB.modal({
      title: isNew ? '新建食物' : '编辑食物',
      body: `
        <div class="row">
          <div class="field" style="flex:2"><label>名称</label><input class="input" id="fName" value="${esc(x.name)}" placeholder="鸡胸肉 / 米饭" maxlength="30"></div>
          <div class="field"><label>单位</label><select class="select" id="fUnit">
            ${['份', '克', '个', '杯', '碗'].map(u => `<option ${u === (x.unit || '份') ? 'selected' : ''}>${u}</option>`).join('')}
          </select></div>
        </div>
        <div class="small muted">下面填每 1 个单位的营养</div>
        <div class="row">
          <div class="field"><label>热量 kcal</label><input type="number" class="input" id="fKcal" value="${Number(x.kcal) || ''}" min="0"></div>
          <div class="field"><label>蛋白 g</label><input type="number" class="input" id="fPro" value="${Number(x.protein) || ''}" min="0"></div>
        </div>
        <div class="row">
          <div class="field"><label>碳水 g</label><input type="number" class="input" id="fCarb" value="${Number(x.carb) || ''}" min="0"></div>
          <div class="field"><label>脂肪 g</label><input type="number" class="input" id="fFat" value="${Number(x.fat) || ''}" min="0"></div>
        </div>
        ${isNew ? '' : `<button class="btn danger" id="delFood" style="align-self:flex-start">删除这个食物</button>`}`,
      okText: isNew ? '创建' : '保存',
      onMount: (body, close) => {
        const del = WB.qs('#delFood', body);
        if (del) del.addEventListener('click', () => {
          WB.state.diet.foods = WB.state.diet.foods.filter(y => y.id !== x.id);
          WB.save(); WB.refresh(); close();
        });
      },
      onOk: body => {
        const name = WB.qs('#fName', body).value.trim();
        if (!name) { WB.toast('名称不能为空', true); return false; }
        x.name = name;
        x.unit = WB.qs('#fUnit', body).value;
        x.kcal = Number(WB.qs('#fKcal', body).value) || 0;
        x.protein = Number(WB.qs('#fPro', body).value) || 0;
        x.carb = Number(WB.qs('#fCarb', body).value) || 0;
        x.fat = Number(WB.qs('#fFat', body).value) || 0;
        if (isNew) WB.state.diet.foods.push(x);
        WB.save(); WB.refresh();
      }
    });
  }

  WB.register('diet', { render });
})();
