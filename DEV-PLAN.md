# 个人工作生活台 · v1 开发执行计划

| 项 | 内容 |
|---|---|
| 依据 | `PRD.md` v1.0（2026-11-17） |
| 计划版本 | v1.0 |
| 制定日期 | 2026-11-17 |
| 目标 | 关闭 v1 唯一缺口，跑完 64 条验收，交付一个可长期自用的干净版本 |
| 代码位置 | `D:\！学习用\app` |
| 技术栈 | Node 零依赖 http 服务 + 原生 JS/CSS，无构建 |
| 执行方式 | 按 T0 → T1 → T2 → T3 顺序，每个任务独立提交、独立可回滚 |

---

## 0. 现状核对（已逐文件读过代码，不是照抄记录）

### 0.1 完成度

PRD §8 的"必须完成"实际为 **45 条**（原文写"50 条"是笔误），当前 **44 条已完成，1 条未完成**：

| 项 | 位置 | 状态 |
|---|---|---|
| 首页"今日安排"下方显示其他模块汇入的只读条目 | `public/js/views/home.js` `render()` | ❌ 未做（PRD 6.5 已登记） |

PRD §10 的验收条目实际为 **64 条**（原文写"60 条"是笔误）。这两处数字在 T3.2 一并修正。

### 0.2 代码核查发现的 4 个问题（PRD 未记录，本次必须处理）

| 编号 | 问题 | 证据 | 影响 |
|---|---|---|---|
| D-1 | 首页勾选计划条目后，列表更新了，但**完成度圆环和"今天安排了 N 件事"不更新** | `home.js` `bindPlan()` 只重绘 `#homePlan` | 违反 PRD 3.1；用户会看到环和列表对不上，必须 F5 才恢复 |
| D-2 | **两套聚合逻辑并存**：`core.js` 的 `calc.todayAgenda()` 是死代码（全项目无引用），且**漏了"在玩"**、又多算了计划本身；真正的实现在 `plan.js` 的局部 `agenda()` | `core.js:343`、`plan.js:27` | 若直接复用 `todayAgenda()` 补首页，会漏掉 4 类来源中的"游戏娱乐"，且首页会重复显示计划条目 |
| D-3 | 时间线文本无断词规则，超长英文/无空格串会撑破卡片 | `style.css` `.tl-text` 只有 `flex:1;min-width:0`，无 `word-break` | 违反 PRD §10 M2 |
| D-4 | **项目没有版本控制** | `git status` 报 "not a repo" | 改坏无法回滚；本次要动核心文件，必须先建基线 |

### 0.3 其他已核实为"符合 PRD"的点（不用改）

- 数据写入：`data.json.tmp` 再 `rename`，原子替换（`server.js` `writeData`）
- 中文不转义、2 空格缩进（`JSON.stringify(parsed, null, 2)`）
- 每日快照：同一天只写一次，保留最近 40 份
- 端口占用自动 +1，最多 10 次；只监听 `127.0.0.1`
- 恢复接口用正则 `^data-\d{4}-\d{2}-\d{2}\.json$` 挡住路径穿越
- 全站输出走 `esc()`；`confirm` 的关闭路径已修为 resolve(false)
- 自动保存 350ms 防抖，左下角状态机三态齐全

---

## 1. 执行纪律（每个任务都按这套走）

1. **先基线后改动**：任何代码改动前，先跑一遍 §3.1 语法检查 + §3.3 渲染检查，确认起点是绿的。
2. **一个任务一个提交**：提交信息格式 `T1.1 calc.agenda 统一聚合来源`。改坏了 `git checkout -- <file>` 即可退。
3. **改完必须三件套**：`node --check` 通过 → 页面无头渲染无报错 → 对应 PRD 验收条目手点通过。
4. **不扩范围**：PRD 没写的功能一律不做，发现缺口记到 §6 问题清单，等确认。
5. **不碰真实数据**：测试用临时数据，测完按 §3.5 恢复成空白初始态；`data/` 进 `.gitignore`。
6. **改前端要防缓存**：服务已设 `Cache-Control: no-cache`，但改完仍用 `Ctrl+F5` 复核一次。

