// ScanMatch — point a camera at barcodes and see what your spreadsheet says.
// Everything runs in the browser. Your table, scans and logs never leave this device.
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const OPTS={formats:['DataMatrix','QRCode','Code128','Code39','EAN-13','EAN-8','UPC-A','UPC-E','ITF','PDF417','Aztec','MicroQRCode'],tryHarder:true,tryRotate:true,tryInvert:true,tryDownscale:true,maxNumberOfSymbols:255};

/* ---------------- i18n ---------------- */
const I18N={
 en:{data:'Data',rows:n=>`${n} rows`,noData:'No table',modeS:'Scan',modeP:'Pair check',modeK:'Rack',showOn:'Show',snap:'Capture',snapRack:'Capture rack',live:'Live',stop:'Stop',camOn:'Start camera',retake:'Retake',
  rear:'Rear',front:'Front',mirror:'Mirror',mirrorOff:'No mirror',keys:'Keys: <b>Space</b> capture · <b>L</b> live · <b>1</b> scan · <b>2</b> pair · <b>3</b> rack · <b>Esc</b> close',
  msgS:'<b>Capture or go live to read barcodes</b>Any number of codes per photo<br>Matched information appears on the image and below',
  msgP:'<b>Show code A, then code B</b>(e.g. the tube barcode, then its label)<br>Match → big ○ · mismatch → big ✕',
  msgK:'<b>Photograph a whole rack from above</b>Every tube is placed into its row/column<br>Unread cells are estimated if the codes are sequential',
  msgNoData:'<b>Load a table first</b>Tap “Data” to upload Excel/CSV, link a Google Sheet or type one in',
  waiting:'Waiting',now:n=>`${n} just now`,matched:n=>`matched ${n}`,unmatched:n=>`not in table ${n}`,notFound:'Not in table',dup:'Duplicate key',labelOf:x=>`Label of ${x}`,
  check:'Mark done',checked:'✓ Done',uncheck:'Undo',progress:(a,b)=>`Done ${a}/${b}`,prev:n=>`Earlier ${n}`,
  pairA:'① Code A',pairB:'② Code B',pairNeedCmp:'Choose the compare column in Data → Settings',ok:'Match',bad:'Mismatch',belongs:x=>`B belongs to ${x}`,bNotIn:'B is not in the table',aNotIn:'A is not in the table',
  many:'Several codes in view — show one item at a time',
  busyRead:'Reading…',busyFine:'Fine search',busySide:'Searching laser-etched code',busyBlur:'Blur correction',rackFitting:n=>`${n} codes · fitting grid`,rackRescue:'Re-reading empty cells',rackNoGrid:n=>`No grid found (${n} codes). Photograph the whole rack from straight above.`,
  noCode:'No code read — move closer, check focus and glare',
  rackSize:'Rack',rackLabel:'Rack label (optional)',rackRule:(a,b,o,n)=>`Sequential codes: row ${a>0?'+':''}${a} · column ${b>0?'+':''}${b} (${o}/${n} read cells agree) → unread cells estimated`,rackNoRule:'No sequential pattern — unread cells left blank',
  stRead:'read',stManual:'manual',stEst:'estimated',stMiss:'unread',stBad:'conflict',stEnd:'empty (end)',stWrong:'wrong place',
  legend:'Colours: <span class="st-ok">read</span> · <span class="st-est">estimated</span> · <span class="st-miss">unread</span> · <span class="st-bad">conflict</span> · <span class="st-wrong">wrong place</span> · tap a cell to type its code',
  a1:'Change A1 corner',xlsx:'Save Excel',typeCode:p=>`${p}: type the barcode (empty to clear)`,
  rackSum:(r,c,o)=>`<b>Rack ${r}×${c}</b> · ${o}`,
  dpTitle:'Data',dpPrivacy:'Your table stays in this browser only (local storage). Nothing is uploaded.',dpLoad:'Load',dpFile:'Upload Excel / CSV',dpSample:'Load sample',dpNew:'New empty table',
  gsPh:'Google Sheet link (shared: anyone with the link can view)',gsBtn:'Import',gsNote:'Works with sheets shared as “anyone with the link”, or File → Share → Publish to web → CSV links.',
  dpEdit:'Edit (paste straight from Excel / Google Sheets)',find:'Search',addRow:'+ Row',addCol:'+ Column',sheetNote:(shown,total)=>`Showing ${shown} of ${total} rows · first column with the key colour is the barcode`,
  dpSet:'Settings',keyCol:'Barcode column',cmpCol:'Compare column (pair check)',posCol:'Position column (rack order check)',none:'(none)',optCase:'Ignore upper/lower case',optStrip:'Ignore spaces, - and _',
  dpCam:'Camera',hold:'Keep labels for a moment after a code leaves view',laser:'Try harder on laser-etched / low-contrast codes (slower)',
  expTable:'Download table (CSV)',expLog:'Download scan log (CSV)',clrLog:'Clear done marks & log',clrAll:'Delete table',lang:'Language',cam:'Camera',
  sure:'Are you sure?',loaded:n=>`Loaded ${n} rows`,loadFail:'Could not read that file',gsFail:'Could not import. Is the sheet shared publicly?',xlsxOld:'Old .xls is not supported — save as .xlsx or CSV',
  engineErr:'Engine error',engineFail:'Engine failed',help:'Help',minOne:'Keep at least one column visible',col:n=>`Column ${n}`,
  helpBody:`<h3>What it does</h3><p>Load a table whose first column is a barcode (QR, DataMatrix, Code128, EAN…). Point the camera at codes and ScanMatch shows the matching row on the image and as cards.</p>
  <h3>Modes</h3><ul><li><b>Scan</b> — look up any number of codes per photo or live. Mark items done to track progress.</li><li><b>Pair check</b> — show code A (e.g. a tube) and then code B (e.g. the label stuck on it). If B equals A's compare column you get a big ○, otherwise ✕.</li><li><b>Rack</b> — photograph a whole rack/box from above. Every tube is placed in its row/column, unread cells are estimated when the codes are sequential, and the result is saved as Excel. With a position column (A01…) the rack doubles as an order check.</li></ul>
  <h3>Tips</h3><ul><li>Live scanning needs HTTPS and a real browser (not an in-app browser).</li><li>On a laptop, the capture button turns the webcam on, then captures.</li><li>For laser-etched side codes, turn on the laser option and keep the code inside the dashed square.</li></ul>
  <h3>Privacy</h3><p>No server, no account, no analytics. Data lives in this browser's local storage until you delete it.</p>`},
 ko:{data:'데이터',rows:n=>`${n}행`,noData:'표 없음',modeS:'스캔',modeP:'짝 확인',modeK:'랙',showOn:'표시',snap:'촬영',snapRack:'랙 촬영',live:'실시간',stop:'정지',camOn:'카메라 켜기',retake:'다시 찍기',
  rear:'후면',front:'전면',mirror:'좌우반전',mirrorOff:'반전 끔',keys:'키보드: <b>Space</b> 촬영 · <b>L</b> 실시간 · <b>1</b> 스캔 · <b>2</b> 짝 확인 · <b>3</b> 랙 · <b>Esc</b> 닫기',
  msgS:'<b>[촬영] 또는 [실시간]으로 바코드를 읽으세요</b>한 장에 여러 개도 됩니다<br>표에서 찾은 정보가 사진 위와 아래에 나옵니다',
  msgP:'<b>코드 A를 보여 준 뒤 코드 B를 보여 주세요</b>(예: 튜브 바코드 → 붙인 라벨)<br>맞으면 큰 ○, 틀리면 큰 ✕',
  msgK:'<b>랙 전체를 위에서 한 장 찍으세요</b>각 튜브를 행·열 자리에 넣어 표로 만듭니다<br>코드가 순번이면 못 읽은 칸도 추정합니다',
  msgNoData:'<b>먼저 표를 불러오세요</b>[데이터]에서 엑셀/CSV 올리기, 구글 시트 연결, 직접 입력',
  waiting:'대기 중',now:n=>`방금 ${n}개`,matched:n=>`찾음 ${n}`,unmatched:n=>`표에 없음 ${n}`,notFound:'표에 없음',dup:'중복 키',labelOf:x=>`${x}의 라벨`,
  check:'완료 표시',checked:'✓ 완료',uncheck:'취소',progress:(a,b)=>`완료 ${a}/${b}`,prev:n=>`이전 ${n}개`,
  pairA:'① 코드 A',pairB:'② 코드 B',pairNeedCmp:'[데이터] → 설정에서 비교 열을 고르세요',ok:'맞음',bad:'틀림',belongs:x=>`B는 ${x}의 것`,bNotIn:'B가 표에 없음',aNotIn:'A가 표에 없음',
  many:'코드가 여러 개 보입니다 — 하나씩 보여 주세요',
  busyRead:'읽는 중…',busyFine:'정밀 검색',busySide:'레이저 각인 코드 찾는 중',busyBlur:'흐린 사진 보정',rackFitting:n=>`코드 ${n}개 · 격자 맞추는 중`,rackRescue:'빈 칸 다시 읽는 중',rackNoGrid:n=>`격자를 찾을 수 없습니다 (코드 ${n}개). 랙 전체가 보이게 위에서 다시 찍으세요.`,
  noCode:'코드를 못 읽었습니다 — 더 가까이, 초점·반사 확인',
  rackSize:'랙',rackLabel:'랙 라벨 (선택)',rackRule:(a,b,o,n)=>`순번 규칙: 행 ${a>0?'+':''}${a} · 열 ${b>0?'+':''}${b} (읽은 ${n}개 중 ${o}개 일치) → 못 읽은 칸은 추정`,rackNoRule:'순번 규칙 없음 — 못 읽은 칸은 비워 둡니다',
  stRead:'읽음',stManual:'수동',stEst:'추정',stMiss:'못 읽음',stBad:'불일치',stEnd:'빈 칸(끝)',stWrong:'자리 틀림',
  legend:'글자색: <span class="st-ok">읽음</span> · <span class="st-est">추정</span> · <span class="st-miss">못 읽음</span> · <span class="st-bad">불일치</span> · <span class="st-wrong">자리 틀림</span> · 칸을 누르면 직접 입력',
  a1:'A1 위치 바꾸기',xlsx:'엑셀 저장',typeCode:p=>`${p} 바코드 입력 (비우면 지움)`,
  rackSum:(r,c,o)=>`<b>랙 ${r}×${c}</b> · ${o}`,
  dpTitle:'데이터',dpPrivacy:'표는 이 브라우저에만 저장됩니다(로컬 저장소). 어디에도 올라가지 않습니다.',dpLoad:'불러오기',dpFile:'엑셀 / CSV 올리기',dpSample:'예시 불러오기',dpNew:'빈 표 만들기',
  gsPh:'구글 시트 링크 (링크가 있는 모든 사용자 보기 권한)',gsBtn:'가져오기',gsNote:'“링크가 있는 모든 사용자”로 공유한 시트나, 파일 → 공유 → 웹에 게시 → CSV 링크를 쓸 수 있습니다.',
  dpEdit:'편집 (엑셀·구글 시트에서 바로 붙여넣기)',find:'찾기',addRow:'+ 행',addCol:'+ 열',sheetNote:(shown,total)=>`${total}행 중 ${shown}행 표시 · 노란 열이 바코드 열`,
  dpSet:'설정',keyCol:'바코드 열',cmpCol:'비교 열 (짝 확인)',posCol:'위치 열 (랙 순서 검증)',none:'(없음)',optCase:'대소문자 구분 안 함',optStrip:'공백·-·_ 무시',
  dpCam:'카메라',hold:'코드가 화면에서 사라져도 잠시 표시 유지',laser:'레이저 각인·흐린 코드 더 열심히 찾기 (느려짐)',
  expTable:'표 내려받기 (CSV)',expLog:'스캔 기록 내려받기 (CSV)',clrLog:'완료 표시·기록 지우기',clrAll:'표 삭제',lang:'언어',cam:'카메라',
  sure:'정말 할까요?',loaded:n=>`${n}행을 불러왔습니다`,loadFail:'파일을 읽지 못했습니다',gsFail:'가져오지 못했습니다. 시트가 공개 공유인지 확인하세요',xlsxOld:'예전 .xls는 지원하지 않습니다 — .xlsx나 CSV로 저장하세요',
  engineErr:'엔진 오류',engineFail:'엔진 실패',help:'도움말',minOne:'최소 한 열은 보여야 합니다',col:n=>`열 ${n}`,
  helpBody:`<h3>무엇을 하나요</h3><p>첫 열이 바코드(QR, DataMatrix, Code128, EAN 등)인 표를 불러오고 카메라로 코드를 비추면, 해당 행의 정보가 사진 위와 카드로 나옵니다.</p>
  <h3>모드</h3><ul><li><b>스캔</b> — 사진 한 장이나 실시간으로 여러 코드를 찾습니다. 완료 표시로 진행률을 셉니다.</li><li><b>짝 확인</b> — 코드 A(예: 튜브)를 보여 준 뒤 코드 B(예: 붙인 라벨)를 보여 주면, B가 A의 비교 열과 같을 때 큰 ○, 다르면 ✕.</li><li><b>랙</b> — 랙·박스 전체를 위에서 찍으면 각 튜브를 행·열 자리에 넣어 표와 엑셀로 만듭니다. 코드가 순번이면 못 읽은 칸도 추정합니다. 위치 열(A01…)이 있으면 순서 검증도 됩니다.</li></ul>
  <h3>팁</h3><ul><li>실시간 스캔은 HTTPS와 일반 브라우저(인앱 브라우저 아님)에서만 됩니다.</li><li>노트북에서는 [촬영]이 웹캠을 켜고, 한 번 더 누르면 찍습니다.</li><li>레이저 각인 옆면 코드는 레이저 옵션을 켜고 점선 칸 안에 맞추세요.</li></ul>
  <h3>개인정보</h3><p>서버·계정·분석 도구가 없습니다. 데이터는 지우기 전까지 이 브라우저의 로컬 저장소에만 있습니다.</p>`}};
