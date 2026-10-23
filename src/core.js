// ScanMatch core — barcode decoding pipeline (ZXing-wasm in Web Workers), photo/laser-code enhancement,
// label layout, rack lattice fitting and a tiny dependency-free .xlsx writer.
// Extracted from a production lab app; comments translated where useful.

const work=document.createElement('canvas'), wctx=work.getContext('2d',{willReadFrequently:true});

function grab(src,sx,sy,sw,sh,scale){ work.width=Math.max(1,Math.round(sw*scale)); work.height=Math.max(1,Math.round(sh*scale)); wctx.imageSmoothingQuality='high'; wctx.drawImage(src,sx,sy,sw,sh,0,0,work.width,work.height); return wctx.getImageData(0,0,work.width,work.height); }

function prep(img,passes,amt){
  const d=img.data,w=img.width,h=img.height; let a=new Float32Array(d.length),b=new Float32Array(d.length);
  for(let i=0;i<d.length;i++) a[i]=d[i];
  for(let p=0;p<passes;p++){
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=(y*w+x)*4,l=x?i-4:i,r=x<w-1?i+4:i; for(let k=0;k<3;k++) b[i+k]=(a[l+k]+2*a[i+k]+a[r+k])/4; }
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=(y*w+x)*4,u=y?i-4*w:i,dn=y<h-1?i+4*w:i; for(let k=0;k<3;k++) a[i+k]=(b[u+k]+2*b[i+k]+b[dn+k])/4; } }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=(y*w+x)*4; for(let k=0;k<3;k++){ const c=a[i+k];
    const n=(x?a[i+k-4]:c)+(x<w-1?a[i+k+4]:c)+(y?a[i+k-4*w]:c)+(y<h-1?a[i+k+4*w]:c); d[i+k]=c+amt*(4*c-n); } }
  return img;
}

function closePrep(img,o){   // o={win,k,c}: adaptive threshold → binary closing (fills gaps between laser dots) → 3x3 opening (removes speckle)
  const W=img.width,H=img.height,d=img.data,n=W*H, g=new Float32Array(n);
  for(let i=0;i<n;i++) g[i]=.3*d[i*4]+.59*d[i*4+1]+.11*d[i*4+2];
  const I=new Float64Array((W+1)*(H+1)); for(let y=0;y<H;y++){ let s=0; for(let x=0;x<W;x++){ s+=g[y*W+x]; I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+s; } }
  const r=o.win>>1; let m=new Uint8Array(n);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const x0=Math.max(0,x-r),x1=Math.min(W,x+r+1),y0=Math.max(0,y-r),y1=Math.min(H,y+r+1);
    m[y*W+x]=g[y*W+x]<(I[y1*(W+1)+x1]-I[y0*(W+1)+x1]-I[y1*(W+1)+x0]+I[y0*(W+1)+x0])/((x1-x0)*(y1-y0))-o.k?1:0; }
  const morph=(src,rad,dil)=>{ const J=new Int32Array((W+1)*(H+1)); for(let y=0;y<H;y++){ let s=0; for(let x=0;x<W;x++){ s+=src[y*W+x]; J[(y+1)*(W+1)+x+1]=J[y*(W+1)+x+1]+s; } }
    const o2=new Uint8Array(n); for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const x0=Math.max(0,x-rad),y0=Math.max(0,y-rad),x1=Math.min(W,x+rad+1),y1=Math.min(H,y+rad+1), c=J[y1*(W+1)+x1]-J[y0*(W+1)+x1]-J[y1*(W+1)+x0]+J[y0*(W+1)+x0];
      o2[y*W+x]=dil?(c>0?1:0):(c===(x1-x0)*(y1-y0)?1:0); } return o2; };
  const cr=o.c>>1; if(cr>0) m=morph(morph(m,cr,true),cr,false);
  m=morph(morph(m,1,false),1,true);
  for(let i=0;i<n;i++){ const v=m[i]?0:255; d[i*4]=d[i*4+1]=d[i*4+2]=v; d[i*4+3]=255; }
  return img;
}

