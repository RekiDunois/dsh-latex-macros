import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('validation',{recursive:true});
await build({entryPoints:['test/browser-harness.js'],outfile:'validation/browser-harness.js',bundle:true,platform:'browser',format:'iife'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:1100,height:800}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:system-ui;background:#fafafa;padding:24px"><h1>DSH LaTeX macros — isolated browser fixture</h1><div id="settings"></div><h3>Assistant response fixture</h3><div data-chat-flow-kind="assistant-step" id="answer"></div></body></html>');
 await page.addScriptTag({path:'validation/browser-harness.js'});await page.addScriptTag({path:'lib/client.js'});await page.evaluate(()=>window.startHarness());
 await page.getByRole('textbox',{name:'自定义 LaTeX 宏 JSON'}).fill(JSON.stringify({'\\RR':'\\mathbb{R}','\\vect':'\\mathbf{#1}'},null,2));
 await page.getByRole('button',{name:'保存',exact:true}).click();
 await page.locator('[data-dsh-latex-macros-output]').waitFor();await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('[data-dsh-latex-macros-output] .katex-display').count(),1);
 assert.equal(await page.locator('[data-dsh-latex-macros-hidden]').evaluate(e=>getComputedStyle(e).display),'none');
 await page.screenshot({path:'validation/browser-smoke.png',fullPage:true});
 await page.getByRole('checkbox').uncheck();await page.waitForTimeout(80);assert.equal(await page.locator('[data-dsh-latex-macros-output]').count(),0);
 await page.getByRole('checkbox').check();await page.locator('[data-dsh-latex-macros-output]').waitFor();
 await page.evaluate(()=>window.stopPlugin());assert.equal(await page.locator('[data-dsh-latex-macros-output]').count(),0);assert.equal(await page.locator('[data-dsh-latex-macros-hidden]').count(),0);
 assert.deepEqual(errors,[]);
 await writeFile('validation/browser-smoke.json',JSON.stringify({passed:true,browser:await browser.version(),scope:'Isolated Chromium fixture using built plugin, real React/KaTeX, mocked DSH settings/slots. Not full DSH application.',checks:['settings textarea save','simple and parameter macro display','bundled fonts','enable/disable','dispose restore'],errors},null,2));
 console.log('Browser fixture smoke passed. Not full DSH integration.');
} finally {await browser.close();}
