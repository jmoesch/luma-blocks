import { GameEngine, SHAPES, dims, SIDE, loadState, loadBest, validateState, SAVE_KEY, saveState, linesNeeded, SETTINGS_KEY } from './engine.js?v=1.3.2';

const $=id=>document.getElementById(id);
const app=$('app'), board=$('board'), boardStack=$('boardStack'), boardArea=document.querySelector('.game-area');
const ghost=$('ghost'), scoreEl=$('score'), bestEl=$('best'), guide=$('guideText');
const racks=[...document.querySelectorAll('.piece-slot')];
const novaBtn=$('novaBtn'), novaBars=[...document.querySelectorAll('#novaBars i')];
const modal=$('modal'), modalBody=$('modalBody'), modalActions=$('modalActions');
const noSound=(()=>{try{return localStorage.getItem(SETTINGS_KEY)==='false';}catch{return false;}})();
let engine=new GameEngine(loadState());
engine.state.bestScore=Math.max(engine.state.bestScore,loadBest());
let cursor={row:0,col:0},preview=null,inspectEnd=false;
function readSnapshot(){try{return localStorage.getItem(SAVE_KEY);}catch{return null;}}
const journalPrefix=SAVE_KEY+'.pending.';
const journalKey=journalPrefix+Date.now().toString(36)+Math.random().toString(36).slice(2);
let expectedSave=readSnapshot(),queued=false,pending=null;
function discardPending(){
  pending=null;
  try{localStorage.removeItem(journalKey);}catch{}
}
function syncBoard(){
  if(readSnapshot()===expectedSave)return;
  const lostMove=!!pending&&JSON.stringify(pending.state)!==readSnapshot();
  if(pending)discardPending();
  expectedSave=readSnapshot();
  const saved=loadState();
  if(!saved)return;
  engine=new GameEngine(saved);
  engine.state.bestScore=Math.max(engine.state.bestScore,loadBest());
  if(drag)stopDrag();
  boardPointer=null;selected=null;novaMode=false;preview=null;animation=null;inspectEnd=false;
  modal.hidden=true;modalType=null;app.inert=false;
  updateHUD();drawRack();drawBoard();checkBlockedBoard();
  if(lostMove)showToast('En annan flik hann före. Ditt senaste drag sparades inte.');
}
function persist(){
  pending={base:expectedSave,state:JSON.parse(JSON.stringify(engine.state))};
  // Keep the newest local move durable even if the page closes before the lock is granted.
  try{localStorage.setItem(journalKey,JSON.stringify(pending));}catch{}
  if(queued)return;
  queued=true;
  function commit(){
    queued=false;
    if(!pending)return;
    if(readSnapshot()!==pending.base){syncBoard();return;}
    if(saveState(pending.state)){expectedSave=readSnapshot();discardPending();}
  }
  if(navigator.locks)navigator.locks.request(SAVE_KEY,commit).catch(()=>{queued=false;});
  else commit();
}
function recoverInterruptedWrites(){
  // A closed tab's journal can be recovered by any tab holding the save lock.
  const keys=[];
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key?.startsWith(journalPrefix))keys.push(key);
    }
    for(const key of keys.sort()){
      if(key===journalKey)continue;
      let item;
      try{item=JSON.parse(localStorage.getItem(key));}catch{}
      if(item?.base===readSnapshot()&&validateState(item.state)){
        if(!saveState(item.state))continue;
      }
      localStorage.removeItem(key);
    }
  }catch{}
  syncBoard();
  if(!readSnapshot())persist();
}
window.addEventListener('storage',e=>{if(e.key===SAVE_KEY)syncBoard();});
const colors=[
  { light:'#6cf2ff',mid:'#35cce9',dark:'#128dab'},
  { light:'#c2a9ff',mid:'#9b80fa',dark:'#6152c9'},
  { light:'#ff9cba',mid:'#fc6b9f',dark:'#c63f7d'},
  { light:'#ffe394',mid:'#ffcb62',dark:'#ce8b31'},
  { light:'#8df5d7',mid:'#44d9b4',dark:'#20977f'},
  { light:'#8ec1ff',mid:'#619eff',dark:'#3869c4'}
];
const format=new Intl.NumberFormat('sv-SE');
let boardSize=0, cell=0, selected=null, drag=null, novaMode=false, soundOn=!noSound;
let animation=null, rafAnimation=0, resizeRaf=0, toastTimer=0, modalType=null, focusBeforeModal=null;
import { createGameAudio } from './audio.js?v=1.3.2';
const sound=createGameAudio(Audio,()=>showToast('Ljudet kunde inte starta. Tryck på högtalaren för att försöka igen.'));
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden')sound.stop();
});

