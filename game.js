'use strict';
(()=>{const $=id=>document.getElementById(id),canvas=$('gl');let gl;
try{gl=canvas.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'high-performance'});if(!gl)throw Error('此瀏覽器未能提供 WebGL2。請用支援 WebGL2 嘅 Safari / Chrome 開啟。');init()}catch(e){$('errorText').textContent=e.message;$('error').hidden=false;console.error(e)}
function init(){
const PI=Math.PI,TAU=PI*2,FAR=6500;let W=1,H=1,aspect=1,time=0,last=0,mode='menu',paused=false,quality='high',rain=true,camMode='cockpit',audioOn=false,actx=null;let seed=8192;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(...a),norm=a=>mul(a,1/(len(a)||1));
function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}function mm(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}function perspective(a,n,f){let t=1/Math.tan(1.12/2);return new Float32Array([t/a,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0])}function look(eye,target,up=[0,1,0]){let z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}function model(pos,yaw=0,pitch=0,roll=0,scale=1){let cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);let y=new Float32Array([cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1]),p=new Float32Array([1,0,0,0,0,cp,sp,0,0,-sp,cp,0,0,0,0,1]),r=new Float32Array([cr,sr,0,0,-sr,cr,0,0,0,0,1,0,0,0,0,1]);let m=mm(mm(y,p),r);for(let i=0;i<12;i++)m[i]*=scale;m[12]=pos[0];m[13]=pos[1];m[14]=pos[2];return m}function forward(y,p){return[-Math.sin(y)*Math.cos(p),Math.sin(p),-Math.cos(y)*Math.cos(p)]}
function program(v,f){function sh(type,s){let h=gl.createShader(type);gl.shaderSource(h,s);gl.compileShader(h);if(!gl.getShaderParameter(h,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(h));return h}let p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,v));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));p.u={};return p}function use(p){gl.useProgram(p)}function loc(p,n){return p.u[n]??(p.u[n]=gl.getUniformLocation(p,n))}const f1=(p,n,x)=>gl.uniform1f(loc(p,n),x),i1=(p,n,x)=>gl.uniform1i(loc(p,n),x),v2=(p,n,x)=>gl.uniform2fv(loc(p,n),x),v3=(p,n,x)=>gl.uniform3fv(loc(p,n),x),m4=(p,n,x)=>gl.uniformMatrix4fv(loc(p,n),false,x);
const fullVS=`#version 300 es
precision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0,1);}`;
const scene=program(`#version 300 es
precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNormal;layout(location=2)in vec2 aUV;layout(location=3)in vec3 aColor;layout(location=4)in vec4 aMat;uniform mat4 model,view,proj,refVP;out vec3 wp,n,col;out vec2 uv;out vec4 mat,reflection;out float depth;void main(){vec4 w=model*vec4(aPos,1);wp=w.xyz;n=normalize(mat3(model)*aNormal);col=aColor;uv=aUV;mat=aMat;vec4 v=view*w;depth=-v.z;reflection=refVP*w;gl_Position=proj*v;}`,`#version 300 es
precision highp float;in vec3 wp,n,col;in vec2 uv;in vec4 mat,reflection;in float depth;uniform vec3 eye;uniform float time;uniform sampler2D windowsTex,reflectTex,materialTex,facadeTex,shadowNearTex,shadowFarTex,stationTex,hyattTex,districtTex,streetTex;uniform mat4 shadowNearVP,shadowFarVP;uniform vec2 shadowTexel;uniform bool shadowsOn;uniform bool reflectionPass,materialReady,facadeReady;layout(location=0)out vec4 outColor;layout(location=1)out vec4 outNormal;const float PI=3.14159265;
vec3 sky(vec3 d){float h=max(d.y,0.);vec3 c=mix(vec3(.12,.17,.23),vec3(.025,.065,.13),pow(h,.5));float sun=pow(max(dot(d,normalize(vec3(-.75,.32,.58))),0.),90.);return c+vec3(1.5,.48,.16)*sun;}
// Two static directional depth maps, manually filtered to work on WebGL2 mobile.
float depthValue(vec3 rgb){return dot(rgb,vec3(1.,1./255.,1./65025.));}
float filteredShadow(sampler2D map,vec3 q,float pixel,float bias){
 vec3 dx=dFdx(q),dy=dFdy(q);float det=dx.x*dy.y-dx.y*dy.x;
 vec2 gradient=abs(det)>1e-12?vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/det:vec2(0.);
 gradient=clamp(gradient,vec2(-2.),vec2(2.));
 float visibility=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 sampleUV=(floor((q.xy+vec2(x,y)*pixel)/pixel)+.5)*pixel;
  float stored=depthValue(texture(map,sampleUV).rgb);
  visibility+=step(q.z+dot(gradient,sampleUV-q.xy)-bias,stored);
 }
 return visibility/9.;
}
float sunVisibility(vec3 pos,vec3 normal,float nl){
 if(!shadowsOn)return 1.;
 vec3 farQ=(shadowFarVP*vec4(pos+normal*.35,1.)).xyz*.5+.5;
 if(any(lessThan(farQ,vec3(.003)))||any(greaterThan(farQ,vec3(.997))))return 1.;
 float farVis=filteredShadow(shadowFarTex,farQ,shadowTexel.y,.000025+.000045*(1.-nl));
 vec3 nearQ=(shadowNearVP*vec4(pos+normal*.08,1.)).xyz*.5+.5;
 float edge=max(abs(nearQ.x-.5),abs(nearQ.y-.5));
 if(edge>.49||nearQ.z<.001||nearQ.z>.999)return farVis;
 float nearVis=filteredShadow(shadowNearTex,nearQ,shadowTexel.x,.000008+.000018*(1.-nl));
 return mix(nearVis,farVis,smoothstep(.43,.49,edge));
}
void main(){vec3 N=normalize(n),V=normalize(eye-wp);float rough=mat.x,metal=mat.y,em=mat.z,type=mat.w;vec3 base=col;bool aircraft=type>4.5&&type<5.5;float water=step(2.5,type)* (1.-step(3.5,type));float wet=step(3.5,type)*(1.-step(4.5,type));float glass=0.;
if(type>.5&&type<2.5&&abs(N.y)<.5){
 vec2 grid=uv*vec2(16.,29.),cell=fract(grid),id=floor(grid);
 float rnd=fract(sin(dot(id,vec2(127.1,311.7)))*43758.5453);
 vec2 aa=max(fwidth(grid),vec2(.006));
 float pane=smoothstep(.035,.035+aa.x,cell.x)*(1.-smoothstep(.965-aa.x,.965,cell.x))*smoothstep(.16,.16+aa.y,cell.y)*(1.-smoothstep(.96-aa.y,.96,cell.y));
 if(type>1.5)pane=1.-smoothstep(.25,.25+max(aa.x,aa.y),length(cell-.5));
 float fade=smoothstep(.35,1.4,max(aa.x,aa.y));pane=mix(pane,.72,fade);glass=pane;
 vec3 texel=facadeReady?pow(texture(facadeTex,grid/vec2(8.,7.)).rgb,vec3(2.2)):vec3(.18,.25,.29);
 vec3 glazing=mix(col*.42,texel,.6)*mix(.86,1.14,rnd);
 base=mix(vec3(.29,.3,.29),glazing,pane);
 rough=mix(.44,.17+rnd*.07,pane);metal=mix(.65,.06,pane);
 if(type>1.5){base=mix(vec3(.46,.44,.38),vec3(.045,.09,.12),pane);rough=mix(.72,.18,pane);metal=mix(.08,.14,pane);glass=pane;}
 float office=step(.92,rnd)*(.6+.4*fract(rnd*17.));
 float blinds=1.-smoothstep(.62,.7,cell.y);
 em=office*pane*blinds*.025*(1.-fade);
 vec3 tangent=normalize(vec3(N.z,0.,-N.x));
 N=normalize(N+tangent*sin(cell.x*6.283)*.007*pane+vec3(0.,sin(cell.y*6.283)*.004*pane,0.));
}

// Stone offices and concrete residential blocks have their own wall/window response.
if(type>5.5&&type<7.5&&abs(N.y)<.5){
 bool residential=type>6.5;vec2 grid=uv*(residential?vec2(12.,25.):vec2(13.,22.));
 vec2 c=fract(grid),id=floor(grid),aa=max(fwidth(grid),vec2(.01));
 float r=fract(sin(dot(id,vec2(73.13,157.7)))*41793.1);
 float pane=smoothstep(.15,.15+aa.x,c.x)*(1.-smoothstep(.85-aa.x,.85,c.x))*smoothstep(.22,.22+aa.y,c.y)*(1.-smoothstep(.86-aa.y,.86,c.y));
 pane=mix(pane,.41,smoothstep(.5,1.5,max(aa.x,aa.y)));
 float joints=(1.-smoothstep(.015,.03,c.x))+(1.-smoothstep(.015,.035,c.y));
 float weather=(.93+.07*sin(wp.y*.15+floor(grid.x)*4.));
 vec3 wall=col*weather*(1.-joints*.13);vec3 glazing=mix(vec3(.045,.085,.11),vec3(.15,.18,.17),r);
 base=mix(wall,glazing,pane);glass=pane*.65;rough=mix(.83,.23,pane);metal=pane*.09;
 em=step(.96,r)*pane*.025;
}

// Procedural courtyards, paving and planting add detail to the spaces between streets.
if(type>9.5&&type<10.5){
 vec2 p=wp.xz;vec2 lot=floor(p/42.);vec2 f=fract(p/42.);float r=fract(sin(dot(lot,vec2(127.1,311.7)))*43758.5453);
 vec2 tile=abs(fract(p/3.)-.5);float joints=1.-smoothstep(.465,.495,max(tile.x,tile.y));
 float inset=step(.18,f.x)*step(f.x,.82)*step(.18,f.y)*step(f.y,.82);
 float greenery=step(.72,r)*inset;float paving=step(.35,r)*inset;
 base=mix(vec3(.18,.20,.19),vec3(.37,.38,.33)*(.84+.16*joints),paving);
 base=mix(base,vec3(.12,.23,.11)*(0.85+.15*sin(p.x*.4)*sin(p.y*.35)),greenery);
 rough=.92;metal=0.;
}
// HKCEC curtain wall: tall glass bays, fine mullions and restrained reflections.
if(type>10.5&&type<11.5&&abs(N.y)<.5){
 vec2 g=uv*vec2(16.,8.),f=fract(g),aa=max(fwidth(g),vec2(.008));
 float pane=smoothstep(.025,.025+aa.x,f.x)*(1.-smoothstep(.975-aa.x,.975,f.x))*smoothstep(.035,.035+aa.y,f.y)*(1.-smoothstep(.965-aa.y,.965,f.y));
 pane=mix(pane,.9,smoothstep(.5,1.4,max(aa.x,aa.y)));
 float nr=fract(sin(dot(floor(g),vec2(37.1,91.7)))*37183.3);
 base=mix(vec3(.38,.42,.42),mix(vec3(.055,.12,.16),vec3(.12,.22,.24),nr),pane);
 rough=mix(.4,.14+nr*.06,pane);metal=mix(.65,.06,pane);glass=pane;em=step(.97,nr)*pane*.015;
}
// Dedicated hand-painted Canvas facade texture for Grand Hyatt, with glazing response.
if(type>11.5&&type<12.5&&abs(N.y)<.5){
 vec2 q=vec2(fract(uv.x*.66),fract(uv.y*.68));vec3 texel=texture(hyattTex,q).rgb;
 base=pow(texel,vec3(1.6));float frame=smoothstep(.4,.7,max(texel.r,max(texel.g,texel.b)));glass=(1.-frame)*.8;
 rough=mix(.19,.5,frame);metal=mix(.13,.48,frame);
}
// Renaissance hotel and Convention Plaza office: separate illustrated glass atlases.
if(type>12.5&&type<14.5&&abs(N.y)<.5){
 float lane=type<13.5?0.:.5;vec2 q=vec2(lane+fract(uv.x*.62)*.5,fract(uv.y*.68));
 vec3 texel=texture(districtTex,q).rgb;base=pow(texel,vec3(1.6));
 float frame=smoothstep(.42,.7,max(texel.r,max(texel.g,texel.b)));glass=(1.-frame)*.85;
 rough=mix(.2,.48,frame);metal=mix(.12,.48,frame);
}
if(type>15.5&&type<16.5){base=pow(texture(streetTex,uv).rgb,vec3(2.2));rough=.55;em=.12;}
// Vertical seawall concrete: joints, tidal staining and a subtle wet edge.
if(type>16.5&&type<17.5){float joint=1.-smoothstep(.015,.045,abs(fract(wp.x/12.)-.5));float tide=1.-smoothstep(.7,3.3,wp.y);float grain=fract(sin(dot(floor(wp.xy*1.4),vec2(127.1,311.7)))*43758.5453);base=col*(.86+.15*grain)*(1.-joint*.18)*(1.-tide*.27);rough=mix(.46,.88,1.-tide);metal=0.;}
// Fine standing seams and soft panel variation in the aluminium shell.
if(type>14.5&&type<15.5){vec2 g=wp.xz/vec2(4.0,6.0);vec2 f=abs(fract(g)-.5);float seam=1.-smoothstep(.465,.495,max(f.x,f.y));float tone=fract(sin(dot(floor(g),vec2(127.1,311.7)))*43758.5453);base=col*(.84+.16*tone)*mix(.76,1.,seam);rough=.34;metal=.68;}
if(aircraft&&materialReady){vec3 skin=texture(materialTex,vec2(.504,.504)+fract(uv)*.492).rgb;base*=mix(vec3(.65),skin*1.75,.72);rough=clamp(.23+skin.r*.18,.22,.5);}
if(wet>.5&&materialReady){vec3 road=texture(materialTex,vec2(.004)+fract(wp.xz*.018)*.492).rgb;base=mix(base,road,.7);rough=.16;}
if(water>.5){
 vec2 p=wp.xz;float distanceToEye=length(eye-wp);float fade=1./(1.+distanceToEye*.0018);
 float a=dot(p,vec2(.115,.064))+time*.65,b=dot(p,vec2(-.16,.105))-time*.83,c=dot(p,vec2(.038,-.047))+time*.28;
 vec2 dn=vec2(cos(a)*.115-cos(b)*.073+cos(c)*.032,cos(a)*.064+cos(b)*.05-cos(c)*.039);
 N=normalize(vec3(dn.x*.72*fade,1.,dn.y*.72*fade));
 float bands=.5+.5*sin(dot(p,vec2(.035,.021))+time*.18);float shore=smoothstep(0.,450.,distanceToEye);
 rough=mix(.21,.29,bands);metal=.12;base=mix(vec3(.025,.065,.077),vec3(.035,.085,.10),bands*.45+shore*.15);
}
vec3 L=normalize(vec3(-.75,.32,.58)),H=normalize(V+L);float nl=max(dot(N,L),0.),nv=max(dot(N,V),.001),nh=max(dot(N,H),0.),vh=max(dot(V,H),0.);float a=rough*rough,a2=a*a;float D=a2/(PI*pow(nh*nh*(a2-1.)+1.,2.)+.0001);float k=pow(rough+1.,2.)/8.;float G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);vec3 F0=mix(vec3(.04),base,metal),F=F0+(1.-F0)*pow(1.-vh,5.);vec3 spec=D*G*F/max(4.*nv*nl,.001);float sunlit=sunVisibility(wp,normalize(n),nl);vec3 color=(base*(1.-metal)/PI+spec)*vec3(2.6,1.98,1.35)*nl*sunlit+base*vec3(.27,.34,.44)*(.48+N.y*.26);vec3 R=reflect(-V,N);vec3 environment=sky(R);
if(glass>.0){
 float az=atan(R.z,R.x);float roof=.035+.075*pow(.5+.5*sin(floor(az*53.)*17.31),3.);
 float silhouette=1.-smoothstep(roof-.012,roof+.012,R.y);
 vec3 oppositeBank=vec3(.035,.055,.073)+vec3(.055,.055,.04)*pow(max(0.,sin(az*800.)*sin(R.y*900.)),14.);
 environment=mix(environment,oppositeBank,silhouette*.68);
 float fres=.08+.92*pow(1.-nv,5.);
 color=mix(color,environment,glass*(.32+fres*.57));
}else color+=environment*mix(.06,.4,metal)*(1.-rough*.5);color+=base*em*2.1;if(type>.5&&type<2.5&&abs(N.y)<.5)color+=vec3(1.3,.63,.2)*em;
if(water>.5||wet>.5){vec2 r=reflection.xy/reflection.w*.5+.5;vec2 distortion=N.xz*.09+vec2(sin(wp.z*.12+wp.x*.08+time),cos(wp.x*.11-wp.z*.05+time))*.0008;vec3 re=texture(reflectTex,clamp(r+distortion,.002,.998)).rgb;vec3 refl=re*re*4.;float fres=.12+.88*pow(1.-nv,4.);color=mix(color,refl,water>.5?clamp(.2+fres*.65,0.,.9):.28);}
if(type>7.5&&type<8.5){
 float age=uv.y;float edge=pow(max(0.,1.-abs(uv.x*2.-1.)),.65);
 float grain=fract(sin(dot(floor(wp.xz*3.+vec2(time*1.7,time*.8)),vec2(12.9898,78.233)))*43758.5453);
 float foam=edge*(1.-age)*(.6+.4*sin(uv.y*80.-time*3.));
 if(grain>foam*.85)discard;
 color=mix(vec3(.08,.19,.22),vec3(.55,.65,.61),foam);
}
if(type>9.5&&type<10.5)color+=base*.16;
if(type>8.5&&type<9.5)color=pow(texture(stationTex,uv).rgb,vec3(2.2))*1.3;
if(aircraft)color+=base*.25;float fog=1.-exp(-length(eye-wp)*(aircraft?.000035:.000075));color=mix(color,vec3(.12,.17,.23),fog);float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;outColor=vec4(sqrt(max(color,vec3(0))/4.)+jitter/255.,1);outNormal=vec4(N*.5+.5,clamp(depth/6500.,0.,1.));}`);
const shadowP=program(`#version 300 es
precision highp float;layout(location=0)in vec3 aPos;uniform mat4 lightVP;void main(){gl_Position=lightVP*vec4(aPos,1.);}`,`#version 300 es
precision highp float;out vec4 color;void main(){vec3 packedDepth=fract(min(gl_FragCoord.z,.999999)*vec3(1.,255.,65025.));packedDepth-=packedDepth.yzz*vec3(1./255.,1./255.,0.);color=vec4(packedDepth,1.);}`);
const skyP=program(fullVS,`#version 300 es
precision highp float;in vec2 uv;uniform vec3 front,right,up;uniform float aspect,time;layout(location=0)out vec4 color;layout(location=1)out vec4 nd;float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec2 s=uv*2.-1.;vec3 d=normalize(front+right*s.x*aspect*.627+up*s.y*.627);float h=max(d.y,0.);vec3 c=mix(vec3(.12,.17,.23),vec3(.025,.065,.13),pow(h,.45));float glow=pow(max(dot(d,normalize(vec3(-.75,.32,.58))),0.),7.);c+=vec3(.3,.11,.045)*glow;float sun=pow(max(dot(d,normalize(vec3(-.75,.32,.58))),0.),1400.);c+=vec3(1.1,.5,.2)*sun;vec2 cp=d.xz/(max(d.y,.03)+.35)*2.5;float cloud=noise(cp+time*.006)*.6+noise(cp*2.1)*.3+noise(cp*4.3)*.1;c=mix(c,c*.82,smoothstep(.5,.75,cloud)*smoothstep(.02,.2,d.y));color=vec4(sqrt(max(c,vec3(0))/4.)+(hash(gl_FragCoord.xy)-.5)/255.,1);nd=vec4(.5,1.,.5,1);}`);
const bloomP=program(fullVS,`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D tex;uniform vec2 stepUV;uniform bool extract;void main(){vec3 c=vec3(0);for(int i=-4;i<=4;i++){vec3 s=texture(tex,uv+float(i)*stepUV).rgb;s=s*s*4.;if(extract)s=max(s-vec3(.88),vec3(0));float w=exp(-float(i*i)/8.);c+=s*w;}color=vec4(sqrt(max(c/4.898,vec3(0))/4.),1);}`);
const postP=program(fullVS,`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D tex,normalTex,bloomTex;uniform vec2 resolution;uniform float time,aspect,damage,impactFlash,concussion;uniform bool rain,ao;vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}vec3 pos(vec2 q,float d){return vec3((q*2.-1.)*vec2(aspect,1.)*.627*d,-d);}void main(){vec2 q=uv;if(rain){vec2 grid=vec2(24.,14.),cell=floor(uv*grid),f=fract(uv*grid)-.5;float h=hash(cell);vec2 center=vec2((h-.5)*.5,fract(h*47.+time*(.03+h*.025))-.5);vec2 drop=(f-center)*vec2(1.4,.9);float r=length(drop);float mask=(1.-smoothstep(.07,.14,r))*step(.66,h);q+=drop*mask*.085;q.y+=mask*.004;float streak=pow(max(0.,1.-abs(fract(uv.x*170.+uv.y*16.)-.5)*18.),4.)*pow(fract(uv.y*9.+time*.8),12.);q.x+=streak*.0008;}
vec2 radial=q-.5;vec3 c=vec3(0);for(int k=0;k<4;k++){vec2 sampleUV=q-radial*concussion*float(k)*.014;vec3 tap=texture(tex,sampleUV).rgb;c+=tap*tap;}c*=1.;c.r=mix(c.r,pow(texture(tex,q+radial*concussion*.012).r,2.)*4.,concussion*.45);c.b=mix(c.b,pow(texture(tex,q-radial*concussion*.012).b,2.)*4.,concussion*.45);vec4 nd=texture(normalTex,q);float depth=nd.a*6500.;float occ=0.;if(ao&&depth<6400.){vec3 N=nd.xyz*2.-1.;for(int i=0;i<12;i++){float a=float(i)*2.39996;vec2 off=vec2(cos(a),sin(a))*mix(3.,22.,float(i)/12.)/resolution;vec4 neighbour=texture(normalTex,q+off);float d=neighbour.a*6500.;float delta=depth-d;float edge=1.-smoothstep(.75,.98,dot(normalize(N),normalize(neighbour.xyz*2.-1.)));occ+=edge*smoothstep(.5,4.,delta)*(1.-smoothstep(15.,100.,delta))*(.5+.5*abs(N.y));}c*=1.-occ/12.*.7;}
vec3 bloom=texture(bloomTex,q).rgb;c+=bloom*bloom*4.*.6;c=pow(aces(c*1.17),vec3(1./2.2));float vign=smoothstep(.9,.25,length((uv-.5)*vec2(1.,.8)));c*=.75+.25*vign;c+=vec3(.01)*(hash(uv*resolution+time)-.5);c=mix(c,vec3(.8,.04,.025),damage*.35*(1.-vign*.6));c=mix(c,vec3(1.,.82,.48),clamp(impactFlash,0.,.88));color=vec4(c,1);}`);
const particleP=program(`#version 300 es
precision highp float;layout(location=0)in vec3 center;layout(location=1)in float size;layout(location=2)in vec3 tint;layout(location=3)in float opacity;layout(location=4)in float kind;uniform mat4 view,proj;uniform vec3 right,up;out vec2 uv;out vec3 col;out float alpha,type;void main(){vec2 points[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(1,1),vec2(-1,-1),vec2(1,1),vec2(-1,1));vec2 p=points[gl_VertexID];uv=p;col=tint;alpha=opacity;type=kind;vec3 world=center+(right*p.x+up*p.y)*size;gl_Position=proj*view*vec4(world,1);}`,`#version 300 es
precision highp float;in vec2 uv;in vec3 col;in float alpha,type;uniform float time;layout(location=0)out vec4 color;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){float r=length(uv);if(r>1.)discard;float n=noise(uv*5.+time*.8)*.6+noise(uv*13.-time*.4)*.4;float a=pow(max(0.,1.-r*r),1.4)*alpha;vec3 c=col;if(type<.5){c=mix(vec3(2.4,.12,.008),vec3(6.,3.4,.75),clamp((1.-r)*1.5+n*.3,0.,1.))*col;a*=.7+n*.3;}else if(type<1.5){c*=.65+n*.55;a*=.4+n*.6;}else if(type>2.5){a=(1.-smoothstep(.03,.15,abs(r-.78)))*alpha;c=col*2.;}else{c=col*4.;a=pow(max(0.,1.-r),.5)*alpha;}if(a<.01)discard;color=vec4(sqrt(max(c,vec3(0))/4.),a);}`);
let particleVAO=gl.createVertexArray(),particleBuffer=gl.createBuffer();gl.bindVertexArray(particleVAO);gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer);let particleOffset=0;[3,1,3,1,1].forEach((n,i)=>{gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,36,particleOffset*4);gl.vertexAttribDivisor(i,1);particleOffset+=n;});
let collisionBoxes=[];
// Every vertex, facade, landmark, aircraft and particle is authored here.
class Builder{constructor(){this.a=[]}tri(a,b,c,color,mat,uvs=[[0,0],[1,0],[1,1]]){let n=norm(cross(sub(b,a),sub(c,a)));[a,b,c].forEach((p,i)=>this.a.push(...p,...n,...uvs[i],...color,...mat))}quad(a,b,c,d,color,mat,uvs){this.tri(a,b,c,color,mat,uvs?[uvs[0],uvs[1],uvs[2]]:undefined);this.tri(a,c,d,color,mat,uvs?[uvs[0],uvs[2],uvs[3]]:undefined)}box(x,y,z,w,h,d,c,m=[.55,.25,0,0]){if(m[3]===1||(h>20&&w>=10&&d>=10&&y>=0))collisionBoxes.push({x,y,z,w,h,d});let X=x+w/2,x0=x-w/2,Y=y+h,Z=z+d/2,z0=z-d/2;let A=[x0,y,z0],B=[X,y,z0],C=[X,y,Z],D=[x0,y,Z],E=[x0,Y,z0],F=[X,Y,z0],G=[X,Y,Z],I=[x0,Y,Z];let u=w/55,v=h/85,ud=d/55;this.quad(A,E,F,B,c,m,[[0,0],[0,v],[u,v],[u,0]]);this.quad(C,G,I,D,c,m,[[0,0],[0,v],[u,v],[u,0]]);this.quad(B,F,G,C,c,m,[[0,0],[0,v],[ud,v],[ud,0]]);this.quad(D,I,E,A,c,m,[[0,0],[0,v],[ud,v],[ud,0]]);this.quad(E,I,G,F,c,m);this.quad(D,A,B,C,c,m)}rod(a,b,r,c,m){let axis=norm(sub(b,a)),u=norm(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=cross(axis,u);for(let i=0;i<6;i++){let t=i*TAU/6,t2=(i+1)*TAU/6;let p=add(a,add(mul(u,Math.cos(t)*r),mul(v,Math.sin(t)*r))),q=add(a,add(mul(u,Math.cos(t2)*r),mul(v,Math.sin(t2)*r))),r1=add(p,sub(b,a)),r2=add(q,sub(b,a));this.quad(p,q,r2,r1,c,m||[.4,.5,0,0])}}mesh(){let vao=gl.createVertexArray();gl.bindVertexArray(vao);let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.a),gl.STATIC_DRAW);let sizes=[3,3,2,3,4],offset=0;sizes.forEach((s,i)=>{gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,s,gl.FLOAT,false,60,offset*4);offset+=s});return{vao,count:this.a.length/15}}}
let texCanvas=document.createElement('canvas');texCanvas.width=256;texCanvas.height=256;let tc=texCanvas.getContext('2d');tc.fillStyle='#07121c';tc.fillRect(0,0,256,256);for(let y=0;y<32;y++)for(let x=0;x<16;x++){let lit=rand()>.35;tc.fillStyle=lit?`rgb(${130+rand()*125},${80+rand()*90},${65+rand()*80})`:'#0c192b';tc.fillRect(x*16+3,y*8+2,10,4)}let winTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,winTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,texCanvas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
// Canvas 2D station signs are a single small atlas, baked once at startup.
let stationCanvas=document.createElement('canvas');stationCanvas.width=768;stationCanvas.height=128;let stc=stationCanvas.getContext('2d');
for(let i=0;i<3;i++){let x=i*256;stc.fillStyle='#111c20';stc.fillRect(x,0,256,128);stc.fillStyle='#c73330';stc.fillRect(x+8,13,42,42);stc.fillStyle='#fff';stc.font='bold 31px sans-serif';stc.fillText('M',x+15,45);stc.font='bold 24px sans-serif';stc.fillText(['香港站','中環站','金鐘站'][i],x+60,43);stc.font='17px sans-serif';stc.fillStyle='#d7e4de';stc.fillText(['Hong Kong','Central','Admiralty'][i],x+60,69);stc.fillStyle='#b6bbaa';stc.font='13px sans-serif';stc.fillText('STATION',x+60,94);}
let stationTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,stationTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,stationCanvas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
// Hand-drawn 512px facade atlas: reflective teal windows, warm stone spandrels and varied blinds.
let hyattCanvas=document.createElement('canvas');hyattCanvas.width=512;hyattCanvas.height=512;let ht=hyattCanvas.getContext('2d');
ht.fillStyle='#5f7778';ht.fillRect(0,0,512,512);
for(let row=0;row<16;row++)for(let col=0;col<8;col++){
 let x=col*64,y=row*32,variation=(row*37+col*53)%5;
 ht.fillStyle=['#35595c','#3a6266','#476a6c','#405e61','#597575'][variation];ht.fillRect(x+3,y+3,58,25);
 ht.fillStyle=variation===2?'#96a6a0':'#709091';ht.fillRect(x+5,y+4,2,22);
 ht.fillStyle='#899493';ht.fillRect(x,y,3,32);ht.fillStyle='#a6a79d';ht.fillRect(x,y+28,64,4);
 if((row*7+col*11)%9===0){ht.fillStyle='#8d9c96';ht.fillRect(x+6,y+7,51,2);ht.fillRect(x+6,y+12,51,2);}
}
let hyattTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,hyattTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,hyattCanvas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
// Two Canvas-painted curtain walls with distinct glazing and floor bands.
let districtCanvas=document.createElement('canvas');districtCanvas.width=512;districtCanvas.height=512;let dc26=districtCanvas.getContext('2d');
for(let building=0;building<2;building++)for(let row=0;row<16;row++)for(let col=0;col<4;col++){
 let x=building*256+col*64,y=row*32,v=(row*31+col*47+building*7)%5;
 dc26.fillStyle=building===0?['#395e65','#42656c','#4b7277','#476a6d','#597b7d'][v]:['#2e505a','#375c64','#3f6970','#345860','#51747a'][v];dc26.fillRect(x,y,64,32);
 dc26.fillStyle=building===0?'#81928f':'#94a4a0';dc26.fillRect(x,y,3,32);dc26.fillRect(x+61,y,3,32);
 dc26.fillStyle=building===0?'#acb0a4':'#879795';dc26.fillRect(x,y+28,64,4);
 dc26.fillStyle=building===0?'#799497':'#739197';dc26.fillRect(x+5,y+4,2,22);
 if((row*7+col*11+building)%8===0){dc26.fillStyle='#8e9e99';dc26.fillRect(x+8,y+8,48,2);dc26.fillRect(x+8,y+13,48,2);}
}
let districtTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,districtTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,districtCanvas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
let materialReady=false,materialTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,materialTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([150,155,160,255]));let materialImage=new Image();materialImage.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,materialTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,materialImage);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);let aniso=gl.getExtension('EXT_texture_filter_anisotropic');if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));materialReady=true;};materialImage.src='assets/harbour-surface-atlas-v4.webp';
let facadeReady=false,facadeTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,facadeTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([110,135,150,255]));
let facadeImage=new Image();facadeImage.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,facadeTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,facadeImage);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);let an=gl.getExtension('EXT_texture_filter_anisotropic');if(an)gl.texParameterf(gl.TEXTURE_2D,an.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));facadeReady=true;};facadeImage.src='assets/central-curtainwall-v6.webp';
// V5: harbour geography runs east-west; Hong Kong Island is south, Kowloon north.
let world=new Builder(),wet=new Builder(),waterB=new Builder();const BUILD=[.29,.63,0,1],CONCRETE=[.82,.08,0,0],LIGHT=[.35,.1,1.8,0];
const landmarks=[];function landmark(name,pos,height){landmarks.push({name,pos,height});}
waterB.box(0,-4,0,15000,4,16000,[.025,.065,.085],[.18,.45,0,3]);
function quad(a,b,c,d,color,mat=BUILD,uvs){world.quad(a,b,c,d,color,mat,uvs);}
function bounds(x,z,w,h,d,y=7){collisionBoxes.push({x,y,z,w,h,d});}
// A coastline strip has an irregular edge, with seawall, land and wet promenade.
function shoreline(x){return -630-55*Math.sin(x*.0011)-25*Math.sin(x*.0029);}
function northshore(x){return 930+80*Math.sin(x*.0008+.5);}
for(let x=-5400;x<5400;x+=90){let z0=shoreline(x),z1=shoreline(x+90);quad([x,0,z0],[x+90,0,z1],[x+90,8,z1],[x,8,z0],[.16,.19,.19],[.82,.08,0,17]);quad([x,8.06,z0],[x+90,8.06,z1],[x+90,8.06,-3500],[x,8.06,-3500],[.15,.17,.15],[.92,0,0,10]);wet.quad([x,8.1,z0-28],[x+90,8.1,z1-28],[x+90,8.1,z1],[x,8.1,z0],[.16,.19,.2],[.23,.35,0,4]);let nz0=northshore(x),nz1=northshore(x+90);quad([x,8.06,nz0],[x+90,8.06,nz1],[x+90,8.06,3500],[x,8.06,3500],[.15,.17,.15],[.92,0,0,10]);quad([x,0,nz0],[x,8,nz0],[x+90,8,nz1],[x+90,0,nz1],[.2,.22,.2],[.82,.08,0,17]);if(x%180===0)world.box(x,8,z0-8,2,1.5,2,[.8,.65,.35],LIGHT);}
// Small harbour-edge details: recessed ladders, coping stones and mooring bollards.
for(let x=-1500;x<=1900;x+=200){let z=shoreline(x);for(let dx of [-.55,.55])world.rod([x+dx,1,z+.05],[x+dx,8.8,z+.05],.08,[.3,.33,.32],[.38,.65,0,0]);for(let y=1.5;y<8;y+=1.2)world.rod([x-.55,y,z+.08],[x+.55,y,z+.08],.07,[.35,.38,.37],[.38,.65,0,0]);world.box(x+5,8,z-4,1,.85,1,[.12,.14,.14],[.5,.6,0,0]);world.box(x+5,8.85,z-4,1.5,.35,1,[.12,.14,.14],[.5,.6,0,0]);}
// Dense urban blocks: shorter waterfront frontage and tall, varied buildings behind it.
const reserved=[[1280,-890,380,220],[1490,-875,150,130],[1150,-950,145,190],[1600,-1050,140,160],[1790,-920,120,140],[1555,-495,160,120],[650,-910,250,180],[-620,-765,35,35],[-330,-775,35,35],[420,-1235,40,40],[-1100,-1300,160,160],[365,-1330,180,160],[510,-1130,105,100],[-800,-940,480,360],[-400,-1050,150,150],[-690,-920,200,240],[160,-1180,160,200],[-20,-1100,160,160],[-310,-850,130,130],[-485,-850,170,180],[80,-1340,100,100],[1440,-1020,190,200],[1370,-650,400,340],[-220,-640,130,100],[-1360,1230,190,220]];
function free(x,z,w,d){return !reserved.some(r=>Math.abs(x-r[0])<(w+r[2])/2+25&&Math.abs(z-r[1])<(d+r[3])/2+25);}
// Canvas-made bilingual shop and route signs; no flat photographic backdrop.
let streetCanvas=document.createElement('canvas');streetCanvas.width=1024;streetCanvas.height=512;let sc=streetCanvas.getContext('2d');
let signWords=[['海港茶餐廳','HARBOUR CAFE'],['永安藥房','PHARMACY'],['鮮果士多','FRESH MARKET'],['灣仔電器','ELECTRICAL'],['中環 CENTRAL','5B'],['尖沙咀 TST','1A'],['跑馬地 HAPPY VALLEY','TRAM'],['的士 TAXI','香港 HONG KONG']];
for(let i=0;i<8;i++){let y=i*64;sc.fillStyle=['#193e35','#812c25','#b78739','#224552'][i%4];sc.fillRect(0,y,1024,64);sc.fillStyle='#eedec0';sc.font='bold 34px sans-serif';sc.fillText(signWords[i][0],24,y+35);sc.font='16px sans-serif';sc.fillText(signWords[i][1],650,y+40);sc.fillRect(0,y+60,1024,2);}
let streetTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,streetTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,streetCanvas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
function shopSign(b,x,y,z,w,h,index){let v=index/8,vt=(index+1)/8;b.quad([x-w/2,y,z],[x-w/2,y+h,z],[x+w/2,y+h,z],[x+w/2,y,z],[1,1,1],[.5,.1,.15,16],[[0,vt],[0,v],[1,v],[1,vt]]);}
const cityDetail={frontages:0,awnings:0,balconies:0,streetFurniture:0,movingVehicles:18};let streetSamples=[];
const urbanStats={glass:0,stone:0,residential:0,detailed:0,trees:0,vehicles:0,bridges:0};
// Faceted silhouettes around Wan Chai: bevelled towers, setbacks and varied roof crowns.
function bevelBlock(x,z,w,d,y,h,c,mat,cut=.16){
 let X=w/2,Z=d/2,dx=w*cut,dz=d*cut,pts=[[-X+dx,-Z],[X-dx,-Z],[X,-Z+dz],[X,Z-dz],[X-dx,Z],[-X+dx,Z],[-X,Z-dz],[-X,-Z+dz]];
 for(let j=0;j<8;j++){let a=pts[j],b=pts[(j+1)%8],span=Math.hypot(b[0]-a[0],b[1]-a[1])/55;
  quad([x+a[0],y,z+a[1]],[x+a[0],y+h,z+a[1]],[x+b[0],y+h,z+b[1]],[x+b[0],y,z+b[1]],c,mat,[[0,0],[0,h/85],[span,h/85],[span,0]]);
  world.tri([x,y+h,z],[x+b[0],y+h,z+b[1]],[x+a[0],y+h,z+a[1]],c,CONCRETE);
 }
 bounds(x,z,w,h,d,y);
}
for(let side of [-1,1])for(let row=0;row<10;row++)for(let col=0;col<62;col++){
 let x=-4400+col*142+rand()*27,z=side<0?shoreline(x)-145-row*152:northshore(x)+110+row*150,w=34+rand()*52,d=38+rand()*55;
 if(!free(x,z,w,d)||(side>0&&Math.abs(x)<180&&z<1400))continue;
 let center=Math.exp(-Math.pow((x-100)/1900,2)),h=side<0?40+rand()*60+center*rand()*150:35+rand()*125;if(row>5)h*=.75;if(side<0&&row===0)h=Math.min(h,55+rand()*45);if(side<0&&row===1)h=Math.min(h,90+rand()*85);
 let family=rand(),res=family>.72,stone=family>.4&&!res,mat=res?[.85,.05,0,7]:stone?[.75,.1,0,6]:BUILD;
 let c=res?[.25+rand()*.16,.24+rand()*.13,.22+rand()*.12]:stone?[.25+rand()*.17,.24+rand()*.13,.22+rand()*.10]:[.09+rand()*.12,.15+rand()*.12,.19+rand()*.12];
 urbanStats[res?'residential':stone?'stone':'glass']++;
 if(res)h*=.75;
 if(side<0&&x>-1200&&x<600){let focal=Math.max(Math.exp(-Math.pow((x+690)/260,2)),Math.exp(-Math.pow((x-160)/240,2)));if(row===0)h=Math.min(h,50+focal*25);if(row===1)h=Math.min(h,90+focal*50);if(row>2)h=Math.min(h,100+focal*70);}
 // Break up the repeated rectangular skyline with stepped masses, inset crowns and side wings.
 let variant=Math.floor(Math.abs(Math.sin(x*.038+z*.019)*137))%5;
 let wanDetailed=Math.abs(x)<2400&&row<4;
 let split=wanDetailed?(variant===0?.65:variant===1?.77:variant===2?.56:.86):(variant===0?.68:variant===1?.78:variant===2?.56:1);
 if(wanDetailed&&variant%2===0)bevelBlock(x,z,w,d,7,h*split,c,mat,.12+variant*.025);else world.box(x,7,z,w,h*split,d,c,mat);
 if(split<1){let topW=w*(variant===0?.72:variant===1?.84:.55),topD=d*(variant===2?.68:.82);let dx=variant===2?w*.13:0;if(wanDetailed&&variant%2===0)bevelBlock(x+dx,z,topW,topD,7+h*split,h*(1-split),c,mat,.15);else world.box(x+dx,7+h*split,z,topW,h*(1-split),topD,c,mat);}
 if(variant===3&&h>65){world.box(x-w*.36,7,z,w*.24,h*.75,d*.78,c,mat);world.box(x+w*.36,7,z,w*.24,h*.85,d*.78,c,mat);}
 if(variant===4&&h>75){world.box(x,7+h,z,w*.8,3,d*.8,[.25,.29,.29],[.5,.55,0,0]);world.box(x,10+h,z,w*.18,5,d*.22,[.28,.31,.3],[.6,.4,0,0]);}
 if(wanDetailed){
  let metal=[.39,.43,.42],stone=[.41,.4,.36];
  // Vertical piers, occasional projecting bay and strong recessed mechanical levels.
  for(let xx=x-w/2+4;xx<x+w/2;xx+=variant%2?10:13)world.box(xx,8,z+d/2+.3,.6,h*split-2,.5,metal,[.4,.55,0,0]);
  for(let y=22;y<h*split;y+=variant%2?19:27)world.box(x,y,z+d/2+.4,w,.55,.6,stone,CONCRETE);
  if(variant===1||variant===3){world.box(x+w*.27,8,z+d/2+1,w*.25,h*.57,3,c,mat);world.box(x+w*.27,h*.57+8,z+d/2+1,w*.25,1.2,3.5,stone,CONCRETE);}
  let top=7+h,tw=w*(split<1?(variant===0?.72:variant===1?.84:variant===2?.55:.78):.8),td=d*.72;
  world.box(x,top,z,tw,2,td,metal,[.4,.5,0,0]);
  if(variant===0||variant===2){world.box(x,top+2,z,tw*.52,6,td*.5,[.24,.28,.28],CONCRETE);for(let j=-1;j<=1;j++)world.box(x+j*tw*.12,top+8,z,3,2,6,[.32,.35,.33],CONCRETE);}
  if(variant===1){for(let side2 of [-1,1])world.rod([x+side2*tw*.43,top+2,z],[x+side2*tw*.43,top+9,z],.3,metal,[.4,.6,0,0]);world.rod([x-tw*.43,top+9,z],[x+tw*.43,top+9,z],.3,metal,[.4,.6,0,0]);}
  if(variant===3)world.rod([x,top+2,z],[x,top+12,z],.3,metal,[.4,.55,0,0]);
 }
 let detailed=Math.abs(x)<2400&&row<3;
 if(detailed){urbanStats.detailed++;cityDetail.frontages++;
 if(streetSamples.length<2&&side>0)streetSamples.push([x,z,w,d,h]);
 // Shop modules, projecting striped awnings and recessed glazed doors.
 for(let xx=x-w/2+6;xx<x+w/2-3;xx+=12){let idx=(col+Math.floor(xx/12)+row+1000)%4;
  world.box(xx,7.1,z+d/2+.3,10,4.2,.5,[.035,.075,.08],[.2,.25,0,0]);
  shopSign(world,xx,11.4,z+d/2+4.1,10,1.7,idx);
  for(let k=0;k<6;k++)world.quad([xx-5+k*1.7,11.2,z+d/2+.5],[xx-5+k*1.7,10.4,z+d/2+4],[xx-3.3+k*1.7,10.4,z+d/2+4],[xx-3.3+k*1.7,11.2,z+d/2+.5],k%2?[.65,.59,.44]:[[.12,.3,.23],[.45,.12,.09],[.49,.35,.13],[.16,.26,.33]][idx],[.8,.05,0,0]);
  for(let dx of [-4.7,0,4.7])world.box(xx+dx,7.2,z+d/2+.65,.16,3.8,.16,[.44,.45,.4],[.3,.7,0,0]);cityDetail.awnings++;
 }
 // Side elevations have real balcony depth and AC units, not only front texture.
 for(let flank of [-1,1])for(let y=18;y<Math.min(h,95);y+=14){let xx=x+flank*(w/2+.7);world.box(xx,y,z,2.6,.35,d*.55,[.42,.42,.36],CONCRETE);world.box(xx+flank*1.2,y+.35,z,.12,1.2,d*.55,[.25,.32,.32],[.3,.6,0,0]);world.box(xx,y+2,z-d*.18,1.8,1.1,2,[.48,.48,.42],CONCRETE);cityDetail.balconies++;}

  // Setback roof storey and plant rooms interrupt identical box silhouettes.
  world.box(x,7+h,z,w*.72,6,d*.7,c,mat);
  for(let k=0;k<3;k++){let xx=x-w*.25+k*w*.24;world.box(xx,h+13,z,6,3,9,[.23,.26,.26],CONCRETE);for(let v=-2;v<=2;v+=2)world.box(xx+v,h+16,z,.6,.25,7,[.08,.1,.11],[.6,.6,0,0]);}
  if(res){
   for(let y=14;y<h;y+=9)for(let xx=x-w*.32;xx<x+w*.4;xx+=12){
    world.box(xx,y,z+d/2+1.8,8,.45,3.6,[.45,.43,.36],CONCRETE);
    world.box(xx,y+.45,z+d/2+3.5,8,1,.18,[.24,.27,.27],[.5,.6,0,0]);
    world.box(xx+2.6,y+2.3,z+d/2+.7,1.5,.9,1.1,[.44,.45,.4],CONCRETE);
   }
   world.box(x-w*.25,h+13,z-d*.2,8,8,9,[.3,.32,.29],CONCRETE);
  }else if(stone){
   for(let xx=x-w/2+3;xx<x+w/2;xx+=10)world.box(xx,7,z+d/2+.4,1.2,h,.8,[.51,.46,.36],CONCRETE);
   for(let y=20;y<h;y+=18)world.box(x,y,z+d/2+.5,w,1,1,[.47,.43,.35],CONCRETE);
  }else{world.box(x-w*.35,7,z+d/2+.4,2,h,.8,[.39,.44,.44],[.35,.7,0,0]);}
  // Shop plinths and sheltered entrances face the local street.
  world.box(x,7,z+d/2-1,w,5,1,[.14,.18,.18],BUILD);
  world.box(x,13.3,z+d/2+1,w+2,.35,3,[.32,.34,.31],CONCRETE);
 }
 if(rand()>.7)world.box(x,h+15,z,1,2,1,[.6,.12,.04],[.4,.1,1,0]);
}
// Polygonal towers with continuous facades, tapered crowns, mullions and mechanical floors.
function tower(x,z,rings,shape,color,segments=28){for(let k=0;k<rings.length-1;k++){let [y0,rx0,rz0]=rings[k],[y1,rx1,rz1]=rings[k+1];for(let j=0;j<segments;j++){let a=TAU*j/segments,b=TAU*(j+1)/segments;function point(y,rx,rz,t){if(shape==='triangle'){let i=Math.round(t/TAU*3)%3,ang=i*TAU/3;return[x+Math.cos(ang)*rx,y,z+Math.sin(ang)*rz];}let cx=Math.cos(t),cz=Math.sin(t);let power=shape==='rounded'?.42:1;return[x+Math.sign(cx)*Math.pow(Math.abs(cx),power)*rx,y,z+Math.sign(cz)*Math.pow(Math.abs(cz),power)*rz];}let A=point(y0,rx0,rz0,a),B=point(y0,rx0,rz0,b),C=point(y1,rx1,rz1,b),D=point(y1,rx1,rz1,a);let u0=0;for(let q=0;q<j;q++)u0+=len(sub(point(y0,rx0,rz0,(q+1)*TAU/segments),point(y0,rx0,rz0,q*TAU/segments)))/55;let u1=u0+len(sub(B,A))/55;quad(A,D,C,B,color,BUILD,[[u0,y0/130.5],[u0,y1/130.5],[u1,y1/130.5],[u1,y0/130.5]]);if(k===rings.length-2)world.tri([x,y1,z],C,D,[.2,.24,.25],[.5,.6,0,0]);}}
let last=rings[rings.length-1];bounds(x,z,rings[0][1]*2,last[0],rings[0][2]*2);}
// Central waterfront sample. Architectural interpretation, not a surveyed digital twin.
const ifcRings=[[7,43,37],[220,42,36],[300,39,34],[350,35,31],[380,30,27],[391,28,25]];
function ifcSection(y){for(let k=0;k<ifcRings.length-1;k++){let a=ifcRings[k],b=ifcRings[k+1];if(y<=b[0]){let t=(y-a[0])/(b[0]-a[0]);return[mix(a[1],b[1],t),mix(a[2],b[2],t)];}}return[28,25];}
function ifcPoint(y,a,extra=0){let r=ifcSection(y);return[-690+Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.42)*(r[0]+extra),y,-920+Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.42)*(r[1]+extra)];}
tower(-690,-920,ifcRings,'rounded',[.26,.34,.38],48);
// Recessed floor spandrels, proud metal fins and ventilation bands catch actual geometry light.
for(let f=1;f<86;f++){let y=7+f*4.5,r=ifcSection(y);for(let j=0;j<48;j++){let a=j*TAU/48,b=(j+1)*TAU/48;quad(ifcPoint(y,a,.13),ifcPoint(y+.12,a,.13),ifcPoint(y+.12,b,.13),ifcPoint(y,b,.13),[.24,.28,.3],[.38,.72,0,0]);}}
for(let j=0;j<32;j++)for(let k=0;k<ifcRings.length-1;k++)world.rod(ifcPoint(ifcRings[k][0],j*TAU/32,.38),ifcPoint(ifcRings[k+1][0],j*TAU/32,.38),.32,[.53,.53,.48],[.28,.83,0,0]);
for(let y of [109,207,305,355])for(let h=0;h<4;h++)for(let j=0;j<48;j++){let a=j*TAU/48,b=(j+1)*TAU/48;quad(ifcPoint(y+h*.7,a,.4),ifcPoint(y+h*.7+.25,a,.4),ifcPoint(y+h*.7+.25,b,.4),ifcPoint(y+h*.7,b,.4),[.12,.15,.17],[.6,.65,0,0]);}
// Open pearl aluminium crown. Sky remains visible between the structural masts.
for(let j=0;j<32;j++){let a=j*TAU/32,top=404+15*Math.pow(Math.abs(Math.sin(a*2)),.7);let p=ifcPoint(380,a,.8),q=ifcPoint(391,a,.8);world.rod(p,[q[0],top,q[2]],.7,[.57,.56,.5],[.3,.72,0,0]);}
for(let y of [393,399])for(let j=0;j<32;j++){let a=j*TAU/32,b=(j+1)*TAU/32;world.rod(ifcPoint(y,a,.8),ifcPoint(y,b,.8),.22,[.32,.34,.33],[.4,.7,0,0]);}
world.box(-690,391,-920,28,4,24,[.09,.11,.12],[.8,.1,0,0]);
landmark('IFC 國際金融中心',[-690,418,-920],412);
// IFC podium, planted roof, glazed retail edge, service plant, One IFC and hotel volumes.
world.box(-770,7,-940,325,21,245,[.32,.34,.32],[.7,.1,0,0]);
world.box(-770,10,-814,315,14,5,[.2,.29,.31],BUILD);
world.box(-770,28,-940,310,1.2,228,[.14,.2,.14],[.9,.02,0,0]);
for(let x=-900;x<-620;x+=30){world.box(x,29,-850,19,1.2,25,[.28,.29,.27],CONCRETE);world.box(x,30,-850,9,1.5,13,[.08,.16,.09],CONCRETE);}
for(let x=-895;x<-770;x+=18){world.box(x,29,-1000,12,4,23,[.29,.32,.33],[.7,.3,0,0]);for(let z=-1008;z<-990;z+=5)world.box(x,33,z,8,.3,2,[.07,.09,.1],[.6,.6,0,0]);}
tower(-400,-1050,[[7,34,30],[171,34,30],[195,28,25],[214,22,20]],'rounded',[.28,.34,.37],32);
world.box(-955,28,-950,62,174,70,[.25,.27,.24],BUILD);world.box(-1015,28,-950,48,155,70,[.3,.29,.26],BUILD);
// Exchange Square: a compact cluster bridging the IFC complex and Jardine House.
for(let [x,z,h,w] of [[-540,-830,170,36],[-488,-835,180,40],[-438,-840,155,34]]){
 world.box(x,7,z,w,h,44,[.22,.26,.27],BUILD);
 world.box(x,7+h,z,w-3,3,40,[.37,.38,.35],[.48,.5,0,0]);
 for(let xx=x-w/2+3;xx<x+w/2;xx+=7)world.box(xx,7,z+22.4,.65,h,.5,[.4,.39,.34],[.55,.45,0,0]);
 for(let y=30;y<h;y+=26)world.box(x,y,z+22.5,w,.6,.6,[.33,.33,.3],[.55,.4,0,0]);
}
// Cheung Kong Center: reflective square tower between the two bank landmarks.
world.box(80,7,-1340,56,270,54,[.13,.19,.22],BUILD);
for(let x=56;x<105;x+=8)world.box(x,7,-1312.5,.7,270,.7,[.35,.4,.4],[.35,.65,0,0]);
world.box(80,277,-1340,57,4,55,[.25,.28,.28],[.45,.55,0,0]);
for(let y=24;y<275;y+=18)world.box(80,y,-1312,56,.24,.3,[.5,.57,.58],[.3,.7,.08,0]);
landmark('長江集團中心',[80,282,-1340],275);
// Lippo Centre: twin towers with staggered cantilevered blue glass bays.
for(let [x,z,h] of [[330,-1330,172],[400,-1330,186]]){
 world.box(x,7,z,38,h,38,[.09,.2,.27],BUILD);
 for(let y=26;y<h-12;y+=28){let side=(Math.floor(y/28)%2?1:-1);world.box(x+side*21,y,z+8,18,18,28,[.11,.25,.33],BUILD);world.box(x-side*9,y+8,z+22,22,16,10,[.1,.22,.3],BUILD);}
 world.box(x,7+h,z,38,3,38,[.3,.36,.38],[.4,.65,0,0]);
}
landmark('力寶中心',[365,195,-1330],188);
// Bank of America Tower: vertically articulated office facade and stepped top.
world.box(510,7,-1130,48,135,44,[.3,.32,.31],BUILD);world.box(510,142,-1130,38,17,38,[.3,.32,.31],BUILD);world.box(510,159,-1130,28,11,32,[.32,.34,.33],BUILD);
for(let x=489;x<534;x+=5)world.box(x,7,-1107.5,.65,135,.6,[.48,.49,.46],[.42,.5,0,0]);
landmark('美國銀行中心',[510,171,-1130],164);
// The Center: a slender faceted tower with horizontal light bands and crown.
tower(-1100,-1300,[[7,36,32],[300,36,32],[325,31,27],[340,22,20]],'rounded',[.13,.23,.29],24);
for(let y=18;y<326;y+=16)for(let j=0;j<24;j++){let a=j*TAU/24,b=(j+1)*TAU/24;world.rod([-1100+36*Math.cos(a),y,-1300+32*Math.sin(a)],[-1100+36*Math.cos(b),y,-1300+32*Math.sin(b)],.22,[.26,.39,.43],[.35,.5,.12,0]);}
world.rod([-1100,340,-1300],[-1100,347,-1300],.5,[.5,.6,.6]);landmark('中環中心',[-1100,348,-1300],341);
// Bank of China Tower: four triangular shafts step down around a central core.
const bx=160,bz=-1180,br=31,glassBlue=[.11,.2,.26],silver=[.56,.62,.63],metalFrame=[.3,.7,.08,0];
const corners=[[-br,-br],[br,-br],[br,br],[-br,br]],levels=[[124,170],[203,247],[260,301],[300,338]];
for(let i=0;i<4;i++){
 let c=corners[i],d=corners[(i+1)%4],lo=levels[i][0],hi=levels[i][1];
 let C=[bx,7,bz],A=[bx+c[0],7,bz+c[1]],B=[bx+d[0],7,bz+d[1]],T=[bx,hi,bz],U=[bx+c[0],lo,bz+c[1]],V=[bx+d[0],lo,bz+d[1]];
 quad(A,U,V,B,glassBlue,BUILD,[[0,0],[0,lo/130],[1,lo/130],[1,0]]);
 quad(C,T,U,A,glassBlue,BUILD,[[0,0],[0,hi/130],[1,lo/130],[1,0]]);
 quad(B,V,T,C,glassBlue,BUILD,[[0,0],[0,lo/130],[1,hi/130],[1,0]]);
 world.tri(U,T,V,[.18,.27,.32],[.2,.6,0,0]);
 world.rod(U,T,.5,silver,metalFrame);world.rod(V,T,.5,silver,metalFrame);
}
bounds(bx,bz,62,338,62);
for(let side of [-1,1]){let z=bz+side*br,zLimit=side<0?124:260,x=bx+side*br,xLimit=side<0?300:203;
 for(let k=0;k<4;k++){let y=10+k*72;if(y<zLimit){let f=Math.min(1,(zLimit-y)/72);world.rod([bx-br,y,z],[bx-br+2*br*f,y+72*f,z],.75,silver,metalFrame);world.rod([bx+br,y,z],[bx+br-2*br*f,y+72*f,z],.75,silver,metalFrame);}if(y<xLimit){let f=Math.min(1,(xLimit-y)/72);world.rod([x,y,bz-br],[x,y+72*f,bz-br+2*br*f],.75,silver,metalFrame);world.rod([x,y,bz+br],[x,y+72*f,bz+br-2*br*f],.75,silver,metalFrame);}}
}
for(let [dx,dz,top] of [[-31,-31,124],[31,-31,203],[31,31,260],[-31,31,300]])world.rod([bx+dx,7,bz+dz],[bx+dx,top,bz+dz],.85,silver,metalFrame);
world.rod([bx,338,bz],[bx,374,bz],.65,silver,metalFrame);world.rod([bx+4,338,bz+2],[bx+4,362,bz+2],.6,silver,metalFrame);
landmark('中銀大廈',[bx,375,bz],367);
// HSBC: five suspended modules, external steel masts, trusses and an open plaza.
const hx=-20,hz=-1100,steel=[.43,.46,.46],darkGlass=[.12,.19,.21];
for(let i=0;i<5;i++){let dx=(i-2)*19,h=i===2?149:(i===1||i===3?133:112);world.box(hx+dx,34,hz,18,h,74,darkGlass,BUILD);world.box(hx+dx,34+h,hz,17,4,70,steel,[.4,.65,0,0]);}
for(let dx of [-47,-16,16,47])for(let dz of [-43,43]){world.box(hx+dx,7,hz+dz,4,176,4,steel,[.32,.72,0,0]);for(let y of [38,72,106,140,174])world.box(hx+dx,y,hz+dz,6,3,6,[.3,.33,.33],[.4,.7,0,0]);}
for(let z of [hz-44,hz+44])for(let y of [38,72,106,140]){world.rod([hx-47,y,z],[hx+47,y+12,z],.85,steel,metalFrame);world.rod([hx+47,y,z],[hx-47,y+12,z],.85,steel,metalFrame);world.rod([hx-47,y,z],[hx+47,y,z],.7,steel,metalFrame);}
// Atrium floor and paired escalator frames keep the ground-level plaza visible.
world.box(hx,9,hz,84,1,74,[.28,.3,.28],CONCRETE);for(let side of [-1,1]){world.rod([hx+side*4,10,hz+29],[hx+side*4,33,hz-8],.55,steel,metalFrame);world.rod([hx+side*7,10,hz+29],[hx+side*7,33,hz-8],.55,steel,metalFrame);}
for(let dx of [-36,0,36])world.box(hx+dx,180,hz,13,4,18,[.34,.15,.11],[.5,.35,0,0]);
landmark('滙豐總行',[hx,184,hz],177);
// Jardine House: pale stone with its own circular-window shader and inset roof plant.
world.box(-310,7,-850,57,178,65,[.48,.46,.41],[.7,.1,0,2]);
world.box(-310,185,-850,52,3,60,[.35,.36,.33],CONCRETE);world.box(-310,188,-850,32,6,35,[.25,.27,.26],CONCRETE);
for(let x of [-335,-285])for(let z of [-879,-821])world.box(x,7,z,1.2,178,1.2,[.51,.49,.43],CONCRETE);
landmark('怡和大廈',[-310,195,-850],188);
// Central Plaza: truncated-triangle curtain wall, articulated crown and Lightime mast.
const cpx=1440,cpz=-1020,cpbase=[[56,0],[-28,48.5],[-28,-48.5]],cpPoly=[];
for(let i=0;i<3;i++){let a=cpbase[i],b=cpbase[(i+1)%3];for(let t of [.15,.85])cpPoly.push([a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t]);}
function cpPoint(i,y,scale=1,offset=0){let p=cpPoly[(i+6)%6];return[cpx+p[0]*scale+offset,y,cpz+p[1]*scale];}
for(let j=0;j<6;j++){
 let k=(j+1)%6,glass=j%2?[.29,.27,.23]:[.43,.32,.21];
 quad(cpPoint(j,7),cpPoint(j,292,.96),cpPoint(k,292,.96),cpPoint(k,7),glass,[.23,.58,0,11],[[0,0],[0,2.5],[1,2.5],[1,0]]);
 for(let y=16;y<292;y+=4.7){let f=1-(y-7)*.04/285;world.rod(cpPoint(j,y,f),cpPoint(k,y,f),.10,[.47,.38,.27],[.35,.55,0,0]);}
 for(let q=0;q<=8;q++){let t=q/8,a=cpPoint(j,7,1.006),b=cpPoint(k,7,1.006),c=cpPoint(j,292,.966),d=cpPoint(k,292,.966);world.rod([mix(a[0],b[0],t),7,mix(a[2],b[2],t)],[mix(c[0],d[0],t),292,mix(c[2],d[2],t)],.15,[.49,.45,.36],[.3,.65,0,0]);}
 let a=cpPoint(j,292,.96),b=cpPoint(k,292,.96),c=cpPoint(j,315,.67),d=cpPoint(k,315,.67);
 quad(a,c,d,b,[.35,.34,.27],[.27,.6,0,0]);
 for(let q=0;q<5;q++){let t=q/5;world.rod([mix(a[0],b[0],t),292,mix(a[2],b[2],t)],[mix(c[0],d[0],t),315,mix(c[2],d[2],t)],.25,[.53,.51,.41],[.3,.7,0,0]);}
 world.tri(c,[cpx,350,cpz],d,[.27,.36,.32],[.22,.7,0,0]);
 world.rod(c,[cpx,350,cpz],.45,[.58,.57,.46],[.3,.7,.12,0]);
}
for(let y of [321,327,333,339])for(let j=0;j<6;j++){let t=(y-315)/35,f=.67*(1-t);world.rod(cpPoint(j,y,f),cpPoint((j+1)%6,y,f),.26,[.12,.55,.38],[.3,.45,.4,0]);}
world.rod([cpx,347,cpz],[cpx,381,cpz],.8,[.48,.51,.48],[.3,.6,.15,0]);bounds(cpx,cpz,100,374,94);landmark('中環廣場',[cpx,382,cpz],374);
// HKCEC Phase 2: single continuous multi-curved roof and rounded harbour-facing glass.
// Procedural interpretation of the seabird-wing shell, rather than the former two slabs.
const ccx=1370,cz0=-790,czlen=288;
function hkcecWidth(v){let t=Math.max(0.,(v-.67)/.33);return 142*Math.sqrt(Math.max(0.,1.-t*t))+1.;}
function hkcecRoof(u,v){
 // Sweeping ruled wings descend from a raised northward ridge to the eaves.
 let width=hkcecWidth(v),t=Math.abs(u),fade=width/143.;
 let spine=41+20*v+7*Math.sin(PI*v);
 let eaveDrop=14*Math.pow(t,1.25)*fade;
 let shoulder=3.5*Math.sin(PI*t)*Math.sin(PI*v);
 return[ccx+u*width,spine-eaveDrop+shoulder,cz0+v*czlen];
}
// Tiered harbour podium and tall, curved glazing below the sculpted roof.
world.box(ccx,2,-646,292,8,292,[.23,.25,.24],CONCRETE);
const cecGlass=[.2,.1,0,11],cecMullion=[.43,.49,.49],cecFrame=[.36,.62,0,0];
function cecWallPoint(side,v,y,offset=0){let p=hkcecRoof(side,v);return[ccx+(p[0]-ccx)*(.94+offset),y,p[2]];}
for(let side of [-1,1])for(let j=0;j<64;j++){
 let v=j/64,v1=(j+1)/64,A=hkcecRoof(side,v),B=hkcecRoof(side,v1);
 let loA=cecWallPoint(side,v,11),loB=cecWallPoint(side,v1,11),hiA=[loA[0],A[1]-.3,A[2]],hiB=[loB[0],B[1]-.3,B[2]];
 let u0=j/8,u1=(j+1)/8;
 if(side<0)quad(loA,hiA,hiB,loB,[.14,.25,.29],cecGlass,[[u0,0],[u0,1],[u1,1],[u1,0]]);
 else quad(loB,hiB,hiA,loA,[.14,.25,.29],cecGlass,[[u1,0],[u1,1],[u0,1],[u0,0]]);
 if(j%2===0)world.rod(loA,hiA,.18,cecMullion,cecFrame);
 // projecting horizontal terraces wrap around the facade, with a slim railing.
 for(let y of [13,20,27]){
  let p=cecWallPoint(side,v,y,.022),q=cecWallPoint(side,v1,y,.022),r=cecWallPoint(side,v1,y,.004),t=cecWallPoint(side,v,y,.004);
  if(side<0)quad(p,q,r,t,[.49,.51,.48],CONCRETE);else quad(t,r,q,p,[.49,.51,.48],CONCRETE);
  world.rod(p,q,.28,[.56,.57,.53],cecFrame);
 }
 if(j%4===0){let p=cecWallPoint(side,v,20,.022);world.rod(p,[p[0],p[1]+1.15,p[2]],.08,cecMullion,cecFrame);}
}
for(let v of [0,1]){let a=hkcecRoof(-1,v),b=hkcecRoof(1,v);quad([a[0],11,a[2]],a,b,[b[0],11,b[2]],[.14,.25,.29],cecGlass,[[0,0],[0,1],[1,1],[1,0]]);}
bounds(ccx,-646,286,60,288,10);
// One smooth roof surface with feathered eaves; curved ribs follow its length.
for(let i=0;i<56;i++)for(let j=0;j<48;j++){let u=-1+2*i/56,u1=-1+2*(i+1)/56,v=j/48,v1=(j+1)/48;quad(hkcecRoof(u,v),hkcecRoof(u,v1),hkcecRoof(u1,v1),hkcecRoof(u1,v),[.53,.56,.55],[.32,.72,0,15],[[i/56,j/48],[i/56,(j+1)/48],[(i+1)/56,(j+1)/48],[(i+1)/56,j/48]]);}
for(let i=-7;i<=7;i++)for(let j=0;j<48;j++){let u=i/8;let a=hkcecRoof(u,j/48),b=hkcecRoof(u,(j+1)/48);a[1]+=.12;b[1]+=.12;world.rod(a,b,.11,[.39,.43,.44],[.35,.7,0,0]);}
for(let side of [-1,1])for(let j=0;j<48;j++){let a=hkcecRoof(side,j/48),b=hkcecRoof(side,(j+1)/48);world.rod(a,b,.35,[.57,.6,.59],[.3,.75,0,0]);}
// Separate swept upper wing panels: layered shells, tapered tips and visible shadowed fascia.
// Roof photo reference: broad centre spine and two overlapping side wings.
function hkcecWing(side,t,v){
 let u=side*(.30+.79*t),p=hkcecRoof(u,v);
 let along=Math.pow(Math.max(0.,Math.sin(PI*v)),.6);
 p[0]+=side*10*t*along;
 p[1]+=1.0+along*(5.5*Math.sin(PI*t*.9)-3.5*t);
 return p;
}
for(let side of [-1,1])for(let i=0;i<28;i++)for(let j=0;j<40;j++){
 let t=i/28,t1=(i+1)/28,v=.025+j/40*.92,v1=.025+(j+1)/40*.92;
 let a=hkcecWing(side,t,v),b=hkcecWing(side,t1,v),c=hkcecWing(side,t1,v1),d=hkcecWing(side,t,v1);
 if(side>0)quad(a,d,c,b,[.67,.69,.67],[.36,.55,0,15]);else quad(a,b,c,d,[.67,.69,.67],[.36,.55,0,15]);
}
for(let side of [-1,1])for(let j=0;j<40;j++){
 let v=.025+j/40*.92,v1=.025+(j+1)/40*.92,a=hkcecWing(side,1,v),b=hkcecWing(side,1,v1);
 let c=[b[0],b[1]-1.8,b[2]],d=[a[0],a[1]-1.8,a[2]];
 quad(a,b,c,d,[.17,.2,.21],[.65,.35,0,0]);world.rod(a,b,.25,[.58,.6,.58],[.35,.65,0,0]);
}
// Curved raised roof seams and shadowed parapet edges reinforce the layered shell.
for(let side of [-1,1])for(let t of [.18,.36,.54,.72,.9])for(let j=1;j<39;j++){let a=hkcecWing(side,t,.025+j/40*.92),b=hkcecWing(side,t,.025+(j+1)/40*.92);a[1]+=.09;b[1]+=.09;world.rod(a,b,.075,[.49,.53,.53],[.4,.7,0,0]);}
// Harbour-facing glazing receives narrow vertical shadow frames and warm interior strips.
for(let side of [-1,1])for(let j=1;j<64;j+=2){let v=j/64,p=cecWallPoint(side,v,11,.008),roof=hkcecRoof(side,v);world.rod(p,[p[0],roof[1]-.5,p[2]],.10,[.22,.28,.29],[.4,.55,0,0]);}
// Horizontal white spandrel bands articulate the curved glass elevation.
for(let side of [-1,1])for(let j=0;j<48;j++){let a=hkcecRoof(side,j/48),b=hkcecRoof(side,(j+1)/48);for(let y of [12,15.5,19,22.5])world.rod([a[0]*.96+ccx*.04,y,a[2]],[b[0]*.96+ccx*.04,y,b[2]],.23,[.57,.59,.56],[.42,.4,0,0]);}
// Glazed atrium link and low original-wing connector at the landward end.
world.box(1370,10,-827,110,19,74,[.13,.23,.26],BUILD);
world.box(1370,29,-827,114,2,76,[.42,.45,.44],[.38,.7,0,0]);
for(let x=1318;x<=1422;x+=9)world.box(x,10,-788,.45,19,.4,[.39,.44,.44],[.4,.7,0,0]);
// Horizontal curtain-wall rails and a continuous lower terrace on the north-facing side.
for(let side of [-1,1])for(let j=0;j<48;j++){let a=hkcecRoof(side,j/48),b=hkcecRoof(side,(j+1)/48);for(let y of [17,25])world.rod([a[0],y,a[2]],[b[0],y,b[2]],.18,[.4,.45,.46],[.4,.6,0,0]);}
landmark('香港會議展覽中心',[1370,60,-645],50);
// Forecourt extends from the northern edge of the hall towards the harbour.
world.box(1555,2,-490,150,8,110,[.28,.3,.28],CONCRETE);world.box(1555,10,-490,146,.35,106,[.38,.38,.34],CONCRETE);
for(let x=1488;x<=1622;x+=12)world.box(x,10.4,-490,.12,.05,100,[.22,.24,.22],CONCRETE);
for(let z=-535;z<=-445;z+=12)world.box(1555,10.42,z,140,.05,.12,[.22,.24,.22],CONCRETE);
for(let x=1485;x<=1625;x+=10){world.rod([x,10,-437],[x,12,-437],.1,[.4,.45,.44]);if(x<1625)world.rod([x,11.8,-437],[x+10,11.8,-437],.1,[.4,.45,.44]);}
// Stylised golden bauhinia sculpture and its red plinth.
world.box(1558,10.4,-487,6,1.8,6,[.32,.1,.07],[.5,.2,0,0]);world.rod([1558,12,-487],[1558,17,-487],.4,[.7,.49,.1],[.28,.75,.05,0]);
for(let i=0;i<5;i++){let a=i*TAU/5,b=a+TAU/5;world.tri([1558,16,-487],[1558+3.2*Math.cos(a),19,-487+3.2*Math.sin(a)],[1558+2.6*Math.cos(b),19.7,-487+2.6*Math.sin(b)],[.8,.58,.14],[.3,.8,.1,0]);}
world.rod([1575,10,-470],[1575,25,-470],.18,[.62,.63,.59]);
landmark('金紫荊廣場',[1558,22,-487],12);
// Continuous promenade connects the forecourt to the Wan Chai ferry concourse.
world.box(1670,2,-490,240,8,18,[.3,.32,.3],CONCRETE);world.box(1670,10,-490,240,.25,16,[.39,.4,.37],CONCRETE);
for(let x=1550;x<=1790;x+=12){world.rod([x,10.2,-482],[x,11.8,-482],.1,[.42,.46,.45],cecFrame);if(x<1790)world.rod([x,11.65,-482],[x+12,11.65,-482],.09,[.42,.46,.45],cecFrame);}
for(let x=1560;x<1790;x+=36){world.rod([x,10,-497],[x,16,-497],.13,[.32,.35,.34],cecFrame);world.box(x,15.8,-497,1.4,.2,.6,[.65,.63,.45],[.4,.1,.15,0]);}