const TT=(...a)=>T(...a);   // core.js uses TT (it has local variables named T)
let LANG=(navigator.language||'en').toLowerCase().startsWith('ko')?'ko':'en';
const T=(k,...a)=>{ const v=(I18N[LANG]||I18N.en)[k]??I18N.en[k]; return typeof v==='function'?v(...a):v; };

/* ---------------- state ---------------- */
const SKEY='scanmatch.v1';
let DATA={cols:[],rows:[]};
let CFG={key:0,show:[1],cmp:-1,pos:-1,caseIns:true,strip:false,hold:{on:true,sec:3},laser:false,facing:'environment',camId:'',rack:'8x12'};
let CHECK=new Set(), LOG=[];
const IS_DESKTOP=matchMedia('(pointer:fine)').matches&&!/iPhone|iPad|Android/i.test(navigator.userAgent)&&!(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent));
const inFrame=(()=>{ try{ return window.top!==window.self; }catch(e){ return true; } })();
const WIDE=()=>matchMedia('(min-width:760px)').matches;
function save(){ try{ localStorage.setItem(SKEY,JSON.stringify({DATA,CFG,LANG,CHECK:[...CHECK],LOG:LOG.slice(-5000)})); }catch(e){} }
function load(){ try{ const o=JSON.parse(localStorage.getItem(SKEY)||'null'); if(!o) return; if(o.DATA&&Array.isArray(o.DATA.cols)) DATA=o.DATA; if(o.CFG) CFG=Object.assign(CFG,o.CFG); if(o.LANG) LANG=o.LANG; CHECK=new Set(o.CHECK||[]); LOG=o.LOG||[]; }catch(e){} }
if(IS_DESKTOP&&!localStorage.getItem(SKEY)) CFG.facing='user';