---

## 2. 任务清单

### 阶段 0：准备（3 个任务，无功能改动）

#### T0.1 建立版本控制基线
- **目的**：让后面所有改动可回滚（解决 D-4）。
- **步骤**：
  1. `cd "/d/！学习用/app" && git init`
  2. 写 `.gitignore`：`data/`、`node_modules/`、`*.tmp`
  3. `git add -A && git commit -m "baseline: PRD v1.0 已实现部分"`
- **完成判据**：`git log --oneline` 有一条基线；`git status` 干净；`data/` 未被跟踪。
- **注意**：`.gitignore` 必须在 `git add` 之前写好，否则个人数据会进版本库。

#### T0.2 固化检查脚本
- **目的**：把散在命令行的检查变成一个能重复跑的文件。
- **新建** `tools/check.sh`：
  ```bash
  #!/usr/bin/env bash
  cd "$(dirname "$0")/.." || exit 1
  fail=0
  for f in server.js public/js/core.js public/js/views/*.js; do
    node --check "$f" || { echo "语法错误: $f"; fail=1; }
  done
  [ $fail -eq 0 ] && echo "语法检查全部通过"
  exit $fail
  ```
- **新建** `tools/screenshot.sh`（逐个路由无头截图到 `tools/shots/`）：
  ```bash
  #!/usr/bin/env bash
  cd "$(dirname "$0")/.." || exit 1
  EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  mkdir -p tools/shots
  for r in home plan media dev consult fitness diet games settings; do
    "$EDGE" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
      --user-data-dir="/tmp/edge-wb" --virtual-time-budget=3500 \
      --window-size=1440,950 --screenshot="tools/shots/$r.png" \
      "http://127.0.0.1:5188/#/$r" >/dev/null 2>&1
  done
  ls -la tools/shots
  ```
- **完成判据**：两个脚本 `bash tools/check.sh` 可跑通。
- **注意**：`tools/shots/` 加入 `.gitignore`。

#### T0.3 启动服务并建立数据快照
- **目的**：有一份可回退的数据，避免测试污染真实使用。
- **步骤**：`cp data/data.json tools/data-before-test.json`（若为空则跳过）；`NO_OPEN=1 node server.js` 后台启动。
- **完成判据**：`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5188/` 返回 200。
- **回归**：无。

---

### 阶段 1：关闭 v1 缺口（关键路径，5 个任务）

#### T1.1 统一聚合来源 `calc.agenda(date)`（解决 D-2）
- **文件**：`public/js/core.js`（`calc` 对象内，替换 `todayAgenda()`）
- **做法**：把 `plan.js` 的 `agenda()` 原样上移，严格按 PRD §6.2 四类来源：
  ```js
  agenda(date) {
    const out = [];
    state.dev.tasks.filter(t => t.status !== 'done' && t.due === date)
      .forEach(t => out.push({ src: '开发任务', text: t.title, go: 'dev' }));
    state.media.contents.filter(c => c.status !== 'published' && c.publishAt === date)
      .forEach(c => out.push({ src: '待发布', text: c.title, go: 'media' }));
    state.consult.sessions.filter(s => s.followUp && !s.followDone && s.nextAt === date)
      .forEach(s => out.push({ src: '客户跟进', text: s.clientName || s.topic || '', go: 'consult' }));
    if (date === today()) state.games.items.filter(i => i.status === 'playing')
      .forEach(i => out.push({ src: '在玩', text: i.title, go: 'games' }));
    return out;
  }
  ```
- **同时删除** `todayAgenda()`（死代码，且口径错），避免以后被误用。
- **完成判据**：全项目搜 `todayAgenda` 无结果；`calc.agenda(today())` 返回 4 类来源。
- **回归**：本任务不改 UI，页面表现应与改动前完全一致。

#### T1.2 今日计划页改用统一函数
- **文件**：`public/js/views/plan.js`
- **做法**：删除文件内 `agenda()`（约 27-39 行），第 46 行改 `const ag = WB.calc.agenda(planDate);`
- **完成判据**：计划页底部关联区内容、顺序、点击跳转与改动前逐条一致（含"在玩"仅今天出现）。
- **回归**：E5 / E6 / H3 / H4 四条验收。