function edgeTilt(img){
  const W=img.width,H=img.height,d=img.data, g=new Float32Array(W*H); for(let i=0;i<W*H;i++) g[i]=.3*d[i*4]+.59*d[i*4+1]+.11*d[i*4+2];
  let sx=0,sy=0; const hist=new Float32Array(90);
  for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){ const i=y*W+x;
    const gx=(g[i-W+1]+2*g[i+1]+g[i+W+1])-(g[i-W-1]+2*g[i-1]+g[i+W-1]), gy=(g[i+W-1]+2*g[i+W]+g[i+W+1])-(g[i-W-1]+2*g[i-W]+g[i-W+1]);
    const m=Math.hypot(gx,gy); if(m<40) continue; let a=Math.atan2(gy,gx)*180/Math.PI; a=((a%90)+90)%90; hist[Math.floor(a)]+=m; }
  // smooth with a ±3° window and take the peak
  let best=0,bv=-1; for(let a=0;a<90;a++){ let v=0; for(let k=-3;k<=3;k++) v+=hist[(a+k+90)%90]; if(v>bv){ bv=v; best=a; } }
  const top=[best]; let b2=-1,v2=-1; for(let a=0;a<90;a++){ const dd=Math.min(Math.abs(a-best),90-Math.abs(a-best)); if(dd<10) continue; let v=0; for(let k=-3;k<=3;k++) v+=hist[(a+k+90)%90]; if(v>v2){ v2=v; b2=a; } }
  if(b2>=0&&v2>bv*0.5) top.push(b2);
  return top.map(a=>a>45?a-90:a);   // -45..45, one or two candidates
}

function sidePrep(img,o){   // o={r: blur radius, win: window, k: threshold}
  const W=img.width,H=img.height,d=img.data; let g=new Float32Array(W*H);
  for(let i=0;i<W*H;i++) g[i]=.3*d[i*4]+.59*d[i*4+1]+.11*d[i*4+2];
  const box=(src,r)=>{ const out=new Float32Array(W*H), tmp=new Float32Array(W*H);
    for(let y=0;y<H;y++){ let s=0; const o=y*W; for(let x=-r;x<=r;x++) s+=src[o+Math.min(W-1,Math.max(0,x))];
      for(let x=0;x<W;x++){ tmp[o+x]=s/(2*r+1); s+=src[o+Math.min(W-1,x+r+1)]-src[o+Math.max(0,x-r)]; } }
    for(let x=0;x<W;x++){ let s=0; for(let y=-r;y<=r;y++) s+=tmp[Math.min(H-1,Math.max(0,y))*W+x];
      for(let y=0;y<H;y++){ out[y*W+x]=s/(2*r+1); s+=tmp[Math.min(H-1,y+r+1)*W+x]-tmp[Math.max(0,y-r)*W+x]; } }
    return out; };
  if(o.r>0){ g=box(box(g,o.r),o.r); }
  const I=new Float64Array((W+1)*(H+1));
  for(let y=0;y<H;y++){ let s=0; for(let x=0;x<W;x++){ s+=g[y*W+x]; I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+s; } }
  const rr=o.win>>1;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const x0=Math.max(0,x-rr),x1=Math.min(W,x+rr+1),y0=Math.max(0,y-rr),y1=Math.min(H,y+rr+1);
    const m=(I[y1*(W+1)+x1]-I[y0*(W+1)+x1]-I[y1*(W+1)+x0]+I[y0*(W+1)+x0])/((x1-x0)*(y1-y0)), v=g[y*W+x]<m-o.k?0:255, i=(y*W+x)*4; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255; }
  return img;
}

function grabRot(src,cx,cy,cw,ch,target,ang){ const s=target/Math.max(cw,ch), D=Math.ceil(Math.hypot(cw,ch)*s); work.width=D; work.height=D;
  wctx.setTransform(1,0,0,1,0,0); wctx.fillStyle='#fff'; wctx.fillRect(0,0,D,D); wctx.translate(D/2,D/2); wctx.rotate(ang*Math.PI/180); wctx.imageSmoothingQuality='high';
  wctx.drawImage(src,cx,cy,cw,ch,-cw*s/2,-ch*s/2,cw*s,ch*s); wctx.setTransform(1,0,0,1,0,0); return wctx.getImageData(0,0,D,D); }

const SIDE_P=[{win:91,k:3,c:3},{win:61,k:3,c:5},{win:61,k:5,c:7},{win:31,k:5,c:7},{win:91,k:5,c:7}];   // settings with the best success rate in experiments

function sideVariants(tilts){ const v=[]; for(const sz of [520,720]) for(const tl of tilts) for(const p of SIDE_P) v.push({sz,a:-tl,...p}); return v; }

function cropTilts(src,cx,cy,cw,ch){ const s=Math.min(1,380/Math.max(cw,ch)); return edgeTilt(grab(src,cx,cy,cw,ch,s)); }