/* ---------------- matching ---------------- */
const norm=t=>String(t??'').trim();
const nk=t=>{ let s=norm(t); if(CFG.caseIns) s=s.toUpperCase(); if(CFG.strip) s=s.replace(/[\s\-_]/g,''); return s; };
let KEY=new Map(), CMP=new Map(), POS=new Map();
function reindex(){
  KEY=new Map(); CMP=new Map(); POS=new Map();
  DATA.rows.forEach((r,i)=>{ const k=nk(r[CFG.key]); if(k) (KEY.get(k)||KEY.set(k,[]).get(k)).push(i);
    if(CFG.cmp>=0){ const c=nk(r[CFG.cmp]); if(c) (CMP.get(c)||CMP.set(c,[]).get(c)).push(i); }
    if(CFG.pos>=0){ const p=normPos(r[CFG.pos]); if(p) POS.set(i,p); } });
}
const normPos=p=>{ const m=/^\s*([A-Za-z])\s*0*(\d{1,2})\s*$/.exec(String(p??'')); return m?m[1].toUpperCase()+String(+m[2]).padStart(2,'0'):''; };
const isTube=t=>KEY.has(nk(t));              // "known code" — used by the decoding pipeline
const isCode=t=>norm(t).length>=3;
function lookup(code){ const ix=KEY.get(nk(code)); if(!ix){ const cx=CMP.get(nk(code)); return cx&&cx.length===1?{type:'label',i:cx[0],row:DATA.rows[cx[0]]}:{type:'none'}; } if(ix.length>1) return {type:'multi',rows:ix}; return {type:'ok',i:ix[0],row:DATA.rows[ix[0]]}; }
const showCols=()=>CFG.show.filter(c=>c>=0&&c<DATA.cols.length&&c!==CFG.key);
const headline=row=>{ const c=showCols()[0]; return c!==undefined&&norm(row[c])?norm(row[c]):norm(row[CFG.key]); };
function colorFor(text){
  const m=lookup(text);
  if(m.type==='ok'){ const lines=showCols().map(c=>norm(m.row[c])).filter(Boolean); if(!lines.length) lines.push(norm(text)); return {col:CHECK.has(m.i)?'#0a84ff':'#30d158',lines,label:lines.join(' ')}; }
  if(m.type==='multi') return {col:'#ffd60a',lines:[T('dup')],label:T('dup')};
  if(m.type==='label'){ const lines=[T('labelOf',headline(m.row))]; return {col:'#0a84ff',lines,label:lines[0]}; }
  return {col:'#ff453a',lines:[norm(text).slice(0,24),T('notFound')],label:T('notFound')};
}

/* ---------------- ui helpers ---------------- */
let toastT=null;
function toast(h,sub,kind){ const a=$('toast'); a.className='toast show '+kind; a.innerHTML=esc(h)+(sub?`<small>${esc(sub)}</small>`:''); clearTimeout(toastT); toastT=setTimeout(()=>a.className='toast',kind==='ok'?3500:7000); }
function buzz(p){ try{ navigator.vibrate&&navigator.vibrate(p); }catch(e){} }
let actx=null;
function showMsg(h,err){ const m=$('msg'); m.style.display='flex'; m.className='msg'+(err?' err':''); m.innerHTML=h; }
function resetView(){ const v=$('view'); v.classList.remove('photo'); $('pic').style.display='none'; video.style.display=''; ov.style.display=''; }
const video=$('video'), ov=$('ov'), octx=ov.getContext('2d');
let MODE='scan', ready=false, stream=null, track=null, running=false, busy=false, scanning=false, facing='environment';

/* ---------------- photo rendering ---------------- */
let lastShot=null;
function drawPhoto(bmp,found){
  lastShot={bmp,found};
  const pic=$('pic'), s=Math.min(1,2000/Math.max(bmp.width,bmp.height));
  pic.width=Math.round(bmp.width*s); pic.height=Math.round(bmp.height*s);
  const c=pic.getContext('2d'); c.drawImage(bmp,0,0,pic.width,pic.height);
  const v=$('view'); v.classList.add('photo'); v.style.setProperty('--ar',bmp.width+'/'+bmp.height);
  pic.style.display='block'; $('msg').style.display='none'; video.style.display='none'; ov.style.display='none';
  const vw=v.clientWidth||360, vh=v.clientHeight||300, ds=Math.min(vw/pic.width,vh/pic.height);
  drawLabels(c,[...found.values()].filter(k=>k.pts).map(k=>({pts:k.pts.map(q=>({x:q.x*s,y:q.y*s})),...colorFor(k.text)})),ds,false,{x0:0,y0:0,x1:pic.width,y1:pic.height});
}

