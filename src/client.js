import React from 'react';
import { mountFormulaDisplay, parseMacros } from './core.js';
import katexCss from './katex-style.js';
export const inject = ['slots', 'configForms'];
export function apply(ctx) {
  const form = ctx.configForms.get('latex-macros');
  const style = document.createElement('style');
  style.textContent = katexCss;
  document.head.append(style);
  const display = mountFormulaDisplay(document);
  const update = () => {
    const snapshot = form.getSnapshot();
    try { display.update(parseMacros(snapshot.value?.macrosJson || '{}'), snapshot.status === 'ready' && snapshot.value?.enabled !== false); }
    catch { display.update({}, false); }
  };
  const unsubscribe = form.subscribe(update);
  update();
  function Settings() {
    const snapshot = React.useSyncExternalStore(listener => form.subscribe(listener), () => form.getSnapshot());
    const [draft, setDraft] = React.useState(snapshot.value?.macrosJson || '{}');
    const [revision, setRevision] = React.useState(snapshot.revision);
    const [dirty, setDirty] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    React.useEffect(() => { if (!dirty) { setDraft(snapshot.value?.macrosJson || '{}'); setRevision(snapshot.revision); } }, [snapshot, dirty]);
    async function save() {
      try {
        parseMacros(draft); setBusy(true); setMessage('');
        const ok = await form.mutate([{ op: 'set', path: ['macrosJson'], value: draft }], revision);
        if (ok) { setDirty(false); setMessage('已保存，当前回答中的公式已更新。'); }
        else setMessage('保存未接受（配置可能已改变）。草稿保留，请重新打开设置后重试。');
      } catch (e) { setMessage(String(e.message || e)); }
      finally { setBusy(false); }
    }
    const e = React.createElement;
    return e('section', { style: { padding: 20, maxWidth: 720 } },
      e('h2', null, 'LaTeX 自定义宏'),
      e('p', null, '只改变助手公式的显示，不修改回答原文。使用 JSON 字符串映射；参数写作 #1、#2。'),
      e('label', null, e('input', { type: 'checkbox', checked: snapshot.value?.enabled !== false, disabled: busy || !snapshot.writable, onChange: async event => { try { const ok = await form.set('enabled', event.target.checked); if (!ok) setMessage('开关保存失败'); } catch (e) { setMessage(String(e)); } } }), ' 启用宏渲染'),
      e('pre', null, '{ "\\\\RR": "\\\\mathbb{R}", "\\\\vect": "\\\\mathbf{#1}" }'),
      e('textarea', { 'aria-label': '自定义 LaTeX 宏 JSON', rows: 10, spellCheck: false, value: draft, style: { display: 'block', width: '100%', fontFamily: 'monospace', padding: 8 }, onChange: event => { setDraft(event.target.value); setDirty(true); } }),
      e('button', { disabled: busy || !snapshot.writable || snapshot.status !== 'ready', onClick: save, style: { marginTop: 12 } }, busy ? '保存中…' : '保存'),
      e('p', { role: 'status' }, message),
      e('p', null, '暂不支持 LaTeX 宏包。无法安全重渲染时保留 DSH 原显示；流式回答沿用宿主完成后渲染的节奏。'));
  }
  ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'latex-macros', order: 85, label: 'LaTeX 宏' }, Settings)));
  ctx.effect(() => () => { unsubscribe(); display.dispose(); style.remove(); });
}
