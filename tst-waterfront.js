'use strict';
// Reference-led first waterfront pass. Coordinates fit the game's interpreted harbour.
globalThis.HarbourTST={
 reserved(x,z,w=0,d=0){return x+w/2>80&&x-w/2<1450&&z+d/2>900&&z-d/2<1770;},
 shore(x){const pts=[[-700,945.2036561],[-550,1240],[-300,1240],[80,1240],[180,1120],[300,1080],[420,985],[540,930],[700,930],[820,950],[980,950],[1100,925],[1270,955],[1450,1020],[1600,1005]];if(x<-700||x>1600)return 930+80*Math.sin(x*.0008+.5);for(let i=1;i<pts.length;i++)if(x<=pts[i][0]){let a=pts[i-1],b=pts[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}},
 build({world:world,northshore,landmark:label,bounds:solid}){
 // Each landmark uses an explicit metre-like local scale around its footprint centre.
 let origin=[0,8.4,0],scale=[1,1,1],offset=[0,0,0];
 const point=p=>p.map((v,i)=>origin[i]+(v-origin[i])*scale[i]+offset[i]);
 const setScale=(x,z,sx,sy,sz)=>{origin=[x,8.4,z];scale=[sx,sy,sz];offset=[0,0,0];};
 const b={box(x,y,z,w,h,d,c,m){let p=point([x,y,z]);world.box(...p,w*scale[0],h*scale[1],d*scale[2],c,m)},
 rod(a,c,r,col,m){world.rod(point(a),point(c),r*Math.min(...scale),col,m)},
 tri(a,c,d,col,m){world.tri(point(a),point(c),point(d),col,m)},
 quad(a,c,d,e,col,m){world.quad(point(a),point(c),point(d),point(e),col,m)}};
 const bounds=(x,z,w,h,d,y=7)=>{let p=point([x,y,z]);solid(p[0],p[2],w*scale[0],h*scale[1],d*scale[2],p[1]);};
 const landmark=(name,p,h)=>label(name,point(p),h*scale[1]);
 const stone=[.48,.39,.32],pink=[.49,.36,.29],brick=[.37,.16,.10],dark=[.065,.09,.095],metal=[.36,.4,.38];
 const masonry=[.82,.06,0,0],steel=[.38,.65,0,0],glass=[.23,.08,0,1],paving=[.88,.03,0,18];
 const box=(x,y,z,w,h,d,c=stone,m=masonry)=>b.box(x,y,z,w,h,d,c,m);
 const rod=(a,c,r=.10,color=metal)=>b.rod(a,c,r,color,steel);
 const stats={clockFaces:0,roofStrips:0,railPosts:0,benches:0,palms:0,landmarks:15};
 function disc(x,y,z,r,c,vertical=false){for(let i=0;i<32;i++){let a=i*Math.PI/16,t=(i+1)*Math.PI/16;let pt=q=>vertical?[x+Math.cos(q)*r,y+Math.sin(q)*r,z]:[x+Math.cos(q)*r,y,z+Math.sin(q)*r];b.tri([x,y,z],pt(t),pt(a),c,masonry);}}
 function palm(x,z){rod([x,8.5,z],[x+.35,16.5,z],.20,[.26,.20,.13]);for(let j=0;j<8;j++){let a=j*Math.PI/4;let tip=[x+Math.cos(a)*3.4,15.2,z+Math.sin(a)*3.4];b.tri([x+.35,16.5,z],[tip[0]+.7,tip[1],tip[2]], [tip[0]-.7,tip[1]-.2,tip[2]],[.10,.19,.10],masonry);}stats.palms++;}
 // Continuous public waterfront and paired handrails follow the existing north bank.
 // Sample the same seawall curve at both ends of each paving bay.
 for(let x=280;x<1450;x+=10){
  const z=northshore(x),next=northshore(x+10);
  for(const [near,far,c] of [[.35,2,[.60,.54,.44]],[2,13,[.43,.39,.34]],[13,19,[.50,.46,.39]]]){
   b.quad([x,8.31,z+near],[x,8.31,z+far],[x+10,8.31,next+far],[x+10,8.31,next+near],c,paving);
  }
  // Two crossed blades give slender posts a readable profile in both directions.
  for(let dx=0;dx<10;dx+=2.5){
   const px=x+dx,pz=northshore(px)+2;
   b.quad([px-.09,8.3,pz],[px-.09,9.6,pz],[px+.09,9.6,pz],[px+.09,8.3,pz],metal,steel);
   b.quad([px,8.3,pz-.09],[px,8.3,pz+.09],[px,9.6,pz+.09],[px,9.6,pz-.09],metal,steel);
   stats.railPosts++;
  }
  for(const y of [8.9,9.6])b.quad([x,y,z+2],[x,y+.12,z+2],[x+10,y+.12,next+2],[x+10,y,next+2],metal,steel);
  if(x%90===10){box(x+4,8.4,z+12,2,.45,.6,[.24,.15,.085]);box(x+4,8.85,z+12.3,2,.4,.10,[.24,.15,.085]);stats.benches++;palm(x+7,northshore(x+7)+15);}
 }
 // Star Ferry: piled landing, two levels, open bays and green pitched roofs.
 const px=345,pz=northshore(px)-30;setScale(px,pz,.55,.70,.72);
 box(px,6.2,pz,67,2,154,[.24,.25,.22]);bounds(px,pz,67,2,154,6.2);
 for(let x=px-28;x<=px+28;x+=14)for(let z=pz-66;z<=pz+66;z+=22){box(x,0,z,1.4,6.2,1.4,[.16,.18,.17]);box(x,8.2,z,.6,9,.6,stone);}
 for(let y of [8.2,12.4]){box(px,y,pz,62,.45,146);for(let z=pz-60;z<pz+70;z+=20)box(px,y+.5,z,59,.8,.25,metal,steel);}
 for(let side of [-1,1]){let pts=[[px,19,pz-75],[px+side*35,16,pz-75],[px+side*35,16,pz+75],[px,19,pz+75]];if(side>0)pts.reverse();b.quad(...pts,[.10,.23,.17],masonry);}
 bounds(px,pz,70,3,150,16);box(px,17.2,pz+30,16,5,22,[.16,.27,.21]);
 landmark('尖沙咀天星碼頭',[px,23,pz],18);
 // Red-brick Clock Tower: a square shaft, granite bands and four clock faces.
 const tx=452,tz=1080;setScale(tx,tz,.65,1,.65);offset=[-20,0,-75];bounds(tx,tz,15,36.6,15,8.4);
 box(tx,8.4,tz,15,28,15,brick);box(tx,8.4,tz,18,1.2,18);box(tx,34.4,tz,17,1.4,17);
 box(tx,36,tz,14,9,14,brick);box(tx,44,tz,17,1,17);box(tx,45,tz,11,5,11,stone);
 for(let y=12;y<34;y+=4)for(let sign of [-1,1]){box(tx+sign*7.55,y,tz,.12,.35,15);box(tx,y,tz+sign*7.55,15,.35,.12);}
 for(let side=0;side<4;side++){
  let a=side*Math.PI/2,normal=[Math.sin(a),0,Math.cos(a)],right=[Math.cos(a),0,-Math.sin(a)];
  let point=(u,v)=>[tx+normal[0]*7.12+right[0]*u,40+v,tz+normal[2]*7.12+right[2]*u];
  for(let j=0;j<32;j++){let q=j*Math.PI/16,r=(j+1)*Math.PI/16;b.tri(point(0,0),point(Math.cos(q)*2.35,Math.sin(q)*2.35),point(Math.cos(r)*2.35,Math.sin(r)*2.35),[.78,.73,.58],masonry);}
  rod(point(0,0),point(-.7,1.1),.10,dark);rod(point(0,0),point(1.65,.2),.08,dark);stats.clockFaces++;
 }
 // Octagonal belfry columns and copper dome, separate from the square shaft.
 for(let j=0;j<8;j++){let a=j*Math.PI/4;rod([tx+Math.cos(a)*4.4,45,tz+Math.sin(a)*4.4],[tx+Math.cos(a)*4.4,49.8,tz+Math.sin(a)*4.4],.3,stone);}
 for(let j=0;j<24;j++){let a=j*Math.PI/12,c=(j+1)*Math.PI/12;b.tri([tx,52.4,tz],[tx+Math.cos(a)*6,49.7,tz+Math.sin(a)*6],[tx+Math.cos(c)*6,49.7,tz+Math.sin(c)*6],[.14,.23,.17],masonry);}
 rod([tx,52.4,tz],[tx,59.4,tz],.12);landmark('尖沙咀鐘樓',[tx,60,tz],44);
 setScale(652,1190,.85,.78,.85);offset=[-72,0,-115];
 // Concave roof between two raised ends. The front wall bends inland
 // over a recessed arcade instead of spanning the plaza with a solid plinth.
 const section = u => {
  const end = Math.abs(2*u-1);
  return {x:533+232*u, y:28+28*end*end, front:1122+38*(1-end*end)};
 };
 box(649,8.16,1187,235,.25,145,stone,paving);
 box(649,8.4,1209,232,12,96,[.31,.28,.26]);
 for(let i=0;i<48;i++){
  const a=section(i/48), c=section((i+1)/48);
  const fascia=[.56,.39,.33], roof=[.39,.33,.30];
  b.quad([a.x,a.y,a.front],[a.x,a.y,1258],[c.x,c.y,1258],[c.x,c.y,c.front],roof,masonry);
  b.quad([a.x,20.4,a.front],[a.x,a.y,a.front],[c.x,c.y,c.front],[c.x,20.4,c.front],fascia,masonry);
  b.quad([c.x,20.4,1258],[c.x,c.y,1258],[a.x,a.y,1258],[a.x,20.4,1258],fascia,masonry);
  rod([a.x,a.y+.12,a.front],[c.x,c.y+.12,c.front],.25,stone);
  if(i%3===0){
   rod([a.x,8.4,a.front+1],[c.x,20.4,c.front],.64,fascia);
   rod([a.x,a.y+.15,a.front],[a.x,a.y+.15,1258],.075,stone);
  }
  const front=Math.min(a.front,c.front);
  bounds((a.x+c.x)/2,(1258+front)/2,c.x-a.x,Math.max(a.y,c.y)-20.4,1258-front,20.4);
  stats.roofStrips++;
 }
 for(const u of [0,1]){
  const {x,y,front}=section(u);
  const cap=[[x,20.4,front],[x,y,front],[x,y,1258],[x,20.4,1258]];
  if(!u)cap.reverse();
  b.quad(...cap,pink,masonry);
 }
 setScale(0,0,1,1,1);
 // Compact civic forecourt: pale paving, reflecting pool and palm-lined paths.
 box(520,8.15,982,180,.25,65,[.46,.40,.32],paving);
 box(457,8.45,1008,10,.28,45);box(457,8.74,1008,8,.05,42,[.08,.17,.16],[.2,.1,0,4]);
 for(let x=480;x<650;x+=20){
  palm(x,994);
  box(x,8.5,994,4,.42,3,stone);
  box(x,8.94,994,3.5,.15,2.5,[.13,.21,.11]);
 }
 for(let x=442;x<=490;x+=12){
  rod([x,8.4,1038],[x,13.1,1038],.12);
  box(x,13.1,1038,.85,.46,.85,[.72,.65,.46]);
 }
 landmark('香港文化中心',[580,49,1075],40);
 setScale(900,1100,.82,1,.85);offset=[-105,0,-80];
 // Hong Kong Museum of Art: low horizontal volumes, recessed glazing and pale fins.
 box(900,8.4,1100,157,27,87,[.46,.43,.36]);box(900,12,1055.8,144,17,.4,[.08,.14,.16],glass);
 for(let x=827;x<=973;x+=9)box(x,12,1055.3,.65,21,1.2,[.55,.52,.44]);
 box(900,35.4,1100,160,1.3,91,[.58,.54,.45]);landmark('香港藝術館',[900,38,1100],29);
 // Space Museum's recognisable hemisphere, with normals from the mesh triangles.
 const sx=922,sz=1288,r=28;setScale(sx,sz,.68,.68,.68);offset=[-115,0,-166];
 box(sx,8.4,sz,66,5,67,[.48,.44,.37]);
 for(let j=0;j<12;j++)for(let k=0;k<32;k++){
  let pt=(a,t)=>[sx+r*Math.cos(a)*Math.sin(t),13.4+r*Math.cos(t),sz+r*Math.sin(a)*Math.sin(t)];
  let a=k*Math.PI/16,c=(k+1)*Math.PI/16,t=j*Math.PI/24,u=(j+1)*Math.PI/24;
  if(j===0)b.tri(pt(a,t),pt(c,u),pt(a,u),[.66,.61,.49],masonry);
  else b.quad(pt(a,t),pt(c,t),pt(c,u),pt(a,u),[.66,.61,.49],masonry);
 }
 bounds(sx,sz,56,28,56,13.4);landmark('香港太空館',[sx,43,sz],33);
 setScale(0,0,1,1,1);
 // Salisbury Road sits immediately behind the museums, rising gently to the east.
 for(let x=300;x<1400;x+=20){let z=1210+(x-300)*.025;box(x+10,8.2,z,20,.15,24,[.065,.07,.07]);
  for(let side of [-1,1])box(x+10,8.3,z+side*15,20,.2,6,[.34,.32,.28],paving);
  box(x+10,8.38,z,7,.02,.18,[.7,.65,.5]);
 }
 // Star Ferry transport interchange, covered islands and marked bus bays.
 box(350,8.16,1150,120,.2,96,[.065,.07,.07]);
 for(let x of [315,345,375]){box(x,8.4,1150,3,.35,68,[.39,.38,.33]);for(let z=1120;z<1185;z+=12){box(x,8.75,z,.18,3,.18,metal);box(x,11.75,z,5,.2,12,[.23,.27,.25]);}}
 // Salisbury Garden fills the space between the museum and Victoria Dockside.
 box(962,8.2,1100,120,.25,155,[.13,.22,.12]);
 for(let z of [1055,1110,1165])box(962,8.48,z,120,.06,4,[.43,.39,.31],paving);
 for(let x of [920,950,980,1010])for(let z of [1080,1140])palm(x,z);
 setScale(620,1480,1,1,1);offset=[125,0,-182];
 // Peninsula: seven-storey historic wings surround the arrival court; rear tower is distinct.
 const cream=[.61,.53,.40],trim=[.71,.65,.52],window=[.045,.09,.11];
 box(620,8.4,1510,126,27,35,cream);
 for(let x of [572,668])box(x,8.4,1470,30,27,80,cream);
 box(620,8.43,1460,66,.15,66,[.19,.19,.17],paving);
 box(620,12.5,1487,32,.8,12,[.13,.22,.17]);
 for(let x of [607,633])box(x,8.4,1483,.55,4.1,.55,trim);
 function facade(x0,x1,z,y0,rows,step=4){
  for(let row=0;row<rows;row++)for(let x=x0;x<=x1;x+=step){let y=y0+row*3.55;
   box(x,y,z,1.45,2.1,.15,window);box(x,y-.18,z-.12,1.9,.18,.35,trim);
  }
 }
 facade(560,584,1429.9,10.2,7);facade(656,680,1429.9,10.2,7);facade(563,677,1492.4,10.2,7);
 for(let y of [12.2,19.3,26.4,33.5]){box(620,y,1492,126,.25,.5,trim);for(let x of [572,668])box(x,y,1429.7,31,.25,.6,trim);}
 for(let x of [572,668]){box(x,35.4,1470,32,1,82,trim);box(x,36.4,1470,27,2.5,76,[.22,.24,.20]);}
 box(620,35.4,1510,128,1,37,trim);
 box(620,35.4,1510,47,82,33,cream);box(620,117.4,1510,43,6,31,trim);
 facade(599,641,1493.3,38,22,4.2);
 for(let y=39;y<117;y+=3.55)box(620,y,1493,47,.15,.4,trim);
 for(let x of [598,642])box(x,35.4,1510,2,82,34,trim);
 box(620,123.4,1510,49,.7,35,[.23,.25,.23]);
 for(let x of [608,632]){disc(x,124.15,1510,8,[.53,.52,.42]);box(x,124.18,1510,6,.025,.6,trim);for(let dx of [-2.7,2.7])box(x+dx,124.18,1510,.6,.025,6,trim);}
 landmark('半島酒店',[620,127,1510],116);
 setScale(1205,1138,.8,1,.85);offset=[-20,0,-75];
 // K11 MUSEA: stepped limestone waterfront podium, bronze bays and planted terraces.
 const kx=1205,kz=1138,limestone=[.49,.41,.29],bronze=[.25,.19,.11],leaf=[.095,.18,.085];
 box(kx,8.4,kz,290,24,140,limestone);
 box(kx-15,32.4,kz+13,235,12,112,limestone);
 box(kx-25,44.4,kz+27,178,7,80,limestone);
 for(let x=1068;x<1345;x+=12){
  box(x,12,1067.8,8,16,.3,window,glass);
  for(let dx of [-4.4,4.4])box(x+dx,11.7,1067.2,.5,18,.7,bronze,steel);
  box(x,29.7,1067.3,10,.7,1.4,limestone);
  for(let y of [18,24])box(x,y,1067.1,8,.25,.35,bronze,steel);
 }
 for(let tier of [[1205,32.5,1069,286],[1190,44.5,1094,231],[1180,51.5,1125,174]]){
  let [x,y,z,w]=tier;box(x,y,z,w,.55,3.2,limestone);box(x,y+.55,z,w,1.3,2.5,leaf);
 }
 for(let x of [1070,1142,1298,1340])for(let y=13;y<31;y+=3){box(x,y,1066.7,3.5,2.6,.65,leaf);}
 // Recessed circular facade openings are rings with dark inset discs.
 for(let x of [1110,1190,1270]){disc(x,38.5,1094.7,3.3,window,true);for(let j=0;j<24;j++){let a=j*Math.PI/12,c=(j+1)*Math.PI/12;rod([x+3.5*Math.cos(a),38.5+3.5*Math.sin(a),1094.4],[x+3.5*Math.cos(c),38.5+3.5*Math.sin(c),1094.4],.22,bronze);}}
 box(1205,8.45,1045,290,.2,32,[.35,.31,.25],paving);
 for(let x=1070;x<1350;x+=35){box(x,8.6,1048,7,.6,3,limestone);box(x,9.2,1048,6.5,.7,2.5,leaf);}
 landmark('K11 MUSEA',[1205,55,1138],43);
 setScale(0,0,1,1,1);
 // Paved forecourt between the retail frontage and the Avenue of Stars.
 // The promenade widens toward the centre, narrowing again near the tower.
 for(let x=1070;x<1300;x+=10){
  const edge=side=>northshore(side)+19;
  const bed=side=>edge(side)+7+4*Math.sin((side-1070)/230*Math.PI);
  const ribbon=(near,far,y,c)=>b.quad([x,y,near(x)],[x,y,far(x)],
    [x+10,y,far(x+10)],[x+10,y,near(x+10)],c,paving);
  ribbon(edge,()=>1002,8.29,[.49,.45,.38]);
  if((x-1070)%50<30)ribbon(bed,u=>bed(u)+3.5,8.36,[.19,.27,.14]);
 }
 // Victoria Dockside: separate volumes and a clear slot of sky between them.
 // Dimensions are interpreted to fit the harbour model.
 const pierStone=[.51,.45,.36],towerGlass=[.14,.23,.24],towerSkin=[.29,.34,0,6];
 function docksideTier(x,z,y,w,d,h){
  box(x,y,z,w,h,d,towerGlass,towerSkin);
  bounds(x,z,w,h,d,y);
  for(let dx=-w/2+2;dx<w/2;dx+=6){
   const f=z-d/2-.15;
   b.quad([x+dx,y,f],[x+dx,y+h,f],[x+dx+1.45,y+h,f],[x+dx+1.45,y,f],pierStone,masonry);
  }
  for(let dz=-d/2+2;dz<d/2;dz+=6){
   const side=x+w/2+.15;
   b.quad([side,y,z+dz],[side,y+h,z+dz],[side,y+h,z+dz+1.4],[side,y,z+dz+1.4],pierStone,masonry);
  }
  box(x,y+h,z,w+1,.6,d+1,pierStone);
 }
 for(const x of [1298,1320,1342,1364])for(const z of [1064,1097]){
  box(x,8.35,z,4,12,5,pierStone);bounds(x,z,4,12,5,8.35);
 }
 docksideTier(1331,1081,20.35,76,46,119);
 docksideTier(1336,1084,139.95,66,40,56);
 docksideTier(1342,1086,196.55,54,36,42);
 landmark('香港瑰麗酒店',[1342,242,1086],230);
 // K11 ARTUS steps back above the west part of the retail podium.
 for(let tier=0;tier<4;tier++){
  const x=1126+2*tier,z=1087+2*tier,y=51.4+tier*11,w=85-tier*7,d=46-tier*4;
  box(x,y,z,w,11,d,[.28,.29,.24],towerSkin);bounds(x,z,w,11,d,y);
  for(let floor=0;floor<3;floor++)box(x,y+floor*3.55,z-1,w+3,.65,d+4,pierStone);
  box(x,y+10.2,z-d/2,w,1,2,leaf);
 }
 landmark('K11 ARTUS',[1132,98,1093],87);
 // Signal Hill rises behind Salisbury Road. One height function drives the
 // tessellated ground, collision samples and the tree roots.
 const hillX=1147,hillZ=1312;
 function signalGround(x,z){
  const dx=(x-hillX)/86,dz=(z-hillZ)/62,r=dx*dx+dz*dz;
  return 8.08+31*Math.max(0,1-r)**1.4;
 }
 for(let x=hillX-90;x<hillX+90;x+=10)for(let z=hillZ-65;z<hillZ+65;z+=10){
  const corners=[[x,z],[x,z+10],[x+10,z+10],[x+10,z]].map(([u,v])=>[u,signalGround(u,v),v]);
  const height=signalGround(x+5,z+5)-8.08;
  if(height<.01&&corners.every(p=>p[1]<=8.08))continue;
  b.quad(...corners,height>9?[.18,.26,.14]:[.26,.29,.18],masonry);
  if(height>.1)bounds(x+5,z+5,10,height,10,8.08);
 }
 for(let j=0;j<54;j++){
  const a=j*2.4,r=.30+.65*Math.sqrt(j/54),x=hillX+81*r*Math.cos(a),z=hillZ+57*r*Math.sin(a);
  const y=signalGround(x,z),radius=4+j%4,top=[x+1,y+7+j%5,z],bottom=[x,y+.5,z];
  const canopy=[.095+j%3*.025,.18+j%5*.012,.09];
  for(let k=0;k<6;k++){
   const edge=n=>[x+radius*Math.cos(n*Math.PI/3),y+4,z+radius*Math.sin(n*Math.PI/3)];
   b.tri(edge(k),top,edge(k+1),canopy,masonry);
   b.tri(edge(k+1),bottom,edge(k),canopy,masonry);
  }
 }
 const summit=signalGround(hillX,hillZ);
 box(hillX,summit-.5,hillZ,18,.75,16,[.56,.50,.40],paving);
 box(hillX,summit,hillZ,6.8,16,6.8,brick);
 for(const h of [4,9,14,16])box(hillX,summit+h,hillZ,7.5,.6,7.5,pierStone);
 for(const h of [3,8,12])box(hillX,summit+h,hillZ-3.46,1.55,2.1,.15,dark);
 box(hillX,summit+16.6,hillZ,5.4,2.6,5.4,brick);
 rod([hillX,summit+19,hillZ],[hillX,summit+22,hillZ],.12,metal);
 bounds(hillX,hillZ,7,19,7,summit);
 landmark('訊號山訊號塔',[hillX,summit+22,hillZ],19);
 // Missing built edges: Regent on the waterfront, Sheraton/ YMCA north of Salisbury Road.
 function block(x,z,w,d,h,c){box(x,8.4,z,w,h,d,c,[.75,.08,0,6]);box(x,8.4+h,z,w+1,1,d+1,stone);}
 block(1030,1015,82,58,53,[.40,.34,.26]);
 block(900,1308,100,98,67,[.38,.32,.25]);
 block(585,1290,100,72,58,[.49,.43,.32]);
 // 1881 Heritage, adapted to the game's Canton Road plot. The former
 // Marine Police HQ sits above the retail court, looking south over its verandahs.
 const render=[.70,.63,.48], roofTile=[.19,.20,.19], terrace=[.50,.44,.34];
 function hippedRoof(cx,z,y,w,d,rise){
  const l=cx-w/2,r=cx+w/2,f=z-d/2,k=z+d/2;
  const a=[l+d/2,y+rise,z],c=[r-d/2,y+rise,z];
  b.quad([l,y,f],a,c,[r,y,f],roofTile,masonry);
  b.quad([r,y,k],c,a,[l,y,k],roofTile,masonry);
  b.tri([l,y,k],a,[l,y,f],roofTile,masonry);
  b.tri([r,y,f],c,[r,y,k],roofTile,masonry);
 }
 box(440,8.25,1280,130,.3,95,terrace,paving);
 box(440,8.55,1300,122,7,53,terrace);
 bounds(440,1300,122,7,53,8.55);
 for(let i=0;i<9;i++)box(440,8.55,1257+i*1.94,21,(i+1)*7/9,2,render);
 box(440,15.55,1303,84,12.6,18,render);
 bounds(440,1303,84,16.8,24,15.55);
 hippedRoof(440,1300,28.15,88,27,4.2);
 // Open double verandah. A segmented arch leaves a genuine gap in each bay.
 for(const floor of [15.55,21.85]){
  box(440,floor,1291,85,.45,6,render);
  for(let bay=0;bay<12;bay++){
   const x=398+bay*7,front=1288;
   box(x+.35,floor,front,.7,6.3,.8,render);
   b.quad([x+2.1,floor+.6,1293.95],[x+2.1,floor+4.6,1293.95],
     [x+4.9,floor+4.6,1293.95],[x+4.9,floor+.6,1293.95],[.16,.23,.18],masonry);
   for(let j=0;j<4;j++){
    const edge=n=>[x+3.65-3*Math.cos(n*Math.PI/4),floor+3.8+1.7*Math.sin(n*Math.PI/4),front];
    const a=edge(j),c=edge(j+1);
    b.quad(a,[a[0],floor+6.3,front],[c[0],floor+6.3,front],c,render,masonry);
   }
  }
  box(482,floor,1288,.7,6.3,.8,render);
 }
 box(480,15.55,1281,32,5,11,[.45,.29,.21]);
 hippedRoof(480,1281,20.55,34,13,2.8);
 // The round time-ball tower on its own raised terrace near the street corner.
 function drum(x,z,y,r0,r1,h,colour){
  for(let i=0;i<16;i++){
   const ring=(j,r,level)=>[x+r*Math.cos(j*Math.PI/8),level,z+r*Math.sin(j*Math.PI/8)];
   b.quad(ring(i,r0,y),ring(i,r1,y+h),ring(i+1,r1,y+h),ring(i+1,r0,y),colour,masonry);
  }
 }
 drum(394,1261,8.55,15,15,5,terrace);disc(394,13.55,1261,15,terrace);
 drum(394,1261,13.55,5.2,5.2,8.4,render);
 drum(394,1261,21.95,6,1,3.8,roofTile);
 rod([394,25.7,1261],[394,33,1261],.24,dark);
 drum(394,1261,28.5,.35,1.35,1,dark);drum(394,1261,29.5,1.35,.35,1,dark);
 bounds(394,1261,10,17,10,8.55);
 landmark('1881 Heritage · 前水警總部',[440,34,1300],26);
 // The strip immediately north of the hotels: narrower side streets flank Nathan Road.
 const avenueX=820;
 const asphalt=[.065,.069,.071], kerb=[.41,.38,.34];
 const roads=[[510,14],[avenueX,24],[970,13]];
 const junctions=[1395,1505,1625];
 for(const [x,width] of roads){
  box(x,8.2,1496,width,.16,538,asphalt);
  for(const side of [-1,1])box(x+side*(width/2+2),8.38,1496,4,.16,538,kerb,paving);
 }
 for(const z of junctions){
  box(855,8.56,z,1120,.08,13,asphalt);
  for(const side of [-1,1]){
   const y=z+side*12;
   for(let lane=-9;lane<=9;lane+=3)box(avenueX+lane,8.46,y,1.3,.03,3,[.76,.64,.29]);
  }
 }
 for(let z=1248;z<1760;z+=14){
  if(junctions.some(j=>Math.abs(j-z)<18))continue;
  box(avenueX,8.39,z,.18,.025,5,[.68,.62,.48]);
 }
 // Parcel groups share party walls and shop podiums. The short access lanes
 // and different rooflines remain visible from a low pass over the waterfront.
 const lots=[[310,491],[528,800],[841,950],[990,1190],[1207,1390]];
 const walls=[[.46,.42,.35],[.34,.36,.33],[.47,.39,.33],[.37,.38,.39]];
 let parcel=0;
 for(const [south,north] of [[1410,1490],[1520,1608],[1640,1740]]){
  for(const [west,east] of lots){
   const depth=north-south,mid=(south+north)/2;
   box((west+east)/2,8.42,mid,east-west,.25,depth,kerb,paving);
   let left=west+3;
   while(left<east-15){
    const width=Math.min(east-3-left,[28,43,35,53,32][parcel%5]);
    const x=left+width/2, base=14, tall=parcel%7===2;
    const inset=tall?6:1.5, buildingDepth=depth-12-(parcel%3)*4;
    const height=tall?71+(parcel%4)*9:21+(parcel*11%31);
    const colour=walls[parcel%4];
    box(x,8.67,mid,width,base-8.67,depth-6,colour,masonry);
    const upperWidth=width-2*inset, facadeMat=[.76,.08,0,6];
    const stepped=tall||parcel%5===0, lowerHeight=stepped?height*.71:height;
    box(x,base,mid+1,upperWidth,lowerHeight,buildingDepth,colour,facadeMat);
    bounds(x,mid+1,upperWidth,lowerHeight,buildingDepth,base);
    if(stepped){
     const setback=Math.min(5,upperWidth*.2),sign=parcel%2?1:-1;
     box(x+sign*setback/2,base+lowerHeight,mid+4,upperWidth-setback,height-lowerHeight,buildingDepth-8,colour,facadeMat);
     bounds(x+sign*setback/2,mid+4,upperWidth-setback,height-lowerHeight,buildingDepth-8,base+lowerHeight);
    }
    const front=south+2.95;
    b.quad([left+1,9,front],[left+1,12.5,front],[left+width-1,12.5,front],[left+width-1,9,front],
      [.09,.14,.15],[.29,.18,0,0]);
    box(x,12.6,front-.4,width-1,.45,1.4,parcel%3===0?[.20,.32,.25]:stone);
    if(parcel%3===0)box(x,base+height,mid+5,width*.46,3.2,buildingDepth*.32,stone);
    left+=width+1;parcel++;
   }
  }
 }
  // V59: Harbour City is a connected north/south spine with a westward Ocean Terminal.
 // Dimensions are authored estimates from official layout diagrams, not surveyed footprints.
 setScale(0,0,1,1,1);
 const hcStone=[.49,.46,.39],hcGlass=[.07,.14,.18],hcMetal=[.44,.48,.48];
 function hcMass(x,z,w,d,h){box(x,8.4,z,w,h,d,hcStone,masonry);bounds(x,z,w,h,d,8.4);}
 function ribbon(x,z,w,y){box(x,y,z,w,2.7,.25,hcGlass,glass);box(x,y+2.7,z,w,.22,.6,hcMetal,steel);}
 // Glazing stops short of corners, leaving stone piers visible at oblique angles.
 function floorBands(x,z,width,depth,first,top,pitch,tint){
  const pane=[.24,.24,0,0];
  for(const [nx,nz] of [[0,-1],[1,0],[0,1],[-1,0]]){
   const span=(nx?depth:width)-3;
   const faceX=x+nx*(width/2+.06),faceZ=z+nz*(depth/2+.06);
   const bays=Math.ceil(span/24);
   for(let y=first;y+2.25<top;y+=pitch){
    for(let bay=0;bay<bays;bay++){
     const left=span*(bay/bays-.5)+.22,right=span*((bay+1)/bays-.5)-.22;
     const at=(u,h)=>[faceX+nz*u,h,faceZ-nx*u];
     b.quad(at(left,y),at(right,y),at(right,y+2.25),at(left,y+2.25),tint,pane);
    }
   }
  }
 }
 // Seaward terminal deck connects to the landward shopping spine, leaving water below.
 box(-35,5,1165,520,3.4,100,[.22,.25,.25]);bounds(-35,1165,520,3.4,100,5);
 for(let x=-275;x<220;x+=24)for(let z of [1123,1207])box(x,-1,z,1.8,6,1.8,[.16,.19,.18]);
 hcMass(-5,1165,440,80,15);
 for(let y of [10,15,20])for(let z of [1124.7,1205.3])ribbon(-5,z,438,y);
 // Recessed boarding doors, brows and rubber fenders break up the quay elevation.
 for(const x of [-173,-92,-11,70,151]){
  box(x,8.5,1124.4,7.6,4.6,.6,[.085,.12,.12]);
  box(x,13.1,1123.7,10,.38,2.6,hcStone);
  for(const dx of [-7,7])box(x+dx,1.4,1114.85,.85,5.6,1,[.043,.047,.05]);
 }
 // Roof carpark: parapets, ramp and restrained parking bays establish the broad low roof.
 box(-5,23.45,1165,440,.12,79,[.15,.17,.17]);
 for(let z of [1126,1204])box(-5,23.6,z,440,.8,.25,hcStone);
 for(let x=-210;x<205;x+=8){box(x,23.6,1136,.10,.02,12,[.66,.64,.54]);box(x,23.6,1194,.10,.02,12,[.66,.64,.54]);}
 // The terminal's western end has stacked public viewing terraces facing the harbour.
 for(let level=0;level<5;level++){
  let y=8.4+level*3.5,w=63-level*5;
  box(-255,y,1165,w,.55,94-level*4,[.58,.57,.51]);
  if(level<4){box(-247,y+.55,1165,42,2.95,70,hcGlass,glass);}
  for(let z of [1120+level*2,1210-level*2]){rod([-255-w/2,y+1.65,z],[-255+w/2,y+1.65,z],.055);}
 }
 // The western lookout has planted roof islands and a continuous seaward rail.
 const deckY=22.95;
 for(const dz of [-20,20]){
  box(-254,deckY,1165+dz,22,.38,9,hcStone);
  box(-254,deckY+.38,1165+dz,20,.18,7,[.16,.27,.12]);
 }
 for(let z=1127;z<=1203;z+=4)rod([-276,deckY,z],[-276,deckY+1.1,z],.055);
 rod([-276,deckY+1.1,1127],[-276,deckY+1.1,1203],.065);
 landmark('海運大廈 · 海運觀點',[-255,29,1165],21);
 // Canton Road stays on the east side of the mall, connected to the ferry interchange.
 box(275,8.2,1450,22,.15,620,[.065,.07,.07]);
 for(let x of [259,291])box(x,8.35,1450,8,.2,620,[.36,.34,.29],paving);
 for(let z=1160;z<1760;z+=16)box(275,8.4,z,.15,.02,7,[.7,.65,.5]);
 // Star House at the south end: podium plus a broad, horizontally banded office slab.
 hcMass(222,1090,63,74,10);hcMass(222,1096,52,53,49);
 floorBands(222,1096,52,53,20,56,3.6,[.13,.18,.19]);
 box(222,57.4,1099,36,3.1,32,hcStone);
 landmark('星光行',[222,61,1096],49);
 // Marco Polo / Ocean Centre, followed by the long Gateway Arcade to the north.
 hcMass(170,1250,150,100,16);hcMass(150,1256,95,65,56);
 floorBands(150,1256,95,65,26,64,3.5,[.13,.17,.16]);
 box(150,64.4,1258,73,3,45,hcStone);
 hcMass(170,1370,150,130,22);
 hcMass(170,1580,150,280,19);
 for(let z=1320;z<1715;z+=12){box(245.3,10.5,z,.3,5.5,8,hcGlass,glass);box(245.6,16,z,.8,.35,10,hcStone);}
 for(let [x,z,w,d,h] of [[145,1510,49,47,115],[204,1510,42,47,103],[145,1660,48,48,134],[204,1660,42,48,119]]){
  hcMass(x,z,w,d,h);
  floorBands(x,z,w,d,29,8+h,4,[.09,.17,.20]);
  for(let side of [-1,1])box(x+side*(w/2-.8),28,z,1.6,h-20,d+1,hcStone);
  box(x,9.8+h,z,w*.72,3,d*.68,hcStone);
  box(x,8.4+h,z,w+2,1.4,d+2,hcMetal,steel);
 }
 landmark('海港城 · 海洋中心',[170,37,1370],28);landmark('港威大廈',[145,145,1660],134);
 // Connected covered approaches to Star Ferry and boarding edges/fenders at the pier.
 box(300,8.4,1112,48,.3,8,[.4,.38,.31],paving);
 for(let x=280;x<=320;x+=8){box(x,8.7,1112,.25,3,.25,hcMetal);box(x,11.7,1112,8,.2,8,[.15,.26,.20]);}
 const ferryZ=northshore(345)-30;
 for(let side of [-1,1])for(let z=ferryZ-44;z<ferryZ+40;z+=9){box(345+side*19,3,z,.6,4,1.4,[.045,.05,.045]);rod([345+side*17.5,8,z],[345+side*17.5,9.1,z],.07);}
 stats.harbourCity={terminalWest:-286.5,terminalEast:225,cantonRoadX:275,landmarks:4};

 stats.layoutRevision=59;stats.scaleRevision=57;stats.benchLength=2;stats.railingSpacing=2.5;
 return stats;
 }
};
