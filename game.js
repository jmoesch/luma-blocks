import { GameEngine, SHAPES, dims, SIDE, loadState, saveState, linesNeeded, SETTINGS_KEY } from './engine.js?v=1.2.4';

const $=id=>document.getElementById(id);
const app=$('app'), board=$('board'), boardStack=$('boardStack'), boardArea=document.querySelector('.game-area');
const ghost=$('ghost'), scoreEl=$('score'), bestEl=$('best'), guide=$('guideText');
const racks=[...document.querySelectorAll('.piece-slot')];
const novaBtn=$('novaBtn'), novaBars=[...document.querySelectorAll('#novaBars i')];
const modal=$('modal'), modalBody=$('modalBody'), modalActions=$('modalActions');
const noSound=(()=>{try{return localStorage.getItem(SETTINGS_KEY)==='false';}catch{return false;}})();
const engine=new GameEngine(loadState());
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
import { createGameAudio } from './audio.js?v=1.2.4';
const sound=createGameAudio(window);
function unlockSound(){if(soundOn)sound.unlock();}
for(const event of ['pointerdown','pointerup','touchend','keydown']){
  document.addEventListener(event,unlockSound,{capture:true,passive:true});
}
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')unlockSound();
});

function rounded(ctx,x,y,w,h,r) {
  ctx.beginPath();ctx.roundRect(x,y,Math.max(0,w),Math.max(0,h),Math.min(r,Math.max(0,w)/2,Math.max(0,h)/2));
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
  for(let i=0;i<3;i++) {
    const slot=racks[i],cv=slot.querySelector('canvas'),piece=engine.state.rack[i];
    slot.classList.toggle('empty',!piece);
    slot.classList.toggle('selected',selected===i&&!!piece);
    slot.classList.toggle('dragging',drag?.index===i&&drag.moved);
    slot.disabled=!!engine.state.isGameOver||!piece;
    slot.setAttribute('aria-label',piece?`Block ${i+1}, ${SHAPES[piece.shape].length} rutor`:`Block ${i+1} är använt`);
    const rect=cv.getBoundingClientRect();
    const w=rect.width,h=rect.height;
    if(w<1||h<1)continue;
    const ctx=prepareCanvas(cv,w,h);
    if(!piece)continue;
    const d=dims(piece),p=Math.min(25.5,(w-8)/d.cols,(h-6)/d.rows);
    const x0=(w-d.cols*p)/2,y0=(h-d.rows*p)/2;
    for(const t of SHAPES[piece.shape])drawBlock(ctx,x0+t.col*p,y0+t.row*p,p,piece.hue);
  }
}
function updateHUD({pop=false}={}) {
  const s=engine.state;
  scoreEl.textContent=format.format(s.score);
  bestEl.textContent=format.format(s.bestScore);
  if(pop){scoreEl.classList.remove('pop');void scoreEl.offsetWidth;scoreEl.classList.add('pop');}
  $('novaProgress').textContent=`${s.novaEnergy} / 4`;
  novaBars.forEach((bar,i)=>bar.classList.toggle('on',i<s.novaEnergy));
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
  guide.textContent=novaMode?'VÄLJ EN RUTA ATT TA BORT': selected!==null?'TRYCK PÅ RUTNÄTET ELLER DRA':'DRA ETT BLOCK TILL RUTNÄTET';
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
  selected=null;novaMode=false;
  saveState(engine.state);
  updateHUD({pop:true});
  drawRack();drawBoard();
  if(outcome.clearedLines){
    play('clear');startClearAnimation(outcome);
    scoreFloat(outcome.combo>1?`KOMBO ×${outcome.combo} · +${outcome.gained}`:`+${outcome.gained}`);
    if(outcome.novaEarned>0)showToast('✦ NOVA uppladdad!');
  }else play('place');
  if(outcome.levelUp)showLevelBanner(outcome.toLevel);
  // On a blocked board show NOVA before offering a fresh level.
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
  if(modalType || novaMode || engine.hasAnyMove())return;
  if(engine.state.novaTokens>0)openModal('stuck');
  else openModal('gameover');
}
function selectPiece(index) {
  if(novaMode){novaMode=false;}
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
    if(modalType||engine.state.isGameOver||novaMode||drag)return;
    const index=Number(slot.dataset.index),piece=engine.state.rack[index];
    if(!piece)return;
    e.preventDefault();
    slot.setPointerCapture(e.pointerId);
    drag={index,piece,pointerId:e.pointerId,pointerType:e.pointerType,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,moved:false,origin:null,valid:false};
  });
  slot.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.pointerId)return;
    const distance=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY);
    if(!drag.moved && distance<7)return;
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
    if(e.detail===0&&!modalType&&!novaMode&&!engine.state.isGameOver)selectPiece(Number(slot.dataset.index));
  });
}
board.addEventListener('pointerdown',e=>{
  if(modalType||engine.state.isGameOver||drag)return;
  e.preventDefault();
  const target=boardCell(e.clientX,e.clientY);
  if(!target)return;
  if(novaMode){
    if(engine.useNova(target.row,target.col)){
      novaMode=false;saveState(engine.state);play('clear');scoreFloat('✦ NOVA');
      updateHUD();drawBoard();drawRack();
      setTimeout(checkBlockedBoard,250);
    }else showToast('Välj en fylld ruta');
    return;
  }
  if(selected!==null){
    const piece=engine.state.rack[selected];
    if(!piece){selected=null;return;}
    const d=dims(piece),row=target.row-Math.floor((d.rows-1)/2),col=target.col-Math.floor((d.cols-1)/2);
    const outcome=engine.place(selected,row,col);
    if(outcome)afterMove(outcome);else showToast('Blocket får inte plats där');
  }else showToast('Välj ett block längst ned');
});
$('newBtn').addEventListener('click',()=>{
  if(engine.state.isGameOver)restart();else openModal('new');
});
$('helpBtn').addEventListener('click',()=>openModal('help'));
$('soundBtn').addEventListener('click',()=>{
  soundOn=!soundOn;
  try{localStorage.setItem(SETTINGS_KEY,String(soundOn));}catch{}
  if(soundOn)play('place');updateHUD();
});
novaBtn.addEventListener('click',()=>{
  if(engine.state.novaTokens<1||engine.state.isGameOver||modalType)return;
  if(drag)stopDrag();
  novaMode=!novaMode;
  selected=null;
  drawBoard();drawRack();updateHUD();
  checkBlockedBoard();
});
function restart() {
  modal.hidden=true;modalType=null;app.inert=false;
  $('levelBanner').classList.remove('show');
  engine.restart();selected=null;drag=null;novaMode=false;animation=null;
  saveState(engine.state);
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
    modalBody.innerHTML=`<div class="instructions"><p><strong>1.</strong> Dra block från de tre rutorna till spelplanen. Du kan även trycka på ett block och sedan på rutnätet.</p><p><strong>2.</strong> Fyll en hel rad eller kolumn för att rensa den och få poäng. Efter flera rensade linjer stiger du i nivå, men alla andra block ligger kvar på spelplanen.</p><p><strong>3.</strong> Fyra rensade linjer ger en <strong>NOVA</strong>. Med den kan du ta bort en blockerande ruta. Du kan spara högst tre.</p><p>Om inga block får plats får du först möjlighet att använda NOVA. Om brädet fortfarande är låst när din sista NOVA är använd är omgången slut. Spelet sparas automatiskt.</p><p><small>Version 1.2.4</small></p><p><strong>På iPhone:</strong> öppna sidan i Safari, tryck på Dela och välj <em>Lägg till på hemskärmen</em> för att installera spelet.</p></div>`;
    focusTarget=modalButton('FORTSÄTT SPELA','primary',closeModal);
  }else if(type==='stuck') {
    kicker.textContent='INGA MÖJLIGA DRAG';title.textContent='Använd NOVA?';
    const tokens=engine.state.novaTokens;
    modalBody.textContent=`Inget av dina block får plats. Du har ${tokens} NOVA kvar. Ta bort en fylld ruta för att försöka skapa plats och fortsätta på nivå ${engine.state.level}.`;
    focusTarget=modalButton(`ANVÄND NOVA (${tokens})`,'primary',()=>{
      modal.hidden=true;modalType=null;app.inert=false;
      novaMode=true;selected=null;
      drawBoard();drawRack();updateHUD();
      showToast('Välj en ifylld ruta att ta bort');
    });

  }else if(type==='new'){
    kicker.textContent='NY OMGÅNG';title.textContent='Börja om?';
    modalBody.textContent='Dina nuvarande poäng och din spelplan återställs. Ditt rekord behålls.';
    focusTarget=modalButton('JA, NYTT SPEL','primary',restart);
    modalButton('AVBRYT','secondary',closeModal);
  }else if(type==='gameover'){
    kicker.textContent='INGA MÖJLIGA DRAG';title.textContent='Omgången är slut';
    modalBody.innerHTML=`<div class="modal-points">${format.format(engine.state.score)}</div><p>Inget block får plats och du har ingen NOVA kvar. Ditt rekord är ${format.format(engine.state.bestScore)} poäng.</p>`;
    focusTarget=modalButton('NYTT SPEL','primary',restart);
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
// Moves save immediately. Closing an older tab must not overwrite a newer game.
saveState(engine.state);
// Prevent accidental pan/pinch or browser overscroll on the game surface.
for(const el of [board,...racks])el.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
updateHUD();
requestAnimationFrame(()=>{layout();checkBlockedBoard();});
if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1')) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('Offline-cache kunde inte aktiveras:',err)));
}