async function sideScan(src,cx,cy,cw,ch,found,label,budget){
  const t0=performance.now(); let i=0, hit=null; const V=sideVariants(cropTilts(src,cx,cy,cw,ch));
  await runAll(V,PAR(),async v=>{ if(hit||performance.now()-t0>budget) return; i++;
    const r=await decodeRaw(grabRot(src,cx,cy,cw,ch,v.sz,v.a),{close:1,win:v.win,k:v.k,c:v.c});
    const b=r.find(x=>isTube(norm(x.text))); if(b&&!hit){ hit=b; found.set(norm(b.text),{text:norm(b.text),format:b.format,pts:[{x:cx,y:cy},{x:cx+cw,y:cy},{x:cx+cw,y:cy+ch},{x:cx,y:cy+ch}]}); }
    if(label&&i%4===0) $('busy').textContent=`${label} ${i}/${V.length}`; });
  return hit;
}

async function sidePhoto(src,w,h,found){
  if([...found.keys()].some(isTube)) return null;
  const m=Math.min(w,h), regions=[];
  for(const f of [0.4,0.6]){ const cw=m*f; regions.push([(w-cw)/2,(h-cw)/2,cw]); }
  const tw=m*0.45; for(const fy of [0.25,0.5,0.75]) for(const fx of [0.25,0.5,0.75]) regions.push([Math.max(0,Math.min(w-tw,w*fx-tw/2)),Math.max(0,Math.min(h-tw,h*fy-tw/2)),tw]);
  const t0=performance.now();
  for(const [x,y,cw] of regions){ if(performance.now()-t0>14000) break; const hit=await sideScan(src,x,y,cw,cw,found,TT('busySide'),4000); if(hit) return hit; }
  return null;
}

async function enhancedScan(src,w,h,found,label){
  const M=Math.max(w,h), T=Math.round(M/5), st=Math.round(T*0.5), xs=[],ys=[];
  for(let x=0;;x+=st){ xs.push(Math.min(x,Math.max(0,w-T))); if(x+T>=w) break; }
  for(let y=0;;y+=st){ ys.push(Math.min(y,Math.max(0,h-T))); if(y+T>=h) break; }
  const s=Math.min(1,1000/T); let i=0; const tiles=[]; for(const y of ys) for(const x of xs) tiles.push([x,y]);
  await runAll(tiles,PAR(),async([x,y])=>{ const r=await decodeRaw(grab(src,x,y,Math.min(T,w),Math.min(T,h),s),[1,2]); i++;
    addFound(found,r,x,y,s); $('busy').textContent=`${label} ${i}/${tiles.length}`; if(!poolOK) await new Promise(r=>setTimeout(r,0)); });
}

const POOL=[], pend=new Map(); let poolOK=false, jobN=0;

let WURL=null;

function initPool(){
  try{
    const src=[...document.scripts].map(s=>s.textContent).filter(x=>x.startsWith('var ZXingWASM=')||x.startsWith('window.__WASM_B64='));
    if(src.length!==2||!window.Worker) return Promise.resolve();
    const body='self.window=self;\n'+src.join('\n;\n')+'\nconst OPTS='+JSON.stringify(OPTS)+';\n'+prep.toString()+'\n'+sidePrep.toString()+'\n'+closePrep.toString()+
      "\nconst ready=ZXingWASM.prepareZXingModule({overrides:{wasmBinary:Uint8Array.from(atob(self.__WASM_B64),c=>c.charCodeAt(0)).buffer},fireImmediately:true});"+
      "\nonmessage=async e=>{ const d=e.data; try{ await ready; let img=new ImageData(new Uint8ClampedArray(d.buf),d.w,d.h); if(d.pp&&d.pp.close) img=closePrep(img,d.pp); else if(d.pp&&d.pp.side) img=sidePrep(img,d.pp); else if(d.pp) img=prep(img,d.pp[0],d.pp[1]);"+
      " const r=(await ZXingWASM.readBarcodes(img,OPTS)).filter(b=>b.isValid&&b.text).map(b=>({text:b.text,format:b.format,position:b.position,isValid:true})); postMessage({id:d.id,r}); }"+
      " catch(err){ postMessage({id:d.id,err:String(err&&err.message||err)}); } };";
    WURL=URL.createObjectURL(new Blob([body],{type:'text/javascript'}));
    const n=Math.max(1,Math.min(3,(navigator.hardwareConcurrency||2)-1));
    for(let i=0;i<n;i++) POOL.push(newWorker());
    return Promise.race([decodeW(new ImageData(16,16)).then(()=>{ poolOK=true; }),new Promise(r=>setTimeout(r,20000))]).catch(()=>{});
  }catch(e){ return Promise.resolve(); }
}

function newWorker(){ const w=new Worker(WURL); w.busy=0; w.jobs=new Set();
  w.onmessage=e=>settle(w,e.data.id,e.data.err?new Error(e.data.err):null,e.data.r);
  w.onerror=w.onmessageerror=ev=>{ try{ ev.preventDefault&&ev.preventDefault(); }catch(_){ } replaceWorker(w); };
  return w; }