#### T1.3 首页补只读汇入条（PRD §8.2 最后一条，核心交付）
- **文件**：`public/js/views/home.js`、`public/css/style.css`
- **做法**：
  1. `home.js` 新增：
     ```js
     function agendaHtml(ag) {
       if (!ag.length) return '';
       return `<div class="agenda-block">
         <div class="agenda-title">其他模块今天关联的事<span>只读，点击去处理</span></div>
         <div class="agenda-strip">${ag.map(a => `
           <div class="agenda-chip" data-go="${a.go}">
             <span class="src">${esc(a.src)}</span><span>${esc(a.text)}</span>
           </div>`).join('')}</div>
       </div>`;
     }
     ```
  2. 在 `render()` 里 `#homePlan` 之后插入 `${agendaHtml(calc.agenda(t))}`。
  3. `style.css` 补：
     ```css
     .agenda-block { border-top: 1px dashed #ece9e1; margin-top: 2px; }
     .agenda-title { padding: 10px 16px 0; font-size: 11px; color: var(--ink-3); display: flex; gap: 8px; }
     .agenda-title span { color: var(--ink-3); opacity: .75; }
     ```
- **关键点**：不要新增点击绑定。`render()` 末尾已有 `WB.qsa('[data-go]', root)` 统一绑定，新 chip 带 `data-go` 就自动生效。
- **完成判据**：
  - 四类来源各造一条（见 §3.4），首页今日安排下方出现 4 个 chip，分类前缀正确；
  - 点 chip 跳到对应模块；
  - 无关条目时整块不渲染（首页不留空壳）；
  - 计划页与首页显示的关联事项**完全一致**。
- **回归**：D1、D5、E5、E6、H3。

#### T1.4 首页勾选后同步圆环与条幅（解决 D-1）
- **文件**：`public/js/views/home.js`
- **做法**：新增 `paintHomePlan(root, arr)`，在 `bindPlan()` 的 toggle 分支里调用，一次更新三处：
  ```js
  function paintHomePlan(root, arr) {
    const done = arr.filter(x => x.done).length;
    const total = arr.length;
    const c = 2 * Math.PI * 20;
    const ring = WB.qs('#ringArc', root);
    if (ring) ring.setAttribute('stroke-dashoffset', (c * (1 - (total ? done / total : 0))).toFixed(1));
    const label = WB.qs('#ringLabel', root);
    if (label) label.textContent = `${done}/${total}`;
    const meta = WB.qs('.today-banner .meta', root);
    if (meta) meta.textContent = `${fmtDateFull(today())}　·　${total ? `今天安排了 ${total} 件事` : '今天还没有安排'}`;
  }
  ```
  配套：`ring()` 里给第二条 `<circle>` 加 `id="ringArc"`、`<text>` 加 `id="ringLabel"`。
- **完成判据**：首页直接勾一条 → 圆环弧长、中间数字、条幅文案三者同时变，不需要刷新；再取消勾选能还原。
- **回归**：D2、D3、D4，以及计划页进度条不受影响。

#### T1.5 长文本与徽标不撑破布局（解决 D-3）
- **文件**：`public/css/style.css`
- **做法**：
  ```css
  .tl-text { word-break: break-word; overflow-wrap: anywhere; }
  .agenda-chip { max-width: 100%; }
  .agenda-chip span:last-child { word-break: break-word; }
  ```
- **完成判据**：PRD M2 通过——200 字长文本、连续无空格英文串都不出现横向滚动条。
- **回归**：M4（1080px 两栏并一栏）。

#### T1.6 阶段 1 验收
- 跑 `bash tools/check.sh`；
- 按 §3.4 造四类数据 → 首页、计划页各截图一张 → 目检 chip 对齐、无溢出；
- 手点：首页勾选（圆环同步）、chip 跳转、计划页关联区、空数据态。
- **完成判据**：以上全过 → `git commit -m "T1 补齐首页汇入条目并统一聚合口径"`，PRD §8.2 第 6 条打勾。