/* ---------------- scan mode ---------------- */
const cards=new Map(); let batch=0, lastAdd=0;
function logEvent(o){ LOG.push(Object.assign({ts:new Date().toISOString()},o)); if(LOG.length>6000) LOG.splice(0,LOG.length-5000); save(); }
function addCodes(list,src,join){
  const codes=[...new Set(list.map(k=>norm(k.text)).filter(isCode))]; if(!codes.length) return;
  if(!join) batch++;
  for(const code of codes){ const m=lookup(code), k=nk(code), old=cards.get(k);
    if(old){ old.batch=batch; old.ts=Date.now(); continue; }
    cards.set(k,{code,m,batch,ts:Date.now()}); logEvent({code,action:'scan',mode:'scan',found:m.type==='ok'||m.type==='label'?1:0,src}); }
  const bad=codes.some(c=>!['ok','label'].includes(lookup(c).type)); buzz(bad?[200,100,200]:[50]);
  render();
}
function cardHTML(c){
  if(c.m.type==='ok'){ const r=c.m.row, done=CHECK.has(c.m.i);
    return `<div class="h">${esc(headline(r))}</div><div class="k">${esc(c.code)}</div><dl>${showCols().slice(1).map(ci=>`<dt>${esc(DATA.cols[ci])}</dt><dd>${esc(norm(r[ci]))}</dd>`).join('')}</dl>
      <div class="acts"><button class="mini${done?'':' g'}" data-chk="${c.m.i}">${done?T('uncheck'):T('check')}</button>${done?`<span class="ok-t">${T('checked')}</span>`:''}</div>`; }
  if(c.m.type==='multi') return `<div class="h">${T('dup')}</div><div class="k">${esc(c.code)}</div>`;
  if(c.m.type==='label') return `<div class="h">${esc(T('labelOf',headline(c.m.row)))}</div><div class="k">${esc(c.code)} · ${esc(DATA.cols[CFG.cmp]||'')}</div>`;
  return `<div class="h">${T('notFound')}</div><div class="k">${esc(c.code)}</div>`;
}
function renderScan(){
  const all=[...cards.values()], cur=all.filter(c=>c.batch===batch).sort((a,b)=>(a.m.type==='ok')-(b.m.type==='ok')), old=all.filter(c=>c.batch!==batch).sort((a,b)=>b.ts-a.ts);
  const N=$('now'); N.className='now'+(!WIDE()&&cur.length>2?' c2':'');
  const okN=cur.filter(c=>c.m.type==='ok'||c.m.type==='label').length;
  $('sumL').innerHTML=cur.length?`<b>${T('now',cur.length)}</b> · <span class="ok-t">${T('matched',okN)}</span>${cur.length-okN?` · <span class="bad-t">${T('unmatched',cur.length-okN)}</span>`:''}`:T('waiting');
  $('sumR').textContent='';
  N.innerHTML=cur.length?cur.map(c=>`<div class="card ${c.m.type==='ok'?(CHECK.has(c.m.i)?'done':'ok'):(c.m.type==='multi'||c.m.type==='label'?'warn':'bad')}">${cardHTML(c)}</div>`).join(''):`<div class="empty">${DATA.rows.length?T('msgS').replace(/<[^>]+>/g,' '):T('msgNoData').replace(/<[^>]+>/g,' ')}</div>`;
  if(old.length) N.innerHTML+=`<div class="card" style="grid-column:1/-1"><div class="k">${T('prev',old.length)}</div>${old.slice(0,40).map(c=>`<div class="k">${c.m.type==='ok'?esc(headline(c.m.row))+' · ':''}${esc(c.code)}${c.m.type==='ok'&&CHECK.has(c.m.i)?' ✓':''}</div>`).join('')}</div>`;
  N.querySelectorAll('[data-chk]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.chk; if(CHECK.has(i)){ CHECK.delete(i); logEvent({code:norm(DATA.rows[i][CFG.key]),action:'undo',mode:'scan'}); } else { CHECK.add(i); logEvent({code:norm(DATA.rows[i][CFG.key]),action:'done',mode:'scan'}); } save(); render(); });
}

/* ---------------- pair mode ---------------- */
const PAIR_WIN=10000; let PA=null, PB=null, pairKey='', pairTs=0, verdictT=null; const PLOG=[];
function pairFeed(list){
  if(CFG.cmp<0){ toast(T('pairNeedCmp'),'','bad'); return; }
  const now=Date.now(); if(PA&&now-PA.ts>PAIR_WIN) PA=null; if(PB&&now-PB.ts>PAIR_WIN) PB=null;
  const codes=[...new Set(list.map(k=>norm(k.text)).filter(isCode))];
  const As=codes.filter(c=>KEY.has(nk(c))&&!(CMP.has(nk(c))&&PA&&nk(PA.code)!==nk(c)));
  const Bs=codes.filter(c=>!As.includes(c));
  if(As.length>1||Bs.length>1){ toast(T('many'),'','bad'); return; }
  if(As.length){ if(!PA||PA.code!==As[0]) PA={code:As[0],ts:now}; else PA.ts=now; }
  if(Bs.length&&(PA||CMP.has(nk(Bs[0])))){ if(!PB||PB.code!==Bs[0]) PB={code:Bs[0],ts:now}; else PB.ts=now; }
  if(PA&&PB){ const key=PA.code+'|'+PB.code; if(!(key===pairKey&&now-pairTs<6000)){ pairKey=key; pairTs=now; verdict(PA.code,PB.code); PA=PB=null; } }
  pairStatus();
}
function pairStatus(){ const el=$('pairSt'); if(MODE!=='pair'){ el.style.display='none'; return; } el.style.display='flex';
  const am=PA?lookup(PA.code):null, aTxt=PA?(am.type==='ok'?headline(am.row):PA.code):'';
  el.innerHTML=`<span class="${PA?'on':'off'}">${PA?'① ✓ '+esc(aTxt):T('pairA')}</span><span class="${PB?'on':'off'}">${PB?'② ✓ '+esc(PB.code):T('pairB')}</span>`; }
function verdict(a,b){
  const m=lookup(a), row=m.type==='ok'?m.row:null, want=row?nk(row[CFG.cmp]):'', ok=!!(row&&want&&want===nk(b));
  const ownIx=CMP.get(nk(b)), own=ownIx?DATA.rows[ownIx[0]]:null;
  const head=row?headline(row):a, note=ok?norm(row[CFG.cmp]):(!row?T('aNotIn'):own?T('belongs',headline(own)):T('bNotIn'));
  $('verdictP').innerHTML=`${esc(head)}<small>${esc(note)}</small>`;
  const v=$('verdict'); v.className='verdict show '+(ok?'ok':'bad'); $('verdictT').innerHTML=`${ok?'○ '+T('ok'):'✕ '+T('bad')}<br><small style="font-size:15px;font-weight:600">A ${esc(a)} · B ${esc(b)}</small>`;
  clearTimeout(verdictT); verdictT=setTimeout(()=>{ v.className='verdict'; },ok?2200:4000); buzz(ok?[80]:[400,120,400]); beep(ok);
  if(ok){ CHECK.add(m.i); }
  logEvent({code:a,code2:b,action:ok?'pair-ok':'pair-bad',mode:'pair'});
  PLOG.unshift({ok,head,a,b,note,ts:Date.now()}); if(PLOG.length>300) PLOG.pop(); render();
}
function renderPair(){
  const N=$('now'); N.className='now log'; const okN=PLOG.filter(x=>x.ok).length;
  $('sumL').innerHTML=`<b>${T('modeP')}</b> · <span class="ok-t">○ ${okN}</span> · <span class="bad-t">✕ ${PLOG.length-okN}</span>`;
  $('sumR').textContent=CFG.cmp>=0?`A = ${DATA.cols[CFG.key]||''} · B = ${DATA.cols[CFG.cmp]||''}`:T('pairNeedCmp');
  N.innerHTML=PLOG.length?`<div class="plog">${PLOG.slice(0,80).map(x=>`<div class="prow ${x.ok?'ok':'bad'}"><div class="g">${x.ok?'○':'✕'}</div><div class="ps">${esc(x.head)}</div><div class="d">${esc(x.note)}<small>A ${esc(x.a)} · B ${esc(x.b)} · ${new Date(x.ts).toLocaleTimeString()}</small></div></div>`).join('')}</div>`:`<div class="empty">${T('msgP').replace(/<[^>]+>/g,' ')}</div>`;
}

/* ---------------- rack mode ---------------- */
let lastRack=null, rackFlip=0;
function rackLayout(res){
  const {cells,su,sv,NU,NV}=res; const seq=seqFit(cells), corners=[[su,sv],[su+NU-1,sv],[su,sv+NV-1],[su+NU-1,sv+NV-1]];
  const est=(u,v)=>seq?String(seq.A+seq.DU*u+seq.DV*v).padStart(seq.width,'0'):'';
  let a1;
  if(seq) a1=corners.reduce((m,c)=>Number(est(...c))<Number(est(...m))?c:m);                       // smallest code = A1
  else { const miss=corners.filter(c=>!cells.has(c.join(','))); a1=miss.length===1?corners.find(c=>c[0]!==miss[0][0]&&c[1]!==miss[0][1]):corners[0]; }   // diagonal of the empty corner
  a1=corners[(corners.findIndex(c=>c[0]===a1[0]&&c[1]===a1[1])+rackFlip)%4];
  const end=[a1[0]===su?su+NU-1:su,a1[1]===sv?sv+NV-1:sv], sgnU=a1[0]===su?1:-1, sgnV=a1[1]===sv?1:-1;
  let rowAxisV=res.longU; if(seq) rowAxisV=Math.abs(seq.DV)<Math.abs(seq.DU);
  const NR=rowAxisV?NV:NU, NC=rowAxisV?NU:NV, rows=[];
  for(let r=0;r<NR;r++){ const row=[]; for(let c=0;c<NC;c++){
    const u=rowAxisV?a1[0]+sgnU*c:a1[0]+sgnU*r, v=rowAxisV?a1[1]+sgnV*r:a1[1]+sgnV*c, cell=cells.get(u+','+v), isEnd=u===end[0]&&v===end[1];
    const pos=String.fromCharCode(65+r)+String(c+1).padStart(2,'0');
    let code='', st='miss';
    if(cell){ code=cell.code; st=seq&&code!==est(u,v)?'bad':(cell.how==='manual'?'manual':'read'); }
    else if(isEnd) st='end';
    else if(seq){ code=est(u,v); st='est'; }
    const m=code?lookup(code):{type:'none'}, expPos=m.type==='ok'?POS.get(m.i)||'':'';
    if(expPos&&expPos!==pos&&(st==='read'||st==='manual')) st='wrong';
    row.push({code,st,u,v,pos,exp:seq&&!isEnd?est(u,v):'',m,expPos}); } rows.push(row); }
  return {rows,seq,NR,NC};
}
const ST={read:'stRead',manual:'stManual',est:'stEst',miss:'stMiss',bad:'stBad',end:'stEnd',wrong:'stWrong'};
const STC={read:'ok',manual:'ok',est:'est',miss:'miss',bad:'bad',end:'end',wrong:'wrong'};
function renderRack(){
  const N=$('now'); N.className='now log';
  let h=`<div class="card"><div class="bhead"><span class="note">${T('rackSize')}</span><select id="rkSize">${['8x12','9x9','6x8','4x6','10x10','16x24'].map(s=>`<option${CFG.rack===s?' selected':''}>${s}</option>`).join('')}</select>
    <input class="rkin" id="rkLabel" placeholder="${esc(T('rackLabel'))}" value="${esc(lastRack&&lastRack.label||'')}" style="flex:2 1 200px"></div></div>`;
  if(!lastRack||!lastRack.L){ N.innerHTML=h+(lastRack&&lastRack.error?`<div class="card bad"><div class="k" style="color:var(--tx)">${esc(lastRack.error)}</div></div>`:`<div class="empty">${T('msgK').replace(/<[^>]+>/g,' ')}</div>`); bindRack(); $('sumL').innerHTML=`<b>${T('modeK')}</b>`; $('sumR').textContent=''; return; }
  const L=lastRack.L, cnt={}; L.rows.flat().forEach(c=>cnt[c.st]=(cnt[c.st]||0)+1);
  $('sumL').innerHTML=T('rackSum',L.NR,L.NC,['read','manual','est','miss','bad','wrong','end'].filter(k=>cnt[k]).map(k=>`<span class="st-${STC[k]}">${T(ST[k])} ${cnt[k]}</span>`).join(' · '));
  $('sumR').textContent=L.seq?T('rackRule',Math.min(Math.abs(L.seq.DV),Math.abs(L.seq.DU)),Math.max(Math.abs(L.seq.DV),Math.abs(L.seq.DU)),L.seq.ok,L.seq.n):T('rackNoRule');
  h+=`<div class="card"><div class="bhead"><button class="mini" id="rkA1">${T('a1')}</button><span class="sp"></span><button class="mini g" id="rkXlsx">${T('xlsx')}</button></div><div class="rkwrap"><table class="rk"><tr><th></th>${Array.from({length:L.NC},(_,c)=>`<th>${c+1}</th>`).join('')}</tr>`;
  L.rows.forEach((row,r)=>{ h+=`<tr><th>${String.fromCharCode(65+r)}</th>`+row.map(c=>{ const info=c.m.type==='ok'?headline(c.m.row):'';
    return `<td class="st-${STC[c.st]}" data-u="${c.u}" data-v="${c.v}" title="${c.pos} ${esc(c.code)} ${T(ST[c.st])}${info?' · '+esc(info):''}${c.expPos?' → '+c.expPos:''}">${c.code?esc(c.code.slice(-4)):(c.st==='end'?'—':'?')}${info?`<small>${esc(info)}</small>`:''}</td>`; }).join('')+'</tr>'; });
  h+=`</table></div><div class="m">${T('legend')}</div></div>`;
  N.innerHTML=h; bindRack();
  $('rkA1').onclick=()=>{ rackFlip=(rackFlip+1)%4; lastRack.L=rackLayout(lastRack.res); render(); drawRackPhoto(); };
  $('rkXlsx').onclick=downloadRackXlsx;
  N.querySelectorAll('td[data-u]').forEach(td=>td.onclick=()=>{ const k=td.dataset.u+','+td.dataset.v, cur=lastRack.res.cells.get(k), v=prompt(T('typeCode',td.title.split(' ')[0]),cur?cur.code:''); if(v===null) return;
    const s=norm(v); if(s) lastRack.res.cells.set(k,{code:s,how:'manual'}); else lastRack.res.cells.delete(k); lastRack.L=rackLayout(lastRack.res); render(); drawRackPhoto(); });
}
function bindRack(){ $('rkSize').onchange=e=>{ CFG.rack=e.target.value; save(); }; $('rkLabel').oninput=e=>{ if(lastRack) lastRack.label=e.target.value; }; }
function drawRackPhoto(){
  if(!lastRack||!lastRack.L) return; const bmp=lastRack.bmp, res=lastRack.res;
  const pic=$('pic'), s=Math.min(1,2000/Math.max(bmp.width,bmp.height)); pic.width=Math.round(bmp.width*s); pic.height=Math.round(bmp.height*s);
  const c=pic.getContext('2d'); c.drawImage(bmp,0,0,pic.width,pic.height);
  const v=$('view'); v.classList.add('photo'); v.style.setProperty('--ar',bmp.width+'/'+bmp.height); pic.style.display='block'; $('msg').style.display='none'; video.style.display='none'; ov.style.display='none';
  const col={read:'#30d158',manual:'#30d158',est:'#0a84ff',miss:'#ff453a',bad:'#ff453a',end:'#8e8e93',wrong:'#ffd60a'}, items=[];
  for(const row of lastRack.L.rows) for(const cell of row){ const q=[[-.38,-.38],[.38,-.38],[.38,.38],[-.38,.38]].map(([a,b])=>res.toImg(cell.u+a,cell.v+b)).map(p=>({x:p.c*s,y:p.r*s}));
    const lines=[cell.pos]; if(cell.st==='wrong') lines.push('→'+cell.expPos); items.push({pts:q,col:col[cell.st],lines,label:lines.join(' ')}); }
  drawLabels(c,items,Math.min((v.clientWidth||360)/pic.width,(v.clientHeight||300)/pic.height),false,{x0:0,y0:0,x1:pic.width,y1:pic.height});
}
async function rackPhoto(bmp){
  const B=$('busy'); B.style.display='block'; B.textContent=T('busyRead'); drawPhoto(bmp,new Map());
  const [R,C]=CFG.rack.split('x').map(Number);
  const res=await rackRead(bmp,Math.min(R,C),Math.max(R,C),msg=>{ B.textContent=msg; });
  rackFlip=0; lastRack=res.error?{error:res.error}:{res,bmp,L:rackLayout(res),label:lastRack&&lastRack.label||''}; B.style.display='none';
  if(!res.error) logEvent({action:'rack',mode:'rack',code:`${res.cells.size} codes`});
  render(); drawRackPhoto();
}
function downloadRackXlsx(){
  const L=lastRack.L, extra=showCols().filter(c=>c!==CFG.pos), rows=[], styles=[];
  for(let c=0;c<L.NC;c++) for(let r=0;r<L.NR;r++){ const x=L.rows[r][c];
    rows.push([x.pos,String.fromCharCode(65+r),c+1,x.code,T(ST[x.st]),x.exp,...extra.map(ci=>x.m.type==='ok'?norm(x.m.row[ci]):''),x.expPos,lastRack.label||'']);
    styles.push({est:2,miss:3,bad:3,wrong:3,end:4}[x.st]||0); }
  const head=[LANG==='ko'?'위치':'Position',LANG==='ko'?'행':'Row',LANG==='ko'?'열':'Column',LANG==='ko'?'바코드':'Barcode',LANG==='ko'?'상태':'Status',LANG==='ko'?'규칙상 바코드':'Expected by pattern',...extra.map(ci=>DATA.cols[ci]),LANG==='ko'?'표의 위치':'Position in table',LANG==='ko'?'랙 라벨':'Rack label'];
  saveBlob(xlsxBlob('rack',head,rows,styles),`rack_${new Date().toISOString().slice(0,10)}.xlsx`);
}
function saveBlob(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); }

