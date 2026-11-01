import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const root = path.dirname(import.meta.dirname);
const cssFile = path.join(root, 'node_modules/katex/dist/katex.min.css');
let css = await readFile(cssFile, 'utf8');
for (const url of new Set([...css.matchAll(/url\(([^)]+)\)/g)].map(m => m[1]))) {
  const bytes = await readFile(path.join(path.dirname(cssFile), url));
  const extension = path.extname(url).slice(1);
  const mime = extension === 'ttf' ? 'font/ttf' : `font/${extension}`;
  css = css.replaceAll(`url(${url})`, `url(data:${mime};base64,${bytes.toString('base64')})`);
}
css = css.replaceAll('KaTeX_', 'DshMacroKaTeX_').replace(/(^|})([^{}]+)\{/g, (all, boundary, selector) => selector.trim().startsWith('@') ? all : boundary + selector.split(',').map(s => '[data-dsh-latex-macros-output] ' + s.trim()).join(',') + '{');
await writeFile(path.join(root, 'src/katex-style.js'), `export default ${JSON.stringify(css)};\n`);
await mkdir(path.join(root, 'lib'), { recursive: true });
await build({ entryPoints: ['src/index.js'], outfile: 'lib/index.js', platform: 'node', format: 'esm', bundle: true, external: ['@deepseek-ai/schemastery'] });
await build({ entryPoints: ['src/client.js'], outfile: 'lib/client.js', platform: 'browser', format: 'cjs', bundle: true, external: ['react'], banner: { js: 'window.__ModuleLoader__.load({id:"dsh-latex-macros",factory:(require)=>{const module={exports:{}};const exports=module.exports;' }, footer: { js: 'return module.exports;}});' } });
