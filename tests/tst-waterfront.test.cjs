const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const s=fs.readFileSync('game.js','utf8');const context=vm.createContext({});
vm.runInContext(fs.readFileSync('tst-waterfront.js','utf8'),context);
// Use the game's actual triangle/normal and box builder, without a GPU upload.
vm.runInContext(`const TAU=Math.PI*2;const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>mul(a,1/(Math.hypot(...a)||1));let collisionBoxes=[];${s.slice(s.indexOf('class Builder{'),s.indexOf('let texCanvas='))};globalThis.builder=new Builder();globalThis.boxes=collisionBoxes;`,context);
const landmarks=[],bounds=[];
const stats=context.HarbourTST.build({world:context.builder,northshore:x=>context.HarbourTST.shore(x),landmark:(...a)=>landmarks.push(a),bounds:(x,z,w,h,d,y=7)=>bounds.push({x,z,w,h,d,y})});
test('fifteen named landmarks, four clock faces and both curved roof shells are authored',()=>{assert.equal(landmarks.length,15);assert.equal(stats.clockFaces,4);assert.equal(stats.roofStrips,48);assert.ok(stats.railPosts>100);assert.ok(stats.palms>5)});
test('geometry is finite and bounded; dome normals face outwards',()=>{
 const a=context.builder.a;assert.ok(a.length>10000&&a.length<2000000);assert.ok(a.every(Number.isFinite));
 let dome=0;for(let i=0;i<a.length;i+=15){const [x,y,z,nx,ny,nz]=a.slice(i,i+6);if(y>15&&y<41.5&&Math.hypot(x-807,z-1122)<28.01&&z>1094&&z<1150){const dot=(x-807)*nx+(y-11.8)*ny+(z-1122)*nz;if(Math.abs(Math.hypot(x-807,y-11.8,z-1122)-19.04)<.01){assert.ok(dot>0);dome++;}}}assert.ok(dome>300);
});
test('cultural roof collision covers each strip and Clock Tower is solid',()=>{assert.equal(bounds.filter(b=>Math.abs(b.y-17.76)<.001).length,48);assert.ok(bounds.some(b=>b.x===432&&b.z===1005&&b.h===36.6));assert.ok(bounds.some(b=>b.x===807&&Math.abs(b.h-19.04)<.001))});
test('authored waterfront reserve excludes generic buildings and roads',()=>{assert.ok(context.HarbourTST.reserved(652,1190));assert.ok(!context.HarbourTST.reserved(-600,-900));assert.ok(!context.HarbourTST.reserved(2000,1400))});
test('study camera names, view indices and buttons stay aligned',()=>{
 const start=s.indexOf('let views=')+'let views='.length,end=s.indexOf(';if(studyView===50)',start);
 const views=vm.runInNewContext(s.slice(start,end),{streetSamples:[[0,0,0,0]],shoreline:()=>-630});
 assert.equal(views.length,64);assert.equal(views[50],null);assert.equal(views[51][0][2],670);
 const html=fs.readFileSync('index.html','utf8');for(const id of ['spotDockside','spotFerryBoat','spotBusTerminus','spot1881','spotInland','spotK11','spotPeninsula','spotTST','spotTSTClock','spotTSTCulture','spotTSTMuseums']){assert.ok(html.includes(`id="${id}"`));assert.ok(s.includes(`['${id}',`))}
 assert.ok(html.indexOf('src="tst-waterfront.js')<html.indexOf('src="game.js'));
});
console.log('TST vertices:',context.builder.a.length/15,'collision bounds:',bounds.length+context.boxes.length);

test('K11 remains east of museums and Peninsula court is open',()=>{assert.ok(landmarks.find(l=>l[0]==='K11 MUSEA')[1][0]>1000);assert.ok(!context.boxes.some(b=>Math.abs(b.x-745)<b.w/2&&Math.abs(b.z-1273)<b.d/2&&b.y+b.h>15));assert.equal(stats.benchLength,2);});

test('mapped landmark adjacency closes oversized waterfront gaps',()=>{const get=n=>landmarks.find(l=>l[0]===n)[1];assert.ok(get('半島酒店')[2]-get('香港太空館')[2]<220);assert.ok(get('香港太空館')[2]>get('香港藝術館')[2]);assert.ok(get('香港藝術館')[0]>get('香港文化中心')[0]);assert.ok(context.HarbourTST.shore(540)<context.HarbourTST.shore(300));});

test('Ocean Terminal extends west of landward mall and Canton Road',()=>{assert.ok(stats.harbourCity.terminalWest<0);assert.ok(stats.harbourCity.terminalEast<stats.harbourCity.cantonRoadX);assert.ok(context.HarbourTST.shore(-255)>1215);assert.ok(context.HarbourTST.reserved(145,1660,48,48));});

test('ferries wait alongside both piers and reverse without turning the hull',()=>{
 const state=vm.runInContext(s.slice(s.indexOf('function ferryState'),s.indexOf('const roadMeshes'))+';ferryState',context);
 for(const i of [0,1]){
  const start=i?297:0, dock=state(i,start), far=state(i,start+198);
  assert.equal(dock.wake,0);assert.equal(far.wake,0);
  assert.ok(dock.pos[2]>980 && far.pos[2]<-400);
  const outbound=state(i,start+18+90),inbound=state(i,start+198+18+90);
  assert.deepEqual(outbound.pos,inbound.pos);assert.equal(outbound.yaw,inbound.yaw);
  assert.ok(Math.abs(inbound.wakeYaw-outbound.wakeYaw-Math.PI)<1e-8);
 }
});
test('moving bus waits at its bay and clears the covered boarding islands',()=>{
 const state=vm.runInNewContext(s.slice(s.indexOf('function terminusBus'),s.indexOf('function drawHarbourTraffic'))+';terminusBus');
 assert.deepEqual(state(0).pos,state(12).pos);
 for(let t=0;t<83;t+=.25){
  const {pos:[x,,z],yaw}=state(t);
  for(const end of [-6,0,6]){
   const xx=x+end*Math.cos(yaw),zz=z-end*Math.sin(yaw);
   assert.ok(xx>290 && xx<410 && zz>1102 && zz<1198);
   if(zz>=1115 && zz<=1185)assert.ok([315,345,375].every(island=>Math.abs(xx-island)>3.8));
  }
 }
});

test('Dockside steps up east of ARTUS and Signal Hill sits inland above the road',()=>{
 const pos=name=>landmarks.find(item=>item[0]===name)[1];
 const rose=pos('香港瑰麗酒店'),artus=pos('K11 ARTUS'),hill=pos('訊號山訊號塔');
 assert.ok(rose[0]>artus[0] && rose[1]>artus[1]*2);
 assert.ok(hill[2]>rose[2] && hill[1]>55);
 assert.ok(bounds.some(b=>b.x===hill[0] && b.z===hill[2] && b.y>38));
});