function settle(w,id,err,r){ const q=pend.get(id); if(!q) return; pend.delete(id); clearTimeout(q.t); w.jobs.delete(id); w.busy=Math.max(0,w.busy-1); err?q.rej(err):q.res(r); }

function replaceWorker(w){ const i=POOL.indexOf(w); if(i<0) return; try{ w.terminate(); }catch(_){ }
  for(const id of [...w.jobs]) settle(w,id,new Error('worker lost'));
  try{ POOL[i]=newWorker(); }catch(_){ POOL.splice(i,1); if(!POOL.length) poolOK=false; } }

function decodeW(img,pp){ const w=POOL.reduce((a,b)=>a.busy<=b.busy?a:b); w.busy++; const id=++jobN; w.jobs.add(id);
  return new Promise((res,rej)=>{ const t=setTimeout(()=>replaceWorker(w),15000);   // replace a worker that does not answer within 15 s
    pend.set(id,{res,rej,t}); w.postMessage({id,buf:img.data.buffer,w:img.width,h:img.height,pp:pp||null},[img.data.buffer]); }); }

async function decodeRaw(img,pp){
  if(poolOK){ try{ return await decodeW(img,pp); }catch(e){ return []; } }
  if(pp&&pp.close) img=closePrep(img,pp); else if(pp&&pp.side) img=sidePrep(img,pp); else if(pp) img=prep(img,pp[0],pp[1]);
  return (await ZXingWASM.readBarcodes(img,OPTS)).filter(b=>b.isValid&&b.text);
}

const PAR=()=>poolOK?POOL.length*2:1;

async function runAll(jobs,limit,fn){ let i=0; await Promise.all(Array.from({length:Math.max(1,limit)},async()=>{ while(i<jobs.length){ const j=jobs[i++]; await fn(j); } })); }

function addFound(map,res,sx,sy,scale,flipW){
  let n=0;
  for(const b of res){ const t=norm(b.text); if(map.has(t)) continue; const p=b.position;
    let pts=p?[p.topLeft,p.topRight,p.bottomRight,p.bottomLeft].map(q=>({x:sx+q.x/scale,y:sy+q.y/scale})):null;
    if(pts&&flipW) pts=pts.map(q=>({x:flipW-q.x,y:q.y}));
    map.set(t,{text:t,format:b.format,pts}); n++; }
  return n;
}

let flipCv=null;

function flipped(src,w,h){ flipCv=flipCv||document.createElement('canvas'); flipCv.width=w; flipCv.height=h; const c=flipCv.getContext('2d'); c.setTransform(-1,0,0,1,w,0); c.drawImage(src,0,0); return flipCv; }

async function scanPhoto(src,w,h,onStep){
  const found=new Map(), M=Math.max(w,h);
  await runAll([3000,1800,1100].filter(max=>!(max>M*1.05&&max!==3000)),PAR(),async max=>{ const s=Math.min(1,max/M); addFound(found,await decodeRaw(grab(src,0,0,w,h,s)),0,0,s); });
  await onStep(found,TT('busyFine'));
  if(M>900){
    const T=Math.round(Math.max(Math.min(w,h)/2.2,M/3.2)), st=Math.round(T*0.62), xs=[],ys=[];
    for(let x=0;;x+=st){ xs.push(Math.min(x,Math.max(0,w-T))); if(x+T>=w) break; }
    for(let y=0;;y+=st){ ys.push(Math.min(y,Math.max(0,h-T))); if(y+T>=h) break; }
    const scale=Math.min(3,1400/T); let i=0; const tiles=[]; for(const y of ys) for(const x of xs) tiles.push([x,y]);
    await runAll(tiles,PAR(),async([x,y])=>{ const r=await decodeRaw(grab(src,x,y,Math.min(T,w),Math.min(T,h),scale)); i++; const n=addFound(found,r,x,y,scale); if(n) await onStep(found,`${TT('busyFine')} ${i}/${tiles.length}`); else $('busy').textContent=`${TT('busyFine')} ${i}/${tiles.length}`; });
  }
  if(facing==='user'||![...found.keys()].some(isTube)){
    const f=flipped(src,w,h);
    for(const max of [3000,1600]){ const s=Math.min(1,max/M); addFound(found,await decodeRaw(grab(f,0,0,w,h,s)),0,0,s,w); }
  }
  return found;
}