// Convention Plaza complex: three individually modelled waterfront buildings.
// Approximate relative placement and massing from the harbour; not a surveyed model.
function conventionTower(x,z,w,d,h,kind){
 let glass=kind===0?[.24,.33,.34]:kind===1?[.20,.28,.31]:[.16,.25,.29];
 let pale=[.46,.47,.42],dark=[.09,.16,.18];
 world.box(x,8,z,w,h,d,glass,BUILD);
 world.box(x,8,z+d/2+3,w+6,12,7,dark,BUILD);
 world.box(x,20,z+d/2+4,w+8,.8,10,pale,CONCRETE);
 for(let xx=x-w/2+2;xx<=x+w/2-2;xx+=kind===2?5.5:4.5){
  world.box(xx,11,z+d/2+.4,kind===2?.65:.35,h-4,.6,pale,[.36,.58,0,0]);
  world.box(xx,11,z-d/2-.4,kind===2?.65:.35,h-4,.6,pale,[.36,.58,0,0]);
 }
 for(let y=15;y<h+8;y+=kind===0?4.2:kind===1?4.5:4.8){
  world.box(x,y,z+d/2+.5,w,.23,.5,pale,[.35,.55,0,0]);
  world.box(x,y,z-d/2-.5,w,.23,.5,pale,[.35,.55,0,0]);
  for(let side of [-1,1])world.box(x+side*(w/2+.4),y,z,.5,.23,d,pale,[.35,.55,0,0]);
 }
 world.box(x,h+8,z,w*.92,2,d*.9,pale,CONCRETE);
 for(let q=-1;q<=1;q++)world.box(x+q*w*.22,h+10,z,7,3,10,[.3,.32,.3],CONCRETE);
 if(kind===0){for(let side of [-1,1]){world.box(x+side*w*.39,8,z,w*.18,h*.93,d+4,[.31,.37,.36],BUILD);world.box(x+side*w*.39,8+h*.93,z,w*.18,3,d+4,pale,CONCRETE);}}
 if(kind===1){world.box(x-w*.32,8,z,w*.32,h*.92,d+3,[.25,.31,.32],BUILD);world.box(x+w*.32,8,z,w*.25,h*.97,d+3,[.25,.31,.32],BUILD);}
 if(kind===2){for(let y=40;y<h;y+=43)world.box(x,y,z+d/2+.7,w,1.2,.9,[.39,.42,.39],CONCRETE);}
}
world.box(1305,8,-872,350,16,92,[.29,.31,.29],CONCRETE);
// Grand Hyatt: three linked reflective volumes, a recessed central bay and stepped roof.
const hx26=1195,hz26=-880,hotelGlass=[.25,.4,0,12],hotelStone=[.58,.55,.48];
world.box(hx26,24,hz26,58,111,48,[.26,.38,.39],hotelGlass);
for(let side of [-1,1]){
 let x=hx26+side*30;
 world.box(x,24,hz26,19,105,54,[.29,.4,.4],hotelGlass);
 world.box(x,129,hz26,19,4,54,hotelStone,[.5,.28,0,0]);
 for(let y=30;y<129;y+=4.2){world.box(x,y,hz26+27.2,19,.17,.3,[.52,.55,.51],[.45,.4,0,0]);}
 world.box(hx26+side*20,24,hz26+27.2,1.1,107,.8,[.55,.55,.5],[.38,.55,0,0]);
}
world.box(hx26,135,hz26,54,2.2,46,hotelStone,[.5,.28,0,0]);
world.box(hx26,137,hz26,23,3,25,[.3,.34,.32],CONCRETE);
for(let x of [1181,1209])world.box(x,140,hz26,6,2,9,[.25,.29,.28],CONCRETE);
// Hotel entrance on the harbour-side podium: glazed lobby, projecting canopy and forecourt.
world.box(hx26,24,-843,86,15,25,hotelStone,CONCRETE);
world.box(hx26,27,-828.2,40,8,.35,[.08,.18,.2],hotelGlass);
for(let x=1177;x<=1213;x+=6)world.box(x,27,-827.8,.3,8,.4,[.63,.62,.55],[.35,.55,0,0]);
world.box(hx26,35,-822,50,1.1,15,[.46,.46,.42],[.4,.45,0,0]);
for(let x of [1173,1217])world.box(x,24,-816,.8,11,.8,[.56,.56,.52],CONCRETE);
for(let k=0;k<10;k++)world.box(hx26,9+k*1.5,-801-k*2,42,1.5,2.1,[.44,.43,.39],CONCRETE);
// Stepped forecourt and planted beds connect the hotel to the convention podium.
world.box(hx26,8.4,-801,116,.45,34,[.38,.37,.34],CONCRETE);
for(let z of [-814,-808,-802,-796,-790])world.box(hx26,8.87,z,110,.06,.12,[.25,.25,.23],CONCRETE);
for(let x of [1148,1242]){world.box(x,9,-802,12,.8,10,[.48,.46,.39],CONCRETE);world.box(x,9.8,-802,10,1.1,8,[.11,.24,.12],CONCRETE);}
for(let x of [1164,1226]){world.rod([x,9,-797],[x,15,-797],.12,[.43,.46,.43]);world.box(x,15,-797,1.6,.3,.8,[.7,.67,.48],[.4,.2,.15,0]);}
landmark('香港君悅酒店',[1195,143,-880],136);
// Renaissance Harbour View: linked glazed wings, vertical piers and stepped hotel crown.
const rx27=1310,rz27=-891,renGlass=[.23,.4,0,13],officeGlass=[.22,.43,0,14];
world.box(rx27,24,rz27,53,123,48,[.24,.36,.39],renGlass);
for(let side of [-1,1]){
 let x=rx27+side*28;world.box(x,24,rz27,17,side<0?116:121,53,[.25,.37,.39],renGlass);
 world.box(x,side<0?140:145,rz27,17,3,53,[.47,.49,.46],CONCRETE);
 for(let y=30;y<139;y+=4.4)world.box(x,y,rz27+26.8,17,.2,.4,[.48,.51,.48],[.4,.5,0,0]);
 world.box(rx27+side*18,24,rz27+27,1.1,120,.8,[.5,.53,.49],[.4,.55,0,0]);
}
world.box(rx27,147,rz27,51,2,46,[.48,.5,.46],CONCRETE);world.box(rx27,149,rz27,24,4,24,[.28,.31,.3],CONCRETE);
// Entrance glazing and a canopy facing the shared pedestrian podium.
world.box(rx27,24,-852,74,14,23,[.41,.42,.39],CONCRETE);
world.box(rx27,27,-839.8,36,8,.4,[.09,.19,.21],renGlass);
for(let x=1294;x<=1326;x+=5)world.box(x,27,-839.4,.32,8,.5,[.58,.59,.53],[.35,.5,0,0]);
world.box(rx27,35,-833,46,1,14,[.46,.48,.44],[.4,.5,0,0]);
for(let x of [1290,1330])world.box(x,24,-828,.8,11,.8,[.5,.52,.48],CONCRETE);
for(let x of [1275,1345]){world.box(x,24,-820,9,.7,7,[.43,.44,.39],CONCRETE);world.box(x,24.7,-820,7,1,5,[.1,.23,.12],CONCRETE);}
landmark('萬麗海景酒店',[1310,153,-891],149);
// Convention Plaza Office Tower: tall vertically expressed glazing and stone-pier podium.
const ox27=1500,oz27=-895;
world.box(ox27,24,oz27,58,158,47,[.18,.3,.34],officeGlass);
for(let side of [-1,1])world.box(ox27+side*27,24,oz27,4,158,48,[.4,.44,.42],[.42,.55,0,0]);
for(let x=1478;x<=1522;x+=8)world.box(x,24,oz27+24,.42,158,.6,[.48,.53,.51],[.35,.55,0,0]);
for(let y=30;y<182;y+=4.5)world.box(ox27,y,oz27+24.1,58,.16,.5,[.43,.48,.46],[.4,.55,0,0]);
for(let y of [62,105,148])world.box(ox27,y,oz27+24.4,58,1,.8,[.35,.41,.4],[.4,.5,0,0]);
world.box(ox27,182,oz27,58,2,47,[.44,.47,.44],CONCRETE);world.box(ox27,184,oz27,30,3,25,[.28,.31,.3],CONCRETE);
// Lobby piers, entrance terrace, low fountain basin and planted edges.
world.box(ox27,24,-858,65,14,26,[.42,.43,.4],CONCRETE);
world.box(ox27,26,-843.9,40,10,.5,[.1,.2,.22],officeGlass);
for(let x=1470;x<=1530;x+=10)world.box(x,24,-843.2,1.4,14,1.4,[.54,.53,.48],CONCRETE);
world.box(ox27,37,-838,67,1,11,[.48,.49,.45],CONCRETE);
world.box(ox27,24,-824,48,.7,11,[.39,.41,.38],CONCRETE);
world.box(ox27,24.7,-824,44,.2,8,[.1,.28,.31],[.22,.25,0,0]);
for(let x of [1479,1521]){world.box(x,24,-817,8,.7,6,[.48,.46,.41],CONCRETE);world.box(x,24.7,-817,6,1,4,[.11,.25,.12],CONCRETE);}
landmark('會展廣場辦公大樓',[1500,188,-895],181);
world.box(1790,7,-920,60,126,54,[.2,.27,.29],BUILD);
// Wan Chai Star Ferry: light roof, glazed waiting hall, exposed trusses and boarding bridges.
world.box(1810,2,-545,50,7,210,[.23,.26,.24],CONCRETE);
world.box(1810,9,-510,34,8,124,[.14,.23,.25],[.18,.3,0,11]);
world.box(1810,17,-510,44,1.5,138,[.49,.52,.5],[.4,.55,0,0]);
for(let z=-575;z<=-445;z+=10){
 for(let side of [-1,1])world.rod([1810+side*20,9,z],[1810+side*20,20,z],.3,[.65,.67,.63],[.35,.55,0,0]);
 world.rod([1790,20,z],[1830,20,z],.32,[.65,.67,.63],[.35,.55,0,0]);
 world.rod([1790,20,z],[1810,25,z],.28,[.65,.67,.63],[.35,.55,0,0]);
 world.rod([1810,25,z],[1830,20,z],.28,[.65,.67,.63],[.35,.55,0,0]);
}
for(let x of [1790,1810,1830])world.rod([x,20,-575],[x,20,-445],.24,[.65,.67,.63],[.35,.55,0,0]);
for(let z of [-558,-465]){world.box(1840,8,z,18,1.2,8,[.36,.38,.35],CONCRETE);for(let side of [-1,1]){world.rod([1831,10,z+side*4],[1849,10,z+side*4],.15,[.6,.62,.58]);world.rod([1849,4,z+side*4],[1849,10,z+side*4],.15,[.6,.62,.58]);}}
for(let z=-625;z<-410;z+=15)for(let side of [-1,1])world.box(1810+side*25,2,z,1.3,3,2,[.025,.03,.03],CONCRETE);
landmark('灣仔渡輪碼頭',[1810,20,-510],18);
// Wan Chai waterfront character: varied curtain walls, articulated mid-rise buildings and roof plant.
for(let [x,z,w,d,h,kind] of [[1060,-1060,54,55,114,0],[1195,-1100,57,51,168,1],[1275,-1120,48,50,132,2],[1548,-1160,50,50,185,0],[1665,-1120,55,53,140,1],[1735,-1060,47,46,108,2],[1870,-1040,53,47,146,0]]){
 let colors=[[.15,.23,.27],[.31,.29,.25],[.39,.36,.31]], c=colors[kind];
 let split=kind===0?.7:kind===1?.76:.64;
 if(kind===0)bevelBlock(x,z,w,d,7,h*split,c,BUILD,.16);else world.box(x,7,z,w,h*split,d,c,kind===1?[.75,.1,0,6]:[.85,.05,0,7]);
 world.box(x+(kind===2?w*.1:0),7+h*split,z,w*(kind===2?.64:.8),h*(1-split),d*.78,c,kind===1?[.75,.1,0,6]:BUILD);
 world.box(x,7,z+d/2+2,w,7,4,[.12,.17,.17],BUILD);
 world.box(x,14,z+d/2+3,w+1,.5,7,[.4,.4,.36],CONCRETE);
 for(let xx=x-w/2+4;xx<x+w/2;xx+=kind===2?8:6)world.box(xx,9,z+d/2+.35,kind===2?1.1:.4,h-2,.5,kind===1?[.47,.43,.36]:[.36,.42,.42],[.42,.55,0,0]);
 for(let y=22;y<h;y+=kind===2?13:24)world.box(x,y,z+d/2+.45,w,.35,.45,[.32,.36,.35],[.4,.5,0,0]);
 world.box(x,h+7,z,w*.8,2,d*.8,[.3,.32,.3],CONCRETE);
 for(let k=-1;k<=1;k++)world.box(x+k*9,h+9,z,6,3,8,[.27,.29,.28],CONCRETE);
}
// Harbourfront plaza furniture, flower beds, commemorative flagpoles and berth details.
for(let x of [1502,1520,1592,1610]){world.box(x,10.45,-457,10,.65,3,[.33,.32,.28],CONCRETE);world.box(x,11.1,-457,8,.55,1.8,[.24,.18,.12],CONCRETE);}
for(let x of [1510,1604]){world.box(x,10.4,-520,13,.7,5,[.31,.33,.29],CONCRETE);world.box(x,11,-520,11,1.1,3,[.1,.23,.1],CONCRETE);}
for(let x of [1570,1575,1580]){world.rod([x,10.5,-470],[x,26,-470],.13,[.62,.63,.59],cecFrame);world.box(x+1.1,23,-470,2.1,1.5,.08,[.55,.07,.05],[.7,.05,0,0]);}
// Pier pilings, floating pontoons and waiting shelter.
for(let z=-610;z<=-415;z+=22){for(let x of [1786,1834])world.rod([x,-2,z],[x,9,z],.7,[.15,.17,.16],CONCRETE);}
for(let z of [-600,-450]){world.box(1841,3,z,14,2,23,[.18,.2,.19],CONCRETE);world.box(1841,5,z,12,.4,21,[.34,.34,.29],CONCRETE);}
for(let z=-565;z<=-455;z+=11){world.box(1829,10,z,.5,7,.5,[.42,.45,.42],cecFrame);world.box(1829,16,z,1,.4,10,[.33,.38,.35],cecFrame);}
// Navigational marks in the water, capped by distinctive red and green beacons.
for(let [x,z,red] of [[1610,-150,1],[1940,-80,0],[1110,110,1]]){let c=red?[.62,.08,.045]:[.05,.36,.18];world.box(x,.2,z,4,2.2,4,c,[.45,.4,.1,0]);world.rod([x,2.4,z],[x,6,z],.2,c,[.4,.4,.15,0]);world.box(x,5.6,z,1.3,.8,1.3,c,[.35,.35,.5,0]);}
// Hong Kong Observation Wheel, a real 3D wheel on Central harbourfront.
const wheelX=-220,wheelZ=-655;for(let j=0;j<64;j++){let a=j*TAU/64,b=(j+1)*TAU/64;world.rod([wheelX+Math.cos(a)*30,40+Math.sin(a)*30,wheelZ],[wheelX+Math.cos(b)*30,40+Math.sin(b)*30,wheelZ],.5,[.6,.55,.4],[.35,.4,.8,0]);if(j%2===0){world.rod([wheelX,40,wheelZ],[wheelX+Math.cos(a)*30,40+Math.sin(a)*30,wheelZ],.15,[.6,.56,.45]);world.box(wheelX+Math.cos(a)*30,38+Math.sin(a)*30,wheelZ,2,3,2,[.55,.65,.62],[.25,.6,.25,0]);}}world.rod([wheelX-14,8,wheelZ-8],[wheelX,40,wheelZ],1,[.45,.45,.4]);world.rod([wheelX+14,8,wheelZ+8],[wheelX,40,wheelZ],1,[.45,.45,.4]);
// ICC and the West Kowloon shoreline across the harbour.
tower(-1360,1230,[[7,55,48],[420,53,46],[467,46,41],[490,42,37]],'rounded',[.16,.24,.29],16);landmark('ICC 環球貿易廣場',[-1360,492,1230],484);
// Tsim Sha Tsui Clock Tower and Cultural Centre.
world.box(450,7,1100,14,32,14,[.3,.14,.08],[.75,.15,0,0]);world.box(450,39,1100,18,5,18,[.35,.3,.22],[.7,.1,0,0]);world.box(450,44,1100,8,7,8,[.1,.24,.19],[.5,.4,0,0]);world.box(455,32,1107.1,3,3,.1,[.7,.7,.55],[.5,.1,.2,0]);
for(let k=0;k<2;k++)for(let i=0;i<18;i++){let x=500+k*75+i*4;world.box(x,8,1150,4,15+30*Math.sin(i/18*PI),115,[.29,.22,.16],[.7,.15,0,0]);}
// Detailed Central waterfront corridor: roads sit between the towers and promenade.
const ROAD=[.82,.08,0,0],PAINT=[.8,.03,0,0],STEEL=[.4,.65,0,0];
function streetTree(x,z){urbanStats.trees++;world.rod([x,8.5,z],[x,15,z],.32,[.2,.14,.085],CONCRETE);
 for(let cluster=0;cluster<4;cluster++)for(let j=0;j<10;j++)for(let k=0;k<6;k++){
  function point(u,v){let a=u*TAU/10,b=v*PI/6,nn=[Math.cos(a)*Math.sin(b),Math.cos(b),Math.sin(a)*Math.sin(b)];return{p:[x+Math.cos(cluster*2.4)*1.8+nn[0]*2.5,15.8+(cluster%2)*1.2+nn[1]*2.3,z+Math.sin(cluster*2.4)*1.8+nn[2]*2.5],n:nn};}
  let pp=[point(j,k),point(j+1,k),point(j+1,k+1),point(j,k+1)];for(let q of [0,1,2,0,2,3])world.a.push(...pp[q].p,...pp[q].n,0,0,.06+cluster*.011,.135+cluster*.016,.07+cluster*.006,...CONCRETE);
 }}
