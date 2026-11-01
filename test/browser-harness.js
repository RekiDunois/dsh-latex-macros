import React from 'react';
import { createRoot } from 'react-dom/client';
import katex from 'katex';
window.__ModuleLoader__={load({factory}){window.plugin=factory(name=>{if(name==='react')return React;throw new Error(name);});}};
window.startHarness=()=>{
 let snap={status:'ready',writable:true,revision:1,value:{enabled:true,macrosJson:'{}'}};
 const listeners=new Set(),cleanups=[];
 const form={getSnapshot(){return snap;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},async mutate(ops,rev){if(rev!==snap.revision)return false;const value={...snap.value};for(const op of ops)value[op.path[0]]=op.value;snap={...snap,revision:snap.revision+1,value};listeners.forEach(fn=>fn());return true;},set(k,v){return this.mutate([{op:'set',path:[k],value:v}],snap.revision);}};
 let Page;window.plugin.apply({configForms:{get:()=>form},effect(fn){cleanups.push(fn());},slots:{inject:(name,fn)=>fn(),register:(opts,p)=>{Page=p;return()=>{};}}});
 createRoot(document.querySelector('#settings')).render(React.createElement(Page));
 window.addFormula=(tex,block=false)=>{document.querySelector('#answer').innerHTML=katex.renderToString(tex,{displayMode:block,throwOnError:false});};
 window.stopPlugin=()=>cleanups.reverse().forEach(fn=>fn?.());
 window.addFormula('x \\in \\RR, \\vect{x}',true);
};
