const assert=require('node:assert/strict');const {test}=require('node:test');const fs=require('node:fs');const ts=require('typescript');const m={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../utils/draw-odds.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports);const {probNoHit,probAtLeastOne}=m.exports;
function choose(n,k){if(k>n)return 0;let x=1;for(let i=1;i<=k;i++)x=x*(n-i+1)/i;return x}
test('matches exact hypergeometric counts for all small decks and draw sizes',()=>{for(let n=1;n<=12;n++)for(let k=0;k<=n;k++)for(let draw=0;draw<=n;draw++)assert.ok(Math.abs(probAtLeastOne(n,k,draw)-(1-choose(n-k,draw)/choose(n,draw)))<1e-10)});
test('40 cards with three outs gives 7.5% on the next draw',()=>assert.ok(Math.abs(probAtLeastOne(40,3,1)-0.075)<1e-12));
test('draws cap at deck size and no-outs/empty-deck cases are stable',()=>{assert.equal(probAtLeastOne(3,1,7),1);assert.equal(probAtLeastOne(40,0,7),0);assert.equal(probAtLeastOne(0,0,7),0);assert.equal(probNoHit(40,3,0),1)});