// Detailed vehicle bodies are built once for moving traffic and reused for parked vehicles.
function vehicleBody(b,x,y,z,type){let bus=type==='bus',tram=type==='tram',taxi=type==='taxi',long=bus||tram,L=bus?11.5:tram?9:4.8,W=tram?2.2:bus?2.6:1.85,H=long?4.6:1.1,c=tram?[.06,.3,.22]:bus?[.7,.49,.19]:taxi?[.62,.035,.035]:[.19,.28,.33],paint=[.3,.55,0,0],glass=[.15,.3,0,0];
 b.box(x,y+.45,z,L,H,W,c,paint);b.box(x,y+.6,z,L+.15,.16,W+.1,[.4,.43,.44],[.3,.8,0,0]);
 if(long){for(let side of [-1,1]){for(let yy of [1.35,3.25])for(let dx=-L/2+.8;dx<L/2-.4;dx+=1.55)b.box(x+dx,y+yy,z+side*(W/2+.02),1.2,1.2,.06,[.035,.095,.12],glass);b.box(x,y+2.7,z+side*(W/2+.03),L,.17,.06,[.88,.73,.42],paint);shopSign(b,x,y+2.25,z+side*(W/2+.07),L*.7,.48,tram?6:4);}
 b.box(x+L/2+.02,y+1.4,z,.06,2.7,W*.85,[.035,.09,.12],glass);b.box(x,y+H+.45,z,L+.2,.2,W+.1,[.6,.61,.52],paint);b.box(x-L*.25,y+H+.65,z,2,.35,1.4,[.3,.34,.33],paint);
 if(tram){b.rod([x-2,y+5,z],[x+1,y+6.8,z],.07,[.38,.4,.37]);b.rod([x+1,y+6.8,z],[x+2,y+5,z],.07,[.38,.4,.37]);}
 }else{b.box(x-.25,y+1.55,z,2.65,.15,W*.8,taxi?[.78,.78,.71]:c,paint);for(let side of [-1,1]){b.quad([x-1.65,y+1.1,z+side*W/2],[x-1.25,y+1.55,z+side*W*.4],[x+1,y+1.55,z+side*W*.4],[x+1.65,y+1.1,z+side*W/2],[.025,.09,.12],glass);b.box(x,y+.7,z+side*(W/2+.015),.04,.4,.04,[.05,.06,.06],paint);}b.quad([x+1.65,y+1.1,z-W/2],[x+1,y+1.55,z-W*.4],[x+1,y+1.55,z+W*.4],[x+1.65,y+1.1,z+W/2],[.055,.12,.15],glass);if(taxi){b.box(x,y+1.7,z,.65,.23,.42,[.85,.81,.61],[.3,.2,.2,0]);shopSign(b,x,y+1.72,z+.22,.6,.2,7);}}
 for(let dx of [-L*.32,L*.32])for(let side of [-1,1]){b.rod([x+dx,y+.48,z+side*(W/2-.12)],[x+dx,y+.48,z+side*(W/2+.16)],long?.48:.36,[.025,.028,.03],[.85,.05,0,0]);b.rod([x+dx,y+.48,z+side*(W/2+.16)],[x+dx,y+.48,z+side*(W/2+.19)],long?.23:.17,[.5,.52,.5],[.3,.8,0,0]);}
 for(let side of [-1,1]){b.box(x+L/2+.04,y+.85,z+side*W*.32,.08,.22,.35,[.9,.85,.6],[.25,.3,2,0]);b.box(x-L/2-.04,y+.85,z+side*W*.32,.08,.22,.3,[.7,.025,.015],[.3,.2,1,0]);}b.box(x+L/2+.06,y+.6,z,.05,.2,.6,[.8,.7,.27],paint);
}
function car(x,z,bus=false,taxi=false){urbanStats.vehicles++;vehicleBody(world,x,8.3,z,bus?'bus':taxi?'taxi':'car');}
for(let x=-1580;x<1900;x+=20){let z=shoreline(x),zn=shoreline(x+20);
 quad([x,8.2,z-79],[x,8.2,z-53],[x+20,8.2,zn-53],[x+20,8.2,zn-79],[.07,.085,.092],ROAD);
 quad([x,8.35,z-53],[x,8.35,z-33],[x+20,8.35,zn-33],[x+20,8.35,zn-53],[.34,.34,.29],CONCRETE);
 for(let off of [-78,-54])world.box(x+10,8.4,shoreline(x+10)+off,18,.08,.18,[.67,.53,.12],PAINT);
 world.box(x+7,8.4,shoreline(x+7)-66,6,.08,.22,[.62,.63,.54],PAINT);
 // Seawall railing and paving joints.
 world.rod([x,9.6,z-2],[x+20,9.6,zn-2],.09,[.32,.38,.38],STEEL);world.rod([x,8,z-2],[x,10,z-2],.09,[.32,.38,.38],STEEL);
 if((x%40+40)%40===20){streetTree(x,z-41);world.box(x,8.4,z-41,7,.45,7,[.29,.3,.25],CONCRETE);world.box(x+9,8.6,z-25,4,.6,1,[.27,.18,.1],CONCRETE);world.box(x+9,9.2,z-25.5,4,.8,.2,[.27,.18,.1],CONCRETE);}
 if((x%80+80)%80===20){world.rod([x,8,z-48],[x,18,z-48],.13,[.27,.31,.32],STEEL);world.rod([x,18,z-48],[x+3,18,z-48],.11,[.27,.31,.32],STEEL);world.box(x+3,17.8,z-48,1.7,.2,.7,[.7,.68,.45],[.4,.2,.2,0]);}
 if((x%120+120)%120===100)car(x,shoreline(x)-60,false,true);
 if((x%200+200)%200===20)car(x,shoreline(x)-72,true);
}
// Marked crossings at the pier approaches.
for(let x of [-1120,-600,-280])for(let dx=-6;dx<=6;dx+=2)world.box(x+dx,8.45,shoreline(x)-66,1, .08,24,[.67,.66,.55],PAINT);
// Enclosed elevated walkways connect the IFC frontage to the pier concourse.
for(let x of [-820,-620]){urbanStats.bridges++;let z0=-808,z1=shoreline(x)-18,mid=(z0+z1)/2,length=z1-z0;
 world.box(x,21,mid,9,1.6,length,[.31,.33,.32],CONCRETE);
 for(let side of [-1,1]){world.box(x+side*4.3,22.6,mid,.22,2.3,length,[.13,.23,.25],[.22,.3,0,0]);for(let z=z0;z<z1;z+=12)world.box(x+side*4.3,22,z,.3,4,.3,[.49,.51,.48],STEEL);}
 world.box(x,26,mid,10,.5,length,[.42,.44,.41],STEEL);
 for(let z of [z0+18,z1-12])world.box(x,8,z,2,13,2,[.33,.34,.31],CONCRETE);
 for(let j=0;j<14;j++)world.box(x+6+j*.8,21-j*.95,z1,1,.95,8,[.34,.35,.31],CONCRETE);
 world.box(x+6,21,z1,12,1.6,9,[.31,.33,.32],CONCRETE);
}
// Street furniture and station entrances, positioned as approximate above-ground landmarks.
function metroEntrance(x,z,index){
 let dark=[.08,.11,.12],frame=[.37,.4,.38];
 world.box(x,8.2,z,16,.45,13,[.35,.35,.31],CONCRETE);
 world.box(x,8.7,z,10,.25,8,dark,ROAD);
 for(let k=0;k<7;k++)world.box(x,8.95+k*.07,z-3+k*.85,8,.08,.28,[.35,.37,.35],CONCRETE);
 for(let side of [-1,1]){world.box(x+side*5,8.7,z, .5,3.1,9,frame,STEEL);world.rod([x+side*4.8,11.9,z-4],[x+side*4.8,11.9,z+4],.12,[.6,.62,.59],STEEL);}
 world.box(x,12,z-4.8,14,1.8,.5,dark,ROAD);
 let u0=index/3+.004,u1=(index+1)/3-.004;
 world.quad([x-6.8,12.1,z-4.48],[x+6.8,12.1,z-4.48],[x+6.8,13.7,z-4.48],[x-6.8,13.7,z-4.48],[1,1,1],[.8,0,0,9],[[u0,1],[u1,1],[u1,0],[u0,0]]);
 for(let side of [-1,1])world.rod([x+side*6.5,8.5,z-4.8],[x+side*6.5,14,z-4.8],.15,frame,STEEL);
}
metroEntrance(-620,-765,0);metroEntrance(-330,-775,1);metroEntrance(420,-1235,2);
for(let [x,z0,z1] of [[-620,-765,shoreline(-620)-80],[-330,-775,shoreline(-330)-80],[420,-1235,-1145]]){
 world.box(x,8.28,(z0+z1)/2,12,.22,z1-z0,[.32,.33,.29],CONCRETE);
 for(let z=z0+12;z<z1-4;z+=24){world.box(x+10,8.5,z,6,.5,6,[.3,.31,.26],CONCRETE);streetTree(x+10,z);world.box(x-8,8.6,z,4,.5,1,[.28,.19,.12],CONCRETE);}
}

