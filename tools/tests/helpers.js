/** 验收测试共用操作 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitMaskGone(page, timeout = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if ((await page.count('.modal-mask')) === 0) return;
    await sleep(80);
  }
  throw new Error('弹窗未关闭');
}

/** 点击最上层弹窗的"确定"并等它关闭 */
async function modalOk(page) {
  await page.eval(`
    const masks = [...document.querySelectorAll('.modal-mask')];
    const m = masks[masks.length - 1];
    if (!m) throw new Error('没有弹窗');
    const b = m.querySelector('[data-ok]');
    if (!b) throw new Error('弹窗没有确定按钮');
    b.click(); return true;`);
  await waitMaskGone(page);
}

/** 触发确认框（二次确认）并点确定 */
async function confirmOk(page) { return modalOk(page); }

/** 关闭所有残余弹窗 */
async function escapeAll(page) {
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return true;`);
  await sleep(120);
}

/** 给无监听的输入框/下拉直接赋值（保存时才读值） */
async function val(page, sel, v) {
  await page.eval(`
    const e = document.querySelector(${JSON.stringify(sel)});
    if (!e) throw new Error('找不到元素 ' + ${JSON.stringify(sel)});
    e.value = ${JSON.stringify(String(v))}; return true;`);
}

/** 赋值并触发 input 事件（用于有实时监听的控件） */
async function valInput(page, sel, v) {
  await page.eval(`
    const e = document.querySelector(${JSON.stringify(sel)});
    if (!e) throw new Error('找不到元素 ' + ${JSON.stringify(sel)});
    e.value = ${JSON.stringify(String(v))};
    e.dispatchEvent(new Event('input', { bubbles: true })); return true;`);
}

/** 赋值并触发 change 事件 */
async function valChange(page, sel, v) {
  await page.eval(`
    const e = document.querySelector(${JSON.stringify(sel)});
    if (!e) throw new Error('找不到元素 ' + ${JSON.stringify(sel)});
    e.value = ${JSON.stringify(String(v))};
    e.dispatchEvent(new Event('change', { bubbles: true })); return true;`);
}

async function waitToast(page, substr, timeout = 2500) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const txt = await page.eval(`
      const ts = [...document.querySelectorAll('.toast')];
      return ts.length ? ts[ts.length - 1].textContent : '';`);
    if (txt.includes(substr)) return txt;
    await sleep(100);
  }
  throw new Error('等待提示超时: ' + substr);
}

async function waitSaveState(page, substr, timeout = 2500) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const txt = await page.eval(`const e=document.querySelector('#saveState span'); return e ? e.textContent : '';`);
    if (txt.includes(substr)) return txt;
    await sleep(100);
  }
  throw new Error('等待保存状态超时: ' + substr);
}

/** 取某段文本在页面里出现的第一个元素的文本 */
async function bodyHas(page, substr) {
  return page.eval(`return document.body.innerText.includes(${JSON.stringify(substr)});`);
}

const ROOT = (() => {
  const path = require('path');
  return path.resolve(__dirname, '../..');
})();

module.exports = { sleep, modalOk, confirmOk, escapeAll, val, valInput, valChange, waitToast, waitSaveState, bodyHas, ROOT };