---

### 阶段 2：全量验收（6 个批次，64 条）

> 逐条照 PRD §10 点一遍，结果记进 `docs/acceptance-v1.md`（✅/❌ + 备注）。❌ 的转阶段 3 修复，修完只复验该条及其影响面。

| 批次 | 覆盖 | 执行要点 |
|---|---|---|
| T2.1 | A1-A4、B1-B5 | 启动/刷新/双实例/快捷键；数据落盘与重启。B5 需重启电脑，标记为**人工隔日复验** |
| T2.2 | C1-C5 | 备份生成、数量一致、恢复留底、导出→清空→导入。C5 需连续两天，标记**隔日复验** |
| T2.3 | D1-D5、E1-E6 | 首页六卡跳转、完成度、备忘、"接下来"；计划页翻日/连加/编辑/关联区 |
| T2.4 | F1-F4、G1-G6、H1-H5 | 自媒体推进与筛选；项目/任务/bug/代码复制/级联删除；客户、沟通、销账、统计 |
| T2.5 | I1-I5、J1-J5、K1-K5 | 模板生成训练、打卡、体重趋势、连续天数；食物库、按份累加、饮水回退、超标标红；游戏进度与柱图 |
| T2.6 | L1-L4、M1-M5 | 设置联动；空标题拦截、长文本、`<script>` 转义、1080px 断点、多标签刷新 |

**执行顺序建议**：先 T2.3（覆盖刚改的首页/计划），确认改动没引入回归，再跑其余批次。

**每批次结束**：清掉本批次造的数据（§3.5），避免污染下一批次判断。

---

### 阶段 3：修复与交付（4 个任务）

#### T3.1 缺陷修复
- 按 T2 的 ❌ 清单逐条修，一条一提交。
- 修完只复验：该条 + 同批次中与它共用数据的条目。
- **完成判据**：`docs/acceptance-v1.md` 中 64 条全部 ✅（跨日的 A3/B5/C5 可标"待隔日复验"，但必须有等效验证记录，如手工改端口、手工改备份文件名测通）。

#### T3.2 PRD 回写
- §8：把"50 条"改"45 条"，最后一条打勾；
- §10：把"60 条"改"64 条"；
- §6.5"已知差距"改为"已补齐（v1.0.1）"，保留说明；
- 文档版本 v1.0 → v1.0.1，更新日期。

#### T3.3 交付清理
- 清空测试数据（§3.5），确保用户打开是干净初始态；
- 删除 `data/backups/` 下测试产生的快照；
- 确认 `.gitignore` 生效、`git status` 干净；
- 关掉所有后台 node 进程。

#### T3.4 使用说明（可选但建议）
- 新增 `README.md`：怎么启动、数据在哪、怎么备份、换电脑怎么迁（复制整个文件夹即可）、常见问题（端口占用、保存失败）。
- **说明**：PRD 未要求此文件，属于交付便利，不占验收条目。

---

### 阶段 4：v1.1（本次不执行，等确认）

PRD 附录三个待定项，确认前不动。若确认，按下表执行：

| 项 | 现状 | 若采纳的改动面 |
|---|---|---|
| 长表单改右侧抽屉 | 统一居中弹窗 | 新增 `.drawer` 样式 + `WB.drawer()` 组件；改 media 正文、consult 纪要、dev 代码三处弹窗调用 |
| 首页把"今日安排"提到摘要卡之上 | 摘要卡在上 | `home.js` 模板顺序调整 + 移动端单列顺序 |
| 计划页加"本周"视图 | 只有日视图 | `plan.js` 增加视图状态 + 7 天竖排渲染 + 跨日编辑；改动量最大，需单独排期 |

---

## 3. 可复制的命令清单

### 3.1 语法检查
```bash
cd "/d/！学习用/app" && bash tools/check.sh
```

### 3.2 启动 / 停止
```bash
cd "/d/！学习用/app" && NO_OPEN=1 node server.js   # 后台跑，测试用
# 停止：杀掉该进程，或直接在启动窗口按 Ctrl+C
```