// A low civic building and planted public square near the harbour add layers at pedestrian scale.
world.box(650,8,-910,146,27,70,[.43,.42,.37],[.75,.1,0,6]);
world.box(650,35,-910,150,3,73,[.5,.48,.42],CONCRETE);
for(let x=585;x<720;x+=10){world.box(x,8,-873,2,25,2,[.55,.53,.47],CONCRETE);world.box(x,11,-872.6,6,15,.3,[.14,.2,.22],[.3,.3,0,0]);}
world.box(650,8.2,-844,180,.35,54,[.32,.34,.29],CONCRETE);
for(let x=575;x<735;x+=26){world.box(x,8.7,-834,16,.7,8,[.3,.31,.26],CONCRETE);streetTree(x,-834);}
// Crosswalk islands, traffic signals, bus shelters and tactile curb strips.
for(let x of [-1380,-1060,-740,-420,-100,220,540,820]){let z=shoreline(x);
 for(let k=-4;k<=4;k++)world.box(x+k*2,8.47,z-66,1,.08,22,[.64,.63,.53],PAINT);
 for(let side of [-1,1]){let zz=z-66+side*17;world.rod([x+11,8,zz],[x+11,13,zz],.14,[.2,.24,.24],STEEL);world.box(x+11,12,zz,.5,1.2,.4,[.05,.06,.06],ROAD);world.box(x+11,12.8,zz,.3,.25,.3,[.65,.15,.05],[.4,.1,.3,0]);}
}
for(let x of [-1250,-850,-450,150,650]){let z=shoreline(x)-47;world.box(x,8.5,z,12,.4,3,[.25,.27,.25],CONCRETE);for(let side of [-1,1])world.rod([x+side*5,9,z],[x+side*5,12,z],.1,[.4,.43,.4],STEEL);world.box(x,12,z,12,.25,3.5,[.35,.38,.37],STEEL);world.box(x,9,z+1.2,10,2,.1,[.11,.2,.22],[.25,.3,0,0]);}
// Human-scale streetscape: detailed Central waterfront block.
for(let x=-1080;x<=-720;x+=18){let z=shoreline(x);
 // Inland pavement with paving seams and a glazed shop frontage behind the road.
 world.box(x+9,8.3,z-88,18,.14,16,[.33,.34,.31],CONCRETE);
 for(let k=0;k<3;k++)world.box(x+k*6,8.46,z-88,.12,.05,16,[.18,.19,.18],ROAD);
 world.box(x+9,8,z-106,16,8,14,[.29,.3,.28],CONCRETE);
 world.box(x+9,9,z-98.9,14,5,.15,[.055,.12,.14],[.2,.3,0,0]);
 for(let dx=-6;dx<=6;dx+=3)world.box(x+9+dx,9,z-98.75,.17,5,.15,[.46,.47,.44],STEEL);
 world.box(x+9,14,z-97.3,16,.3,3,[.29,.32,.3],STEEL);
 // Planters, bollards, bollard lights and road-edge drainage.
 world.box(x+5,8.5,z-94,2,.5,2,[.3,.3,.27],CONCRETE);
 world.box(x+5,9,z-94,1.4,.4,1.4,[.08,.19,.08],CONCRETE);
 world.box(x+13,8.45,z-80,1,.08,1.4,[.09,.1,.1],ROAD);
 world.rod([x+3,8.4,z-82],[x+3,9.6,z-82],.12,[.31,.34,.32],STEEL);
}
// Prominent sheltered bus stop, road-facing bench, route board and kerb.
{let x=-850,z=shoreline(x)-47;
 world.box(x,8.5,z,16,.35,4,[.31,.32,.3],CONCRETE);
 for(let xx of [-7,7])for(let zz of [-1.5,1.5])world.rod([x+xx,9,z+zz],[x+xx,13,z+zz],.13,[.48,.51,.49],STEEL);
 world.box(x,13,z,16,.35,5,[.48,.5,.46],STEEL);
 world.box(x,9.2,z+1.8,14,3,.12,[.11,.22,.24],[.24,.3,0,0]);
 world.box(x,9,z,8,.35,1,[.32,.2,.12],CONCRETE);
 world.box(x+6,9,z-1.5,1.4,3,.2,[.58,.61,.52],CONCRETE);
 world.box(x-12,8.45,z-12,18,.08,.22,[.76,.66,.23],PAINT);
 car(x-18,z-13,true);
}
// Signal heads with distinct coloured lenses and a wider refuge island.
{let x=-820,z=shoreline(x),zz=z-50;world.box(x,8.5,zz,5,.4,2,[.42,.42,.37],CONCRETE);world.rod([x,8.8,zz],[x,13,zz],.16,[.25,.27,.26],STEEL);world.box(x,11.5,zz,.7,1.8,.6,[.04,.05,.05],ROAD);for(let k=0;k<3;k++)world.box(x,12.9-k*.45,zz+.32,.27,.26,.08,[[.8,.06,.035],[.6,.34,.025],[.05,.55,.2]][k],[.3,.1,k===0?.5:.05,0]);}
// Convention Avenue: a planted approach, traffic markings and elevated connection.
for(let x=1080;x<1850;x+=20){let z=shoreline(x);
 for(let t=0;t<4;t++)world.box(x+2+t*5,8.48,z-66,2,.05,.16,[.68,.66,.57],PAINT);
 if(x%80===40){world.box(x,8.5,z-41,6,.4,6,[.3,.31,.27],CONCRETE);streetTree(x,z-41);}
}
// Covered elevated walk from Central Plaza towards the convention district.
world.box(1440,23,-885,9,1.4,185,[.32,.34,.33],CONCRETE);world.box(1440,28,-885,10,.4,185,[.4,.43,.42],STEEL);
for(let z=-970;z<=-800;z+=16)for(let side of [-1,1])world.box(1440+side*4.5,24,z,.3,4,.3,[.46,.49,.47],STEEL);
for(let z of [-960,-850])world.box(1440,8,z,2.2,15,2.2,[.34,.37,.36],CONCRETE);
// Wan Chai district: elevated links join hotel entrances and the convention concourse.
for(let [x0,x1,z] of [[1154,1348,-817],[1348,1460,-817],[1460,1534,-817]]){
 let mid=(x0+x1)/2,len=x1-x0;
 world.box(mid,24,z,len,.7,9,[.39,.4,.37],CONCRETE);
 for(let side of [-1,1]){
  world.rod([x0,26.1,z+side*4],[x1,26.1,z+side*4],.12,[.56,.58,.55],STEEL);
  for(let x=x0;x<=x1;x+=8)world.rod([x,24.7,z+side*4],[x,26.1,z+side*4],.1,[.49,.52,.49],STEEL);
 }
}
// Covered passages and planted terraces alongside the public podium.
for(let [x0,x1,z] of [[1228,1280,-836],[1348,1408,-836],[1462,1500,-832]]){
 let mid=(x0+x1)/2,len=x1-x0;world.box(mid,29,z,len,.55,7,[.44,.46,.43],STEEL);
 for(let x=x0;x<=x1;x+=10)for(let side of [-1,1])world.box(x,24,z+side*3,.25,5,.25,[.51,.53,.5],STEEL);
}
for(let x of [1255,1355,1405,1454]){
 world.box(x,24.7,-817,8,.6,5,[.43,.43,.38],CONCRETE);world.box(x,25.3,-817,6.5,1.2,3.5,[.1,.23,.12],CONCRETE);
}
// Harbour Road inspired cross streets: lane markings, crossing stripes and kerbs.
for(let [a,b] of [[1070,1360],[1535,1880]]){
 let mid=(a+b)/2,len=b-a;world.box(mid,8.16,-986,len,.15,23,[.07,.085,.088],ROAD);
 for(let z of [-998,-974])world.box(mid,8.4,z,len,.2,2,[.32,.33,.3],CONCRETE);
 for(let x=a+12;x<b-10;x+=16)world.box(x,8.36,-986,7,.08,.2,[.65,.65,.57],PAINT);
 for(let x=a+20;x<b-10;x+=85){
  for(let k=-3;k<=3;k++)world.box(x+k*1.8,8.4,-986,.9,.08,20,[.72,.69,.56],PAINT);
  for(let z of [-1000,-972]){world.rod([x+8,8.5,z],[x+8,14,z],.15,[.28,.31,.3],STEEL);world.box(x+8,12,z,.8,1.7,.7,[.055,.06,.06],ROAD);world.box(x+8,13.1,z+.4,.26,.26,.1,[.65,.06,.04],[.3,.1,.3,0]);}
 }
}
// Kerbside bus shelters and signage.
for(let x of [1105,1320,1615,1815]){
 world.box(x,8.5,-970,17,.35,5,[.33,.34,.31],CONCRETE);
 for(let dx of [-7,7])world.rod([x+dx,8.9,-970],[x+dx,12.5,-970],.15,[.48,.51,.48],STEEL);
 world.box(x,12.5,-970,17,.4,5,[.42,.44,.41],STEEL);
 world.box(x,9.2,-968,15,2.5,.15,[.13,.24,.25],[.2,.4,0,0]);
 world.rod([x+10,8.5,-970],[x+10,14,-970],.15,[.3,.32,.31],STEEL);
 world.box(x+10,12.5,-970,1.6,1.1,.3,[.64,.16,.12],[.5,.1,0,0]);
}
// Recognisable Hong Kong double-decker buses and red taxis, parked for scene readability.
for(let x of [1140,1635,1760])car(x,-992,true);
for(let x of [1180,1250,1570,1710,1840])car(x,-980,false,true);
// Raised covered approach from promenade to the Wan Chai ferry berth.
world.box(1765,10.1,-490,58,.4,14,[.36,.38,.35],CONCRETE);
for(let x=1738;x<=1792;x+=9){for(let z of [-496,-484])world.rod([x,10.5,z],[x,14,z],.14,[.53,.56,.53],STEEL);world.rod([x,14,-496],[x,14,-484],.16,[.53,.56,.53],STEEL);}
world.box(1765,14,-490,58,.4,14,[.48,.51,.48],STEEL);
for(let z of [-575,-535,-495,-455]){world.box(1840,7,z,15,1,12,[.3,.32,.3],CONCRETE);for(let side of [-1,1])world.rod([1833,9,z+side*5],[1847,9,z+side*5],.12,[.52,.55,.52],STEEL);}
// Pier pontoons, pitched roofs, open colonnades, passenger windows and rubber fenders.
for(let x of [-600,-440,-280]){
 world.box(x,2,-530,42,7,180,[.18,.21,.19],CONCRETE);
 world.box(x,9,-520,31,5,125,[.21,.27,.23],BUILD);
 for(let z=-578;z<-462;z+=12)for(let side of [-1,1])world.box(x+side*15,14,z,.65,7,.65,[.48,.5,.43],CONCRETE);
 for(let side of [-1,1])quad([x,24,-585],[x+side*21,20,-585],[x+side*21,20,-455],[x,24,-455],[.12,.25,.19],[.56,.35,0,0]);
 world.box(x,14,-520,32,.5,128,[.46,.48,.41],CONCRETE);
 for(let z=-610;z<-445;z+=15)for(let side of [-1,1])world.box(x+side*21,2,z,1.4,3,2.2,[.025,.035,.035],ROAD);
 world.box(x,9,-444,30,.5,8,[.28,.3,.28],CONCRETE);
}
// Secondary urban streets follow the existing procedural block spacing on both banks.
// Test each segment against real building collision bounds, so lanes do not run through towers.
let innerStats={eastWest:0,crossStreet:0,streetlights:0,crossings:0};
function streetSurface(x,z,w,d,y,c,m){world.quad([x-w/2,y,z-d/2],[x-w/2,y,z+d/2],[x+w/2,y,z+d/2],[x+w/2,y,z-d/2],c,m);}
function openStreet(x,z,w,d){return !collisionBoxes.some(b=>b.y>=6&&b.h>20&&Math.abs(x-b.x)<(w+b.w)*.5+3&&Math.abs(z-b.z)<(d+b.d)*.5+3);}
for(let side of [-1,1])for(let row=0;row<6;row++){
 for(let x=-2300;x<2300;x+=20){let z=side<0?shoreline(x)-221-row*152:northshore(x)+185+row*150;
  if(!openStreet(x+10,z,20,24))continue;innerStats.eastWest++;
  let furnitureIndex=Math.round((x+2300)/20)+row;
  if(furnitureIndex%9===0){let zz=z+10;world.box(x+8,8.5,zz,4,.4,1,[.32,.21,.12],CONCRETE);world.box(x+8,8.9,zz+.4,4,.85,.16,[.32,.21,.12],CONCRETE);world.box(x+13,8.5,zz,.9,1.3,.9,[.1,.28,.23],CONCRETE);for(let dx of [2,17])world.rod([x+dx,8.5,zz-1.7],[x+dx,9.3,zz-1.7],.13,[.4,.42,.38],STEEL);cityDetail.streetFurniture++;}
  // Double yellow kerb lines and individual paving joints.
  for(let dz of [-7.2,-6.7])streetSurface(x+10,z+dz,19,.14,8.45,[.75,.55,.15],PAINT);
  for(let dx=0;dx<20;dx+=4)for(let flank of [-1,1])streetSurface(x+dx,z+flank*10,.07,3.8,8.46,[.19,.22,.22],ROAD);

  streetSurface(x+10,z,20,16,8.28,[.085,.095,.095],ROAD);
  for(let q of [-10,10])streetSurface(x+10,z+q,20,4,8.4,[.29,.3,.27],CONCRETE);
  for(let t=0;t<1;t++)streetSurface(x+10,z,8,.18,8.42,[.62,.61,.52],PAINT);
  if((Math.round((x+2300)/20)+row)%24===0){world.rod([x+15,8,z+10],[x+15,15,z+10],.12,[.26,.29,.28],STEEL);world.rod([x+15,15,z+10],[x+18,15,z+10],.1,[.26,.29,.28],STEEL);world.box(x+18,14.8,z+10,1.2,.2,.5,[.65,.63,.43],[.4,.1,.2,0]);innerStats.streetlights++;}
  if((Math.round((x+2300)/20)+row)%42===0)car(x+10,z+3,false,true);
 }
}
// Cross streets connect successive rows, with stripes and compact pedestrian furniture.
for(let side of [-1,1])for(let col=0;col<16;col++){let x=-2160+col*284;
 for(let row=0;row<5;row++){let z0=side<0?shoreline(x)-221-row*152:northshore(x)+185+row*150,z1=z0+side*152;
  for(let j=0;j<6;j++){let a=z0+(z1-z0)*j/6,b=z0+(z1-z0)*(j+1)/6,mid=(a+b)/2;
   if(!openStreet(x,mid,22,Math.abs(b-a)))continue;innerStats.crossStreet++;
   streetSurface(x,mid,14,Math.abs(b-a),8.29,[.08,.09,.09],ROAD);
   for(let q of [-9,9])streetSurface(x+q,mid,4,Math.abs(b-a),8.41,[.29,.3,.27],CONCRETE);
   streetSurface(x,mid,.18,Math.abs(b-a)*.46,8.43,[.58,.58,.51],PAINT);
   if(j===0&&col%4===0&&row%2===0&&openStreet(x+15,a+side*8,7,7)){streetTree(x+15,a+side*8);world.box(x+15,8.42,a+side*8,6,.4,6,[.29,.31,.27],CONCRETE);}
   if(j===0&&col%3===1&&openStreet(x-16,a+side*8,10,5)){
    let zz=a+side*8;world.box(x-16,8.45,zz,9,.3,3,[.3,.31,.29],CONCRETE);
    for(let dx of [-4,4])world.rod([x-16+dx,8.8,zz],[x-16+dx,12,zz],.1,[.4,.43,.41],STEEL);
    world.box(x-16,12,zz,9,.3,3,[.39,.41,.39],STEEL);world.box(x-16,9,zz+1.3,8,2,.1,[.1,.19,.21],[.25,.3,0,0]);
   }
   if(j===0){for(let k=-3;k<=3;k++)streetSurface(x+k*1.8,a+side*5,1,4,8.44,[.64,.64,.55],PAINT);innerStats.crossings++;}
  }
 }
}
// Broad, layered island mountain backdrop follows the city instead of isolated cones.
function hill(x,z){let edge=clamp((-z-1650)/1250,0,1);let peak=250*Math.exp(-Math.pow((x+900)/950,2))+165*Math.exp(-Math.pow((x-550)/1050,2))+65*Math.exp(-Math.pow((x+2200)/700,2));let ridges=24*Math.sin(x*.0021)+15*Math.sin(x*.0044+z*.0005)+30*Math.cos((z+2600)*.0012);return edge*Math.max(0,100+peak+ridges);}
for(let ix=0;ix<100;ix++)for(let iz=0;iz<18;iz++){let x=-6500+ix*130,z=-1650-iz*140,pp=[[x,hill(x,z),z],[x+130,hill(x+130,z),z],[x+130,hill(x+130,z-140),z-140],[x,hill(x,z-140),z-140]];for(let j of [0,1,2,0,2,3]){let p=pp[j],n=norm([hill(p[0]-3,p[2])-hill(p[0]+3,p[2]),6,hill(p[0],p[2]-3)-hill(p[0],p[2]+3)]);world.a.push(...p,...n,0,0,.045,.075,.075,.95,.02,0,0);}}
// Tram rails are an interpreted short street segment, not a surveyed route.
for(let zz of [-988.5,-987.1]){world.rod([1080,8.5,zz],[1350,8.5,zz],.055,[.4,.43,.44],[.25,.8,0,0]);}
for(let xx=1080;xx<=1350;xx+=45){world.rod([xx,8.5,-973],[xx,16,-973],.09,[.25,.29,.28]);world.rod([xx,16,-973],[xx,16,-989],.06,[.25,.29,.28]);if(xx<1350)world.rod([xx,16,-987.8],[xx+45,16,-987.8],.035,[.15,.18,.18]);}
let worldMesh=world.mesh(),wetMesh=wet.mesh(),waterMesh=waterB.mesh();
function ferryGeometry(){let b=new Builder(),green=[.055,.23,.14],cream=[.62,.61,.49],glass=[.025,.075,.09],m=[.45,.25,0,0];
 let rings=[[-25,0],[-20,5.5],[-12,6],[12,6],[20,5.5],[25,0]];
 for(let j=0;j<rings.length-1;j++){let [za,wa]=rings[j],[zb,wb]=rings[j+1];for(let side of [-1,1]){b.quad([side*wa,-1,za],[side*wb,-1,zb],[side*wb,4,zb],[side*wa,4,za],green,m);b.quad([0,4,za],[side*wa,4,za],[side*wb,4,zb],[0,4,zb],cream,m);}}
 b.box(0,4,0,10.5,2.9,38,cream,m);b.box(0,7,0,12,.45,43,green,m);b.box(0,7.45,0,10.5,2.8,34,cream,m);b.box(0,10.25,0,12,.5,39,green,m);
 for(let y of [4.6,8])for(let z=-15;z<=15;z+=3)for(let side of [-1,1])b.box(side*5.3,y,z,.12,1.6,2,glass,[.2,.3,0,0]);
 for(let z of [-17,17]){b.box(0,8,z,8,1.9,.15,glass,[.2,.3,0,0]);b.box(0,10.7,z,7,.3,5,cream,m);}
 b.box(0,10.7,1,3,3,3,green,m);b.box(0,13.7,1,3.5,.45,3.5,[.08,.09,.08],m);
 for(let z of [-13,13]){b.box(0,7.55,z,7,.18,.5,[.42,.38,.24],m);for(let x of [-3,3])b.rod([x,7,z],[x,10,z],.1,cream,m);}
 for(let side of [-1,1])for(let z=-14;z<=14;z+=7){b.box(side*5.45,7.1,z, .25,.25,3,green,m);b.box(side*5.45,4.2,z,.25,.25,3,green,m);}
 b.rod([0,11,-8],[0,16,-8],.12,cream,m);
 for(let side of [-1,1]){b.rod([side*5.7,5,-22],[side*5.7,5,22],.1,cream,m);for(let z=-20;z<22;z+=5)b.rod([side*5.7,4,z],[side*5.7,5,z],.08,cream,m);}
 return b.mesh();}
