import katex from 'katex';
export function parseMacros(json) {
  const value = JSON.parse(json || '{}');
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('宏必须是 JSON 对象');
  const result = Object.create(null);
  for (const [name, expansion] of Object.entries(value)) {
    if (!/^\\[A-Za-z]+$/.test(name) || typeof expansion !== 'string') throw new Error('宏名须为反斜线加英文字母，展开式须为字符串');
    result[name] = expansion;
  }
  return result;
}
export function renderFormula(tex, displayMode, macros) {
  return katex.renderToString(tex, { displayMode, macros: { ...macros }, throwOnError: true, strict: 'ignore', trust: false, maxExpand: 1000 });
}
/** Own only sibling display nodes. Never replace React-owned children or message data. */
export function mountFormulaDisplay(doc, initial = {}) {
  const view = doc.defaultView;
  let macros = initial, enabled = true, disposed = false, timer = null;
  const entries = new Map();
  const marker = 'data-dsh-latex-macros-output';
  const hidden = 'data-dsh-latex-macros-hidden';
  const style = doc.createElement('style');
  style.textContent = `[${hidden}]{display:none!important}`;
  doc.head.append(style);
  function restore(original, entry) {
    original.removeAttribute(hidden);
    entry.output.remove();
    entries.delete(original);
  }
  function scan() {
    timer = null;
    if (disposed) return;
    for (const [original, entry] of entries) {
      const currentFormula = original.matches('.katex') ? original : original.matches('.katex-display') ? original.querySelector(':scope > .katex') : null;
      if (!currentFormula?.querySelector('annotation[encoding="application/x-tex"]') || original.nextSibling !== entry.output || !original.isConnected || !original.closest('[data-chat-flow-kind="assistant-step"]') || !entry.output.isConnected || !enabled || !Object.keys(macros).length) restore(original, entry);
    }
    if (!enabled || !Object.keys(macros).length) return;
    for (const formula of doc.querySelectorAll('[data-chat-flow-kind="assistant-step"] .katex')) {
      if (formula.closest(`[${marker}]`)) continue;
      const annotation = formula.querySelector('annotation[encoding="application/x-tex"]');
      if (!annotation) continue; // ParseError without reliable mode/source remains untouched.
      const original = formula.parentElement?.classList.contains('katex-display') ? formula.parentElement : formula;
      const tex = annotation.textContent || '';
      const block = original.classList.contains('katex-display') || formula.querySelector('math')?.getAttribute('display') === 'block';
      const old = entries.get(original);
      const key = JSON.stringify([tex, block, macros]);
      if (old?.key === key) continue;
      if (old) restore(original, old);
      try {
        const html = renderFormula(tex, block, macros);
        const output = doc.createElement('span');
        output.setAttribute(marker, '');
        output.innerHTML = html; // KaTeX output only, trust=false, never arbitrary HTML.
        original.after(output);
        original.setAttribute(hidden, '');
        entries.set(original, { output, key });
      } catch { /* Invalid/unknown macros retain the original render. */ }
    }
  }
  function schedule(records) {
    if (disposed || timer !== null) return;
    if (records?.length && records.every(r => r.target.nodeType === 1 && r.target.closest?.(`[${marker}]`))) return;
    timer = view.setTimeout(scan, 30);
  }
  const observer = new view.MutationObserver(schedule);
  observer.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'display'] });
  scan();
  return {
    update(next, active = true) { macros = next; enabled = active; scan(); },
    scan,
    dispose() { disposed = true; observer.disconnect(); if (timer !== null) view.clearTimeout(timer); for (const [node, entry] of entries) restore(node, entry); style.remove(); },
  };
}