function drawLabels(c,items,dispScale,mirror,vis){
  const minFs=(items.length>12?6:11)/dispScale, maxFs=26/dispScale;   // with many codes allow smaller text so labels stay in place (pinch to zoom)
  const L=items.map(k=>{ const cx=k.pts.reduce((a,q)=>a+q.x,0)/4, cy=k.pts.reduce((a,q)=>a+q.y,0)/4;
    const side=Math.hypot(k.pts[1].x-k.pts[0].x,k.pts[1].y-k.pts[0].y), w=k.label.split(' ');
    const lines=k.lines&&k.lines.length?k.lines:(w.length>1?[w.slice(0,-1).join(' '),w[w.length-1]]:[k.label]);
    c.font='800 100px -apple-system,sans-serif'; const w1=Math.max(...lines.map(s=>c.measureText(s).width))/100;   // text width scales with font size: measure once
    return {...k,cx,cy,ox:cx,oy:cy,lines,w1,fs:Math.max(minFs,Math.min(maxFs,side*0.55))}; });
  const box=a=>{ const w=a.w1*a.fs+a.fs*.5, h=a.lines.length*a.fs*1.12+a.fs*.3;
    return {x0:a.cx-w/2,x1:a.cx+w/2,y0:a.cy-h/2,y1:a.cy+h/2,w,h}; };
  const hit=(A,B)=>A.x0<B.x1&&B.x0<A.x1&&A.y0<B.y1&&B.y0<A.y1;
  const clamp=a=>{ if(!vis) return; const B=box(a);   // keep inside the visible area
    if(B.x0<vis.x0) a.cx+=vis.x0-B.x0; else if(B.x1>vis.x1) a.cx-=B.x1-vis.x1;
    if(B.y0<vis.y0) a.cy+=vis.y0-B.y0; else if(B.y1>vis.y1) a.cy-=B.y1-vis.y1; };
  for(let it=0;it<14;it++){ let ch=false;
    for(let i=0;i<L.length;i++) for(let j=i+1;j<L.length;j++) if(hit(box(L[i]),box(L[j]))){
      for(const a of [L[i],L[j]]) if(a.fs>minFs){ a.fs=Math.max(minFs,a.fs*.88); ch=true; } }
    if(!ch) break; }
  L.forEach(clamp);
  for(let it=0;it<30;it++){ let ch=false;   // still overlapping at the minimum size: push apart
    for(let i=0;i<L.length;i++) for(let j=i+1;j<L.length;j++){ const A=box(L[i]),B=box(L[j]); if(!hit(A,B)) continue;
      const ox=Math.min(A.x1,B.x1)-Math.max(A.x0,B.x0), oy=Math.min(A.y1,B.y1)-Math.max(A.y0,B.y0);
      if(oy<=ox){ const s=L[i].cy<=L[j].cy?-1:1, d=oy/2+1; L[i].cy+=s*d; L[j].cy-=s*d; }
      else { const s=L[i].cx<=L[j].cx?-1:1, d=ox/2+1; L[i].cx+=s*d; L[j].cx-=s*d; }
      ch=true; }
    L.forEach(clamp); if(!ch) break; }
  for(const a of L){ c.save(); if(a.stale){ c.globalAlpha=.55; c.setLineDash([8/dispScale,6/dispScale]); } c.strokeStyle=a.col; c.lineWidth=Math.max(2/dispScale,a.fs/8); c.beginPath(); a.pts.forEach((q,j)=>j?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)); c.closePath(); c.stroke(); c.restore(); }
  for(const a of L){ const B=box(a); c.save(); if(a.stale) c.globalAlpha=.55; if(mirror) c.setTransform(-1,0,0,1,2*a.cx,0);
    if(Math.hypot(a.cx-a.ox,a.cy-a.oy)>a.fs*.6){ c.strokeStyle=a.col; c.lineWidth=Math.max(1.5/dispScale,a.fs/14); c.beginPath(); c.moveTo(a.ox,a.oy); c.lineTo(a.cx,a.cy); c.stroke(); }
    c.fillStyle='rgba(0,0,0,.82)'; c.fillRect(B.x0,B.y0,B.w,B.h);
    c.font=`800 ${a.fs}px -apple-system,sans-serif`; c.textAlign='center'; c.textBaseline='middle'; c.fillStyle=a.col;
    a.lines.forEach((s,i)=>c.fillText(s,a.cx,a.cy+(i-(a.lines.length-1)/2)*a.fs*1.12)); c.restore(); }
}

