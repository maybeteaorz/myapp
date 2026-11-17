/** 测试数据构造与写入（通过真实 HTTP 接口，和界面用的是同一条路径） */
const BASE = process.env.BASE || 'http://127.0.0.1:5188';

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const addDays = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  const x = new Date(y, m - 1, d);
  x.setDate(x.getDate() + n);
  return ymd(x);
};

function blank() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    settings: { name: '', kcalGoal: 2000, proteinGoal: 120, waterGoal: 8 },
    memo: [], plan: {},
    media: { contents: [] },
    dev: { projects: [], tasks: [], bugs: [], snippets: [] },
    consult: { clients: [], sessions: [] },
    fitness: { templates: [], logs: [], body: [] },
    diet: { foods: [], logs: {} },
    games: { items: [], sessions: [] }
  };
}

/** 四类汇入来源各一条 + 三条"不该出现"的干扰数据 */
function fourSources() {
  const t = today(), tomorrow = addDays(t, 1);
  const d = blank();
  d.plan[t] = [
    { id: 'p1', text: '写脚本', start: '09:00', tag: '工作', prio: 1, done: false },
    { id: 'p2', text: '客户周会', start: '14:00', tag: '工作', prio: 0, done: true }
  ];
  d.dev.projects = [{ id: 'pr1', name: '测试项目', desc: '', status: 'active', color: '#2f6a63', repo: '' }];
  d.dev.tasks = [
    { id: 't1', projectId: 'pr1', title: '今天到期的任务', status: 'todo', prio: 1, due: t, note: '' },
    { id: 't2', projectId: 'pr1', title: '已完成的任务', status: 'done', prio: 1, due: t, note: '' },
    { id: 't3', projectId: 'pr1', title: '明天到期的任务', status: 'todo', prio: 1, due: tomorrow, note: '' }
  ];
  d.media.contents = [
    { id: 'm1', title: '今天要发的稿子', platform: '公众号', status: 'ready', body: '', publishAt: t, publishedAt: '', stats: {}, notes: '' },
    { id: 'm2', title: '今天已发布的稿子', platform: '公众号', status: 'published', body: '', publishAt: t, publishedAt: t, stats: {}, notes: '' }
  ];
  d.consult.clients = [{ id: 'c1', name: '陈总', company: '', contact: '', rate: 0, rateUnit: '/次', note: '', status: 'active' }];
  d.consult.sessions = [
    { id: 's1', clientId: 'c1', clientName: '陈总', date: t, duration: 60, topic: '诊断', notes: '', fee: 0, followUp: true, followDone: false, nextAt: t },
    { id: 's2', clientId: 'c1', clientName: '李总', date: t, duration: 30, topic: '', notes: '', fee: 0, followUp: true, followDone: true, nextAt: t }
  ];
  d.games.items = [
    { id: 'g1', title: '在玩的游戏', platform: 'Steam', status: 'playing', rating: 4, progress: 30, note: '' },
    { id: 'g2', title: '想玩的游戏', platform: 'Steam', status: 'wish', rating: '', progress: 0, note: '' }
  ];
  return d;
}

/** 首页勾选用的最小数据：两条计划，一条已完成 */
function planTwo() {
  const t = today();
  const d = blank();
  d.plan[t] = [
    { id: 'p1', text: '第一条', start: '09:00', tag: '工作', prio: 0, done: true },
    { id: 'p2', text: '第二条', start: '10:00', tag: '工作', prio: 0, done: false }
  ];
  return d;
}

/** 超长文本：连续 200 个无空格字符 + 200 个汉字 */
function longText() {
  const t = today();
  const d = blank();
  const a = 'A'.repeat(200);
  const b = '这是很长的中文内容用来验证换行是否正常'.repeat(10).slice(0, 200);
  d.plan[t] = [
    { id: 'l1', text: a, start: '09:00', tag: '工作', prio: 0, done: false },
    { id: 'l2', text: b, start: '10:00', tag: '工作', prio: 0, done: false }
  ];
  return d;
}

async function put(data) {
  const r = await fetch(`${BASE}/api/data`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error('写入测试数据失败: ' + r.status);
  return r.json();
}

async function get() {
  const r = await fetch(`${BASE}/api/data`);
  return (await r.json()).data;
}

async function blankWrite() { return put(blank()); }

module.exports = { BASE, blank, fourSources, planTwo, longText, put, get, blankWrite, today, addDays, ymd };