### 3.3 渲染与健康检查
```bash
cd "/d/！学习用/app" && bash tools/screenshot.sh
curl -s -o /dev/null -w "index:%{http_code}\n" http://127.0.0.1:5188/
curl -s http://127.0.0.1:5188/api/info
```

### 3.4 造"四类汇入"测试数据
```bash
TODAY=$(date +%Y-%m-%d)
curl -s -X PUT -H "Content-Type: application/json" http://127.0.0.1:5188/api/data --data-binary @- <<EOF
{"version":1,"createdAt":"2026-11-17T00:00:00.000Z",
 "settings":{"name":"","kcalGoal":2000,"proteinGoal":120,"waterGoal":8},
 "memo":[],"plan":{},
 "media":{"contents":[{"id":"m1","title":"今天该发的稿子","platform":"公众号","status":"ready","body":"","publishAt":"$TODAY","publishedAt":"","stats":{},"notes":""}]},
 "dev":{"projects":[{"id":"p1","name":"测试项目","desc":"","status":"active","color":"#2f6a63","repo":""}],
        "tasks":[{"id":"t1","projectId":"p1","title":"今天到期的任务","status":"todo","prio":1,"due":"$TODAY","note":""}],
        "bugs":[],"snippets":[]},
 "consult":{"clients":[{"id":"c1","name":"陈总","company":"","contact":"","rate":0,"rateUnit":"/次","note":"","status":"active"}],
            "sessions":[{"id":"s1","clientId":"c1","clientName":"陈总","date":"$TODAY","duration":60,"topic":"","notes":"","fee":0,"followUp":true,"followDone":false,"nextAt":"$TODAY"}]},
 "fitness":{"templates":[],"logs":[],"body":[]},
 "diet":{"foods":[],"logs":{}},
 "games":{"items":[{"id":"g1","title":"在玩的游戏","platform":"Steam","status":"playing","rating":4,"progress":30,"note":""}],"sessions":[]}}
EOF
```
预期：首页与计划页各出现 4 个 chip（开发任务 / 待发布 / 客户跟进 / 在玩）。

### 3.5 恢复空白初始态（每批次验收后）
```bash
curl -s -X PUT -H "Content-Type: application/json" http://127.0.0.1:5188/api/data --data-binary \
'{"version":1,"createdAt":"2026-11-17T00:00:00.000Z","settings":{"name":"","kcalGoal":2000,"proteinGoal":120,"waterGoal":8},"memo":[],"plan":{},"media":{"contents":[]},"dev":{"projects":[],"tasks":[],"bugs":[],"snippets":[]},"consult":{"clients":[],"sessions":[]},"fitness":{"templates":[],"logs":[],"body":[]},"diet":{"foods":[],"logs":{}},"games":{"items":[],"sessions":[]}}'
```

### 3.6 逻辑断言（不开浏览器，直接验口径）
```bash
cd "/d/！学习用/app" && node - <<'EOF'
const fs = require('fs');
global.window = { addEventListener() {}, location: { hash: '' } };
global.location = { hash: '' };
global.document = { addEventListener() {}, querySelector: () => null };
const _f = globalThis.fetch;
global.fetch = (u, o) => _f('http://127.0.0.1:5188' + u, o);
eval(fs.readFileSync('public/js/core.js', 'utf8'));
(async () => {
  await WB.load();
  const t = WB.today();
  const ag = WB.calc.agenda(t);
  const srcs = [...new Set(ag.map(a => a.src))].sort();
  console.log('来源:', srcs.join(','));
  console.assert(srcs.includes('开发任务'), '缺开发任务');
  console.assert(srcs.includes('待发布'), '缺待发布');
  console.assert(srcs.includes('客户跟进'), '缺客户跟进');
  console.assert(srcs.includes('在玩'), '缺在玩');
  const other = WB.addDays(t, 1);
  console.assert(!WB.calc.agenda(other).some(a => a.src === '在玩'), '在玩应只在今天出现');
  console.log('聚合断言通过');
})();
EOF
```

---

