const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('game.js','utf8');
test('selection drives the flight mesh and its visible exhausts',()=>{
 const calls=[],selected={classList:{toggle(){}},setAttribute(){}};
 const c=vm.createContext({$:()=>selected,signatures:{falcon:{},viper:{}},aircraftType:'falcon',
  jadeNacelles:[-2.15,2.15],playerMesh:'single',heavyMesh:'twin',jetParts:{flame:'flame'},
  player:{pos:[0,0,0],hp:100,missiles:0,roll:0,pitch:0,speed:115},rocketSalvos:0,
  time:0,mode:'play',camPos:[0,0,0],clamp:(v,a,b)=>Math.min(b,Math.max(v,a)),
  model:p=>p,mm:(_,local)=>local,draw:(mesh,position)=>calls.push([mesh,position]),
  gl:{enable(){},disable(){},blendFunc(){},depthMask(){}}});
 vm.runInContext(code.slice(code.indexOf('function chooseAircraft('),code.indexOf('function releaseSignature(')),c);
 vm.runInContext(code.slice(code.indexOf('function drawJet('),code.indexOf('let fb,resolveF')),c);
 const start=code.indexOf('drawJet(model(player.pos');
 const flightCall=code.slice(start,code.indexOf(';',start));
 for(const [type,mesh,ports] of [['falcon','single',[0]],['viper','twin',[-2.15,2.15]]]){
  c.chooseAircraft(type);calls.length=0;vm.runInContext(flightCall,c);
  assert.equal(calls[0][0],mesh);
  assert.deepEqual(calls.filter(([m])=>m==='flame').map(([,p])=>p[0]),ports);
 }
});