function solveLin(A,b){
  const n=b.length, M=A.map((r,i)=>[...r,b[i]]);
  for(let i=0;i<n;i++){
    let p=i; for(let k=i+1;k<n;k++) if(Math.abs(M[k][i])>Math.abs(M[p][i])) p=k;
    if(Math.abs(M[p][i])<1e-12) return null; [M[i],M[p]]=[M[p],M[i]];
    for(let k=0;k<n;k++) if(k!==i){ const f=M[k][i]/M[i][i]; for(let j=i;j<=n;j++) M[k][j]-=f*M[i][j]; }
  }
  return M.map((r,i)=>r[n]/r[i]);
}

function fitH(pts){
  const A=Array.from({length:8},()=>Array(8).fill(0)), b=Array(8).fill(0);
  for(const p of pts){
    const rows=[[p.x,p.y,1,0,0,0,-p.x*p.c,-p.y*p.c,p.c],[0,0,0,p.x,p.y,1,-p.x*p.r,-p.y*p.r,p.r]];
    for(const row of rows) for(let i=0;i<8;i++){ b[i]+=row[i]*row[8]; for(let j=0;j<8;j++) A[i][j]+=row[i]*row[j]; }
  }
  const h=solveLin(A,b); return h&&h.every(Number.isFinite)?h:null;
}

const applyH=(h,x,y)=>{ const w=h[6]*x+h[7]*y+1; return {c:(h[0]*x+h[1]*y+h[2])/w,r:(h[3]*x+h[4]*y+h[5])/w}; };

function invH(h){ const m=[h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1];
  const A=m[4]*m[8]-m[5]*m[7],B=m[5]*m[6]-m[3]*m[8],C=m[3]*m[7]-m[4]*m[6],det=m[0]*A+m[1]*B+m[2]*C; if(Math.abs(det)<1e-15) return null;
  const v=[A,m[2]*m[7]-m[1]*m[8],m[1]*m[5]-m[2]*m[4],B,m[0]*m[8]-m[2]*m[6],m[2]*m[3]-m[0]*m[5],C,m[1]*m[6]-m[0]*m[7],m[0]*m[4]-m[1]*m[3]].map(x=>x/det);
  return v.map(x=>x/v[8]).slice(0,8); }

function latticeFit(pts){   // pts=[{x,y}] → {h: homography (x,y)->(u,v), ij:[{u,v}]}
  if(pts.length<6) return null;
  // 1) direction and spacing of neighbour vectors
  const vecs=[];
  for(const p of pts){ const nb=pts.filter(q=>q!==p).map(q=>({dx:q.x-p.x,dy:q.y-p.y,d:Math.hypot(q.x-p.x,q.y-p.y)})).sort((a,b)=>a.d-b.d).slice(0,4); vecs.push(...nb); }
  const dmin=vecs.map(v=>v.d).sort((a,b)=>a-b)[Math.floor(vecs.length*0.25)];
  const near=vecs.filter(v=>v.d<dmin*1.6);
  const hist=new Float32Array(180); for(const v of near){ let a=Math.round(Math.atan2(v.dy,v.dx)*180/Math.PI); a=((a%180)+180)%180; hist[a]++; }
  const sm=a=>{ let s=0; for(let k=-6;k<=6;k++) s+=hist[(a+k+180)%180]; return s; };
  let a1=0,b1=-1; for(let a=0;a<180;a++){ const s=sm(a); if(s>b1){ b1=s; a1=a; } }
  let a2=0,b2=-1; for(let a=0;a<180;a++){ const df=Math.min(Math.abs(a-a1),180-Math.abs(a-a1)); if(Math.abs(df-90)>30) continue; /* roughly perpendicular to the first */ const s=sm(a); if(s>b2){ b2=s; a2=a; } }
  const pitch=ang=>{ const ds=near.filter(v=>{ let a=Math.atan2(v.dy,v.dx)*180/Math.PI; a=((a%180)+180)%180; return Math.min(Math.abs(a-ang),180-Math.abs(a-ang))<10; }).map(v=>v.d).sort((a,b)=>a-b); return ds[ds.length>>1]||dmin; };
  const p1=pitch(a1), p2=pitch(a2), t1=a1*Math.PI/180, t2=a2*Math.PI/180;
  const B=[[Math.cos(t1)*p1,Math.cos(t2)*p2],[Math.sin(t1)*p1,Math.sin(t2)*p2]], det=B[0][0]*B[1][1]-B[0][1]*B[1][0];
  // 2) integer coordinates around the central point
  const c=pts.slice().sort((p,q)=>Math.hypot(p.x-cx0(),p.y-cy0())-Math.hypot(q.x-cx0(),q.y-cy0()))[0];
  function cx0(){ return pts.reduce((s,p)=>s+p.x,0)/pts.length; } function cy0(){ return pts.reduce((s,p)=>s+p.y,0)/pts.length; }
  let ij=pts.map(p=>{ const dx=p.x-c.x, dy=p.y-c.y; return {u:Math.round(( B[1][1]*dx-B[0][1]*dy)/det), v:Math.round((-B[1][0]*dx+B[0][0]*dy)/det)}; });
  // 3) refine with a homography (perspective), iterate
  let h=null; const SC=Math.max(...pts.map(p=>Math.max(p.x,p.y)));   // fitH expects 0..1 coordinates
  for(let it=0;it<4;it++){
    const train=pts.map((p,i)=>({x:p.x/SC,y:p.y/SC,c:ij[i].u,r:ij[i].v}));
    h=fitH(train); if(!h) return null;
    ij=pts.map(p=>{ const g=applyH(h,p.x/SC,p.y/SC); return {u:Math.round(g.c),v:Math.round(g.r),eu:g.c-Math.round(g.c),ev:g.r-Math.round(g.r)}; });
  }
  return {h,ij,pitch:(p1+p2)/2,SC};
}