## 4. 验收记录表（照抄到 `docs/acceptance-v1.md` 逐条勾）

**A 启动与运行（4）**
- [ ] A1 双击 `启动.bat` → 黑窗提示 + 自动开浏览器 + 九入口
- [ ] A2 刷新 → 停在原页面
- [ ] A3 服务开着再双击一次 → 换 5189 并正常打开（**需双实例**）
- [ ] A4 `Alt+1`…`Alt+9` → 九模块依次切换、导航高亮

**B 数据不丢（5）**
- [ ] B1 加一条 → 1 秒内"已保存 HH:MM"
- [ ] B2 F5 → 该条仍在
- [ ] B3 关浏览器 + 关黑窗 + 重启 → 仍在
- [ ] B4 记事本打开 `data.json` → 能看到、中文不乱码
- [ ] B5 重启电脑 → 数据完整（**需重启**）

**C 备份与恢复（5）**
- [ ] C1 首次保存后 `data/backups` 出现 `data-YYYY-MM-DD.json`
- [ ] C2 设置页备份数与目录文件数一致
- [ ] C3 点"恢复" → 二次确认 + 数据回退 + 新增 `before-restore_*.json`
- [ ] C4 导出 → 清空 → 导入 → 数据完整
- [ ] C5 连续两天 → 备份 ≥ 2 份（**需隔日**，可手工改文件名等效验证）

**D 首页（5）**
- [ ] D1 六张摘要卡各自跳对模块
- [ ] D2 计划页勾一条回首页 → 分母不变、分子 +1
- [ ] D3 备忘回车即存、刷新仍在
- [ ] D4 勾选备忘 → 划线保留、"未处理"减 1
- [ ] D5 不填称呼 → 问候语无空逗号
- [ ] D6 **新增** 今日安排下方 4 类汇入 chip 齐、可跳转（T1.3）
- [ ] D7 **新增** 首页勾选 → 圆环与条幅同步（T1.4）

**E 今日计划（6）**
- [ ] E1 前一天/后一天/选日期 → 数据不串
- [ ] E2 连按回车加三条 → 默认下一整点、自动回焦
- [ ] E3 点文字编辑 → 卡片立即更新
- [ ] E4 勾两条 → 完成数、百分比、进度条一致
- [ ] E5 开发任务截止今天未完成 → 关联区出现
- [ ] E6 自媒体计划发布今天未发 → 关联区出现

**F 自媒体（4）**
- [ ] F1 新建 → 落"选题"列
- [ ] F2 连点三次推进 → 逐列右移，发布自动补日期
- [ ] F3 改标题/阅读数 → 卡片与平均阅读同步
- [ ] F4 平台筛选 → 只显示该平台

**G 开发工作（6）**
- [ ] G1 空态新建项目 → 自动选中、出现三页签
- [ ] G2 在"进行中"列添加 → 落在该列
- [ ] G3 截止日设昨天 → 显示"已逾期"
- [ ] G4 Bug 改已修复 → 计数 -1
- [ ] G5 代码备忘复制 → 粘贴完整
- [ ] G6 删项目 → 二次确认 + 任务/bug/代码一并消失

**H 咨询工作（5）**
- [ ] H1 新建客户 → 左侧出现、四项统计为 0
- [ ] H2 记 90 分钟 / 1500 元 → 工时与收入同步增
- [ ] H3 勾跟进 + 下次日期今天 → 待跟进 +1、计划关联区出现
- [ ] H4 点"已跟进" → 待跟进 -1、关联区消失
- [ ] H5 删客户 → 沟通记录一并消失

**I 健身计划（5）**
- [ ] I1 模板两动作 → 摘要显示"组×次 @重量"
- [ ] I2 "开始训练" → 今日卡生成；重复点提示已有记录
- [ ] I3 勾两动作改时长 50 → 进度与本週时长同步
- [ ] I4 记两次体重 → 出折线；只一次显示提示
- [ ] I5 连续两天训练 → 连续打卡 2

