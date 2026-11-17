/**
 * 个人工作生活台 —— 本地服务
 * 只监听 127.0.0.1，只读写本文件夹里的 data/data.json
 * 启动：node server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BASE_PORT = 5188;
const MAX_BACKUPS = 40;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function ensureDirs() {
  for (const d of [DATA_DIR, BACKUP_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

function pad(n) { return String(n).padStart(2, '0'); }
function stamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeStamp(d = new Date()) {
  return `${stamp(d)}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** 每天一次快照 + 保留最近 N 份 */
function dailyBackup(content) {
  try {
    const file = path.join(BACKUP_DIR, `data-${stamp()}.json`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, content, 'utf8');
    const list = fs.readdirSync(BACKUP_DIR)
      .filter(f => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort();
    while (list.length > MAX_BACKUPS) {
      fs.unlinkSync(path.join(BACKUP_DIR, list.shift()));
    }
  } catch (e) {
    console.error('[backup] 失败：', e.message);
  }
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) return null;
  return fs.readFileSync(DATA_FILE, 'utf8');
}

function writeData(text) {
  const prev = readData();
  if (prev) dailyBackup(prev);
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, DATA_FILE); // 原子替换，断电也不会写出半个文件
}

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('找不到文件：' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (p === '/api/info') {
    let size = 0, updated = null;
    try {
      const st = fs.statSync(DATA_FILE);
      size = st.size; updated = st.mtime;
    } catch (e) { /* 还没有数据文件 */ }
    return sendJSON(res, 200, {
      dataFile: DATA_FILE,
      backupDir: BACKUP_DIR,
      size, updated,
      backups: listBackups()
    });
  }

  if (p === '/api/data') {
    if (req.method === 'GET') {
      const text = readData();
      if (!text) return sendJSON(res, 200, { exists: false, data: null });
      try {
        return sendJSON(res, 200, { exists: true, data: JSON.parse(text) });
      } catch (e) {
        return sendJSON(res, 500, { error: '数据文件解析失败：' + e.message });
      }
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      let body = '';
      let tooBig = false;
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 30 * 1024 * 1024) { tooBig = true; req.destroy(); }
      });
      req.on('end', () => {
        if (tooBig) return;
        try {
          const parsed = JSON.parse(body);
          writeData(JSON.stringify(parsed, null, 2));
          return sendJSON(res, 200, { ok: true, savedAt: new Date().toISOString() });
        } catch (e) {
          return sendJSON(res, 400, { error: '保存失败：' + e.message });
        }
      });
      return;
    }
    res.writeHead(405); res.end(); return;
  }

  if (p === '/api/backups') return sendJSON(res, 200, { backups: listBackups() });

  if (p === '/api/restore' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { name } = JSON.parse(body);
        if (!/^data-\d{4}-\d{2}-\d{2}\.json$/.test(name)) throw new Error('文件名不合法');
        const src = path.join(BACKUP_DIR, name);
        if (!fs.existsSync(src)) throw new Error('备份不存在');
        const text = fs.readFileSync(src, 'utf8');
        JSON.parse(text); // 先验证
        const prev = readData();
        if (prev) fs.writeFileSync(path.join(BACKUP_DIR, `before-restore_${timeStamp()}.json`), prev, 'utf8');
        fs.writeFileSync(DATA_FILE, text, 'utf8');
        sendJSON(res, 200, { ok: true, data: JSON.parse(text) });
      } catch (e) {
        sendJSON(res, 400, { error: e.message });
      }
    });
    return;
  }

  if (p === '/api/export') {
    const text = readData() || '{}';
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="my-life-backup-${stamp()}.json"`
    });
    return res.end(text);
  }

  serveStatic(req, res, p);
});

function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const st = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: st.size, mtime: st.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch (e) { return []; }
}

function tryListen(port, attempt = 0) {
  server.once('error', err => {
    if (err.code === 'EADDRINUSE' && attempt < 10) {
      tryListen(port + 1, attempt + 1);
    } else {
      console.error('启动失败：', err.message);
      process.exit(1);
    }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    console.log('');
    console.log('  个人工作生活台已启动');
    console.log('  地址：' + url);
    console.log('  数据：' + DATA_FILE);
    console.log('  关闭这个窗口即可停止（数据已随时保存）');
    console.log('');
    if (!process.env.NO_OPEN) {
      exec(`start "" "${url}"`, { shell: 'cmd.exe' }, () => {});
    }
  });
}

ensureDirs();
tryListen(BASE_PORT);