let ferryMesh=ferryGeometry(),wakeB=new Builder();
for(let side of [-1,1])for(let j=0;j<24;j++){let t=j/24,t1=(j+1)/24,z=18+t*110,z1=18+t1*110,x=side*(5+t*30),x1=side*(5+t1*30),width=2+t*7;wakeB.quad([x-width,.14,z],[x+width,.14,z],[x1+width,.14,z1],[x1-width,.14,z1],[.4,.6,.6],[1,0,0,8],[[0,t],[1,t],[1,t1],[0,t1]]);}
wakeB.quad([-2,.16,23],[2,.16,23],[6,.16,105],[-6,.16,105],[.4,.6,.6],[1,0,0,8],[[0,0],[1,0],[1,1],[0,1]]);
let wakeMesh=wakeB.mesh();
function ferryState(i,t=time){if(i===3){let a=t*.006;return{pos:[1670+110*Math.sin(a),.1+Math.sin(t*.7)*.15,-190+90*Math.cos(a)],yaw:Math.atan2(-110*Math.cos(a),90*Math.sin(a)),roll:Math.sin(t*.5)*.007};}let a=t*.007+i*1.8-1.1,rx=90+i*25,rz=510-i*35,cx=-600+i*350,cz=270;let vx=-rx*Math.sin(a),vz=rz*Math.cos(a);return{pos:[cx+rx*Math.cos(a),.1+Math.sin(t*.7+i)*.15,cz+rz*Math.sin(a)],yaw:Math.atan2(-vx,-vz),roll:Math.sin(t*.5+i)*.007};}
const roadMeshes={};for(let type of ['bus','taxi','car','tram']){let b=new Builder();vehicleBody(b,0,0,0,type);roadMeshes[type]=b.mesh();}
// Only route traffic along contiguous sections clear of collision geometry.
const roadRoutes=[[],[]];for(let lane=0;lane<2;lane++){let start=null;for(let x=-1450;x<=1650;x+=4){let z=shoreline(x)-(lane?60:72),clear=x<1650&&!firstCollision([x,8.3,z],[x,13.5,z],7);if(clear&&start===null)start=x;if(!clear&&start!==null){if(x-start>100)roadRoutes[lane].push([start+8,x-12]);start=null;}}}
function roadVehicle(i,t=time){let lane=i%2,dir=lane?1:-1,routes=roadRoutes[lane],route=routes[Math.floor(i/2)%routes.length],L=route[1]-route[0],speed=7+(i%3)*2,x=route[0]+((i*47+t*speed*dir)%L+L)%L,z=shoreline(x)-(lane?60:72),slope=(shoreline(x+1)-shoreline(x-1))/2;return{pos:[x,8.3,z],yaw:-Math.atan(slope)+(dir<0?PI:0),type:i%5===0?'bus':i%3===0?'car':'taxi'};}
function drawHarbourTraffic(isRef){
 let trafficTime=mode==='study'?0:time;for(let i=0;i<18;i++){let v=roadVehicle(i,trafficTime);draw(roadMeshes[v.type],model(v.pos,v.yaw));}
 let tx=1215+120*Math.sin(trafficTime*.025);draw(roadMeshes.tram,model([tx,8.4,-987.8],Math.cos(trafficTime*.025)<0?PI:0));
for(let i=0;i<4;i++){let f=ferryState(i);draw(ferryMesh,model(f.pos,f.yaw,0,f.roll));if(!isRef)draw(wakeMesh,model([f.pos[0],0,f.pos[2]],f.yaw));}}
function jetMesh(enemy=false,heavy=false){let b=new Builder(),c=enemy?[.62,.64,.61]:heavy?[.33,.38,.36]:[.42,.5,.55],m=[.3,.7,0,5],dark=[.045,.065,.08],trim=enemy?[.78,.09,.045]:heavy?[.59,.37,.12]:[.13,.32,.43];
// Smooth segmented fuselage, with radial UVs for aircraft skin, seams and rivets.
function body(rings,color,mat,shift=[0,0,0],segments=20){for(let k=0;k<rings.length-1;k++){let [z0,rx0,ry0,cy0]=rings[k],[z1,rx1,ry1,cy1]=rings[k+1];for(let j=0;j<segments;j++){let a=j*TAU/segments,d=(j+1)*TAU/segments,point=(z,rx,ry,cy,t)=>add([Math.cos(t)*rx,Math.sin(t)*ry+cy,z],shift);let pp=[point(z0,rx0,ry0,cy0,a),point(z0,rx0,ry0,cy0,d),point(z1,rx1,ry1,cy1,d),point(z1,rx1,ry1,cy1,a)],nn=[a,d,d,a].map(t=>norm([Math.cos(t),Math.sin(t),-(rx1-rx0)/(z1-z0)]));let uvs=[[j/segments,k/(rings.length-1)],[(j+1)/segments,k/(rings.length-1)],[(j+1)/segments,(k+1)/(rings.length-1)],[j/segments,(k+1)/(rings.length-1)]];for(let q of [0,1,2,0,2,3])b.a.push(...pp[q],...nn[q],...uvs[q],...color,...mat);}}}
body([[-12,.035,.035,0],[-10,.5,.5,0],[-7,1.05,.85,0],[-3,1.5,1.05,0],[1,1.65,1.15,0],[5,1.25,1,0],[8,1.05,.9,0],[8.5,.95,.83,0]],c,m);
body([[-8,.02,.02,.5],[-6,.6,.65,.7],[-3,.85,1.05,1],[-.8,.6,.5,1.1],[.3,.02,.02,1]], [.065,.23,.32],[.06,.92,.12,0]);
function fin(points,color,mat=m,thick=.1){let down=points.map(p=>[p[0],p[1]-thick,p[2]]);b.quad(...points,color,mat);b.quad(...down.slice().reverse(),color,mat);for(let i=0;i<4;i++)b.quad(points[i],down[i],down[(i+1)%4],points[(i+1)%4],color,mat);}
for(let side of [-1,1]){fin([[side*.9,0,-5],[side*8.5,-.1,2.7],[side*8.8,-.1,4.5],[side*1.1,0,4.7]],c);fin([[side*8,-.08,2.4],[side*8.5,-.1,2.7],[side*8.8,-.1,4.5],[side*7.8,-.08,4.5]],trim);fin([[side*.8,.3,5],[side*4.1,.25,7.9],[side*3.8,.25,9],[side*.7,.3,8]],c);fin([[side*.8,.6,3.5],[side*2.4,4.7,6.7],[side*2.3,4.6,8.6],[side*.9,.5,8]],trim);b.box(side*1.3,-.8,-1,1.2,.7,3.7,dark,[.8,.2,0,0]);b.box(side*4,-.8,2,.25,.9,2,c,m);body([[-3,.02,.02,0],[-2,.16,.16,0],[2.5,.16,.16,0],[3,.1,.1,0]],[.68,.7,.66],m,[side*4,-1.3,2],8);b.box(side*8.5,-.05,3.4,.25,.12,.65,side>0?[.1,1,.5]:[1,.08,.04],[.2,.1,4,0]);}
// Recessed engine nozzle and luminous afterburner sit inside concentric rings.
body([[7.8,1.05,.9,0],[8.6,.95,.82,0],[9,.85,.74,0]],[.065,.08,.09],[.48,.9,0,5]);body([[8.65,.72,.62,0],[9.15,.68,.59,0],[10.3,.12,.1,0]],enemy?[1,.3,.055]:[.22,.55,1],[.1,.1,4,0]);
for(let side of [-1,1]){b.rod([side*.7,.8,-4.9],[side*.7,1,-1],.025,[.65,.7,.73],[.24,.9,0,5]);b.box(side*5,.03,2.9,.8,.05,1.8,trim,[.5,.2,0,5]);}return b.mesh();}
// Fictional opposing fighters inspired by F-16 and F-15 profiles, generated as real 3D meshes.
function opposingFighter(twin=false){
 let b=new Builder(),skin=[.34,.39,.4],dark=[.075,.09,.10],panel=[.24,.28,.29],edge=[.5,.52,.49],mark=[.73,.17,.10],m=[.38,.68,0,5],cockpit=[.055,.17,.2];
 function tube(rings,col,mat,dx=0){for(let k=0;k<rings.length-1;k++){let [z,a,h,cy]=rings[k],[z1,a1,h1,cy1]=rings[k+1];for(let j=0;j<20;j++){let t=j*TAU/20,u=(j+1)*TAU/20;let p=(zz,rx,ry,cc,v)=>[dx+Math.cos(v)*rx,cc+Math.sin(v)*ry,zz];b.quad(p(z,a,h,cy,t),p(z1,a1,h1,cy1,t),p(z1,a1,h1,cy1,u),p(z,a,h,cy,u),col,mat,[[j/20,k/rings.length],[j/20,(k+1)/rings.length],[(j+1)/20,(k+1)/rings.length],[(j+1)/20,k/rings.length]]);}}}
 function slab(v,col,mat=m){let vv=v.map(p=>[p[0],p[1]-.12,p[2]]);b.quad(...v,col,mat);b.quad(vv[3],vv[2],vv[1],vv[0],col,mat);for(let i=0;i<4;i++)b.quad(v[i],vv[i],vv[(i+1)%4],v[(i+1)%4],col,mat);}
 function upright(v,col){b.tri(v[0],v[1],v[2],col,m);b.tri(v[0],v[2],v[3],col,m);b.tri(v[2],v[1],v[0],col,m);b.tri(v[3],v[2],v[0],col,m);}
 // Long pointed radome and blended fuselage with a clear cockpit bubble.
 tube([[-12,.025,.025,0],[-10,.48,.42,0],[-7,.85,.7,0],[-3,1.35,.95,0],[1,twin?2.05:1.5,1.05,0],[5,twin?2.1:1.25,.92,0],[8,twin?1.9:1.0,.75,0],[9,twin?1.7:.9,.65,0]],skin,m);
 tube([[-12,.025,.025,0],[-10,.48,.42,0],[-9.4,.59,.5,0]],dark,[.6,.2,0,0]);
 tube([[-7,.02,.02,.57],[-5.8,.57,.49,.8],[-3.8,.78,.7,1.02],[-1.8,.58,.55,.99],[-.8,.02,.02,.8]],cockpit,[.1,.45,.03,0]);
 for(let side of [-1,1]){
  // Swept leading edges and separate rear stabilisers.
  slab([[side*.9,.05,-4.5],[side*(twin?7.9:7.4),-.08,1.4],[side*(twin?8.4:7.8),-.08,3.2],[side*1.3,.05,3.5]],skin);
  slab([[side*.9,.25,5.1],[side*4.3,.17,7.6],[side*3.8,.17,9],[side*.9,.25,8.2]],panel);
  b.rod([side*1,.14,-4.1],[side*(twin?7.5:7),.04,1.5],.045,edge,m);
  b.box(side*5.8,.02,2.4,.62,.08,1.2,mark,[.45,.3,0,0]);
  // Under-wing pylons and missile-shaped stores.
  b.box(side*4.1,-.48,1.3,.22,.65,1.9,panel,m);
  tube([[-2,.02,.02,0],[-1.3,.12,.12,0],[2.1,.12,.12,0],[2.7,.03,.03,0]],edge,m,side*4.1);
  if(twin){upright([[side*1.25,.65,4],[side*2,4.7,6],[side*2.1,4.7,8.2],[side*1.3,.65,8.3]],skin);b.box(side*1.65,.1,0,1.15,1.1,3.3,dark,[.7,.2,0,0]);}
 }
 if(!twin){
  // F-16 inspired single fin and ventral intake.
  upright([[0,.9,3.6],[0,5.2,5.4],[0,5.2,7.1],[0,.9,8]],skin);
  b.box(0,-1.13,-1.3,1.35,.65,3.6,panel,m);b.box(0,-1.03,-3.15,1.1,.44,.12,dark,[.7,.1,0,0]);
  tube([[8.2,.88,.7,0],[9.1,.78,.62,0],[9.5,.75,.58,0]],dark,[.35,.7,0,0]);
  tube([[9.2,.58,.48,0],[9.7,.53,.42,0],[10.4,.1,.08,0]],[1,.35,.1],[.1,.1,3,0]);
 }else{
  // F-15 inspired paired exhausts and outboard vertical tails.
  for(let side of [-1,1]){tube([[7.2,.8,.68,0],[9,.72,.61,0],[9.7,.66,.56,0]],dark,[.35,.7,0,0],side*.95);tube([[9,.52,.43,0],[9.8,.46,.38,0],[10.6,.1,.08,0]],[1,.33,.08],[.1,.1,3,0],side*.95);}
 }
 return b.mesh();
}
let scrapB=new Builder();scrapB.tri([-2,0,-2],[2,.15,1],[-1,.25,2],[.34,.4,.43],[.4,.8,0,5]);scrapB.tri([-1,.25,2],[2,.15,1],[-2,0,-2],[.16,.2,.22],[.5,.8,0,5]);scrapB.box(0,-.3,0,.22,.3,3,[.1,.14,.16],[.6,.8,0,5]);let debrisMesh=scrapB.mesh();let playerMesh=jetMesh(),heavyMesh=jetMesh(false,true),enemyMesh=opposingFighter(false),enemyHeavyMesh=opposingFighter(true),pb=new Builder();pb.box(0,-.5,0,1,1,1,[1,.25,.045],[.5,.1,5,0]);let particleMesh=pb.mesh(),bulletB=new Builder();bulletB.box(0,-.1,0,.22,.22,6,[1,.65,.15],[.3,.1,5,0]);let bulletMesh=bulletB.mesh();let enemyTraceB=new Builder();enemyTraceB.box(0,-.18,0,.36,.36,9,[1,.08,.035],[.3,.1,6,0]);let enemyTraceMesh=enemyTraceB.mesh();
let fb,resolveF,sceneTex,normalTex,depthRB,msColor,msNormal,refF,refTex,refDepth,bloomF=[],bloomTex=[],bW,bH,samples=1;
let shadowMaps=[],shadowQuality='',shadowsEnabled=true;
function orthographic(radius,near,far){return new Float32Array([1/radius,0,0,0,0,1/radius,0,0,0,0,-2/(far-near),0,0,0,-(far+near)/(far-near),1]);}
function buildShadowMaps(){
 if(shadowQuality===quality)return;
 for(let m of shadowMaps){gl.deleteTexture(m.tex);gl.deleteFramebuffer(m.fbo);gl.deleteRenderbuffer(m.depth);}
 shadowMaps=[];gl.disable(gl.DITHER);let light=norm([-.75,.32,.58]);
 for(let spec of [{center:[-690,205,-920],radius:510,distance:2600,far:5400,size:quality==='high'?2048:1024},{center:[0,220,0],radius:6600,distance:13000,far:27000,size:quality==='high'?2048:1024}]){
  let tex=texture(spec.size,spec.size);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  let fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);attach(tex);gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  let depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,spec.size,spec.size);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);check();
  let vp=mm(orthographic(spec.radius,1,spec.far),look(add(spec.center,mul(light,spec.distance)),spec.center));
  gl.viewport(0,0,spec.size,spec.size);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);use(shadowP);m4(shadowP,'lightVP',vp);gl.bindVertexArray(worldMesh.vao);gl.drawArrays(gl.TRIANGLES,0,worldMesh.count);
  shadowMaps.push({tex,fbo,depth,vp,size:spec.size});
 }
 shadowQuality=quality;gl.enable(gl.DITHER);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
