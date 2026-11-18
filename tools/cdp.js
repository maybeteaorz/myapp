/**
 * 极简 CDP 驱动：用 Edge/Chrome 的 DevTools 协议做真实浏览器交互测试。
 * 只用 Node 内置模块（Node 22 自带全局 WebSocket），不引入任何依赖。
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

function findBrowser() {
  for (const p of CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error('找不到 Edge/Chrome');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function httpJSON(url, timeout = 5000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    return await r.json();
  } finally { clearTimeout(t); }
}

class Page {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.consoleErrors = [];
    ws.addEventListener('message', ev => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        const desc = d.exception && (d.exception.description || d.exception.value);
        this.consoleErrors.push(((d.text || 'exception') + (desc && desc !== d.text ? ' :: ' + String(desc).split('\n').slice(0, 3).join(' | ') : '')).trim());
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleErrors.push(msg.params.args.map(a => a.value ?? a.description ?? '').join(' '));
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('CDP 超时: ' + method)); }
      }, 15000);
    });
  }

  async init() {
    await this.send('Runtime.enable');
    await this.send('Page.enable');
  }

  /** 执行表达式，返回值（支持 Promise） */
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', {
      expression: `(async()=>{${expr}})()`,
      awaitPromise: true,
      returnByValue: true
    });
    if (r.exceptionDetails) {
      throw new Error('页面执行出错: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    }
    return r.result.value;
  }

  async goto(url) {
    // 每次都带唯一参数，确保是真正的新文档加载（同文档哈希跳转不会重新拉数据）。
    // 参数必须拼在 # 之前，否则会污染路由哈希。
    const [base, hash] = url.split('#');
    const full = base + (base.includes('?') ? '&' : '?') + '_=' + Date.now() + (hash ? '#' + hash : '');
    await this.send('Page.navigate', { url: full });
    await sleep(150);
    await this.waitFor(
      'location.hash === ' + JSON.stringify(hash ? '#' + hash : '') +
      ' && document.readyState === "complete" && !!document.querySelector("#app .wrap") && !!window.WB && !!window.WB.state',
      10000
    );
  }

  async reload() {
    await this.send('Page.reload', { ignoreCache: true });
    await sleep(150);
    await this.waitFor(
      'document.readyState === "complete" && !!document.querySelector("#app .wrap") && !!window.WB && !!window.WB.state',
      10000
    );
  }

  async waitFor(expr, timeout = 5000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try {
        if (await this.eval(`return !!(${expr});`)) return true;
      } catch { /* 页面可能正在跳转 */ }
      await sleep(80);
    }
    throw new Error(`等待超时: ${expr}`);
  }

  async text(sel) {
    return this.eval(`const e=document.querySelector(${JSON.stringify(sel)});return e?e.innerText:null;`);
  }

  async count(sel) {
    return this.eval(`return document.querySelectorAll(${JSON.stringify(sel)}).length;`);
  }

  async click(sel, index = 0) {
    const ok = await this.eval(`
      const els=[...document.querySelectorAll(${JSON.stringify(sel)})];
      const el=els[${index}];
      if(!el) return false;
      el.scrollIntoView({block:'center'});
      el.click();
      return true;`);
    if (!ok) throw new Error('点击失败，元素不存在: ' + sel + '[' + index + ']');
    await sleep(120);
  }

  /** 在输入框里填入并回车 */
  async fill(sel, value, enter = false) {
    await this.eval(`
      const el=document.querySelector(${JSON.stringify(sel)});
      if(!el) throw new Error('找不到输入框');
      el.focus();
      el.value=${JSON.stringify(String(value))};
      el.dispatchEvent(new Event('input',{bubbles:true}));`);
    if (enter) await this.press(sel, 'Enter');
    await sleep(80);
  }

  async press(sel, key) {
    await this.eval(`
      const el=document.querySelector(${JSON.stringify(sel)});
      el.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(key)},bubbles:true}));`);
    await sleep(80);
  }

  async shot(file) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    return file;
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: false
    });
    await sleep(120);
  }
}

async function launch(opts = {}) {
  const exe = findBrowser();
  const port = opts.port || 9333;
  const dir = path.join(os.tmpdir(), 'edge-cdp-' + port);
  fs.rmSync(dir, { recursive: true, force: true });
  const proc = spawn(exe, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${dir}`,
    `--window-size=${opts.width || 1440},${opts.height || 950}`,
    'about:blank'
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await httpJSON(`http://127.0.0.1:${port}/json/list`, 1500);
      if (targets && targets.length) break;
    } catch { /* 还没起来 */ }
    await sleep(200);
  }
  if (!targets || !targets.length) {
    proc.kill();
    throw new Error('浏览器调试端口未就绪');
  }
  const target = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  const page = new Page(ws);
  await page.init();

  return {
    page,
    async close() {
      try { ws.close(); } catch {}
      try { proc.kill(); } catch {}
      await sleep(200);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  };
}

module.exports = { launch, sleep };