/* ---------------- render dispatch ---------------- */
function render(){
  $('dataChip').textContent=DATA.rows.length?T('rows',DATA.rows.length):T('noData'); $('dataChip').className='chip'+(DATA.rows.length?'':' bad');
  $('prog').textContent=DATA.rows.length?T('progress',[...CHECK].filter(i=>i<DATA.rows.length).length,DATA.rows.length):''; $('prog').style.display=DATA.rows.length?'':'none';
  if(MODE==='pair') renderPair(); else if(MODE==='rack') renderRack(); else renderScan();
  pairStatus();
}
function renderShow(){
  const row=$('showRow'); const cols=DATA.cols.map((c,i)=>i).filter(i=>i!==CFG.key);
  row.innerHTML=`<span>${T('showOn')}</span>`+cols.map(i=>`<button data-c="${i}" class="${CFG.show.includes(i)?'on':''}" aria-pressed="${CFG.show.includes(i)}">${esc(DATA.cols[i]||T('col',i+1))}</button>`).join('');
  row.style.display=cols.length?'flex':'none';
  row.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const i=+b.dataset.c; if(CFG.show.includes(i)){ if(showCols().length<=1){ toast(T('minOne'),'','bad'); return; } CFG.show=CFG.show.filter(x=>x!==i); } else CFG.show.push(i);
    save(); renderShow(); render(); if($('pic').style.display==='block'){ if(MODE==='rack') drawRackPhoto(); else if(lastShot) drawPhoto(lastShot.bmp,lastShot.found); } });
}
function setMode(m){
  MODE=m; for(const [id,mm] of [['modeS','scan'],['modeP','pair'],['modeK','rack']]) $(id).classList.toggle('on',mm===m);
  PA=PB=null; $('verdict').className='verdict';
  if(running&&m==='rack'&&!IS_DESKTOP) stop();
  $('liveBtn').classList.toggle('dim',(m==='rack'&&!IS_DESKTOP)||inFrame);
  cards.clear(); $('toast').className='toast'; resetView();
  if(running){ $('msg').style.display='none'; $('tag').style.display='block'; }
  else showMsg(!DATA.rows.length&&m!=='rack'?T('msgNoData'):T(m==='pair'?'msgP':m==='rack'?'msgK':'msgS'));
  if(m==='pair'&&!running&&!blockReason()&&DATA.rows.length) start();
  updateSnap(); render();
}