function texture(w,h){let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}function attach(tex){gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0)}function check(){if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('畫面緩衝區未能初始化。請試用流暢模式或重新開啟瀏覽器。')}
function resize(){let dpr=Math.min(devicePixelRatio||1,quality==='high'?1.65:1);let max=quality==='high'?1700:1000;let scale=Math.min(1,max/(innerWidth*dpr));W=Math.max(2,Math.floor(innerWidth*dpr*scale));H=Math.max(2,Math.floor(innerHeight*dpr*scale));canvas.width=W;canvas.height=H;aspect=W/H;
for(let f of [fb,resolveF,refF,...bloomF])if(f)gl.deleteFramebuffer(f);for(let t of [sceneTex,normalTex,refTex,...bloomTex])if(t)gl.deleteTexture(t);for(let r of [depthRB,msColor,msNormal,refDepth])if(r)gl.deleteRenderbuffer(r);
sceneTex=texture(W,H);normalTex=texture(W,H);resolveF=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,resolveF);attach(sceneTex);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,normalTex,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);check();samples=Math.min(quality==='high'?4:2,gl.getParameter(gl.MAX_SAMPLES));fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);function rb(format,att){let r=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,r);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,format,W,H);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,att,gl.RENDERBUFFER,r);return r}msColor=rb(gl.RGBA8,gl.COLOR_ATTACHMENT0);msNormal=rb(gl.RGBA8,gl.COLOR_ATTACHMENT1);depthRB=rb(gl.DEPTH_COMPONENT24,gl.DEPTH_ATTACHMENT);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);check();
bW=Math.max(1,W>>2);bH=Math.max(1,H>>2);bloomF=[];bloomTex=[];for(let i=0;i<2;i++){bloomTex[i]=texture(bW,bH);bloomF[i]=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,bloomF[i]);attach(bloomTex[i]);check()}
refTex=texture(Math.max(1,W>>1),Math.max(1,H>>1));refF=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,refF);attach(refTex);refDepth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,refDepth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,Math.max(1,W>>1),Math.max(1,H>>1));gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,refDepth);check();gl.bindFramebuffer(gl.FRAMEBUFFER,null);$('qualityLabel').textContent=`WEBGL2 / ${samples}× MSAA / ${quality==='high'?'HIGH':'LITE'}`;}
resize();window.addEventListener('resize',resize);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);
const studyNames=['海旁全景','IFC 立面','通透冠頂','商場基座','海濱街道','小輪航道','中銀大廈','滙豐總行','怡和大廈','力寶中心','長江集團中心','美國銀行中心','中環中心','香港站入口','中環站入口','金鐘站入口','中環街道','海旁巴士站近景','港島內街','九龍內街','灣仔會展全景','金紫荊廣場','會展側面','會展上空','灣仔碼頭','中環廣場','香港君悅酒店','萬麗海景酒店','會展廣場辦公大樓','灣仔街區全景','兩岸商舖街景','海旁車流近景','灣仔電車街景','尖沙咀方向海港全景'];let studyView=0;let hudDetail='minimal',hudBrightness=.85,canopyEnabled=true;try{if(localStorage.getItem('harbour-hud-detail')==='full')hudDetail='full';}catch{}let showLandmarks=false;let crash=null,crashReason="",debris=[],impactFlash=0,shake=0,crashEmission=0;let autoActive=false,autoSafetyHold=false,autoUses=0,autoLimit=0,autoScan=0,autoHeading=0,autoPitch=0;let tracked=null,threatSource=null,threatTime=0,combatStats={shots:0,hits:0,missiles:0,damage:0};let enemySerial=0,enemyWarningCD=0,enemyShots=0,enemyHits=0,aircraftType='falcon',rocketSalvos=4,rocketCD=0,flareCharges=3,flareCD=0;let player={pos:[0,180,950],yaw:0,pitch:0,roll:0,hp:100,speed:115,missiles:6},enemies=[],bullets=[],missiles=[],particles=[],kills=0,elapsed=0,spawnTimer=0,shotCD=0,missileCD=0,damage=0,noticeTime=0,selected=null,aimDuration=0,frame=0;let camPos=[55,220,1100],camTarget=[-250,150,-700],view,proj,refVP;
const keys={},input={x:0,y:0,fire:false,boost:false};let audioEngine=null,engineGain=null;
function sound(type){if(!audioOn||!actx)return;let o=actx.createOscillator(),g=actx.createGain();o.connect(g);g.connect(actx.destination);let t=actx.currentTime;o.type=type==='hit'?'sawtooth':'triangle';o.frequency.setValueAtTime(type==='fire'?160:type==='missile'?500:90,t);o.frequency.exponentialRampToValueAtTime(type==='hit'?18:40,t+.18);g.gain.setValueAtTime(type==='fire'?.025:.07,t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.start(t);o.stop(t+.22)}
function audio(){if(!audioOn&&!actx)return;if(!(window.AudioContext||window.webkitAudioContext))return;if(!actx){actx=new(window.AudioContext||window.webkitAudioContext)();audioEngine=actx.createOscillator();engineGain=actx.createGain();audioEngine.type='sawtooth';audioEngine.frequency.value=42;let filter=actx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=180;audioEngine.connect(filter);filter.connect(engineGain);engineGain.connect(actx.destination);audioEngine.start()}actx.resume();engineGain.gain.value=audioOn&&mode==='play'&&!paused?.025:0;}
function notify(s,d=3){$('notice').textContent=s;noticeTime=d}// Place city patrols outside collision volumes, including vertical aircraft clearance.
function safeEnemySpawn(p){
 let q=p.slice();for(let attempt=0;attempt<18;attempt++){
  let overlaps=collisionBoxes.some(b=>q[0]>b.x-b.w/2-22&&q[0]<b.x+b.w/2+22&&q[2]>b.z-b.d/2-22&&q[2]<b.z+b.d/2+22&&q[1]>b.y-20&&q[1]<b.y+b.h+35);
  if(!overlaps)return q;
  if(attempt%3===2){q[0]+=85;q[2]-=55;}else q[1]=Math.min(630,q[1]+65);
 }
 q[1]=660;return q;
}
function spawn(initial=false){
 let idx=enemies.length,f=forward(player.yaw,0),right=[Math.cos(player.yaw),0,-Math.sin(player.yaw)];
 let city=initial?idx>=3:((enemySerial%2===1)||player.pos[2]<shoreline(player.pos[0])+80);
 let d=initial?360+idx*90:500+rand()*250,lateral=initial?[0,-110,145,-220,250][idx%5]:(rand()-.5)*380;
 let p=add(player.pos,add(mul(f,d),mul(right,lateral)));
 if(city){let x=clamp(player.pos[0]+(initial?(idx===3?-240:320):(rand()-.5)*500),-2600,2600);p=[x,initial?300:clamp(player.pos[1]+110,220,500),shoreline(x)-220-(initial?(idx-3)*150:rand()*270)];}
 p[0]=clamp(p[0],-3800,3800);p[2]=clamp(p[2],-1800,1800);
 if(!city)p[1]=initial?player.pos[1]+[10,30,-15,60,15][idx%5]:clamp(player.pos[1]+(rand()-.5)*140,100,450);
 p=safeEnemySpawn(p);let hp=!initial&&kills>=3&&enemySerial%3===1?6:3,type=!initial&&kills>=3&&enemySerial%3===1?'ARMOUR':!initial&&kills>=5&&enemySerial%3===2?'INTERCEPTOR':'DRONE';
 enemies.push({pos:p,yaw:player.yaw+(rand()-.5)*.25,pitch:0,roll:0,hp,maxHp:hp,enemyType:type,cityAnchor:city?p.slice():null,phase:rand()*TAU,cooldown:initial?5+idx*.8:2.5+rand()*2,speed:initial?82:type==='INTERCEPTOR'?115:80+rand()*20,id:++enemySerial,ace:!initial&&enemySerial>=10,avoidClock:rand()*.3,avoidTime:0});let added=enemies[enemies.length-1];if(added.ace){added.hp=added.maxHp=8;added.enemyType='ARMOUR';added.speed=110;}
}

const combatLevels={rookie:{name:'新手',damage:.65,interval:1.5,score:.8},standard:{name:'標準',damage:1,interval:1,score:1},ace:{name:'王牌',damage:1.3,interval:.7,score:1.4}};
let difficulty='standard',score=0,combo=0,comboUntil=0,maxCombo=0,gunHeat=0,overheated=false,supplyCooldown=0,supplyCount=0,effectClock=0,hitConfirm=0;
const supplyPoint=[-230,185,850];
let ringBuilder=new Builder();for(let i=0;i<48;i++){let a=i*TAU/48,b=(i+1)*TAU/48;ringBuilder.rod([Math.cos(a)*64,Math.sin(a)*64,0],[Math.cos(b)*64,Math.sin(b)*64,0],1.1,[.18,.85,.7],[.3,.6,2,0]);}const supplyMesh=ringBuilder.mesh();
function phaseName(){return kills<4?'01 / 海港截擊':kills<8?'02 / 重裝增援':'03 / 王牌決戰';}
function addScore(e){combo=elapsed<=comboUntil?combo+1:1;comboUntil=elapsed+18;maxCombo=Math.max(maxCombo,combo);let gain=Math.round((e.ace?350:e.enemyType==='ARMOUR'?180:100)*Math.min(3,1+(combo-1)*.25)*combatLevels[difficulty].score);score+=gain;return gain;}
function finishReport(win){let total=score+(win?Math.max(0,Math.round(600-elapsed))+Math.round(player.hp*5):0);let best=0;try{best=Number(localStorage.getItem('harbour-best-'+difficulty))||0;if(total>best)localStorage.setItem('harbour-best-'+difficulty,String(total));}catch{}let rank=win?(total>=2800?'S':total>=2000?'A':'B'):'D';$('sortieReport').textContent=rank+' 級 · '+combatLevels[difficulty].name+' · '+total+' 分 / 最高 '+Math.max(best,total)+' · 最高連殺 '+maxCombo+' · 補給 '+supplyCount+' 次';}
function combatUpgradeStep(dt,previous){
 gunHeat=Math.max(0,gunHeat-dt*(overheated?24:14));if(overheated&&gunHeat<=25)overheated=false;
 hitConfirm=Math.max(0,hitConfirm-dt);supplyCooldown=Math.max(0,supplyCooldown-dt);effectClock-=dt;
 if(elapsed>comboUntil)combo=0;
 if(supplyCooldown===0&&segmentDistance(previous,player.pos,supplyPoint)<60){supplyCooldown=45;supplyCount++;player.hp=Math.min(100,player.hp+25);player.missiles=Math.min(6,player.missiles+2);rocketSalvos=Math.min(4,rocketSalvos+1);flareCharges=Math.min(3,flareCharges+1);notify('空中補給 · 裝甲 +25 / 導彈 +2 / 火箭 +1 / 干擾 +1',3);sound('missile');}
 if(effectClock<=0){effectClock=.12;for(let e of enemies)if(!e.dead&&e.hp<e.maxHp*.65)emitParticle(add(e.pos,mul(forward(e.yaw,e.pitch),-13)),[0,6,0],1,3,1.8,[.18,.2,.22],3);if(player.hp<40)emitParticle(add(player.pos,mul(forward(player.yaw,player.pitch),-16)),[0,5,0],1,3,1.6,[.14,.16,.18],4);}
 $('combatReadout').textContent=phaseName()+' · '+score+' 分'+(combo>1?' · '+combo+' 連殺':'');
 $('heatFill').style.width=gunHeat+'%';$('heatMeter').classList.toggle('hot',overheated);$('heatMeter').classList.toggle('warm',gunHeat>=75);document.body.classList.toggle('needs-supply',player.hp<=40||player.missiles===0);$('heatText').textContent=overheated?'機炮過熱 · 冷卻中':'機炮 '+Math.round(gunHeat)+'%';
 $('hitConfirm').hidden=hitConfirm<=0;
 let q=project(supplyPoint),visible=q[2]>0&&q[0]>.08&&q[0]<.92&&q[1]>.16&&q[1]<.8;
 $('supplyMarker').hidden=!visible;$('supplyMarker').style.left=q[0]*100+'%';$('supplyMarker').style.top=q[1]*100+'%';$('supplyMarker').textContent=supplyCooldown>0?'補給 '+Math.ceil(supplyCooldown)+'s':'補給 '+Math.round(len(sub(supplyPoint,player.pos)))+'m';
 let sb=contactBearing(supplyPoint);$('supplyGuide').textContent=supplyCooldown>0?'補給重開 '+Math.ceil(supplyCooldown)+'s':'補給 '+Math.round(sb.range)+'m · '+(Math.abs(sb.angle)<12?'前方':(sb.angle<0?'左轉 ':'右轉 ')+Math.round(Math.abs(sb.angle))+'°')+' · 185m 高度';
 $('leadCue').hidden=true;if(selected&&!selected.dead){let velocity=mul(forward(selected.yaw,selected.pitch),selected.speed),t=interceptTime(player.pos,selected.pos,velocity,740),lead=project(add(selected.pos,mul(velocity,t)));if(lead[2]>0&&lead[0]>.08&&lead[0]<.92&&lead[1]>.16&&lead[1]<.8){$('leadCue').hidden=false;$('leadCue').style.left=lead[0]*100+'%';$('leadCue').style.top=lead[1]*100+'%';}}
}
function reset(){score=combo=maxCombo=comboUntil=gunHeat=supplyCooldown=supplyCount=effectClock=hitConfirm=0;overheated=false;input.brake=false;crash=null;debris=[];impactFlash=0;shake=0;crashEmission=0;document.body.classList.remove('crashing');$('crashAlert').hidden=true;enemySerial=0;enemyWarningCD=0;enemyShots=0;enemyHits=0;autoActive=false;autoSafetyHold=false;autoUses=0;autoScan=0;$('autoPursuit').classList.remove('active');$('autoStatus').hidden=true;tracked=null;threatSource=null;threatTime=0;combatStats={shots:0,hits:0,missiles:0,damage:0};$('trackTarget').classList.remove('active');$('threatWarning').hidden=true;rocketSalvos=4;rocketCD=0;flareCharges=3;flareCD=0;player={pos:[-230,135,500],yaw:0,pitch:0,roll:0,hp:100,speed:115,missiles:6};enemies=[];bullets=[];missiles=[];particles=[];kills=0;elapsed=0;spawnTimer=4;shotCD=0;missileCD=0;damage=0;selected=null;aimDuration=0;camPos=[-230,153,556];camTarget=[-230,148,320];for(let i=0;i<5;i++)spawn(true);$('kills').textContent='0';$('progress').style.setProperty('--prog','0%');}
function start(){reset();document.body.classList.toggle('hud-minimal',hudDetail==='minimal');mode='play';paused=false;$('menu').hidden=true;$('location').hidden=true;$('end').hidden=true;$('hud').hidden=false;document.body.classList.add('playing');$('status').textContent='MISSION ACTIVE';audio();notify('敵機喺正前方 · 按住機炮開火',6);}
function finish(win){finishReport(win);mode='end';$('crashAlert').hidden=true;document.body.classList.remove('crashing');$('end').hidden=false;$('endtag').textContent=win?'AIRSPACE SECURED':'AIRCRAFT LOST';$('endtitle').textContent=win?'維港，安全。':'任務結束';$('enddesc').textContent=win?'全部目標已清除。獵隼一號，歡迎返航。':(crashReason||'獵隼一號失去作戰能力，準備重新出擊。');$('endkills').textContent=kills+' / 12';$('endAccuracy').textContent=combatStats.shots?Math.round(combatStats.hits/combatStats.shots*100)+'%':'—';$('endMissiles').textContent=String(combatStats.missiles);$('endDamage').textContent=String(Math.round(combatStats.damage));$('endtime').textContent=Math.floor(elapsed/60).toString().padStart(2,'0')+':'+Math.floor(elapsed%60).toString().padStart(2,'0');$('status').textContent=win?'MISSION COMPLETE':'SORTIE ENDED';audio();}
function explosion(pos,size=1){sound('hit');for(let i=0;i<28;i++){particles.push({pos:pos.slice(),vel:[(rand()-.5)*50*size,(rand()-.2)*45*size,(rand()-.5)*50*size],life:.4+rand()*1.4,max:1.8,scale:2+rand()*4*size})}}
function destroy(e){if(e.dead)return;e.dead=true;if(tracked===e){if(autoActive)stopAuto('目標已摧毀 · 自動追擊結束');tracked=null;$('trackTarget').classList.remove('active');}explosion(e.pos,1.3);let gained=addScore(e);hitConfirm=.25;
for(let i=0;i<9;i++)debris.push({pos:e.pos.slice(),vel:add(mul(forward(e.yaw,e.pitch),e.speed*.5),[(rand()-.5)*65,rand()*35,(rand()-.5)*65]),rot:[rand()*TAU,rand()*TAU,rand()*TAU],spin:[rand()*6,rand()*6,rand()*6],scale:1+rand()*2,life:3});
for(let i=0;i<8;i++)emitParticle(e.pos,[(rand()-.5)*15,8+rand()*15,(rand()-.5)*15],1,6,2,[.15,.17,.19],6);emitParticle(e.pos,[0,0,0],3,3,.6,[1,.55,.2],75);kills++;$('kills').textContent=kills;$('progress').style.setProperty('--prog',(kills/12*100)+'%');notify((e.ace?'王牌擊落':'目標摧毀')+' +'+gained+' · '+combo+' 連殺',1.5);if(kills%3===0){player.missiles=Math.min(6,player.missiles+2);player.hp=Math.min(100,player.hp+10);rocketSalvos=Math.min(4,rocketSalvos+1);notify('補給 · 導彈 +2 / 火箭 +1 / 裝甲 +10',2.5)}if(kills===4||kills===8){notify(phaseName()+' · '+(kills===4?'重裝敵機增援，善用火箭':'王牌編隊接戰，留意敵火'),3);}if(kills>=12)finish(true)}
function crashSound(){if(!audioOn||!actx)return;let t=actx.currentTime,buffer=actx.createBuffer(1,actx.sampleRate*2,actx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*3);let noise=actx.createBufferSource();noise.buffer=buffer;let low=actx.createBiquadFilter();low.type='lowpass';low.frequency.setValueAtTime(1900,t);low.frequency.exponentialRampToValueAtTime(90,t+1.7);let gain=actx.createGain();gain.gain.setValueAtTime(.22,t);gain.gain.exponentialRampToValueAtTime(.001,t+2);noise.connect(low);low.connect(gain);gain.connect(actx.destination);noise.start(t);let boom=actx.createOscillator(),bg=actx.createGain();boom.frequency.setValueAtTime(95,t);boom.frequency.exponentialRampToValueAtTime(24,t+1.3);bg.gain.setValueAtTime(.24,t);bg.gain.exponentialRampToValueAtTime(.001,t+1.5);boom.connect(bg);bg.connect(actx.destination);boom.start(t);boom.stop(t+1.5);}
function emitParticle(pos,vel,kind,scale,life,color,growth=0){particles.push({pos:pos.slice(),vel:vel.slice(),kind,scale,life,max:life,color,growth});}
function crashBurst(pos,power=1){crashSound();impactFlash=Math.max(impactFlash,.95);shake=Math.max(shake,1.4*power);for(let i=0;i<45;i++){let v=mul(norm([rand()-.5,rand()-.2,rand()-.5]),(15+rand()*45)*power);emitParticle(pos,v,0,(4+rand()*9)*power,.4+rand()*1.1,[1,.85,.65],6*power);}for(let i=0;i<24;i++)emitParticle(pos,[(rand()-.5)*25,12+rand()*25,(rand()-.5)*25],1,(7+rand()*11)*power,2+rand()*2,[.12,.15,.17],8*power);for(let i=0;i<35;i++)emitParticle(pos,[(rand()-.5)*120,rand()*75,(rand()-.5)*120],2,.3+rand()*.7,.6+rand()*1.5,[1,.55,.12]);emitParticle(pos,[0,0,0],3,8,.7,[1,.55,.2],120*power);}
function startCrash(reason,normal=[0,1,0]){if(mode!=='play')return;crashReason=reason;if(autoActive)stopAuto('');combatStats.damage+=player.hp;mode='crash';paused=false;crash={age:0,vel:add(mul(forward(player.yaw,player.pitch),player.speed*.36),mul(normal,38)),spin:(rand()>.5?1:-1)*(1.7+rand()),grounded:false,finalAge:0};crash.vel[1]=Math.min(crash.vel[1],-12);player.hp=0;selected=null;input.fire=input.boost=false;keys.Space=false;$('targetLayer').innerHTML='';$('locktext').textContent='SIGNAL LOST';$('pursuit').textContent='機體失控 · 無法操縱';$('hp').textContent='機體 0%';$('health').style.width='0%';$('status').textContent='MAYDAY / AIRCRAFT LOST';$('crashAlert').hidden=false;document.body.classList.add('crashing');crashBurst(player.pos,1.15);for(let i=0;i<16;i++)debris.push({pos:player.pos.slice(),vel:add(mul(crash.vel,.5),[(rand()-.5)*80,rand()*45,(rand()-.5)*80]),rot:[rand()*TAU,rand()*TAU,rand()*TAU],spin:[rand()*5,rand()*5,rand()*8],scale:.8+rand()*3,life:7});audio();}
function stepEffects(dt){for(let p of particles){p.pos=add(p.pos,mul(p.vel,dt));p.vel[1]+=dt*(p.kind===1?3:-12);p.scale+=dt*(p.growth||0);p.life-=dt;}particles=particles.filter(p=>p.life>0).slice(-520);for(let p of debris){p.vel[1]-=dt*28;p.pos=add(p.pos,mul(p.vel,dt));p.rot=p.rot.map((r,i)=>r+p.spin[i]*dt);p.life-=dt;if(p.pos[1]<6){p.pos[1]=6;p.vel[1]*=-.25;p.vel[0]*=.85;p.vel[2]*=.85;}}debris=debris.filter(p=>p.life>0);}
function updateCrash(dt){crash.age+=dt;let simDT=dt*(crash.age<.4?.24:1);impactFlash=Math.max(0,impactFlash-dt*3.8);shake=Math.max(0,shake-dt*.65);damage=mix(damage,.65,dt*3);if(!crash.grounded){crash.vel[1]-=simDT*27;crash.vel[0]*=Math.exp(-simDT*.15);crash.vel[2]*=Math.exp(-simDT*.15);let from=player.pos.slice(),to=add(from,mul(crash.vel,simDT));let hit=firstCollision(from,to,3);player.pos=hit?hit.point:to;player.roll+=crash.spin*simDT;player.pitch-=simDT*.32;player.yaw+=simDT*.18*crash.spin;crashEmission+=simDT;while(crashEmission>.035){crashEmission-=.035;emitParticle(player.pos,[(rand()-.5)*5,8+rand()*8,(rand()-.5)*5],1,5+rand()*4,2.8,[.09,.12,.14],5);emitParticle(player.pos,[0,5,0],0,3+rand()*3,.5,[1,.7,.35],3);}if((hit&&crash.age>.6)||player.pos[1]<7||crash.age>5.5){player.pos[1]=Math.max(5,player.pos[1]);crash.grounded=true;crash.finalAge=crash.age;crashBurst(player.pos,1.65);$('crashState').textContent='殘骸爆炸 · 訊號中斷';}}else if(crash.age-crash.finalAge>.3&&crash.age-crash.finalAge<1.3&&Math.floor(crash.age*10)%3===0&&frame%5===0){explosion(add(player.pos,[(rand()-.5)*15,rand()*7,(rand()-.5)*15]),.7);}
stepEffects(simDT);$('alt').textContent=Math.max(0,Math.round(player.pos[1]));$('speed').textContent=Math.round(len(crash.vel)*3.6);if(crash.grounded&&crash.age-crash.finalAge>2)finish(false);}
// Swept AABB collision detects a fast aircraft crossing a wall between frames.
function boxHit(from,to,b,radius=7){let mins=[b.x-b.w/2-radius,b.y-radius,b.z-b.d/2-radius],maxs=[b.x+b.w/2+radius,b.y+b.h+radius,b.z+b.d/2+radius],delta=sub(to,from),enter=0,exit=1,normal=[0,1,0];for(let a=0;a<3;a++){if(Math.abs(delta[a])<.000001){if(from[a]<mins[a]||from[a]>maxs[a])return null;}else{let t0=(mins[a]-from[a])/delta[a],t1=(maxs[a]-from[a])/delta[a],n=delta[a]>0?-1:1;if(t0>t1)[t0,t1]=[t1,t0];if(t0>enter){enter=t0;normal=[0,0,0];normal[a]=n;}exit=Math.min(exit,t1);if(enter>exit)return null;}}if(exit<0||enter>1)return null;return{t:enter,normal,point:add(from,mul(delta,Math.max(0,enter-.005)))};}
function firstCollision(from,to,radius=7){let best=null;for(let b of collisionBoxes){let h=boxHit(from,to,b,radius);if(h&&(!best||h.t<best.t))best=h;}return best;}
function hurt(n){if(mode!=='play')return;n*=combatLevels[difficulty].damage;combo=0;comboUntil=0;combatStats.damage+=Math.min(player.hp,n);sound('hit');player.hp=Math.max(0,player.hp-n);damage=.9;shake=Math.max(shake,.25);if(player.hp<=0)startCrash('機體受到致命損傷，失控墜落。');}
function launchMissile(){if(mode!=='play'||paused||!$('panel').hidden||missileCD>0)return;if(player.missiles<=0){notify('導彈耗盡 · 每擊落 3 架可獲補給');return}if(!selected||aimDuration<.45){notify('保持目標喺前方，等候鎖定');return}player.missiles--;combatStats.missiles++;missileCD=1.1;missiles.push({pos:add(player.pos,[3,-1,0]),vel:mul(forward(player.yaw,player.pitch),200),target:selected,life:8});sound('missile');notify('導彈發射',1)}
function launchRockets(){
 if(mode!=='play'||paused||!$('panel').hidden||rocketCD>0)return;
 if(rocketSalvos<=0){notify('火箭彈耗盡 · 每擊落 3 架補給');return;}
 rocketSalvos--;rocketCD=2.2;combatStats.shots+=4;let fw=forward(player.yaw,player.pitch),right=[Math.cos(player.yaw),0,-Math.sin(player.yaw)];
 for(let side of [-1,1])for(let k=0;k<2;k++){let dir=norm(add(fw,mul(right,side*(.035+k*.04))));bullets.push({pos:add(add(player.pos,mul(fw,10)),mul(right,side*(3+k*2))),vel:mul(dir,440),life:2.8,enemy:false,damage:2,rocket:true});}
 sound('missile');notify('火箭齊射 · 毋須鎖定',1.5);
}
function deployFlare(){
 if(mode!=='play'||paused||!$('panel').hidden||flareCD>0)return;
 if(flareCharges<=0){notify('干擾彈耗盡');return;}flareCharges--;flareCD=6;
 let removed=0;for(let b of bullets)if(b.enemy&&len(sub(b.pos,player.pos))<450){b.life=0;removed++;}
 for(let i=0;i<14;i++)emitParticle(player.pos,[(rand()-.5)*60,-10-rand()*25,(rand()-.5)*60],2,1+rand(),1+rand(),[1,.6,.15]);
 sound('missile');notify(removed?'干擾成功 · 消除附近敵火':'干擾彈釋放 · 附近無敵火',2);
}
function chooseAircraft(type){aircraftType=type;$('chooseFalcon').classList.toggle('active',type==='falcon');$('chooseViper').classList.toggle('active',type==='viper');$('loadoutInfo').textContent=type==='falcon'?'獵隼：轉向靈活 · 均衡速度':'雷霆：速度較快 · 轉向較慢';}
$('chooseFalcon').onclick=()=>chooseAircraft('falcon');$('chooseViper').onclick=()=>chooseAircraft('viper');
// Tracking pins an identity; missile lock still requires the aircraft to face that target.
function toggleTracking(){
 if(mode!=='play'||paused||!$('panel').hidden)return;
 if(tracked&&!tracked.dead){if(autoActive)stopAuto('');tracked=null;$('trackTarget').classList.remove('active');notify('已取消追蹤',1.5);return;}
 let candidates=enemies.filter(e=>!e.dead);if(!candidates.length){notify('附近沒有敵機',1.5);return;}
 tracked=candidates.reduce((a,b)=>len(sub(a.pos,player.pos))<=len(sub(b.pos,player.pos))?a:b);
 $('trackTarget').classList.add('active');notify('追蹤 BANDIT '+String(tracked.id).padStart(2,'0'),2);
}
$('trackTarget').addEventListener('pointerdown',e=>{e.preventDefault();toggleTracking()});
// Beginner pursuit steers toward one pinned enemy; it never fires weapons.
function stopAuto(message){autoActive=false;autoScan=0;$('autoPursuit').classList.remove('active');$('autoStatus').hidden=!autoSafetyHold;if(autoSafetyHold)$('autoStatus').textContent='前方受阻 · 已暫停前進，請手動轉向';if(message)notify(message,2.5);}
function toggleAuto(){
 if(mode!=='play'||paused||!$('panel').hidden)return;
 if(autoActive){stopAuto('自動追擊已取消 · 已交還手動控制');return;}
 if(autoLimit>0&&autoUses>=autoLimit){notify('本局自動追擊次數已用完');return;}
 if(!tracked||tracked.dead){let live=enemies.filter(e=>!e.dead);if(!live.length){notify('附近沒有敵機');return;}tracked=live.reduce((a,b)=>len(sub(a.pos,player.pos))<=len(sub(b.pos,player.pos))?a:b);$('trackTarget').classList.add('active');}
 autoActive=true;autoSafetyHold=false;autoUses++;autoScan=0;$('autoPursuit').classList.add('active');$('autoStatus').hidden=false;
 notify('自動追擊 BANDIT '+String(tracked.id).padStart(2,'0')+' · 武器由你操作',2.5);
}
$('autoPursuit').addEventListener('pointerdown',e=>{e.preventDefault();toggleAuto()});
$('autoQuota').onchange=e=>{autoLimit=e.target.value==='three'?3:0;};
// Test a short flight corridor; if there is no safe option, hand control back to the pilot.
function autoSteer(dt){
 if(!tracked||tracked.dead){stopAuto('目標已消失 · 自動追擊結束');return null;}
 let target=add(tracked.pos,mul(forward(tracked.yaw,tracked.pitch),Math.min(2,len(sub(tracked.pos,player.pos))/220)*tracked.speed));
 let rel=sub(target,player.pos),desired=Math.atan2(-rel[0],-rel[2]),pitch=clamp(Math.atan2(rel[1],Math.hypot(rel[0],rel[2])),-.34,.34);
 autoScan-=dt;if(autoScan<=0){autoScan=.3;let distance=clamp(player.speed*1.7,145,320),options=[[0,pitch],[.55,.32],[-.55,.32],[1.1,.34],[-1.1,.34],[0,.45]];let found=false;
  for(let [offset,p] of options){let h=desired+offset,endpoint=add(player.pos,mul(forward(h,p),distance));if(endpoint[1]<45||endpoint[1]>650||Math.abs(endpoint[0])>4200||Math.abs(endpoint[2])>2550)continue;
   if(!firstCollision(player.pos,endpoint,20)){autoHeading=h;autoPitch=p;found=true;break;}}
  if(!found){autoSafetyHold=true;player.speed=0;stopAuto('前方空域受阻 · 已暫停前進，請手動轉向');return null;}
 }
 let delta=Math.atan2(Math.sin(autoHeading-player.yaw),Math.cos(autoHeading-player.yaw));
 return{x:clamp(-delta*1.5,-1,1),y:clamp(autoPitch/.48,-.85,.85)};
}
function setPause(p){if(mode!=='play'&&mode!=='crash')return;paused=p;$('paused').hidden=!p;input.fire=false;keys.Space=false;audio()}
$('study').onclick=()=>{mode='study';paused=false;studyView=0;$('studyCaption').textContent=studyNames[0]+' · 1/'+studyNames.length;$('menu').hidden=true;$('location').hidden=true;$('hud').hidden=true;$('studyControls').hidden=false;$('status').textContent='CENTRAL / MATERIAL STUDY';};$('wanStart').onclick=()=>{$('study').onclick();studyView=20;$('studyCaption').textContent=studyNames[20]+' · 21/'+studyNames.length;};function selectStudy(i){studyView=i;$('studyCaption').textContent=studyNames[i]+' · '+(i+1)+'/'+studyNames.length;}for(let [id,i] of [['spotCEC',20],['spotBauhinia',21],['spotPier',24],['spotPlaza',25],['spotHyatt',26],['spotRenaissance',27],['spotOffice',28],['spotDistrict',29],['spotShops',30],['spotTraffic',31],['spotTram',32],['spotHarbourCompare',33]])$(id).onclick=()=>selectStudy(i);$('studyAngle').onclick=()=>{studyView=(studyView+1)%studyNames.length;$('studyCaption').textContent=studyNames[studyView]+' · '+(studyView+1)+'/'+studyNames.length;};$('shadowCompare').onclick=()=>{shadowsEnabled=!shadowsEnabled;$('shadowCompare').textContent=shadowsEnabled?'建築投影 ON':'建築投影 OFF';};$('studyBack').onclick=()=>{shadowsEnabled=true;$('shadowCompare').textContent='建築投影 ON';mode='menu';$('studyControls').hidden=true;$('menu').hidden=false;$('location').hidden=false;$('status').textContent='SYSTEM READY';};$('cityStart').onclick=()=>{$('study').onclick();selectStudy(31);};$('start').onclick=start;$('restart').onclick=start;$('home').onclick=()=>{mode='menu';crash=null;debris=[];particles=[];document.body.classList.remove('crashing');$('crashAlert').hidden=true;$('end').hidden=true;$('menu').hidden=false;$('location').hidden=false;$('hud').hidden=true;document.body.classList.remove('playing');$('status').textContent='SYSTEM READY';audio()};$('pause').onclick=()=>setPause(!paused);$('resume').onclick=()=>setPause(false);$('settings').onclick=()=>{$('panel').hidden=false;if(mode==='play'||mode==='crash'){paused=true;audio()}};$('closeSettings').onclick=()=>{$('panel').hidden=true;if(mode==='play'||mode==='crash'){paused=false;audio()}};$('hudDetail').value=hudDetail;$('hudDetail').onchange=e=>{hudDetail=e.target.value;document.body.classList.toggle('hud-minimal',hudDetail==='minimal');try{localStorage.setItem('harbour-hud-detail',hudDetail);}catch{}};$('hudBrightness').oninput=e=>hudBrightness=Number(e.target.value);$('canopyToggle').onchange=e=>canopyEnabled=e.target.checked;$('viewButton').onclick=()=>{camMode=camMode==='chase'?'cockpit':'chase';$('camera').value=camMode;};$('landmarkToggle').onchange=e=>showLandmarks=e.target.checked;$('quality').onchange=e=>{quality=e.target.value;resize()};$('rain').onchange=e=>rain=e.target.checked;$('camera').onchange=e=>camMode=e.target.value;$('sound').onclick=()=>{audioOn=!audioOn;$('sound').textContent=audioOn?'音效 ON':'音效 OFF';audio()};
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;keys[e.code]=true;if(e.code==='KeyQ')launchMissile();if(e.code==='KeyE')launchRockets();if(e.code==='KeyF')deployFlare();if(e.code==='KeyT')toggleTracking();if(e.code==='KeyG')toggleAuto();if(e.code==='KeyP'||e.code==='Escape')setPause(!paused);if(e.code==='KeyC'){camMode=camMode==='chase'?'cockpit':'chase';$('camera').value=camMode}});window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);input.fire=false;input.boost=false;input.brake=false;input.x=input.y=0;setPause(true)});document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
function hold(id,prop){let b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input[prop]=true});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>input[prop]=false))}hold('brake','brake');$('difficulty').onchange=e=>{if(combatLevels[e.target.value])difficulty=e.target.value;};hold('fire','fire');hold('boost','boost');$('rockets').addEventListener('pointerdown',e=>{e.preventDefault();launchRockets()});$('flare').addEventListener('pointerdown',e=>{e.preventDefault();deployFlare()});$('missile').addEventListener('pointerdown',e=>{e.preventDefault();launchMissile()});let stick=$('stick'),stickID=null;function moveStick(e){if(e.pointerId!==stickID)return;let r=stick.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.38),dy=(e.clientY-r.top-r.height/2)/(r.height*.38),l=Math.max(1,Math.hypot(dx,dy));input.x=dx/l;input.y=-dy/l;$('knob').style.transform=`translate(${input.x*r.width*.32}px,${-input.y*r.height*.32}px)`}stick.addEventListener('pointerdown',e=>{e.preventDefault();stickID=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)});stick.addEventListener('pointermove',moveStick);['pointerup','pointercancel','lostpointercapture'].forEach(ev=>stick.addEventListener(ev,()=>{stickID=null;input.x=input.y=0;$('knob').style.transform=''}));
// Solve the ballistic intercept using target velocity, not a unit heading vector.
function interceptTime(origin,target,velocity,projectileSpeed){
 let r=sub(target,origin),a=dot(velocity,velocity)-projectileSpeed*projectileSpeed,b=2*dot(r,velocity),c=dot(r,r),t;
 if(Math.abs(a)<1e-7)t=Math.abs(b)>1e-7?-c/b:0;
 else{let disc=b*b-4*a*c;if(disc<0)return Math.sqrt(c)/projectileSpeed;let root=Math.sqrt(disc),t1=(-b-root)/(2*a),t2=(-b+root)/(2*a);t=t1>0&&t2>0?Math.min(t1,t2):t1>0?t1:t2;}
 return t>0?Math.min(t,3.35):Math.sqrt(c)/projectileSpeed;
}
function update(dt){elapsed+=dt;impactFlash=Math.max(0,impactFlash-dt*4);shake=Math.max(0,shake-dt);let previousPosition=player.pos.slice();shotCD-=dt;missileCD-=dt;enemyWarningCD=Math.max(0,enemyWarningCD-dt);threatTime=Math.max(0,threatTime-dt);rocketCD=Math.max(0,rocketCD-dt);flareCD=Math.max(0,flareCD-dt);spawnTimer-=dt;damage=Math.max(0,damage-dt*1.8);noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';let x=input.x+(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),y=input.y+(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);x=clamp(x,-1,1);y=clamp(y,-1,1);if(autoSafetyHold&&(Math.abs(x)>.25||Math.abs(y)>.25)){autoSafetyHold=false;$('autoStatus').hidden=true;notify('已接回手動飛行',1.5);}if(autoActive){if(Math.abs(x)>.25||Math.abs(y)>.25)stopAuto('已切回手動飛行');else{let nav=autoSteer(dt);if(nav){x=nav.x;y=nav.y;}}}if(autoActive&&tracked){$('autoStatus').hidden=false;$('autoStatus').textContent='自動追擊 BANDIT '+String(tracked.id).padStart(2,'0')+' · '+(autoLimit?('剩 '+Math.max(0,autoLimit-autoUses)+' 次'):'無限次');}let brake=input.brake||keys.KeyB,boost=!brake&&(input.boost||keys.ShiftLeft||keys.ShiftRight);player.yaw-=x*dt*(aircraftType==='viper'?.52:.72)*(brake?1.45:1);player.pitch=mix(player.pitch,y*.48,1-Math.exp(-dt*2.8));player.roll=mix(player.roll,-x*.75,1-Math.exp(-dt*4));player.speed=mix(player.speed,brake?70:boost?(aircraftType==='viper'?225:195):(aircraftType==='viper'?130:115),1-Math.exp(-dt*2));let fw=forward(player.yaw,player.pitch);if(!autoSafetyHold)player.pos=add(player.pos,mul(fw,player.speed*dt));else player.speed=0;
if(player.pos[1]<8){startCrash('戰機撞上海面或地面。');return;}if(player.pos[1]<40)notify('低空警告 · 拉高機頭',.5);if(player.pos[1]>680){player.pos[1]=680;notify('已到達空域高度上限',1)}if(Math.abs(player.pos[0])>4300||Math.abs(player.pos[2])>2600){notify('空域邊界 · 自動引導返航',1);let targetYaw=Math.atan2(player.pos[0],player.pos[2]),d=Math.atan2(Math.sin(targetYaw-player.yaw),Math.cos(targetYaw-player.yaw));player.yaw+=d*dt;player.pos[0]=clamp(player.pos[0],-4450,4450);player.pos[2]=clamp(player.pos[2],-2750,2750)}
let buildingHit=firstCollision(previousPosition,player.pos,7);if(buildingHit){if(autoActive){player.pos=previousPosition;player.speed=0;autoSafetyHold=true;stopAuto('前方樓宇太近 · 已暫停前進，請手動轉向');return;}player.pos=buildingHit.point;startCrash('戰機撞上樓宇，機體解體墜落。',buildingHit.normal);return;}
let candidate=null,best=0;for(let e of enemies){if(e.dead)continue;let d=sub(e.pos,player.pos),dist=len(d),alignment=dot(norm(d),fw);if(alignment>.87&&dist<1600&&alignment>best&&(!tracked||tracked.dead||e===tracked)){best=alignment;candidate=e}}
if(candidate===selected)aimDuration+=dt;else{selected=candidate;aimDuration=0}let locked=selected&&aimDuration>.45;$('lock').classList.toggle('locked',!!locked);$('locktext').textContent=locked?'LOCKED · 可發射':selected?'鎖定中…':'搜尋目標';
if((input.fire||keys.Space)&&shotCD<=0&&!overheated){gunHeat=Math.min(100,gunHeat+6);if(gunHeat>=100)overheated=true;shotCD=.105;sound('fire');let dir=fw;if(selected&&best>.98)dir=norm(sub(selected.pos,player.pos));for(let s of [-1,1]){combatStats.shots++;let right=[Math.cos(player.yaw),0,-Math.sin(player.yaw)];bullets.push({pos:add(add(player.pos,mul(fw,10)),mul(right,s*2.5)),vel:mul(dir,740),life:2.3,enemy:false})}}
for(let e of enemies){
 if(e.dead)continue;e.phase+=dt;let to=sub(player.pos,e.pos),dist=len(to),patrol=e.cityAnchor&&dist>900;
 let target=patrol?[e.cityAnchor[0]+Math.cos(e.phase*.17)*150,e.cityAnchor[1],e.cityAnchor[2]+Math.sin(e.phase*.17)*150]:player.pos;
 let goal=sub(target,e.pos),desired=dist>320||patrol?Math.atan2(-goal[0],-goal[2]):player.yaw+Math.sin(e.phase*.4)*1.2;
 if(elapsed<4&&!patrol)desired=player.yaw;
 // Coarse look-ahead prevents fighters flying straight through towers without per-frame full-scene checks.
 e.avoidClock-=dt;e.avoidTime=Math.max(0,e.avoidTime-dt);
 if(e.avoidClock<=0){e.avoidClock=.55;let ahead=add(e.pos,mul(forward(e.yaw,e.pitch),Math.max(100,e.speed*1.2)));if(firstCollision(e.pos,ahead,15))e.avoidTime=1.5;}
 let missileThreat=missiles.some(m=>m.target===e&&m.life>0&&len(sub(m.pos,e.pos))<380);if(missileThreat&&!patrol&&e.avoidTime<=0)desired=e.yaw+(e.id%2?.9:-.9);if(e.avoidTime>0)desired=e.yaw+.8;
 let d=Math.atan2(Math.sin(desired-e.yaw),Math.cos(desired-e.yaw));e.yaw+=clamp(d,-.7*dt,.7*dt);e.roll=mix(e.roll,-clamp(d,-1,1),dt*2);
 e.pitch=e.avoidTime>0?.32:missileThreat&&!patrol?(.15+.1*Math.sin(e.phase)):clamp(goal[1]/Math.max(300,len(goal)),-.22,.22);
 let before=e.pos.slice(),next=add(e.pos,mul(forward(e.yaw,e.pitch),e.speed*dt));
 // A failed look-ahead must never allow the model to be embedded in a building.
 if(firstCollision(before,next,10)){e.avoidTime=1.5;e.yaw+=1.1;e.pos[1]=Math.min(650,e.pos[1]+22);}else e.pos=next;
 e.pos[1]=clamp(e.pos[1]+Math.sin(e.phase*1.2)*dt*5,80,650);
 e.cooldown-=dt;
 if(!patrol&&e.cooldown<=0&&dist<1200){
  e.cooldown=(2.8+rand()*2)*combatLevels[difficulty].interval*(e.ace?.65:1);let speed=430,velocity=mul(fw,player.speed),t=interceptTime(e.pos,player.pos,velocity,speed);
  let aim=add(player.pos,mul(velocity,t));let dir=norm(sub(aim,e.pos));
  // Small dispersion retains a chance to evade while allowing straight-line hits.
  let lateral=norm(cross(dir,[0,1,0]));if(len(lateral)<.01)lateral=[1,0,0];let vertical=norm(cross(lateral,dir));
  dir=norm(add(dir,add(mul(lateral,(rand()-.5)*.006),mul(vertical,(rand()-.5)*.006))));
  bullets.push({pos:e.pos.slice(),vel:mul(dir,430),life:3.5,enemy:true,source:e});enemyShots++;threatSource=e;threatTime=2.5;
  if(enemyWarningCD<=0){notify('⚠ 敵機開火 · 轉向閃避 / 使用干擾彈',1.8);enemyWarningCD=4;}
 }
 if(dist<24){hurt(25);if(mode!=='play')return;destroy(e)}if(dist>3500&&!e.cityAnchor)e.dead=true;
}
for(let b of bullets){if(b.life<=0)continue;let old=b.pos;b.pos=add(b.pos,mul(b.vel,dt));b.life-=dt;if(b.enemy){let relativeOld=sub(old,previousPosition),relativeNew=sub(b.pos,player.pos);if(segmentDistance(relativeOld,relativeNew,[0,0,0])<9){enemyHits++;let hitSource=b.source&&!b.source.dead?b.source:threatSource;if(hitSource){threatSource=hitSource;threatTime=2.5;}hurt(9);b.life=0;if(mode!=='play')return;let angle=hitSource?contactBearing(hitSource.pos).angle:0;notify('⚠ 受到敵火 · '+(Math.abs(angle)<12?'前方':angle<0?'左方':'右方'),1.6)}}else for(let e of enemies){if(!e.dead&&segmentDistance(old,b.pos,e.pos)<22){e.hp-=b.damage||1;combatStats.hits++;hitConfirm=.16;b.life=0;explosion(b.pos,.2);if(e.hp<=0)destroy(e);break}}}
for(let m of missiles){m.life-=dt;if(m.target&&!m.target.dead){let dir=norm(sub(m.target.pos,m.pos));m.vel=mul(norm(add(mul(norm(m.vel),.87),mul(dir,.13))),310);if(len(sub(m.target.pos,m.pos))<22){destroy(m.target);m.life=0}}m.pos=add(m.pos,mul(m.vel,dt));if(frame%2===0)particles.push({pos:m.pos.slice(),vel:[0,3,0],life:.65,max:.65,scale:1.6});}
if(mode!=='play')return;combatUpgradeStep(dt,previousPosition);stepEffects(dt);if(selected&&selected.dead){selected=null;aimDuration=0;}if(tracked&&tracked.dead){if(autoActive)stopAuto('目標已消失 · 自動追擊結束');tracked=null;$('trackTarget').classList.remove('active');}enemies=enemies.filter(e=>!e.dead);bullets=bullets.filter(b=>b.life>0);missiles=missiles.filter(m=>m.life>0);if(spawnTimer<=0&&enemies.length<5&&kills+enemies.length<12){spawn();spawnTimer=2.7}if(enemies.length===0&&kills<12)spawn();
let pursuer=enemies.find(e=>!e.dead&&len(sub(player.pos,e.pos))<650&&dot(forward(e.yaw,e.pitch),norm(sub(player.pos,e.pos)))>.8);let threat=threatTime>0&&threatSource?threatSource:pursuer;if(threat){let b=contactBearing(threat.pos),deg=Math.round(Math.abs(b.angle));$('threatWarning').hidden=false;$('threatWarning').textContent=(threatTime>0?'⚠ 敵火 ':'⚠ 敵機追擊 ')+(b.behind?'後方 · ':'')+(deg<12?'前方':(b.angle<0?'左方 ':'右方 ')+deg+'°');}else $('threatWarning').hidden=true;$('weaponStatus').textContent='火箭 '+rocketSalvos+'  ·  干擾 '+flareCharges+(flareCD>0?' ('+Math.ceil(flareCD)+'s)':'');$('speed').textContent=Math.round(player.speed*3.6);$('alt').textContent=Math.round(player.pos[1]);$('health').style.width=player.hp+'%';$('hp').textContent='機體 '+Math.round(player.hp)+'%';$('ammo').textContent='導彈 '+player.missiles+' / 6';if(audioOn&&audioEngine)audioEngine.frequency.value=35+player.speed*.12;
}
function segmentDistance(a,b,p){let ab=sub(b,a),t=clamp(dot(sub(p,a),ab)/Math.max(.001,dot(ab,ab)),0,1);return len(sub(p,add(a,mul(ab,t))))}
function bindTex(unit,t){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t)}function draw(mesh,m){m4(scene,'model',m);gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count)}let I=identity();
function skyDraw(eye,target){gl.disable(gl.DEPTH_TEST);use(skyP);let f=norm(sub(target,eye)),r=norm(cross(f,[0,1,0])),u=cross(r,f);v3(skyP,'front',f);v3(skyP,'right',r);v3(skyP,'up',u);f1(skyP,'aspect',aspect);f1(skyP,'time',mode==='study'?0:time);gl.bindVertexArray(null);gl.drawArrays(gl.TRIANGLES,0,3);gl.enable(gl.DEPTH_TEST)}
function drawParticles(eye,target){if(!particles.length)return;let sorted=particles.slice().sort((a,b)=>len(sub(b.pos,eye))-len(sub(a.pos,eye))),data=[];for(let p of sorted){let t=clamp(p.life/p.max,0,1),kind=p.kind??0,col=p.color||[1,.8,.55],opacity=kind===1?Math.min(1,(1-t)*6)*Math.min(1,t*3)*.65:Math.min(1,t*3);data.push(...p.pos,p.scale,...col,opacity,kind);}use(particleP);m4(particleP,'view',look(eye,target));m4(particleP,'proj',proj);let f=norm(sub(target,eye)),r=norm(cross(f,[0,1,0]));v3(particleP,'right',r);v3(particleP,'up',cross(r,f));f1(particleP,'time',time);gl.bindVertexArray(particleVAO);gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.drawBuffers([gl.COLOR_ATTACHMENT0]);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.drawArraysInstanced(gl.TRIANGLES,0,6,sorted.length);gl.depthMask(true);gl.disable(gl.BLEND);}
function drawScene(eye,target,isRef){let v=look(eye,target);skyDraw(eye,target);use(scene);m4(scene,'view',v);m4(scene,'proj',proj);m4(scene,'refVP',refVP);v3(scene,'eye',eye);f1(scene,'time',mode==='study'?0:time);i1(scene,'reflectionPass',isRef?1:0);m4(scene,'shadowNearVP',shadowMaps[0].vp);m4(scene,'shadowFarVP',shadowMaps[1].vp);v2(scene,'shadowTexel',[1/shadowMaps[0].size,1/shadowMaps[1].size]);i1(scene,'shadowsOn',shadowsEnabled?1:0);i1(scene,'shadowNearTex',5);i1(scene,'shadowFarTex',6);bindTex(5,shadowMaps[0].tex);bindTex(6,shadowMaps[1].tex);i1(scene,'streetTex',10);bindTex(10,streetTex);i1(scene,'windowsTex',0);i1(scene,'reflectTex',1);i1(scene,'materialTex',3);i1(scene,'materialReady',materialReady?1:0);i1(scene,'stationTex',7);bindTex(7,stationTex);i1(scene,'hyattTex',8);bindTex(8,hyattTex);i1(scene,'districtTex',9);bindTex(9,districtTex);i1(scene,'facadeTex',4);i1(scene,'facadeReady',facadeReady?1:0);bindTex(4,facadeTex);bindTex(3,materialTex);bindTex(0,winTex);bindTex(1,isRef?winTex:refTex);draw(worldMesh,I);if(!isRef){draw(wetMesh,I);draw(waterMesh,I)}drawHarbourTraffic(isRef);if(mode==='play'&&supplyCooldown<=0)draw(supplyMesh,model(supplyPoint,0,0,time*.12));if(mode==='menu'){draw(playerMesh,model([40,155,500],-.2,-.02,-.12,2));}else if(mode!=='study'){if((camMode!=='cockpit'||mode==='crash'||mode==='end')&&!(crash&&crash.grounded))draw(aircraftType==='viper'?heavyMesh:playerMesh,model(player.pos,player.yaw,player.pitch,player.roll));for(let e of enemies){if(e.dead)continue;draw(e.enemyType==='ARMOUR'?enemyHeavyMesh:enemyMesh,model(e.pos,e.yaw,e.pitch,e.roll,1.7));if(!isRef){let tail=forward(e.yaw,e.pitch);for(let j=0;j<5;j++)draw(bulletMesh,model(add(e.pos,mul(tail,-(23+j*8))),e.yaw,e.pitch,0,.35-j*.045));}}if(!isRef){for(let b of bullets)draw(b.enemy?enemyTraceMesh:bulletMesh,model(b.pos,Math.atan2(-b.vel[0],-b.vel[2]),Math.asin(norm(b.vel)[1])));for(let m of missiles)draw(bulletMesh,model(m.pos,Math.atan2(-m.vel[0],-m.vel[2]),Math.asin(norm(m.vel)[1]),0,1.8));for(let p of debris)draw(debrisMesh,model(p.pos,p.rot[0],p.rot[1],p.rot[2],p.scale*.55));drawParticles(eye,target);}}
}
function project(p){let v=mm(proj,view),x=p[0],y=p[1],z=p[2],w=v[3]*x+v[7]*y+v[11]*z+v[15],aw=Math.max(1,Math.abs(w));return[(v[0]*x+v[4]*y+v[8]*z+v[12])/aw*.5+.5,.5-(v[1]*x+v[5]*y+v[9]*z+v[13])/aw*.5,w];}
// Bearings use the aircraft's own heading rather than the camera projection.
// Rear-centre contacts consistently choose a right turn instead of an arbitrary screen side.
function contactBearing(pos){
 let d=sub(pos,player.pos),f=forward(player.yaw,0),r=[Math.cos(player.yaw),0,-Math.sin(player.yaw)];
 let ahead=dot(d,f),side=dot(d,r),angle=Math.atan2(side,ahead)*180/PI;
 if(ahead<0&&Math.abs(side)<.001)angle=180;
 let altitude=pos[1]-player.pos[1];return{angle,behind:ahead<0,altitude,range:len(d)};
}
function altitudeHint(delta){return delta>30?'上方 '+Math.round(delta)+'m':delta< -30?'下方 '+Math.round(-delta)+'m':'同高度';}
const radar=$('radar').getContext('2d');function hud(){let html='',nearest=null,nearDist=Infinity,visibleCount=0,edgeCounts=[0,0];let live=enemies.filter(e=>!e.dead),focus=tracked&&!tracked.dead?tracked:live.reduce((a,b)=>!a||len(sub(b.pos,player.pos))<len(sub(a.pos,player.pos))?b:a,null);for(let e of live){let dangerous=e===threatSource&&threatTime>0;let dist=len(sub(e.pos,player.pos));if(dist<nearDist){nearest=e;nearDist=dist;}let q=project(e.pos),onscreen=q[2]>0&&q[0]>.07&&q[0]<.93&&q[1]>.18&&q[1]<.78;let label=(e.ace?'★ ACE ':'')+(e===tracked?'追蹤 ':'')+'BANDIT '+String(e.id).padStart(2,'0')+(e.enemyType==='ARMOUR'?' · F-15 類':e.enemyType==='INTERCEPTOR'?' · F-16 高速':' · F-16 類');if(onscreen){visibleCount++;let occluded=!!firstCollision(camPos,e.pos,0);let size=clamp(35+15000/Math.max(160,dist),42,85);html+=`<div class="target-v2 ${(e===selected||e===tracked)?'selected':''} ${e===focus?'focus-contact':''} ${dangerous?'threat-contact':''}" style="left:${q[0]*100}%;top:${q[1]*100}%;width:${size}px;height:${size*.65}px"><i></i><b>${label}</b><small>${Math.round(dist)} m${occluded?' · 樓宇遮擋':''}${e===selected&&aimDuration>.45?' · LOCK':''}</small><span class="enemy-health"><em style="width:${e.hp/e.maxHp*100}%"></em></span></div>`; }else{
 // Separate off-screen contacts into rows, keeping every enemy visible.
 let bearing=contactBearing(e.pos),isRear=bearing.behind,turn=bearing.angle<0?'左轉':'右轉';
 let degrees=Math.round(Math.abs(bearing.angle)),vertical=altitudeHint(bearing.altitude);
 // Projected position takes camera pitch and portrait aspect into account.
 let front=q[2]>0,verticalEdge=front&&q[0]>=.07&&q[0]<=.93&&(q[1]<.18||q[1]>.78);
 let px=verticalEdge?clamp(q[0],.12,.88):(bearing.angle<0?.09:.91),py=verticalEdge?(q[1]<.18?.2:.74):clamp(.48-bearing.altitude/1500,.22,.72);
 if(!verticalEdge){let edgeIndex=bearing.angle<0?0:1;if(hudDetail==='full'||e===focus||dangerous)py=clamp(py+(edgeCounts[edgeIndex]++-1)*.095,.2,.76);}
 let cue=verticalEdge?(q[1]<.18?'抬機頭':'壓機頭'):turn+' '+degrees+'°';
 let deg=verticalEdge?(q[1]<.18?-90:90):(bearing.angle<0?180:0);
 html+=`<div class="edge-target ${e===focus?'focus-contact':''} ${dangerous?'threat-contact':''} ${verticalEdge?'edge-vertical':bearing.angle<0?'edge-left':'edge-right'}" style="left:${px*100}%;top:${py*100}%"><span style="transform:rotate(${deg}deg)">➤</span><small>${label}<br>${Math.round(dist)}m · ${isRear?'後方 · ':''}${cue}<br>${vertical}</small></div>`;
 }}
$('targetLayer').innerHTML=html;updateLandmarks();$('enemyCount').textContent=enemies.length;$('nearestRange').textContent=nearest?Math.round(nearDist)+' m':'—';if(nearest){let guide=tracked&&!tracked.dead?tracked:nearest;let b=contactBearing(guide.pos),deg=Math.round(Math.abs(b.angle)),direction=deg<12?'正前方':(b.angle<0?'左轉 ':'右轉 ')+deg+'°';
 let id=String(guide.id).padStart(2,'0');let pq=project(guide.pos),vert=pq[2]>0&&pq[0]>=.07&&pq[0]<=.93?(pq[1]<.18?'抬機頭':pq[1]>.78?'壓機頭':''):'';$('pursuit').textContent=(tracked===guide?'追蹤 BANDIT ':'最近 BANDIT ')+id+' · '+(vert||direction)+' · '+altitudeHint(b.altitude)+' · '+Math.round(b.range)+'m';
 if(selected&&aimDuration>.45&&(()=>{let q=project(selected.pos);return q[2]>0&&q[0]>.07&&q[0]<.93&&q[1]>.18&&q[1]<.78})())$('pursuit').textContent='已鎖定 BANDIT '+String(selected.id).padStart(2,'0')+' · Q / ◇ 發射導彈';}
let c=radar;c.clearRect(0,0,180,180);c.fillStyle='#08212dcc';c.beginPath();c.arc(90,90,84,0,TAU);c.fill();c.strokeStyle='#9adcc25a';c.lineWidth=1;for(let r of [28,56,84]){c.beginPath();c.arc(90,90,r,0,TAU);c.stroke()}c.beginPath();c.moveTo(6,90);c.lineTo(174,90);c.moveTo(90,6);c.lineTo(90,174);c.stroke();c.fillStyle='#b5f6e1';c.beginPath();c.moveTo(90,83);c.lineTo(86,95);c.lineTo(94,95);c.fill();let fw=forward(player.yaw,0),right=[Math.cos(player.yaw),0,-Math.sin(player.yaw)];for(let e of enemies){let d=sub(e.pos,player.pos),x=dot(d,right)/1100*75,y=-dot(d,fw)/1100*75,l=Math.max(1,Math.hypot(x,y)/75);x/=l;y/=l;c.fillStyle=(e===threatSource&&threatTime>0)?'#ff493d':(e===tracked||(!tracked&&(e===selected||e===nearest)))?'#ffd879':'#ff735b';c.beginPath();c.arc(90+x,90+y,(e===tracked||(!tracked&&(e===selected||e===nearest)))?5:3.5,0,TAU);c.fill()}c.font='9px monospace';c.fillStyle='#a9d5cf';c.fillText('1.1 KM / 外圈=更遠',32,22);}
function updateLandmarks(){let html='';if(showLandmarks&&!crash)for(let l of landmarks){let q=project(l.pos),dist=len(sub(l.pos,camPos));if(q[2]>0&&dist<3700&&q[0]>.05&&q[0]<.95&&q[1]>.15&&q[1]<.65)html+=`<span class="landmark" style="left:${q[0]*100}%;top:${q[1]*100}%">${l.name}</span>`;}$('landmarks').innerHTML=html;}
function render(dt){buildShadowMaps();document.body.classList.toggle('cockpit',camMode==='cockpit'&&mode==='play'&&canopyEnabled);if(mode==='menu'){let t=time*.04;camPos=[900+Math.sin(t)*130,340+Math.sin(t*.7)*20,1420];camTarget=[-100,135,-990]}else if(mode==='study'){let views=[[[0,235,800],[-230,150,-1000]],[[-505,205,-590],[-690,230,-920]],[[-580,399,-805],[-690,392,-920]],[[-490,62,-710],[-770,35,-935]],[[-630,28,-620],[-900,13,-680]],[[-710,32,-290],[-470,8,80]],[[325,195,-845],[160,190,-1180]],[[105,100,-860],[-20,100,-1100]],[[-175,120,-580],[-310,110,-850]],[[480,140,-1040],[365,115,-1330]],[[190,180,-1030],[80,150,-1340]],[[620,130,-870],[510,100,-1130]],[[-960,220,-1020],[-1100,190,-1300]],[[-590,23,-700],[-620,11,-765]],[[-300,23,-710],[-330,11,-775]],[[450,24,-1170],[420,11,-1235]],[[680,35,-720],[650,20,-910]],[[-905,18,-585],[-850,11,-620]],[[-1850,30,-800],[-1780,10,-825]],[[-1250,19,1080],[-1160,10,1080]],[[1750,220,50],[1400,65,-690]],[[1615,38,-380],[1555,16,-490]],[[1680,90,-650],[1370,35,-650]],[[1370,430,-370],[1370,20,-650]],[[1950,75,-280],[1810,15,-510]],[[1600,175,-690],[1440,205,-1020]],[[1075,115,-620],[1195,78,-880]],[[1370,115,-590],[1310,88,-891]],[[1630,130,-650],[1500,105,-895]],[[1750,220,50],[1400,65,-690]],[[streetSamples[0][0]+30,27,streetSamples[0][1]+streetSamples[0][3]/2+60],[streetSamples[0][0],20,streetSamples[0][1]]],[[-1100,19,shoreline(-1100)-27],[-1000,10,shoreline(-1000)-65]],[[1260,22,-952],[1215,11,-987.8]],[[350,32,1700],[350,150,-900]]];camPos=views[studyView][0];camTarget=views[studyView][1];}else if(!paused&&mode!=='crash'&&!(mode==='end'&&crash)){let fw=forward(player.yaw,player.pitch),right=[Math.cos(player.yaw),0,-Math.sin(player.yaw)];let desired=camMode==='cockpit'?add(add(player.pos,mul(fw,4)),[0,1.7,0]):add(add(player.pos,mul(fw,-56)),[0,17,0]);camPos=camPos.map((v,i)=>mix(v,desired[i],1-Math.exp(-dt*6)));camTarget=add(add(player.pos,mul(fw,180)),camMode==='cockpit'?[0,1.5,0]:[0,12,0]);}
if(crash&&(mode==='crash'||mode==='end')&&!paused){let desired=add(player.pos,[Math.cos(crash.age*.3)*62,32+Math.min(crash.age*3,20),Math.sin(crash.age*.3)*62]);camPos=camPos.map((v,i)=>mix(v,desired[i],1-Math.exp(-dt*2.8)));camTarget=player.pos.slice();}let baseCamera=camPos.slice(),baseTarget=camTarget.slice();if(shake>0&&!paused&&mode!=='study'){let j=[Math.sin(time*91)*shake*1.8,Math.sin(time*127)*shake*1.2,Math.cos(time*73)*shake*.8];camPos=add(camPos,j);camTarget=add(camTarget,mul(j,-.4));}proj=perspective(aspect,1,FAR);view=look(camPos,camTarget);let re=[camPos[0],-camPos[1],camPos[2]],rt=[camTarget[0],-camTarget[1],camTarget[2]];refVP=mm(proj,look(re,rt));gl.bindFramebuffer(gl.FRAMEBUFFER,refF);gl.viewport(0,0,W>>1,H>>1);gl.clearColor(.05,.08,.1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);drawScene(re,rt,true);
gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,W,H);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);drawScene(camPos,camTarget,false);
gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fb);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,resolveF);for(let i=0;i<2;i++){gl.readBuffer(gl.COLOR_ATTACHMENT0+i);gl.drawBuffers(i===0?[gl.COLOR_ATTACHMENT0]:[gl.NONE,gl.COLOR_ATTACHMENT1]);gl.blitFramebuffer(0,0,W,H,0,0,W,H,gl.COLOR_BUFFER_BIT,gl.NEAREST)}gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(null);
use(bloomP);i1(bloomP,'tex',0);for(let i=0;i<2;i++){gl.bindFramebuffer(gl.FRAMEBUFFER,bloomF[i]);gl.viewport(0,0,bW,bH);bindTex(0,i===0?sceneTex:bloomTex[0]);v2(bloomP,'stepUV',i===0?[1/bW,0]:[0,1/bH]);i1(bloomP,'extract',i===0?1:0);gl.drawArrays(gl.TRIANGLES,0,3)}
gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);use(postP);bindTex(0,sceneTex);bindTex(1,normalTex);bindTex(2,bloomTex[1]);i1(postP,'tex',0);i1(postP,'normalTex',1);i1(postP,'bloomTex',2);v2(postP,'resolution',[W,H]);f1(postP,'time',mode==='study'?0:time);f1(postP,'aspect',aspect);f1(postP,'damage',mode==='study'?0:damage);f1(postP,'impactFlash',mode==='study'?0:impactFlash);f1(postP,'concussion',mode==='study'?0:clamp(shake*.65,0,1));i1(postP,'rain',rain&&mode!=='study'?1:0);i1(postP,'ao',quality==='high'?1:0);gl.drawArrays(gl.TRIANGLES,0,3);gl.enable(gl.DEPTH_TEST);if(mode==='play'&&frame%3===0)hud();if(mode==='menu'&&frame%6===0)updateLandmarks();if(window.FlightHUD){let ff=forward(player.yaw,player.pitch),fp=project(add(player.pos,mul(ff,5000)));window.FlightHUD.draw({active:mode==='play'||mode==='crash',lost:mode==='crash',width:innerWidth,height:innerHeight,dt,paused,time,pitch:player.pitch,roll:player.roll,yaw:player.yaw,speed:player.speed,altitude:player.pos[1],health:player.hp,missiles:player.missiles,locked:!!selected&&aimDuration>.45,range:selected?len(sub(selected.pos,player.pos)):null,fpm:fp,detail:hudDetail,brightness:hudBrightness,touch:!!window.matchMedia?.('(pointer:coarse)').matches});}camPos=baseCamera;camTarget=baseTarget;}
// Expose read-only diagnostics for graphics verification, without gameplay cheats.
window.flightDiagnostics=()=>({webgl:2,mode,width:W,height:H,samples,enemies:enemies.length,kills,health:player.hp,elapsed,vertices:worldMesh.count,glError:gl.getError(),buildingShadows:shadowsEnabled,shadowMapSizes:shadowMaps.map(m=>m.size),shadowCasterVertices:worldMesh.count,effects:['two-range PCF building shadows','GGX PBR','planar wet reflections','screen-space ambient occlusion','bloom','ACES','raindrop refraction'],proceduralModels:true,photorealMaterialAtlas:materialReady,enemyScale:1.7,enemyModels:['F-16-inspired','F-15-inspired'],initialEnemyRange:360,targetIndicators:true,avionicsHUD:!!window.FlightHUD,camera:camMode,photoBackdrop:false,photographicFacadeMaterials:facadeReady,proceduralBuildingFacades:true,urbanFamilies:urbanStats,cityDetail,roadVehiclePositions:Array.from({length:18},(_,i)=>roadVehicle(i,mode==='study'?0:time).pos),animatedFerries:4,ferryPositions:[0,1,2,3].map(i=>ferryState(i).pos),wakeTrails:true,innerStreetStats:innerStats,aircraftType,rocketSalvos,rocketCD,flareCharges,flareCD,enemyTypes:enemies.map(e=>e.enemyType),cityPatrols:enemies.filter(e=>!!e.cityAnchor).length,enemyShots,enemyHits,difficulty,score,combo,maxCombo,gunHeat,overheated,supplyCooldown,supplyCount,autoActive,autoSafetyHold,autoUses,autoLimit,trackedId:tracked&&!tracked.dead?tracked.id:null,combatStats:{...combatStats},threatTime,nearestContact:enemies.length?(()=>{let e=enemies.reduce((a,b)=>len(sub(a.pos,player.pos))<len(sub(b.pos,player.pos))?a:b);return{id:e.id,...contactBearing(e.pos)}})():null,sceneStyle:'detailed-streets-traffic-v38',landmarks:landmarks.map(l=>l.name),harbourAxis:'east-west',crashSequence:mode==='crash',collisionShapes:collisionBoxes.length,crashAge:crash?.age||0});
function loop(t){let dt=Math.min((t-last)/1000,.04)||.016;last=t;if(!paused){time+=dt;if(mode==='play')update(dt);else if(mode==='crash')updateCrash(dt);else if(mode==='end'&&crash)stepEffects(dt);}render(dt);frame++;requestAnimationFrame(loop)}requestAnimationFrame(loop);
}}
)();
