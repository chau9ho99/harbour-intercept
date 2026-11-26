const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const src=require('node:fs').readFileSync('game.js','utf8');
function mission(type){
 const enemies=[100,180,1000].map(x=>({pos:[x,0,0],hp:5}));
 const ctx=vm.createContext({mode:'play',paused:false,aircraftType:type,player:{pos:[0,0,0]},enemies,tracked:enemies[1],
  len:v=>Math.hypot(...v),sub:(a,b)=>a.map((v,i)=>v-b[i]),add:(a,b)=>a.map((v,i)=>v+b[i]),mul:(a,s)=>a.map(v=>v*s),
  TAU:2*Math.PI,emitParticle(){},notify(){},explosion(){},destroy:e=>e.dead=true});
 vm.runInContext(src.slice(src.indexOf('const signatures='),src.indexOf("$('signature').onclick")),ctx);
 return ctx;
}
test('rift strikes the selected contact once per charge',()=>{
 const c=mission('falcon');c.releaseSignature();c.tracked=c.enemies[0];c.releaseSignature();
 assert.deepEqual(c.enemies.map(e=>e.hp),[5,0,5]);assert.equal(vm.runInContext('signatureTime',c),1.15);
});
test('ring damages nearby contacts only and pause blocks activation',()=>{
 const c=mission('viper');c.paused=true;c.releaseSignature();assert.deepEqual(c.enemies.map(e=>e.hp),[5,5,5]);
 c.paused=false;c.releaseSignature();assert.deepEqual(c.enemies.map(e=>e.hp),[2,2,5]);
});