/* ---------------- photo processing ---------------- */
async function processBitmap(bmp){
  if(!ready){ toast(T('engineErr'),'','bad'); return; }
  scanning=true; const B=$('busy'); B.style.display='block'; B.textContent=T('busyRead');
  try{
    if(MODE==='rack'){ await rackPhoto(bmp); return; }
    drawPhoto(bmp,new Map());
    const found=await scanPhoto(bmp,bmp.width,bmp.height,async(f,msg)=>{ drawPhoto(bmp,f); B.textContent=msg||T('busyRead'); });
    if(![...found.keys()].some(isTube)) await enhancedScan(bmp,bmp.width,bmp.height,found,T('busyBlur'));
    if(CFG.laser) await sidePhoto(bmp,bmp.width,bmp.height,found);
    drawPhoto(bmp,found);
    if(!found.size){ $('sumL').innerHTML=`<b class="bad-t">${T('noCode')}</b>`; buzz([200,100,200]); }
    else if(MODE==='pair') pairFeed([...found.values()]); else addCodes([...found.values()],'photo',false);
  }catch(err){ toast(T('engineErr'),String(err&&err.message||err),'bad'); }
  finally{ B.style.display='none'; scanning=false; updateSnap(); }
}
$('snap').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f||scanning) return; if(running) stop(); await processBitmap(await createImageBitmap(f)); };

/* ---------------- camera ---------------- */
function blockReason(){
  if(inFrame) return 'Live camera is blocked inside an embedded preview. Use Capture.';
  if(!window.isSecureContext) return 'Live camera needs HTTPS. Use Capture.';
  if(!navigator.mediaDevices?.getUserMedia) return 'This browser has no live camera. Use Capture.';
  return null;
}
function setFacing(f){ facing=f; CFG.facing=f; save(); $('faceT').textContent=IS_DESKTOP?(f==='user'?T('mirror'):T('mirrorOff')):(f==='user'?T('front'):T('rear')); $('snap').setAttribute('capture',f); video.classList.toggle('mir',f==='user'); ov.classList.toggle('mir',f==='user'); if(running){ stop(); start(); } }
async function start(){
  const r=blockReason(); if(r){ resetView(); showMsg(r,true); return; }
  try{ resetView(); showMsg('…');
    const size=IS_DESKTOP?{width:{ideal:2560},height:{ideal:1440}}:{width:{ideal:1920},height:{ideal:1080}};
    try{ stream=await navigator.mediaDevices.getUserMedia({audio:false,video:Object.assign(CFG.camId?{deviceId:{exact:CFG.camId}}:{facingMode:{ideal:facing}},size)}); }
    catch(e){ if(e.name==='OverconstrainedError'||e.name==='NotFoundError'){ CFG.camId=''; stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing}}); } else throw e; }
    video.srcObject=stream; await video.play(); track=stream.getVideoTracks()[0];
    try{ const cap=track.getCapabilities?.()||{}; if(cap.focusMode&&cap.focusMode.includes('continuous')) await track.applyConstraints({advanced:[{focusMode:'continuous'}]}); }catch(e){}
    $('msg').style.display='none'; $('tag').style.display='block'; running=true; $('liveT').textContent=T('stop'); $('liveBtn').classList.add('on'); loop(); listCams(); updateSnap();
  }catch(e){ stop(); showMsg(esc(e&&e.name==='NotAllowedError'?'Camera permission denied':(e&&e.message||e)),true); }
}
function stop(){ running=false; if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null; track=null; held.clear(); $('liveT').textContent=T('live'); $('liveBtn').classList.remove('on'); $('tag').style.display='none'; octx.clearRect(0,0,ov.width,ov.height); updateSnap(); }
const seen=new Map(), held=new Map(); let tick=0, sideIdx=0;
async function loop(){
  if(!running) return;
  if(ready&&!busy&&video.readyState>=2&&video.videoWidth&&MODE!=='rack'&&$('pic').style.display!=='block'){
    busy=true;
    try{
      const w=video.videoWidth,h=video.videoHeight, found=new Map(), s=Math.min(1,1280/Math.max(w,h));
      addFound(found,await decodeRaw(grab(video,0,0,w,h,s)),0,0,s);
      if(tick++%2){ const cw=Math.round(w*.5),ch=Math.round(h*.5),sx=Math.round((w-cw)/2),sy=Math.round((h-ch)/2),sc=Math.min(2,1100/Math.max(cw,ch)); addFound(found,await decodeRaw(grab(video,sx,sy,cw,ch,sc)),sx,sy,sc); }
      if(facing==='user'&&!found.size){ const f=flipped(video,w,h); addFound(found,await decodeRaw(grab(f,0,0,w,h,s)),0,0,s,w); }
      const m=Math.min(w,h), cw=Math.round(m*.5), cx=Math.round((w-cw)/2), cy=Math.round((h-cw)/2);
      if(CFG.laser&&![...found.keys()].some(isTube)){   // laser-etched codes: a few aligned+closed variants per frame inside the guide square
        const V=sideVariants(cropTilts(video,cx,cy,cw,cw)), vs=[0,1,2].map(()=>V[(sideIdx++)%V.length]);
        const rs=await Promise.all(vs.map(v=>decodeRaw(grabRot(video,cx,cy,cw,cw,v.sz,v.a),{close:1,win:v.win,k:v.k,c:v.c})));
        for(const r of rs){ const b=r.find(x=>isCode(x.text)); if(b) found.set(norm(b.text),{text:norm(b.text),format:b.format,side:true,pts:[{x:cx,y:cy},{x:cx+cw,y:cy},{x:cx+cw,y:cy+cw},{x:cx,y:cy+cw}]}); } }
      ov.width=w; ov.height=h; octx.clearRect(0,0,w,h);
      const ds=Math.max(ov.clientWidth/w,ov.clientHeight/h)||1, vw=ov.clientWidth/ds, vh=ov.clientHeight/ds, tnow=Date.now();
      for(const [t,k] of found) if(k.pts) held.set(t,{k,until:tnow+CFG.hold.sec*1000});
      for(const [t,hh] of held) if(!CFG.hold.on||hh.until<tnow) held.delete(t);
      const show=[...found.values()].filter(k=>k.pts).map(k=>({pts:k.pts,...colorFor(k.text)}));
      for(const [t,hh] of held) if(!found.has(t)) show.push({pts:hh.k.pts,...colorFor(t),stale:true});
      drawLabels(octx,show,ds,facing==='user',{x0:(w-vw)/2,y0:(h-vh)/2+($('tag').offsetHeight+10)/ds,x1:(w+vw)/2,y1:(h+vh)/2});
      if(CFG.laser){ octx.save(); octx.strokeStyle='rgba(255,255,255,.75)'; octx.lineWidth=Math.max(2,3/ds); octx.setLineDash([12/ds,8/ds]); octx.strokeRect(cx,cy,cw,cw); octx.restore(); }
      $('tag').textContent=`${found.size}`;
      for(const k of [...seen.keys()]) if(!found.has(k)) seen.delete(k);
      const conf=[]; for(const [t,k] of found){ const n=(seen.get(t)||0)+(k.side?2:1); seen.set(t,n); if(n===2||(k.side&&n<=3)) conf.push(k); }
      if(conf.length){ if(MODE==='pair') pairFeed(conf); else { const now=Date.now(); addCodes(conf,'camera',now-lastAdd<4000); lastAdd=now; } }
    }catch(e){}
    busy=false;
  }
  setTimeout(()=>requestAnimationFrame(loop),90);
}
function updateSnap(){
  if(!IS_DESKTOP){ $('snapT').textContent=MODE==='rack'?T('snapRack'):T('snap'); return; }
  $('snapT').textContent=!running?T('camOn'):($('pic').style.display==='block'?T('retake'):(MODE==='rack'?T('snapRack'):T('snap')));
}
async function listCams(){ try{ const ds=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'); if(!ds.length) return;
  const cur=track?.getSettings?.().deviceId||CFG.camId; $('camSel').innerHTML=ds.map((d,i)=>`<option value="${esc(d.deviceId)}"${d.deviceId===cur?' selected':''}>${esc(d.label||'Camera '+(i+1))}</option>`).join(''); $('camSel').style.display=''; $('camLbl').style.display=''; }catch(e){} }
async function captureFrame(){ let bmp=null;
  try{ if(window.ImageCapture&&track){ const blob=await Promise.race([new ImageCapture(track).takePhoto(),new Promise((_,j)=>setTimeout(()=>j(0),4000))]); bmp=await createImageBitmap(blob); } }catch(e){}
  if(!bmp){ const c=document.createElement('canvas'); c.width=video.videoWidth; c.height=video.videoHeight; c.getContext('2d').drawImage(video,0,0); bmp=await createImageBitmap(c); }
  await processBitmap(bmp); }
