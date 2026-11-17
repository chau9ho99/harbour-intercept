'use strict';
// Reference-led first waterfront pass. Coordinates fit the game's interpreted harbour.
globalThis.HarbourTST={
 reserved(x,z,w=0,d=0){return x+w/2>260&&x-w/2<1450&&z+d/2>960&&z-d/2<1550;},
 build({world:b,northshore,landmark,bounds}){
 const stone=[.48,.39,.32],pink=[.49,.36,.29],brick=[.37,.16,.10],dark=[.065,.09,.095],metal=[.36,.4,.38];
 const masonry=[.82,.06,0,0],steel=[.38,.65,0,0],glass=[.23,.08,0,1],paving=[.88,.03,0,18];
 const box=(x,y,z,w,h,d,c=stone,m=masonry)=>b.box(x,y,z,w,h,d,c,m);
 const rod=(a,c,r=.10,color=metal)=>b.rod(a,c,r,color,steel);
 const stats={clockFaces:0,roofStrips:0,railPosts:0,benches:0,palms:0,landmarks:6};
 function disc(x,y,z,r,c,vertical=false){for(let i=0;i<32;i++){let a=i*Math.PI/16,t=(i+1)*Math.PI/16;let pt=q=>vertical?[x+Math.cos(q)*r,y+Math.sin(q)*r,z]:[x+Math.cos(q)*r,y,z+Math.sin(q)*r];b.tri([x,y,z],pt(a),pt(t),c,masonry);}}
 function palm(x,z){rod([x,8.5,z],[x+.8,20,z],.36,[.26,.20,.13]);for(let j=0;j<8;j++){let a=j*Math.PI/4;let tip=[x+Math.cos(a)*6,18.8,z+Math.sin(a)*6];b.tri([x+.8,20,z],[tip[0]+.7,tip[1],tip[2]], [tip[0]-.7,tip[1]-.2,tip[2]],[.10,.19,.10],masonry);}stats.palms++;}
 // Continuous public waterfront and paired handrails follow the existing north bank.
 for(let x=280;x<1450;x+=30){let z=northshore(x);box(x+15,8.1,z+24,30,.3,46,[.34,.31,.26],paving);
  for(let dx of [0,10,20]){let zz=northshore(x+dx)+2;rod([x+dx,8.4,zz],[x+dx,9.6,zz]);stats.railPosts++;}
  for(let y of [8.9,9.6])rod([x,y,z+2],[x+30,y,northshore(x+30)+2]);
  if(x%90===10){box(x+10,8.5,z+31,4,.45,1.4,[.24,.15,.085]);box(x+10,9,z+31.6,4,.9,.15,[.24,.15,.085]);stats.benches++;palm(x+22,z+39);}
 }
 // Star Ferry: piled landing, two levels, open bays and green pitched roofs.
 const px=345,pz=northshore(px)-46;
 box(px,6.2,pz,67,2,154,[.24,.25,.22]);bounds(px,pz,67,2,154,6.2);
 for(let x=px-28;x<=px+28;x+=14)for(let z=pz-66;z<=pz+66;z+=22){box(x,0,z,1.4,6.2,1.4,[.16,.18,.17]);box(x,8.2,z,.6,9,.6,stone);}
 for(let y of [8.2,12.4]){box(px,y,pz,62,.45,146);for(let z=pz-60;z<pz+70;z+=20)box(px,y+.5,z,59,.8,.25,metal,steel);}
 for(let side of [-1,1]){let pts=[[px,19,pz-75],[px+side*35,16,pz-75],[px+side*35,16,pz+75],[px,19,pz+75]];if(side>0)pts.reverse();b.quad(...pts,[.10,.23,.17],masonry);}
 bounds(px,pz,70,3,150,16);box(px,17.2,pz+30,16,5,22,[.16,.27,.21]);
 landmark('尖沙咀天星碼頭',[px,23,pz],18);
 // Red-brick Clock Tower: a square shaft, granite bands and four clock faces.
 const tx=452,tz=1080;
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
 // Cultural Centre: broad pale-pink, windowless curved shells with segmented roofs.
 box(652,8.4,1190,245,12,135,pink);
 for(let wing=0;wing<2;wing++){
  let x0=533+wing*119;
  for(let i=0;i<24;i++){
   let xa=x0+i*4.8,xb=xa+4.8,u=i/24,v=(i+1)/24;
   let ya=23+34*Math.pow(1-u,1.55),yb=23+34*Math.pow(1-v,1.55);
   b.quad([xa,ya,1122],[xa,ya,1258],[xb,yb,1258],[xb,yb,1122],pink,masonry);
   b.quad([xa,20.4,1122],[xa,ya,1122],[xb,yb,1122],[xb,20.4,1122],pink,masonry);
   b.quad([xb,20.4,1258],[xb,yb,1258],[xa,ya,1258],[xa,20.4,1258],pink,masonry);
   bounds(xa+2.4,1190,4.8,Math.max(ya,yb)-20.4,136,20.4);stats.roofStrips++;
  }
 }
 for(let wing=0;wing<2;wing++)for(let edge of [0,1]){let x=533+wing*119+edge*115.2,y=edge?23:57;let pts=[[x,20.4,1122],[x,y,1122],[x,y,1258],[x,20.4,1258]];if(edge)pts.reverse();b.quad(...pts,pink,masonry);}
 // Arcade, plaza and long reflecting pool remain open between the main buildings.
 box(651,8.45,1098,250,.25,35,[.39,.34,.28],paving);
 for(let x=540;x<770;x+=12){box(x,8.7,1117,1,8,1,pink);}
 box(651,16.7,1117,246,.65,5,pink);
 box(492,8.5,1100,18,.35,59);box(492,8.86,1100,15,.07,54,[.08,.17,.16],[.2,.1,0,4]);
 landmark('香港文化中心',[651,59,1190],49);
 // Hong Kong Museum of Art: low horizontal volumes, recessed glazing and pale fins.
 box(900,8.4,1100,157,27,87,[.46,.43,.36]);box(900,12,1055.8,144,17,.4,[.08,.14,.16],glass);
 for(let x=827;x<=973;x+=9)box(x,12,1055.3,.65,21,1.2,[.55,.52,.44]);
 box(900,35.4,1100,160,1.3,91,[.58,.54,.45]);landmark('香港藝術館',[900,38,1100],29);
 // Space Museum's recognisable hemisphere, with normals from the mesh triangles.
 const sx=922,sz=1288,r=28;
 box(sx,8.4,sz,66,5,67,[.48,.44,.37]);
 for(let j=0;j<12;j++)for(let k=0;k<32;k++){
  let pt=(a,t)=>[sx+r*Math.cos(a)*Math.sin(t),13.4+r*Math.cos(t),sz+r*Math.sin(a)*Math.sin(t)];
  let a=k*Math.PI/16,c=(k+1)*Math.PI/16,t=j*Math.PI/24,u=(j+1)*Math.PI/24;
  if(j===0)b.tri(pt(a,t),pt(c,u),pt(a,u),[.66,.61,.49],masonry);
  else b.quad(pt(a,t),pt(c,t),pt(c,u),pt(a,u),[.66,.61,.49],masonry);
 }
 bounds(sx,sz,56,28,56,13.4);landmark('香港太空館',[sx,43,sz],33);
 // Salisbury Road defines the northern edge of the first authored waterfront strip.
 box(855,8.2,1385,1160,.15,24,[.06,.065,.065]);
 for(let x=295;x<1420;x+=18)box(x,8.38,1385,8,.015,.18,[.65,.61,.45]);
 for(let z of [1371,1399])box(855,8.3,z,1160,.2,4,[.31,.30,.27],paving);
 // Peninsula-inspired setback hotel mass, behind the waterfront museums.
 box(620,8.4,1480,162,29,65,[.58,.50,.37],[.78,.08,0,6]);
 for(let x of [557,683])box(x,37.4,1480,33,13,60,[.58,.50,.37],[.78,.08,0,6]);
 box(620,37.4,1495,42,97,34,[.40,.37,.30],[.75,.08,0,6]);
 landmark('半島酒店 · 輪廓重建',[620,138,1495],126);
 return stats;
 }
};