function rounded(ctx,x,y,w,h,r) {
  w=Math.max(0,w);h=Math.max(0,h);r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);return;}
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function prepareCanvas(canvas,width,height) {
  const dpr=Math.min(window.devicePixelRatio||1,3);
  canvas.width=Math.max(1,Math.round(width*dpr));
  canvas.height=Math.max(1,Math.round(height*dpr));
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return ctx;
}
function drawBlock(ctx,x,y,s,hue,alpha=1) {
  const color=colors[hue] || colors[0];
  const g=Math.max(1.4,s*.055), w=s-g*2, h=s-g*2;
  if(w<=0||h<=0)return;
  ctx.save();ctx.globalAlpha*=alpha;
  const r=Math.max(3,s*.16);
  // Bottom bevel makes the tiles feel dimensional without expensive images.
  rounded(ctx,x+g,y+g+Math.max(1.2,s*.045),w,h-Math.max(1.2,s*.045),r);
  ctx.fillStyle=color.dark;ctx.fill();
  const grad=ctx.createLinearGradient(x,y+g,x+w,y+h);
  grad.addColorStop(0,color.light);grad.addColorStop(.34,color.mid);grad.addColorStop(1,color.mid);
  rounded(ctx,x+g,y+g,w,h-Math.max(1.2,s*.045),r);
  ctx.fillStyle=grad;ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.13)';ctx.lineWidth=Math.max(.5,s*.018);ctx.stroke();
  const shineH=Math.max(1.4,s*.12);
  rounded(ctx,x+g+s*.09,y+g+s*.09,w-s*.18,shineH,shineH/2);
  ctx.fillStyle='rgba(255,255,255,.39)';ctx.fill();
  ctx.restore();
}
function drawBoard() {
  if(!boardSize)return;
  const ctx=board.getContext('2d'), s=boardSize;
  ctx.clearRect(0,0,s,s);
  ctx.save();
  rounded(ctx,0,0,s,s,11);ctx.fillStyle='#101a34';ctx.fill();
  for(let r=0;r<SIDE;r++)for(let c=0;c<SIDE;c++){
    const x=c*cell,y=r*cell,pad=Math.max(1.7,cell*.046);
    rounded(ctx,x+pad,y+pad,cell-pad*2,cell-pad*2,Math.max(3,cell*.14));
    ctx.fillStyle=(r+c)%2===0?'#243251':'#22304e';ctx.fill();
    ctx.strokeStyle='rgba(172,203,247,.035)';ctx.lineWidth=.8;ctx.stroke();
    const hue=engine.state.board[r][c];
    if(hue!==null)drawBlock(ctx,x,y,cell,hue);
  }
  if(drag && drag.origin && drag.valid){
    const {row,col}=drag.origin;
    for(const t of SHAPES[drag.piece.shape]){
      const x=(col+t.col)*cell,y=(row+t.row)*cell;
      rounded(ctx,x+1,y+1,cell-2,cell-2,cell*.15);
      ctx.fillStyle='rgba(135,242,251,.19)';ctx.fill();
      ctx.strokeStyle='rgba(162,250,255,.55)';ctx.lineWidth=1.6;ctx.stroke();
    }
  }
  if(preview&&!drag){
    const piece=engine.state.rack[selected];
    const origin=piece?tapOrigin(preview,piece):preview;
    const valid=piece?engine.canPlace(piece,origin.row,origin.col):engine.state.board[origin.row][origin.col]!==null;
    ctx.strokeStyle=valid?'#9cffe2':'#ff889c';ctx.lineWidth=3;
    for(const t of piece?SHAPES[piece.shape]:[{row:0,col:0}]){
      ctx.strokeRect((origin.col+t.col)*cell+3,(origin.row+t.row)*cell+3,cell-6,cell-6);
    }
  }
  if(novaMode){
    for(let r=0;r<SIDE;r++)for(let c=0;c<SIDE;c++){
      if(engine.state.board[r][c]===null)continue;
      const x=c*cell+2,y=r*cell+2;
      rounded(ctx,x,y,cell-4,cell-4,cell*.14);
      ctx.strokeStyle='rgba(143,250,255,.88)';ctx.lineWidth=1.7;ctx.stroke();
    }
  }
  if(animation) {
    const t=Math.min(1,(performance.now()-animation.start)/animation.duration);
    // Important: never paint the last frame of a completed animation.
    // v1.1 painted it and stopped its render loop, leaving ghost blocks visible forever.
    if(t>=1){
      animation=null;
    } else {
      for(let i=0;i<animation.cleared.length;i++){
        const {row,col}=animation.cleared[i];
        const pulse=cell*(.12*t);
        ctx.save();
        ctx.globalAlpha=(1-t)*.9;
        ctx.shadowColor=colors[animation.hues[i]??0].light;
        ctx.shadowBlur=cell*.35*(1-t);
        drawBlock(ctx,col*cell-pulse,row*cell-pulse,cell+2*pulse,animation.hues[i]??0,.9);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}
function drawRack() {
  let rackCell=cell;
  for(const [i,shape] of engine.state.rackShapes.entries()){
    if(!shape)continue;
    const rect=racks[i].querySelector('canvas').getBoundingClientRect(),d=dims({shape});
    rackCell=Math.min(rackCell,(rect.width-8)/d.cols,(rect.height-6)/d.rows);
  }
  for(let i=0;i<3;i++) {
    const slot=racks[i],cv=slot.querySelector('canvas'),piece=engine.state.rack[i];
    slot.classList.toggle('empty',!piece);
    slot.classList.toggle('selected',selected===i&&!!piece);
    slot.classList.toggle('dragging',drag?.index===i&&drag.moved);
    slot.disabled=!!engine.state.isGameOver||!piece;
    slot.setAttribute('aria-pressed',String(selected===i&&!!piece));
    slot.setAttribute('aria-label',piece?`Block ${i+1}, ${SHAPES[piece.shape].length} rutor`:`Block ${i+1} är använt`);
    const rect=cv.getBoundingClientRect();
    const w=rect.width,h=rect.height;
    if(w<1||h<1)continue;
    const ctx=prepareCanvas(cv,w,h);
    if(!piece)continue;
    const d=dims(piece),p=rackCell;
    const x0=(w-d.cols*p)/2,y0=(h-d.rows*p)/2;
    for(const t of SHAPES[piece.shape])drawBlock(ctx,x0+t.col*p,y0+t.row*p,p,piece.hue);
  }
}
function updateHUD({pop=false}={}) {
  const s=engine.state;
  app.dataset.theme=s.level>=9?'aurora':s.level>=5?'plum':'night';
  $('newBtn').textContent=inspectEnd?'RESULTAT':'NYTT SPEL';
  scoreEl.textContent=format.format(s.score);
  bestEl.textContent=format.format(s.bestScore);
  if(pop){scoreEl.classList.remove('pop');void scoreEl.offsetWidth;scoreEl.classList.add('pop');}
  $('novaProgress').textContent=s.novaTokens===3?'MAX':`${s.novaEnergy} / 4`;
  novaBars.forEach((bar,i)=>bar.classList.toggle('on',s.novaTokens===3||i<s.novaEnergy));
  $('novaCount').textContent=String(s.novaTokens);
  novaBtn.disabled=s.novaTokens===0 || s.isGameOver;
  novaBtn.classList.toggle('active',novaMode);
  novaBtn.setAttribute('aria-pressed',String(novaMode));
  $('boardHint').hidden=!novaMode;
  $('comboLabel').textContent=s.combo>1?`KOMBO ×${s.combo}`:'';
  $('levelNumber').textContent=String(s.level);
  $('levelCount').textContent=`${s.levelLines} / ${linesNeeded(s.level)} LINJER`;
  $('levelFill').style.width=`${100*s.levelLines/linesNeeded(s.level)}%`;
  $('soundBtn').classList.toggle('is-muted',!soundOn);
  $('soundBtn').setAttribute('aria-pressed',String(soundOn));
  $('soundBtn').setAttribute('aria-label',soundOn?'Stäng av ljud':'Slå på ljud');
  guide.textContent=s.isGameOver?'OMGÅNGEN ÄR SLUT':novaMode?'VÄLJ EN RUTA ATT TA BORT': selected!==null?'TRYCK ELLER HÅLL OCH GLID':'DRA ETT BLOCK TILL RUTNÄTET';
}
function layout() {
  const available=Math.max(20,Math.min(boardArea.clientWidth,boardArea.clientHeight,466));
  const newStack=Math.floor(available);
  boardStack.style.width=`${newStack}px`;
  boardStack.style.height=`${newStack}px`;
  const rect=board.getBoundingClientRect();
  boardSize=rect.width;
  cell=boardSize/SIDE;
  prepareCanvas(board,boardSize,boardSize);
  drawBoard();drawRack();
  if(drag&&drag.moved)updateDrag(drag.x,drag.y);
}
function scheduleLayout() {
  cancelAnimationFrame(resizeRaf);
  resizeRaf=requestAnimationFrame(layout);
}
function showToast(text) {
  const node=$('toast');node.textContent=text;node.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),1750);
}
function play(name) {
  if(soundOn)sound.play(name);
}
function scoreFloat(message) {
  const node=$('floatingScore');node.textContent=message;
  node.classList.remove('animate');void node.offsetWidth;node.classList.add('animate');
}
function startClearAnimation(outcome) {
  if(!outcome.cleared.length)return;
  animation={cleared:outcome.cleared,hues:outcome.clearedHues,start:performance.now(),duration:480};
  cancelAnimationFrame(rafAnimation);
  function step(){drawBoard();if(animation)rafAnimation=requestAnimationFrame(step);}
  rafAnimation=requestAnimationFrame(step);
}
function afterMove(outcome) {
  if(!outcome)return;
  selected=null;novaMode=false;preview=null;
  persist();
  updateHUD({pop:true});
  drawRack();drawBoard();
  if(outcome.clearedLines){
    if(navigator.vibrate)navigator.vibrate(18);
    play('clear');startClearAnimation(outcome);
    scoreFloat(outcome.combo>1?`KOMBO ×${outcome.combo} · +${outcome.gained}`:`+${outcome.gained}`);
    if(outcome.novaEarned>0)showToast('✦ NOVA uppladdad!');
  }else play('place');
  if(outcome.levelUp)showLevelBanner(outcome.toLevel);
  // Wait for the clear animation before showing the blocked-board dialog.
  if(outcome.gameOver || outcome.needsNova) setTimeout(checkBlockedBoard, outcome.clearedLines?560:160);
}
function showLevelBanner(level) {
  const el=$('levelBanner');
  el.textContent=`NIVÅ ${level}`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),1450);
}
function checkBlockedBoard() {
  if(inspectEnd || modalType || novaMode || engine.hasAnyMove())return;
  if(engine.state.novaTokens>0)openModal('stuck');
  else openModal('gameover');
}
function selectPiece(index) {
  if(novaMode&&!engine.hasAnyMove()){showToast('Välj en fylld ruta för NOVA');return;}
  novaMode=false;preview=null;
  selected=engine.state.rack[index]?index:null;
  drawBoard();drawRack();updateHUD();
}
function boardCell(clientX,clientY) {
  const rect=board.getBoundingClientRect();
  const col=Math.floor((clientX-rect.left)/cell),row=Math.floor((clientY-rect.top)/cell);
  if(row<0||row>=SIDE||col<0||col>=SIDE)return null;
  return {row,col};
}
function ghostOrigin(x,y, session) {
  const rect=board.getBoundingClientRect(),d=dims(session.piece);
  const lift=session.pointerType==='touch'||session.pointerType==='pen'?Math.min(98,Math.max(58,cell*1.85)):0;
  const left=x-d.cols*cell*.5,top=y-lift-d.rows*cell*.5;
  const row=Math.round((top-rect.top)/cell),col=Math.round((left-rect.left)/cell);
  const intersects=left<rect.right+cell*.4 && left+d.cols*cell>rect.left-cell*.4
    && top<rect.bottom+cell*.4 && top+d.rows*cell>rect.top-cell*.4;
  if(intersects&&!engine.canPlace(session.piece,row,col)){
    const exactRow=(top-rect.top)/cell,exactCol=(left-rect.left)/cell;
    let best=null,distance=.6;
    for(let r=row-1;r<=row+1;r++)for(let c=col-1;c<=col+1;c++){
      const d=Math.hypot(exactRow-r,exactCol-c);
      if(d<distance&&engine.canPlace(session.piece,r,c)){distance=d;best={row:r,col:c};}
    }
    if(best)return {...best,lift,intersects};
  }
  return {row,col,lift,intersects};
}
function makeGhost(piece) {
  const d=dims(piece);const w=d.cols*cell,h=d.rows*cell;
  const ctx=prepareCanvas(ghost,w,h);
  ghost.style.width=`${w}px`;ghost.style.height=`${h}px`;
  for(const t of SHAPES[piece.shape])drawBlock(ctx,t.col*cell,t.row*cell,cell,piece.hue);
  ghost.classList.add('visible');
}
function updateDrag(x,y) {
  if(!drag)return;
  drag.x=x;drag.y=y;
  const r=ghostOrigin(x,y,drag),d=dims(drag.piece),rect=board.getBoundingClientRect();
  drag.valid=r.intersects && engine.canPlace(drag.piece,r.row,r.col);
  drag.origin=drag.valid?{row:r.row,col:r.col}:null;
  if(drag.valid) {
    ghost.style.left=`${rect.left+r.col*cell}px`;
    ghost.style.top=`${rect.top+r.row*cell}px`;
    ghost.style.opacity='1';
  }else {
    ghost.style.left=`${x-d.cols*cell*.5}px`;
    ghost.style.top=`${y-r.lift-d.rows*cell*.5}px`;
    ghost.style.opacity='.66';
  }
  drawBoard();
}
function stopDrag() {
  ghost.classList.remove('visible');
  ghost.style.left='-400px';ghost.style.top='-400px';
  ghost.style.opacity='';
  drag=null;
  drawRack();drawBoard();
}
for(const slot of racks) {
  slot.addEventListener('pointerdown',e=>{
    if(modalType||engine.state.isGameOver||drag||boardPointer!==null)return;
    if(novaMode){selectPiece(Number(slot.dataset.index));if(novaMode)return;}
    const index=Number(slot.dataset.index),piece=engine.state.rack[index];
    if(!piece)return;
    e.preventDefault();
    slot.setPointerCapture(e.pointerId);
    drag={index,piece,pointerId:e.pointerId,pointerType:e.pointerType,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,moved:false,origin:null,valid:false};
  });
  slot.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.pointerId)return;
    const distance=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY);
    if(!drag.moved && distance<DRAG_THRESHOLD)return;
    if(!drag.moved){drag.moved=true;makeGhost(drag.piece);drawRack();}
    e.preventDefault();updateDrag(e.clientX,e.clientY);
  });
  slot.addEventListener('pointerup',e=>{
    if(!drag||drag.pointerId!==e.pointerId)return;
    e.preventDefault();
    const session=drag;
    if(session.moved)updateDrag(e.clientX,e.clientY);
    const origin=drag.origin;
    stopDrag();
    if(!session.moved) selectPiece(session.index);
    else if(origin)afterMove(engine.place(session.index,origin.row,origin.col));
    else showToast('Släpp blocket på lediga rutor');
  });
  slot.addEventListener('lostpointercapture',e=>{if(drag?.pointerId===e.pointerId)stopDrag();});
  slot.addEventListener('pointercancel',e=>{if(drag?.pointerId===e.pointerId)stopDrag();});
  slot.addEventListener('click',e=>{
    // Keyboard/assistive button activation (pointer clicks already handled).
    if(e.detail===0&&!modalType&&!engine.state.isGameOver){selectPiece(Number(slot.dataset.index));board.focus();}
  });
}
function tapOrigin(target,piece){
  const d=dims(piece);
  return {
    row:Math.max(0,Math.min(SIDE-d.rows,target.row-Math.floor((d.rows-1)/2))),
    col:Math.max(0,Math.min(SIDE-d.cols,target.col-Math.floor((d.cols-1)/2)))
  };
}
function updatePreview(target,announce=false){
  if(!target||modalType||drag)return;
  cursor=target;preview=target;drawBoard();
  if(announce){
    const piece=engine.state.rack[selected], origin=piece&&tapOrigin(target,piece);
    const fits=piece?(engine.canPlace(piece,origin.row,origin.col)?', blocket får plats':', blocket får inte plats'):'';
    $('cellStatus').textContent=`Rad ${target.row+1}, kolumn ${target.col+1}, ${engine.state.board[target.row][target.col]===null?'ledig':'fylld'}${fits}`;
  }
}
const DRAG_THRESHOLD=7;
let boardPointer=null,keyboardFocus=false,startX=0,startY=0;
function trackBoardPointer(e){
  if(!drag&&selected!==null&&!novaMode&&Math.hypot(e.clientX-startX,e.clientY-startY)>=DRAG_THRESHOLD){
    const piece=engine.state.rack[selected];
    drag={index:selected,piece,pointerId:e.pointerId,pointerType:e.pointerType,moved:true};
    preview=null;makeGhost(piece);
  }
  if(drag)updateDrag(e.clientX,e.clientY);
  else if(selected!==null||novaMode)updatePreview(boardCell(e.clientX,e.clientY));
}
document.addEventListener('keydown',()=>{keyboardFocus=true;},true);
document.addEventListener('pointerdown',()=>{keyboardFocus=false;},true);
board.addEventListener('pointerdown',e=>{
  if(e.button!==0||modalType||engine.state.isGameOver||drag||boardPointer!==null)return;
  e.preventDefault();
  keyboardFocus=false;
  boardPointer=e.pointerId;
  board.setPointerCapture(e.pointerId);
  startX=e.clientX;startY=e.clientY;
  if(selected!==null||novaMode)updatePreview(boardCell(startX,startY));
});
board.addEventListener('pointermove',e=>{
  if(e.pointerId===boardPointer){trackBoardPointer(e);return;}
  if(e.pointerType==='mouse'&&boardPointer===null&&!drag&&(selected!==null||novaMode)){
    updatePreview(boardCell(e.clientX,e.clientY));
  }
});
board.addEventListener('pointerleave',()=>{
  if(boardPointer===null){preview=null;drawBoard();}
});
function cancelBoardPointer(){
  boardPointer=null;preview=null;
  if(drag)stopDrag();else drawBoard();
}
for(const type of ['lostpointercapture','pointercancel'])board.addEventListener(type,e=>{
  if(e.pointerId===boardPointer)cancelBoardPointer();
});
board.addEventListener('pointerup',e=>{
  if(e.pointerId!==boardPointer)return;
  trackBoardPointer(e);
  boardPointer=null;preview=null;
  if(drag){
    const {origin,index}=drag;
    stopDrag();
    if(origin)afterMove(engine.place(index,origin.row,origin.col));
    else showToast('Släpp blocket på lediga rutor');
  }else activateCell(boardCell(e.clientX,e.clientY));
  drawBoard();
});
board.addEventListener('blur',()=>{preview=null;drawBoard();});
board.addEventListener('focus',()=>{if(keyboardFocus)updatePreview(cursor,true);});
board.addEventListener('keydown',e=>{
  if(modalType)return;
  const steps={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]};
  if(steps[e.key]){
    e.preventDefault();
    const [r,c]=steps[e.key];
    updatePreview({row:Math.max(0,Math.min(7,cursor.row+r)),col:Math.max(0,Math.min(7,cursor.col+c))},true);
  }else if(e.key==='Enter'||e.key===' '){
    e.preventDefault();if(!e.repeat)activateCell(cursor);
  }
});
board.addEventListener('click',e=>{if(e.detail===0&&keyboardFocus)activateCell(cursor);});
function activateCell(target){
  if(!target||modalType||engine.state.isGameOver||drag)return;
  preview=null;
  if(novaMode){
    if(engine.useNova(target.row,target.col)){
      novaMode=false;persist();play('clear');scoreFloat('✦ NOVA');
      updateHUD();drawBoard();drawRack();
      setTimeout(checkBlockedBoard,250);
    }else showToast('Välj en fylld ruta');
    return;
  }
  if(selected!==null){
    const piece=engine.state.rack[selected];
    if(!piece){selected=null;return;}
    const {row,col}=tapOrigin(target,piece);
    const outcome=engine.place(selected,row,col);
    if(outcome)afterMove(outcome);else showToast('Blocket får inte plats där');
  }else showToast('Välj ett block längst ned');
}
$('newBtn').addEventListener('click',()=>{
  if(engine.state.isGameOver){inspectEnd=false;openModal('gameover');}else openModal('new');
});
$('helpBtn').addEventListener('click',()=>openModal('help'));
$('soundBtn').addEventListener('click',()=>{
  soundOn=!soundOn||sound.failed;
  try{localStorage.setItem(SETTINGS_KEY,String(soundOn));}catch{}
  if(soundOn)play('clear');else sound.stop();
  updateHUD();
});
novaBtn.addEventListener('click',()=>{
  if(engine.state.novaTokens<1||engine.state.isGameOver||modalType)return;
  if(drag)stopDrag();
  preview=null;boardPointer=null;
  novaMode=!novaMode;
  selected=null;
  drawBoard();drawRack();updateHUD();
  checkBlockedBoard();
  if(novaMode)board.focus();
});
function restart() {
  modal.hidden=true;modalType=null;app.inert=false;
  $('levelBanner').classList.remove('show');
  inspectEnd=false;preview=null;engine.restart();selected=null;drag=null;novaMode=false;animation=null;
  persist();
  updateHUD();drawBoard();drawRack();
  scoreFloat('NYTT SPEL');
}
function modalButton(label,kind,fn) {
  const button=document.createElement('button');button.textContent=label;
  if(kind==='primary')button.classList.add('primary');
  button.addEventListener('click',fn);
  modalActions.append(button);
  return button;
}
function openModal(type) {
  if(modalType==='gameover'||modalType==='stuck')return;
  boardPointer=null;preview=null;
  if(drag)stopDrag();
  focusBeforeModal=document.activeElement;
  app.inert=true;
  modalType=type;
  modalActions.replaceChildren();
  const title=$('modalTitle');
  const kicker=$('modalKicker');
  let focusTarget;
  if(type==='help') {
    kicker.textContent='SÅ SPELAR DU';title.textContent='Enkelt att börja';
    modalBody.innerHTML=`<div class="instructions"><p><strong>1.</strong> Dra block från de tre rutorna till spelplanen. Du kan också välja ett block och trycka där du vill lägga det. Håll och glid för att lyfta blocket ovanför fingret. Släpp när det ligger rätt.</p><p><strong>2.</strong> Fyll en hel rad eller kolumn för att rensa den och få poäng. Efter flera rensade linjer stiger du i nivå, men alla andra block ligger kvar på spelplanen.</p><p><strong>3.</strong> Fyra rensade linjer ger en <strong>NOVA</strong>. Med den kan du ta bort en blockerande ruta. Du kan spara högst tre.</p><p>Om inga block får plats får du först möjlighet att använda NOVA. Om brädet fortfarande är låst när din sista NOVA är använd är omgången slut. Spelet sparas automatiskt.</p><p><small>Version 1.3.2</small></p><p><strong>På iPhone:</strong> öppna sidan i Safari, tryck på Dela och välj <em>Lägg till på hemskärmen</em> för att installera spelet.</p></div>`;
    focusTarget=modalButton('FORTSÄTT SPELA','primary',closeModal);
  }else if(type==='stuck') {
    kicker.textContent='INGA MÖJLIGA DRAG';title.textContent='Använd NOVA?';
    const tokens=engine.state.novaTokens;
    modalBody.textContent=`Inget av dina block får plats. Du har ${tokens} NOVA kvar. Ta bort en fylld ruta för att försöka skapa plats och fortsätta på nivå ${engine.state.level}.`;
    focusTarget=modalButton(`ANVÄND NOVA (${tokens})`,'primary',()=>{
      modal.hidden=true;modalType=null;app.inert=false;
      novaMode=true;selected=null;
      drawBoard();drawRack();updateHUD();
      board.focus();showToast('Välj en ifylld ruta att ta bort');
    });

  }else if(type==='new'){
    kicker.textContent='NY OMGÅNG';title.textContent='Börja om?';
    modalBody.textContent='Dina nuvarande poäng och din spelplan återställs. Ditt rekord behålls.';
    focusTarget=modalButton('JA, NYTT SPEL','primary',restart);
    modalButton('AVBRYT','secondary',closeModal);
  }else if(type==='gameover'){
    kicker.textContent='INGA MÖJLIGA DRAG';title.textContent='Omgången är slut';
    modalBody.innerHTML=`<div class="modal-points">${format.format(engine.state.score)}</div><p>Inget block får plats och du har ingen NOVA kvar. Ditt rekord är ${format.format(engine.state.bestScore)} poäng.</p><p>${engine.state.moves} drag · ${engine.state.totalLines} linjer · Bästa kombo ×${engine.state.maxCombo}</p>`;
    focusTarget=modalButton('NYTT SPEL','primary',restart);
    modalButton('VISA BRÄDET','secondary',()=>{
      inspectEnd=true;modal.hidden=true;modalType=null;app.inert=false;updateHUD();board.focus();
    });
  }
  modal.hidden=false;
  focusTarget?.focus();
}
function closeModal() {
  if(modalType==='gameover'||modalType==='stuck')return;
  modal.hidden=true;modalType=null;app.inert=false;
  if(focusBeforeModal?.focus)focusBeforeModal.focus();
  checkBlockedBoard();
}
modal.querySelector('.modal-backdrop').addEventListener('click',()=>{
  if(modalType!=='gameover'&&modalType!=='stuck')closeModal();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && modalType && modalType!=='gameover'&&modalType!=='stuck')closeModal();
});
window.addEventListener('resize',scheduleLayout);
if(window.visualViewport)window.visualViewport.addEventListener('resize',scheduleLayout);
if(navigator.locks)navigator.locks.request(SAVE_KEY,recoverInterruptedWrites).catch(()=>persist());
else recoverInterruptedWrites();
// Prevent accidental pan/pinch or browser overscroll on the game surface.
for(const el of [board,...racks])el.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
updateHUD();
requestAnimationFrame(()=>{layout();checkBlockedBoard();});
if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1')) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('Offline-cache kunde inte aktiveras:',err)));
}