async function desktopSnap(){ if(scanning) return; if(!ready){ toast(T('engineErr'),'','bad'); return; } if(!running){ await start(); return; }
  if($('pic').style.display==='block'){ resetView(); $('tag').style.display='block'; updateSnap(); return; } await captureFrame(); }

/* ---------------- data loading ---------------- */
function parseDelimited(text){
  text=text.replace(/^﻿/,''); const first=text.split(/\r?\n/)[0]||''; const d=(first.match(/\t/g)||[]).length>(first.match(/,/g)||[]).length?'\t':(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  const rows=[]; let row=[], cell='', q=false;
  for(let i=0;i<text.length;i++){ const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=ch; }
    else if(ch==='"') q=true; else if(ch===d){ row.push(cell); cell=''; } else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(cell); rows.push(row); row=[]; cell=''; } else cell+=ch; }
  if(cell||row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r=>r.some(c=>String(c).trim()));
}
// Minimal .xlsx reader: zip central directory + DecompressionStream, shared strings, first/selected sheet
async function readXlsx(buf,sheetIndex){
  const u8=new Uint8Array(buf), dv=new DataView(buf); let e=u8.length-22; while(e>=0&&dv.getUint32(e,true)!==0x06054b50) e--; if(e<0) throw new Error('zip');
  const n=dv.getUint16(e+10,true); let p=dv.getUint32(e+16,true); const files={};
  for(let i=0;i<n;i++){ const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(u8.subarray(p+46,p+46+nl)); files[name]={method,csize,off}; p+=46+nl+xl+cl; }
  const get=async name=>{ const f=files[name]; if(!f) return null; const lnl=dv.getUint16(f.off+26,true), lxl=dv.getUint16(f.off+28,true), data=u8.subarray(f.off+30+lnl+lxl,f.off+30+lnl+lxl+f.csize);
    if(f.method===0) return new TextDecoder().decode(data);
    const ds=new DecompressionStream('deflate-raw'); const out=await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer(); return new TextDecoder().decode(out); };
  const P=s=>new DOMParser().parseFromString(s,'application/xml');
  const wb=P(await get('xl/workbook.xml')), rels=P(await get('xl/_rels/workbook.xml.rels'));
  const sheets=[...wb.getElementsByTagName('sheet')].map(s=>({name:s.getAttribute('name'),rid:s.getAttribute('r:id')||s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')}));
  const target=rid=>{ const r=[...rels.getElementsByTagName('Relationship')].find(x=>x.getAttribute('Id')===rid); let t=r.getAttribute('Target'); return t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,''); };
  const ssx=await get('xl/sharedStrings.xml'), ss=ssx?[...P(ssx).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
  const sh=P(await get(target(sheets[sheetIndex||0].rid))), out=[];
  const colIx=ref=>{ let n=0; for(const ch of ref.replace(/\d+/g,'')) n=n*26+ch.charCodeAt(0)-64; return n-1; };
  for(const r of sh.getElementsByTagName('row')){ const row=[]; for(const c of r.getElementsByTagName('c')){ const t=c.getAttribute('t'), v=c.getElementsByTagName('v')[0], is=c.getElementsByTagName('is')[0];
      let val=t==='s'?ss[+(v&&v.textContent)]:t==='inlineStr'?(is?[...is.getElementsByTagName('t')].map(x=>x.textContent).join(''):''):(v?v.textContent:'');
      if(t!=='s'&&t!=='inlineStr'&&t!=='str'&&/e[+-]?\d+$/i.test(val)&&Number.isFinite(+val)) val=BigInt(Math.round(+val)).toString();
      row[colIx(c.getAttribute('r'))]=val??''; }
    out.push(Array.from(row,x=>x??'')); }
  return {rows:out.filter(r=>r.some(x=>String(x).trim())),sheets:sheets.map(s=>s.name)};
}
function setTable(rows,keepCfg){
  const w=Math.max(1,...rows.map(r=>r.length)); rows=rows.map(r=>Array.from({length:w},(_,i)=>String(r[i]??'').trim()));
  const head=rows.shift()||[]; DATA={cols:head.map((h,i)=>h||T('col',i+1)),rows};
  if(!keepCfg){ CFG.key=0; CFG.show=DATA.cols.length>1?[1]:[]; CFG.cmp=-1; CFG.pos=DATA.cols.findIndex(c=>/^(position|pos|well|위치|자리)$/i.test(c)); CHECK=new Set(); }
  reindex(); save(); renderAll(); toast(T('loaded',DATA.rows.length),'','ok');
}
let pendingXlsx=null;
$('fileIn').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
  try{ if(/\.xls$/i.test(f.name)){ toast(T('xlsxOld'),'','bad'); return; }
    if(/\.xlsx$/i.test(f.name)){ const buf=await f.arrayBuffer(), r=await readXlsx(buf,0); pendingXlsx=buf;
      if(r.sheets.length>1){ $('sheetSel').innerHTML=r.sheets.map((s,i)=>`<option value="${i}">${esc(s)}</option>`).join(''); $('sheetPick').style.display='flex'; } else $('sheetPick').style.display='none';
      setTable(r.rows); }
    else setTable(parseDelimited(await f.text())); }catch(err){ toast(T('loadFail'),String(err&&err.message||err),'bad'); } };
$('sheetSel').onchange=async e=>{ if(!pendingXlsx) return; try{ setTable((await readXlsx(pendingXlsx,+e.target.value)).rows); }catch(err){ toast(T('loadFail'),'','bad'); } };
$('gsBtn').onclick=async()=>{ const u=$('gsUrl').value.trim(); if(!u) return;
  let url=u; const m=u.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/), g=u.match(/[#&?]gid=(\d+)/);
  if(m&&!/\/pub\?/.test(u)) url=`https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${g?'&gid='+g[1]:''}`;
  try{ const r=await fetch(url); if(!r.ok) throw 0; const txt=await r.text(); if(/^\s*</.test(txt)) throw 0; setTable(parseDelimited(txt)); }catch(e){ toast(T('gsFail'),'','bad'); } };
$('dpSample').onclick=()=>{ setTable(SAMPLE.map(r=>r.slice())); CFG.cmp=2; CFG.pos=3; CFG.show=[1,3]; reindex(); save(); renderAll(); };
$('dpNew').onclick=()=>{ setTable([['Barcode','Name','Note'],['','','']]); };

/* ---------------- sheet editor ---------------- */
function renderSheet(){
  const q=nk($('findIn').value||''), idx=DATA.rows.map((r,i)=>i).filter(i=>!q||DATA.rows[i].some(c=>nk(c).includes(q))).slice(0,300);
  let h=`<tr><th class="n">#</th>${DATA.cols.map((c,i)=>`<th class="${i===CFG.key?'keyc':''}"><input data-h="${i}" value="${esc(c)}"></th>`).join('')}<th class="n"></th></tr>`;
  for(const i of idx) h+=`<tr><td class="n">${i+1}</td>${DATA.cols.map((_,j)=>`<td><input data-r="${i}" data-c="${j}" value="${esc(DATA.rows[i][j]??'')}"${j===CFG.key?' style="color:var(--y)"':''}></td>`).join('')}<td class="n"><button class="del" data-del="${i}" aria-label="delete">✕</button></td></tr>`;
  $('sheet').innerHTML=h; $('sheetNote').textContent=T('sheetNote',idx.length,DATA.rows.length);
}
let saveT=null; const soon=()=>{ clearTimeout(saveT); saveT=setTimeout(()=>{ reindex(); save(); render(); renderShow(); renderSettings(); },400); };
$('sheet').addEventListener('input',e=>{ const t=e.target; if(t.dataset.h!==undefined) DATA.cols[+t.dataset.h]=t.value; else if(t.dataset.r!==undefined) DATA.rows[+t.dataset.r][+t.dataset.c]=t.value; soon(); });
$('sheet').addEventListener('click',e=>{ const b=e.target.closest('[data-del]'); if(!b) return; DATA.rows.splice(+b.dataset.del,1); reindex(); save(); renderSheet(); render(); });
$('sheet').addEventListener('paste',e=>{ const t=e.target; if(t.dataset.r===undefined&&t.dataset.h===undefined) return; const txt=e.clipboardData.getData('text'); if(!/[\t\n]/.test(txt)) return; e.preventDefault();
  const grid=parseDelimited(txt.includes('\t')?txt:txt.replace(/,/g,'\t')); let r0=t.dataset.h!==undefined?-1:+t.dataset.r, c0=+(t.dataset.h??t.dataset.c);
  grid.forEach((row,ri)=>{ const r=r0+ri; row.forEach((v,ci)=>{ const c=c0+ci; while(c>=DATA.cols.length){ DATA.cols.push(T('col',DATA.cols.length+1)); DATA.rows.forEach(x=>x.push('')); }
    if(r<0) DATA.cols[c]=v; else { while(r>=DATA.rows.length) DATA.rows.push(DATA.cols.map(()=>'')); DATA.rows[r][c]=v; } }); });
  reindex(); save(); renderSheet(); renderAll(); });
$('findIn').oninput=renderSheet;
$('addRow').onclick=()=>{ DATA.rows.push(DATA.cols.map(()=>'')); save(); renderSheet(); render(); };
$('addCol').onclick=()=>{ DATA.cols.push(T('col',DATA.cols.length+1)); DATA.rows.forEach(r=>r.push('')); save(); renderSheet(); renderSettings(); renderShow(); };
function renderSettings(){
  const opts=(sel,withNone)=>(withNone?`<option value="-1">${T('none')}</option>`:'')+DATA.cols.map((c,i)=>`<option value="${i}"${i===sel?' selected':''}>${esc(c)}</option>`).join('');
  $('keySel').innerHTML=opts(CFG.key,false); $('cmpSel').innerHTML=opts(CFG.cmp,true); $('posSel').innerHTML=opts(CFG.pos,true);
  $('optCase').checked=CFG.caseIns; $('optStrip').checked=CFG.strip; $('holdOn').checked=CFG.hold.on; $('holdSec').value=String(CFG.hold.sec); $('optLaser').checked=CFG.laser; $('langSel').value=LANG;
}
$('keySel').onchange=e=>{ CFG.key=+e.target.value; CFG.show=CFG.show.filter(c=>c!==CFG.key); reindex(); save(); renderAll(); };
$('cmpSel').onchange=e=>{ CFG.cmp=+e.target.value; reindex(); save(); render(); };
$('posSel').onchange=e=>{ CFG.pos=+e.target.value; reindex(); save(); if(lastRack&&lastRack.res) lastRack.L=rackLayout(lastRack.res); render(); };
$('optCase').onchange=e=>{ CFG.caseIns=e.target.checked; reindex(); save(); render(); };
$('optStrip').onchange=e=>{ CFG.strip=e.target.checked; reindex(); save(); render(); };
$('holdOn').onchange=e=>{ CFG.hold.on=e.target.checked; save(); };
$('holdSec').onchange=e=>{ CFG.hold.sec=+e.target.value; save(); };
$('optLaser').onchange=e=>{ CFG.laser=e.target.checked; save(); };
$('langSel').onchange=e=>{ LANG=e.target.value; save(); applyLang(); renderAll(); };
$('camSel').onchange=e=>{ CFG.camId=e.target.value; save(); if(running){ stop(); start(); } };
const csv=rows=>'﻿'+rows.map(r=>r.map(v=>{ let s=String(v??''); if(/^[=+\-@\t\r]/.test(s)) s="'"+s; return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }).join(',')).join('\r\n');
$('expTable').onclick=()=>saveBlob(new Blob([csv([DATA.cols,...DATA.rows])],{type:'text/csv'}),'scanmatch_table.csv');
$('expLog').onclick=()=>saveBlob(new Blob([csv([['time','mode','action','code','code2','found'],...LOG.map(l=>[l.ts,l.mode,l.action,l.code,l.code2||'',l.found??''])])],{type:'text/csv'}),'scanmatch_log.csv');
$('clrLog').onclick=()=>{ if(!confirm(T('sure'))) return; CHECK.clear(); LOG=[]; save(); render(); };
$('clrAll').onclick=()=>{ if(!confirm(T('sure'))) return; DATA={cols:[],rows:[]}; CHECK.clear(); LOG=[]; reindex(); save(); renderAll(); };

/* ---------------- panels, language, events ---------------- */
function applyLang(){
  document.documentElement.lang=LANG;
  const set={dataBtn:'data',modeS:'modeS',modeP:'modeP',modeK:'modeK',liveT:'live',dpTitle:'dpTitle',dpPrivacy:'dpPrivacy',dpLoadT:'dpLoad',dpFileT:'dpFile',dpSample:'dpSample',dpNew:'dpNew',gsBtn:'gsBtn',gsNote:'gsNote',dpEditT:'dpEdit',addRow:'addRow',addCol:'addCol',dpSetT:'dpSet',keyLbl:'keyCol',cmpLbl:'cmpCol',posLbl:'posCol',optCaseT:'optCase',optStripT:'optStrip',dpCamT:'dpCam',holdT:'hold',optLaserT:'laser',expTable:'expTable',expLog:'expLog',clrLog:'clrLog',clrAll:'clrAll',langT:'lang',camLbl:'cam',hpTitle:'help'};
  for(const [id,k] of Object.entries(set)) if($(id)) $(id).textContent=T(k);
  $('gsUrl').placeholder=T('gsPh'); $('findIn').placeholder=T('find'); $('keys').innerHTML=T('keys'); $('helpBody').innerHTML=T('helpBody');
  if(running) $('liveT').textContent=T('stop'); setFacing(facing); updateSnap();
}
function renderAll(){ renderShow(); renderSettings(); if($('dataPanel').classList.contains('show')) renderSheet(); setMode(MODE); }
$('dataBtn').onclick=()=>{ renderSettings(); renderSheet(); $('dataPanel').classList.add('show'); };
$('dpClose').onclick=()=>$('dataPanel').classList.remove('show');
$('helpBtn').onclick=()=>$('helpPanel').classList.add('show'); $('hpClose').onclick=()=>$('helpPanel').classList.remove('show');
for(const id of ['dataPanel','helpPanel']) $(id).addEventListener('click',e=>{ if(e.target.id===id) $(id).classList.remove('show'); });
$('modeS').onclick=()=>setMode('scan'); $('modeP').onclick=()=>setMode('pair'); $('modeK').onclick=()=>setMode('rack');
$('liveBtn').onclick=()=>{ if(MODE==='rack'&&!IS_DESKTOP) return; running?stop():start(); };
$('faceBtn').onclick=()=>setFacing(facing==='user'?'environment':'user');
if(IS_DESKTOP&&!inFrame&&navigator.mediaDevices?.getUserMedia) $('snapLbl').addEventListener('click',e=>{ e.preventDefault(); desktopSnap(); });
document.addEventListener('keydown',e=>{ if(e.target.closest('input,textarea,select')||e.metaKey||e.ctrlKey||e.altKey) return;
  if(e.key==='Escape'){ $('dataPanel').classList.remove('show'); $('helpPanel').classList.remove('show'); return; }
  if(document.querySelector('.panel.show')) return;
  if(e.key===' '||e.key==='Enter'){ e.preventDefault(); IS_DESKTOP?desktopSnap():$('snap').click(); }
  else if(e.key==='l'||e.key==='L') $('liveBtn').click(); else if(e.key==='1') setMode('scan'); else if(e.key==='2') setMode('pair'); else if(e.key==='3') setMode('rack'); });
addEventListener('resize',()=>{ clearTimeout(window.__rz); window.__rz=setTimeout(render,150); });

/* ---------------- sample data (fictional) ---------------- */
const SAMPLE=/*SAMPLE*/[];

/* ---------------- start ---------------- */
load(); facing=CFG.facing; reindex(); applyLang(); renderAll();
if(window.ZXingWASM){
  ZXingWASM.prepareZXingModule({overrides:{wasmBinary:Uint8Array.from(atob(window.__WASM_B64),c=>c.charCodeAt(0)).buffer},fireImmediately:true})
    .then(()=>initPool()).then(()=>{ ready=true; $('badge').style.display='none'; document.documentElement.dataset.workers=poolOK?POOL.length:0; })
    .catch(()=>{ $('badge').textContent=T('engineErr'); $('badge').className='chip bad'; });
}else{ $('badge').textContent=T('engineFail'); }