**J 饮食计划（5）**
- [ ] J1 新建"米饭 232 kcal/碗" → 可搜到
- [ ] J2 午餐 2 份 → 该餐 464、顶部同步
- [ ] J3 点第 5 格水 → 5/8；再点回 4/8
- [ ] J4 超目标 → 标红 + "已超 x"
- [ ] J5 切昨天加一条 → 今天不受影响

**K 游戏娱乐（5）**
- [ ] K1 设为在玩 → 出现在在玩卡区
- [ ] K2 +30 分 → 累计与柱图同步
- [ ] K3 进度拖 60% → 卡片与条同步
- [ ] K4 已通关点"重玩" → 回在玩
- [ ] K5 删时长记录 → 周合计与柱图减

**L 设置（4）**
- [ ] L1 填"阿泽" → 首页"早上好，阿泽"
- [ ] L2 热量目标 1800 → 饮食页分母重算
- [ ] L3 数据概览与各模块条目数一致
- [ ] L4 清空 → 各模块空、称呼与目标保留

**M 边界与健壮性（5）**
- [ ] M1 标题留空 → 拦截、弹窗不关
- [ ] M2 200 字长文本 → 正常换行不撑破（T1.5）
- [ ] M3 输入 `<script>alert(1)</script>` → 原样显示
- [ ] M4 窗口 1080px → 两栏并一栏、无横向滚动
- [ ] M5 一处改、另一处刷新 → 显示最新值

---

## 5. 风险与对策

| 风险 | 触发条件 | 对策 |
|---|---|---|
| 双实例互相覆盖 | 同时开 5188 和 5189 两个窗口改数据 | 后写者覆盖前者。**使用约定：只开一个窗口**。若要根治，需改 PRD A3（第二实例只跳转到已有实例），本次不做 |
| 聚合口径再次分裂 | 以后有人另写一份 `agenda()` | T1.1 后只保留 `calc.agenda()`；代码审查要求凡"当天关联事项"必须调它 |
| `before-restore_*.json` 无限堆积 | 频繁恢复 | 现状不参与 40 份清理。建议 v1.1 加独立上限 10 份；本次先手动清理 |
| 测试数据残留 | 验收后忘了清 | 每批次结束执行 §3.5，交付前 T3.3 再核一次 |
| 跨零点不刷新 | 页面通宵开着，次日仍显示昨天 | PRD 未要求。若你希望，可加"每分钟检查日期变化自动刷新"（约 8 行），需确认后做 |
| 无服务端 schema 校验 | 手改 `data.json` 写坏结构 | 客户端导入校验 `version` + `load()` 补字段兜底；服务端保持宽松。改坏时用备份恢复 |

---

## 6. 问题清单（发现但不擅自做，等确认）

1. PRD §8 条目数 45（非 50）、§10 条目数 64（非 60）——T3.2 修正，无需确认。
2. `before-restore` 备份是否也要限份数？（建议：10 份）
3. A3"两个窗口都能用"与"后写覆盖"存在冲突，是否改为"第二实例只跳转"？
4. 跨零点自动刷新要不要加？
5. v1.1 三个待定项（抽屉 / 首页顺序 / 周视图）何时启动？

---

## 7. 交付物

| 文件 | 说明 |
|---|---|
| `public/js/core.js` | 新增 `calc.agenda()`，删除死代码 `todayAgenda()` |
| `public/js/views/plan.js` | 改为调用统一聚合函数 |
| `public/js/views/home.js` | 汇入条渲染 + 勾选同步圆环 |
| `public/css/style.css` | `.agenda-block` 系列 + 断词规则 |
| `tools/check.sh`、`tools/screenshot.sh` | 可重复的检查脚本 |
| `docs/acceptance-v1.md` | 64 条验收记录 |
| `PRD.md` | v1.0.1，条目数与勾选修正 |
| `README.md` | 使用与迁移说明（可选） |

---

## 8. 本次明确不做

- 不新增任何 PRD 之外的功能（含搜索、拖拽、暗色、图表导出）
- 不改数据文件结构（不改 `version`，不迁移字段）
- 不引入任何第三方依赖（保持零依赖、无构建）
- 不动 v1.1 的三个待定项