async function rackRead(bmp,R,C,onStep){
  const M=Math.max(bmp.width,bmp.height);
  const found=await scanPhoto(bmp,bmp.width,bmp.height,async()=>{});
  onStep&&onStep(TT('rackFitting',found.size));
  const codes=[...found.values()].filter(k=>k.pts&&isCode(k.text));
  const pts=codes.map(k=>({x:k.pts.reduce((a,q)=>a+q.x,0)/4,y:k.pts.reduce((a,q)=>a+q.y,0)/4,code:norm(k.text)}));
  const fit=latticeFit(pts); if(!fit) return {error:TT('rackNoGrid',pts.length),codes:pts};
  const cells=new Map(); pts.forEach((p,i)=>{ const k=fit.ij[i].u+','+fit.ij[i].v; if(!cells.has(k)) cells.set(k,{code:p.code,how:'photo',x:p.x,y:p.y}); else cells.get(k).dup=(cells.get(k).dup||[]).concat(p.code); });
  const us=[...cells.keys()].map(k=>+k.split(',')[0]), vs=[...cells.keys()].map(k=>+k.split(',')[1]);
  let u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs);
  // the long axis holds the columns (C)
  const longU=(u1-u0)>=(v1-v0); const NU=longU?C:R, NV=longU?R:C;
  // if the span is short, re-read cells on both sides and keep the window with most reads
  const ih0=invH(fit.h), SC=fit.SC; const ih=ih0&&[...ih0];
  const toImg=(u,v)=>{ const q=applyH(ih,u,v); return {c:q.c*SC,r:q.r*SC}; };
  const tryCells=[]; for(let u=u1-NU+1;u<=u0+NU-1;u++) for(let v=v1-NV+1;v<=v0+NV-1;v++) if(!cells.has(u+','+v)) tryCells.push([u,v]);
  let done=0; const t0=performance.now();
  await runAll(tryCells,PAR(),async([u,v])=>{ if(performance.now()-t0>25000) return;
    const cs=[[-.48,-.48],[.48,-.48],[.48,.48],[-.48,.48]].map(([du,dv])=>toImg(u+du,v+dv)), xs=cs.map(q=>q.c), ys=cs.map(q=>q.r);
    const x0=Math.max(0,Math.min(...xs)), y0=Math.max(0,Math.min(...ys)), x1=Math.min(bmp.width,Math.max(...xs)), y1=Math.min(bmp.height,Math.max(...ys)), w=x1-x0, h=y1-y0;
    done++; onStep&&onStep(`${TT('rackRescue')} ${done}/${tryCells.length}`);
    if(w<10||h<10) return;
    for(const [target,pp,half] of [[650,0,.6],[650,[1,2],.6],[900,{close:1,win:61,k:3,c:5},.6],[650,[2,3],.48],[900,0,.6],[300,[1,2],.48]]){
      const cs2=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>toImg(u+a*half,v+b*half)), X0=Math.max(0,Math.min(...cs2.map(q=>q.c))), Y0=Math.max(0,Math.min(...cs2.map(q=>q.r))), X1=Math.min(bmp.width,Math.max(...cs2.map(q=>q.c))), Y1=Math.min(bmp.height,Math.max(...cs2.map(q=>q.r)));
      if(X1-X0<10||Y1-Y0<10) continue;
      const r=await decodeRaw(grab(bmp,X0,Y0,X1-X0,Y1-Y0,Math.min(5,target/Math.max(X1-X0,Y1-Y0))),pp||null);
      const b=r.find(q=>isCode(q.text)); if(b){ cells.set(u+','+v,{code:norm(b.text),how:'cell',x:(x0+x1)/2,y:(y0+y1)/2}); return; } } });
  // final window: the NU×NV placement containing the most reads
  let best=null; for(let su=u1-NU+1;su<=u0;su++) for(let sv=v1-NV+1;sv<=v0;sv++){ let n=0; for(const k of cells.keys()){ const [u,v]=k.split(',').map(Number); if(u>=su&&u<su+NU&&v>=sv&&v<sv+NV) n++; } if(!best||n>best.n) best={n,su,sv}; }
  return {cells,su:best.su,sv:best.sv,NU,NV,longU,h:fit.h,toImg,pitch:fit.pitch,SC};
}

