import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import katex from 'katex';
import { parseMacros, renderFormula, mountFormulaDisplay } from '../src/core.js';
const macro = { '\\RR': '\\mathbb{R}', '\\vect': '\\mathbf{#1}' };
const wait = () => new Promise(r => setTimeout(r, 75));
function setup(tex='x \\in \\RR', block=false) {
 const dom = new JSDOM('<!doctype html><html><head></head><body><div data-chat-flow-kind="assistant-step"><div id="answer"></div></div><div id="user"></div></body></html>');
 dom.window.document.querySelector('#answer').innerHTML = katex.renderToString(tex, { displayMode:block, throwOnError:false });
 return dom;
}
test('simple/argument macros render; source dictionary is immutable', () => {
 const copy = {...macro};
 assert.match(renderFormula('\\RR + \\vect{x}', false, macro), /mathbb|mathnormal/);
 renderFormula('\\gdef\\RR{Q}\\RR', false, macro);
 assert.deepEqual(macro, copy);
 assert.throws(()=>renderFormula('\\loop', false, {'\\loop':'\\loop'}));
 assert.throws(()=>parseMacros('{"bad":"x"}'));
 assert.throws(()=>parseMacros('[]'));
 assert.equal(parseMacros('{"\\\\RR":"\\\\mathbb{R}"}')['\\RR'], '\\mathbb{R}');
});
test('normal and display formulas are replaced visually; original nodes survive; disable restores', () => {
 for(const block of [false,true]) {
  const dom=setup(undefined,block), d=dom.window.document;
  const original=d.querySelector('#answer').firstElementChild;
  const before=original.outerHTML;
  const controller=mountFormulaDisplay(d,macro);
  assert.equal(d.querySelector('#answer').firstElementChild,original);
  assert.ok(original.hasAttribute('data-dsh-latex-macros-hidden'));
  const output=d.querySelector('[data-dsh-latex-macros-output]');
  assert.ok(output); assert.equal(Boolean(output.querySelector('.katex-display')),block);
  controller.update({},false);
  assert.equal(original.outerHTML,before);
  assert.equal(d.querySelectorAll('[data-dsh-latex-macros-output]').length,0);
  controller.dispose(); dom.window.close();
 }
});
test('settings update refreshes formulas; bad expansion falls back', () => {
 const dom=setup(),d=dom.window.document,c=mountFormulaDisplay(d,macro);
 const first=d.querySelector('[data-dsh-latex-macros-output]').innerHTML;
 c.update({'\\RR':'\\mathbb{Q}'});
 assert.notEqual(d.querySelector('[data-dsh-latex-macros-output]').innerHTML,first);
 c.update({'\\RR':'\\nonexistentcommand'});
 assert.equal(d.querySelector('[data-dsh-latex-macros-output]'),null);
 assert.equal(d.querySelector('[data-dsh-latex-macros-hidden]'),null);
 c.dispose(); dom.window.close();
});
test('streaming settle and conversation replacement are observed without recursive duplicate outputs',async()=>{
 const dom=setup(),d=dom.window.document; d.querySelector('#answer').textContent='streaming $\\RR$';
 const c=mountFormulaDisplay(d,macro); assert.equal(d.querySelector('[data-dsh-latex-macros-output]'),null);
 d.querySelector('#answer').innerHTML=katex.renderToString('\\RR',{throwOnError:false});
 await wait(); assert.equal(d.querySelectorAll('[data-dsh-latex-macros-output]').length,1);
 await wait(); assert.equal(d.querySelectorAll('[data-dsh-latex-macros-output]').length,1);
 d.querySelector('#answer').innerHTML=katex.renderToString('\\vect{x}',{throwOnError:false});
 await wait(); assert.equal(d.querySelectorAll('[data-dsh-latex-macros-output]').length,1);
 c.dispose(); assert.equal(d.querySelector('[data-dsh-latex-macros-hidden]'),null); dom.window.close();
});
test('no macros is a no-op; user messages and ambiguous parser errors stay untouched; no trusted HTML',()=>{
 const dom=setup(),d=dom.window.document;
 d.querySelector('#user').innerHTML=katex.renderToString('\\RR',{throwOnError:false});
 const user=d.querySelector('#user').innerHTML;
 const error=d.createElement('span');error.className='katex-error';error.textContent='\\broken{';d.querySelector('#answer').append(error);
 const c=mountFormulaDisplay(d,{});assert.equal(d.querySelector('[data-dsh-latex-macros-output]'),null);
 c.update(macro);assert.equal(d.querySelector('#user').innerHTML,user);assert.equal(error.textContent,'\\broken{');assert.equal(error.hasAttribute('data-dsh-latex-macros-hidden'),false);
 const unsafe=renderFormula('\\htmlClass{evil}{x}',false,{});assert.doesNotMatch(unsafe,/class="evil"/);
 c.dispose();dom.window.close();
});

test('React reuse of a formula node as ordinary/error content restores and drops stale sibling', async()=>{
 const dom=setup(),d=dom.window.document,c=mountFormulaDisplay(d,macro);
 const original=d.querySelector('[data-dsh-latex-macros-hidden]');
 original.className='katex-error';original.textContent='new broken formula';
 await wait();
 assert.equal(d.querySelector('[data-dsh-latex-macros-output]'),null);
 assert.equal(original.hasAttribute('data-dsh-latex-macros-hidden'),false);
 c.dispose();dom.window.close();
});
