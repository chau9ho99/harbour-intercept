const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
function setup(mode='play'){
 const elements=new Map();
 const $=id=>{if(!elements.has(id))elements.set(id,{hidden:true,style:{transform:''}});return elements.get(id)};
 const handlers={};
 const c=vm.createContext({$,mode,paused:false,keys:{},input:{},stickID:null,audio(){},window:{addEventListener:(name,fn)=>handlers[name]=fn},document:{addEventListener(){}} ,finishIntro(){c.mode='play'},launchMissile(){throw Error('unexpected weapon')},launchRockets(){},deployFlare(){},toggleTracking(){},toggleAuto(){}});
 vm.runInContext(source.slice(source.indexOf('function clearFlightInput()'),source.indexOf('function closeStudyPicker()')),c);
 vm.runInContext(source.slice(source.indexOf("window.addEventListener('keydown'"),source.indexOf('// Suppress the mobile')),c);
 return {c,$,key:(code,target)=>handlers.keydown({code,target,preventDefault(){}})};
}
test('settings pause active flight and restore a prior pause',()=>{
 const {c,$}=setup();c.openSettings();assert.equal(c.paused,true);c.setPause(false);assert.equal(c.paused,true);c.closeSettings();assert.equal(c.paused,false);
 c.setPause(true);c.openSettings();c.openSettings();c.closeSettings();assert.equal(c.paused,true);assert.equal($('paused').hidden,false);
});
test('pause clears every held input and the touch stick',()=>{
 const {c,$}=setup();Object.assign(c.keys,{Space:true,KeyW:true,ShiftLeft:true});Object.assign(c.input,{x:1,y:-1,fire:true,boost:true,brake:true});c.stickID=4;$('knob').style.transform='translate(10px)';
 c.setPause(true);assert.ok(Object.values(c.keys).every(v=>v===false));assert.ok(Object.values(c.input).every(v=>v===false||v===0));assert.equal(c.stickID,null);assert.equal($('knob').style.transform,'');
});
test('blur while in settings requires explicit resume',()=>{
 const {c,$}=setup();c.openSettings();c.suspendFlight();c.closeSettings();assert.equal(c.paused,true);assert.equal($('paused').hidden,false);c.setPause(false);assert.equal(c.paused,false);
});
test('intro freezes for settings and background suspension',()=>{
 const {c}=setup('intro');c.openSettings();assert.equal(c.paused,true);c.closeSettings();assert.equal(c.paused,false);c.suspendFlight();assert.equal(c.paused,true);
});
test('settings Escape closes modal without resuming a previous pause',()=>{
 const {c,key}=setup();c.setPause(true);c.openSettings();key('Escape');assert.equal(c.paused,true);key('Escape');assert.equal(c.paused,false);
});
test('paused keys and form controls never latch flight input or fire',()=>{
 const {c,key}=setup();c.setPause(true);key('KeyW');key('KeyQ');assert.equal(c.keys.KeyW,undefined);c.setPause(false);key('KeyQ',{closest:()=>true});assert.equal(c.keys.KeyQ,undefined);key('KeyW');assert.equal(c.keys.KeyW,true);
});
test('settings keyboard shortcuts cannot skip intro or fire',()=>{
 const {c,key}=setup('intro');c.openSettings();key('Space');key('KeyQ');assert.equal(c.mode,'intro');assert.equal(c.paused,true);
});