function seqFit(cells){
  const pts=[...cells.entries()].map(([k,c])=>{ const [u,v]=k.split(',').map(Number); return {u,v,n:/^\d{6,15}$/.test(c.code)?Number(c.code):NaN,c}; }).filter(p=>Number.isFinite(p.n));
  if(pts.length<8) return null;
  const med=a=>{ const s=a.slice().sort((x,y)=>x-y); return s[s.length>>1]; };
  const du=[],dv=[]; for(const p of pts) for(const q of pts){ if(p===q) continue; if(p.v===q.v&&p.u!==q.u) du.push((q.n-p.n)/(q.u-p.u)); if(p.u===q.u&&p.v!==q.v) dv.push((q.n-p.n)/(q.v-p.v)); }
  if(!du.length||!dv.length) return null;
  const DU=Math.round(med(du)), DV=Math.round(med(dv)); if(!DU||!DV) return null;
  const A=med(pts.map(p=>p.n-DU*p.u-DV*p.v)), ok=pts.filter(p=>p.n===A+DU*p.u+DV*p.v).length;
  return ok>=Math.max(8,pts.length*0.8)?{A,DU,DV,ok,n:pts.length,width:pts[0].c.code.length}:null;
}

const CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();

const crc32=b=>{ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=CRC[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };

function zipStore(files){   // [{name, data:Uint8Array}]
  const enc=new TextEncoder(), parts=[], cen=[]; let off=0;
  const u16=v=>[v&255,(v>>8)&255], u32=v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];
  for(const f of files){ const nm=enc.encode(f.name), crc=crc32(f.data), sz=f.data.length;
    const lh=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(sz),...u32(sz),...u16(nm.length),...u16(0)]);
    parts.push(lh,nm,f.data);
    cen.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(sz),...u32(sz),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);
    off+=lh.length+nm.length+sz; }
  const cl=cen.reduce((a,b)=>a+b.length,0);
  return new Blob([...parts,...cen,new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cl),...u32(off),0,0])],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

function xlsxBlob(sheetName,header,rows,styles){
  const x=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
  const col=i=>{ let s=''; i++; while(i){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=(i-m-1)/26; } return s; };
  const row=(cells,r)=>{ const s=r===1?1:(styles&&styles[r-2])||0; return `<row r="${r}">`+cells.map((v,i)=>typeof v==='number'?`<c r="${col(i)}${r}"${s?` s="${s}"`:''}><v>${v}</v></c>`:`<c r="${col(i)}${r}" t="inlineStr"${s?` s="${s}"`:''}><is><t xml:space="preserve">${x(v)}</t></is></c>`).join('')+'</row>'; };
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${header.map((h,i)=>`<col min="${i+1}" max="${i+1}" width="${Math.max(10,String(h).length*2+4)}" customWidth="1"/>`).join('')}</cols><sheetData>${[header,...rows].map((r,i)=>row(r,i+1)).join('')}</sheetData></worksheet>`;
  const enc=s=>new TextEncoder().encode(s);
  return zipStore([
    {name:'[Content_Types].xml',data:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>')},
    {name:'_rels/.rels',data:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
    {name:'xl/workbook.xml',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${x(sheetName).slice(0,31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`)},
    {name:'xl/_rels/workbook.xml.rels',data:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')},
    {name:'xl/styles.xml',data:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><i/><sz val="11"/><color rgb="FF0A60D0"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFD02020"/><name val="Calibri"/></font><font><sz val="11"/><color rgb="FF8E8E93"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')},
    {name:'xl/worksheets/sheet1.xml',data:enc(sheet)}]);
}

function beep(ok){ try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); const tones=ok?[[880,.12]]:[[220,.18],[0,.06],[220,.25]]; let t0=actx.currentTime;
  for(const [f,d] of tones){ if(f){ const o=actx.createOscillator(), g=actx.createGain(); o.frequency.value=f; o.type=ok?'sine':'square'; g.gain.value=.15; o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0+d); } t0+=d; } }catch(e){} }
