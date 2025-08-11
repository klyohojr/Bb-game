const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W,H,DPR;
const HUD={scoreEl:document.getElementById('score'),bestEl:document.getElementById('best'),levelEl:document.getElementById('level'),playBtn:document.getElementById('playBtn'),muteBtn:document.getElementById('muteBtn'),installBtn:document.getElementById('installBtn')};
let audioOn=true, allowInstallPrompt=null;
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();allowInstallPrompt=e;HUD.installBtn.hidden=false;});
HUD.installBtn?.addEventListener('click',async()=>{ if(allowInstallPrompt){ allowInstallPrompt.prompt(); allowInstallPrompt=null; HUD.installBtn.hidden=true; }});
HUD.muteBtn.addEventListener('click',()=>{ audioOn=!audioOn; HUD.muteBtn.textContent='Sound: ' + (audioOn?'On':'Off'); });
function fit(){ DPR=Math.min(2,window.devicePixelRatio||1); W=canvas.width=Math.floor(innerWidth*DPR); H=canvas.height=Math.floor(innerHeight*DPR); canvas.style.width=innerWidth+'px'; canvas.style.height=innerHeight+'px'; }
fit(); addEventListener('resize',fit);
const state={running:false,t:0,score:0,best:Number(localStorage.getItem('best')||0),level:1,gravity:0.0012,scroll:0.2,jumpV:-0.5,glide:0.0004,player:null,obstacles:[],particles:[],groundY:0.8};
HUD.bestEl.textContent=state.best;
class Player{constructor(){this.x=W*0.2;this.y=H*state.groundY-60;this.vx=0;this.vy=0;this.w=60;this.h=60;this.onGround=true;this.jumpCount=0;this.angle=0;} update(dt){this.vy+=state.gravity*dt; this.y+=this.vy*dt; const gy=H*state.groundY - this.h; if(this.y>=gy){this.y=gy;this.vy=0;this.onGround=true;this.jumpCount=0;} else this.onGround=false; this.angle=Math.max(-0.2,Math.min(0.3,this.vy*0.003)); } jump(){ if(this.onGround || this.jumpCount<2){ this.vy=state.jumpV*(1+0.07*this.jumpCount); this.jumpCount++; sfx(220+Math.random()*80,0.03);} } glide(dt){ if(!this.onGround && this.vy>0) this.vy-=state.glide*dt; } draw(){const x=this.x,y=this.y,r=this.h/2; ctx.save(); ctx.translate(x+r,y+r); ctx.rotate(this.angle); const g=ctx.createRadialGradient(0,0,r*0.2,0,0,r*1.2); g.addColorStop(0,'rgba(255,212,0,.95)'); g.addColorStop(1,'rgba(255,212,0,.05)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,r*1.2,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#ffd400'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(-r*0.25,-r*0.1,r*0.12,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(r*0.25,-r*0.1,r*0.12,0,Math.PI*2); ctx.fill(); ctx.fillRect(-r*0.25,r*0.15,r*0.5,r*0.12); ctx.restore(); }}
class Obstacle{constructor(speed){const h=30+Math.random()*80; this.w=30+Math.random()*40; this.h=h; this.x=W+Math.random()*W*0.4; this.y=H*state.groundY - h; this.speed=speed || (state.scroll+Math.random()*0.25); this.passed=false; this.color='hsl('+(40+Math.random()*40)+', 90%, 55%)'; } update(dt){ this.x-=this.speed*dt; } draw(){ ctx.fillStyle=this.color; roundRect(this.x,this.y,this.w,this.h,8); }}
class Particle{constructor(x,y,dx,dy,life,color){ Object.assign(this,{x,y,dx,dy,life,color}); this.maxLife=life; } update(dt){ this.life-=dt; this.x+=this.dx*dt; this.y+=this.dy*dt; this.dy+=0.0004*dt; } draw(){ const a=Math.max(0,this.life/this.maxLife); ctx.fillStyle=this.color.replace('ALPHA',a.toFixed(3)); ctx.fillRect(this.x,this.y,3,3); }}
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.fill(); }
function sfx(freq,dur){ if(!audioOn) return; const a=new (window.AudioContext||window.webkitAudioContext)(); const o=a.createOscillator(); const g=a.createGain(); o.frequency.value=freq; o.type='triangle'; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0.0001,a.currentTime); g.gain.exponentialRampToValueAtTime(0.2,a.currentTime+0.01); g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+dur); o.start(); o.stop(a.currentTime+dur+0.02); }
function reset(){ state.player=new Player(); state.obstacles=[]; state.particles=[]; state.t=0; state.score=0; state.level=1; }
function spawnObstacles(){ if(state.obstacles.length<4){ state.obstacles.push(new Obstacle(state.scroll+state.level*0.05)); }}
let holding=false,lastTap=0;
function setupInput(){ const tap=()=>{ const now=performance.now(); const dtap=now-lastTap; lastTap=now; state.player.jump(); if(dtap<280) state.player.jump(); }; const holdStart=()=>{ holding=true; }; const holdEnd=()=>{ holding=false; };
  canvas.addEventListener('touchstart',e=>{e.preventDefault();tap();holdStart();},{passive:false});
  canvas.addEventListener('touchend',e=>{e.preventDefault();holdEnd();},{passive:false});
  canvas.addEventListener('mousedown',e=>{tap();holdStart();}); addEventListener('mouseup',holdEnd);
}
setupInput();
HUD.playBtn.addEventListener('click',()=>{ if(!state.running){ reset(); state.running=true; }});
let last=0;
function loop(ts){ const dt=Math.min(32, ts-(last||ts)); last=ts; ctx.clearRect(0,0,W,H); ctx.fillStyle='#0b0e19'; ctx.fillRect(0,0,W,H); drawStars(ts); ctx.fillStyle='#101527'; ctx.fillRect(0,H*state.groundY,W,H);
  if(state.running){ state.t+=dt; if(holding) state.player.glide(dt); state.player.update(dt); spawnObstacles(); for(let i=state.obstacles.length-1;i>=0;i--){ const o=state.obstacles[i]; o.update(dt); o.draw(); if(o.x+o.w<0) state.obstacles.splice(i,1); if(!o.passed && o.x+o.w<state.player.x){ o.passed=true; state.score+=10; sfx(660,0.03); if(state.score%100===0){ state.level++; state.scroll+=0.03; } } if(rectsOverlap(state.player,o)){ explode(state.player.x+state.player.w/2, state.player.y+state.player.h/2); sfx(110,0.2); state.running=false; state.best=Math.max(state.best,state.score); localStorage.setItem('best',state.best); } }
    HUD.scoreEl.textContent=state.score; HUD.bestEl.textContent=state.best; HUD.levelEl.textContent=state.level; }
  state.player?.draw();
  for(let i=state.particles.length-1;i>=0;i--){ const p=state.particles[i]; p.update(dt); p.draw(); if(p.life<=0) state.particles.splice(i,1); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
function rectsOverlap(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
function explode(x,y){ for(let i=0;i<40;i++){ const ang=Math.random()*Math.PI*2; const spd=0.15+Math.random()*0.4; state.particles.push(new Particle(x,y,Math.cos(ang)*spd,Math.sin(ang)*spd,600+Math.random()*600,'rgba(255,212,0,ALPHA)')); } }
function drawStars(ts){ const n=80; for(let i=0;i<n;i++){ const x=(i*137 + ts*0.03)%W; const y=(i*89) % (H*state.groundY-40); const a=0.3+0.7*Math.abs(Math.sin((ts*0.001 + i)*0.8)); ctx.fillStyle=`rgba(255,255,255,${a.toFixed(2)})`; ctx.fillRect(W-x,y,2,2); } }
