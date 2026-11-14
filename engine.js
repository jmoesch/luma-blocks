/**
 * Luma Blocks v1.2.3 — deterministic puzzle and non-destructive level progression.
 * No dependencies on the DOM; testable using Node.js.
 */
export const SIDE = 8;
export const HUES = 6;
// Keep the original key so that previous users do not lose their scores or boards.
export const SAVE_KEY = 'luma.pwa.game.v1';
export const SETTINGS_KEY = 'luma.pwa.sound.v1';

const XY = list => list.map(([row,col]) => ({row,col}));
const rectangle = (w,h) => {
  const cells=[];
  for(let r=0;r<h;r++) for(let c=0;c<w;c++) cells.push([r,c]);
  return XY(cells);
};
export const SHAPES = Object.freeze({
  dot:XY([[0,0]]),
  dominoH:XY([[0,0],[0,1]]), dominoV:XY([[0,0],[1,0]]),
  bar3H:XY([[0,0],[0,1],[0,2]]), bar3V:XY([[0,0],[1,0],[2,0]]),
  bar4H:XY([[0,0],[0,1],[0,2],[0,3]]), bar4V:XY([[0,0],[1,0],[2,0],[3,0]]),
  square2:rectangle(2,2), square3:rectangle(3,3),
  l3TL:XY([[0,0],[1,0],[1,1]]), l3TR:XY([[0,1],[1,0],[1,1]]),
  l3BL:XY([[0,0],[0,1],[1,0]]), l3BR:XY([[0,0],[0,1],[1,1]]),
  l4TL:XY([[0,0],[1,0],[2,0],[2,1]]), l4TR:XY([[0,1],[1,1],[2,0],[2,1]]),
  l4BL:XY([[0,0],[0,1],[1,0],[2,0]]), l4BR:XY([[0,0],[0,1],[1,1],[2,1]]),
  teeUp:XY([[0,0],[0,1],[0,2],[1,1]]), teeDown:XY([[0,1],[1,0],[1,1],[1,2]]),
  teeLeft:XY([[0,0],[1,0],[1,1],[2,0]]), teeRight:XY([[0,1],[1,0],[1,1],[2,1]]),
  zigH:XY([[0,0],[0,1],[1,1],[1,2]]), zagH:XY([[0,1],[0,2],[1,0],[1,1]]),
  zigV:XY([[0,1],[1,0],[1,1],[2,0]]), zagV:XY([[0,0],[1,0],[1,1],[2,1]]),
  corner5TL:XY([[0,0],[0,1],[0,2],[1,0],[2,0]]),
  corner5TR:XY([[0,0],[0,1],[0,2],[1,2],[2,2]]),
  corner5BL:XY([[0,0],[1,0],[2,0],[2,1],[2,2]]),
  corner5BR:XY([[0,2],[1,2],[2,0],[2,1],[2,2]]),
  plus5:XY([[0,1],[1,0],[1,1],[1,2],[2,1]])
});
export const SHAPE_IDS=Object.keys(SHAPES);
export function dims(piece) {
  const cells=SHAPES[piece.shape] || [];
  return {rows:1+Math.max(0,...cells.map(t=>t.row)),cols:1+Math.max(0,...cells.map(t=>t.col))};
}
// A level requires several cleared lines, not a single line.
// Level-ups never erase other occupied cells.
export const linesNeeded=level=>Math.min(15, 3 + Math.max(1,level)*2);
const blankBoard=()=>Array.from({length:SIDE},()=>Array(SIDE).fill(null));

export function createState(bestScore=0) {
  return {
    board:blankBoard(),rack:[null,null,null],score:0,bestScore,
    combo:0,maxCombo:0,moves:0,novaEnergy:0,novaTokens:0,isGameOver:false,
    level:1,levelLines:0,totalLines:0
  };
}
export function validateState(s) {
  return !!s&&typeof s==='object'
    &&Array.isArray(s.board)&&s.board.length===SIDE
    &&s.board.every(row=>Array.isArray(row)&&row.length===SIDE&&row.every(v=>v===null||(Number.isInteger(v)&&v>=0&&v<HUES)))
    &&Array.isArray(s.rack)&&s.rack.length===3
    &&s.rack.every(p=>p===null||(typeof p==='object'&&Object.hasOwn(SHAPES,p.shape)&&Number.isInteger(p.hue)&&p.hue>=0&&p.hue<HUES))
    &&['score','bestScore','combo','maxCombo','moves','novaEnergy','novaTokens','level','levelLines','totalLines'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)
    &&s.level>=1&&s.levelLines<linesNeeded(s.level)&&s.novaEnergy<4&&s.novaTokens<=3
    &&typeof s.isGameOver==='boolean';
}
function migrateSaved(saved) {
  if(!saved||typeof saved!=='object')return null;
  // Accept games from v1.1.0, upgrading them in place while preserving the board and score.
  const s={...saved,level:saved.level??1,levelLines:saved.levelLines??0,
    totalLines:saved.totalLines??0};
  return validateState(s)?s:null;
}
function findFilledLines(board) {
  const fullRows=Array.from({length:SIDE},(_,i)=>i).filter(r=>board[r].every(v=>v!==null));
  const fullCols=Array.from({length:SIDE},(_,i)=>i).filter(c=>board.every(row=>row[c]!==null));
  const unique=new Set();
  fullRows.forEach(r=>{for(let c=0;c<SIDE;c++)unique.add(`${r},${c}`);});
  fullCols.forEach(c=>{for(let r=0;r<SIDE;r++)unique.add(`${r},${c}`);});
  const cleared=[...unique].map(s=>{const [row,col]=s.split(',').map(Number);return {row,col};});
  return {cleared,lines:fullRows.length+fullCols.length};
}
export class GameEngine {
  constructor(saved=null,random=Math.random) {
    this.random=random;
    const restored=migrateSaved(saved);
    if(restored) {
      this.state=structuredClone(restored);
      this.repairLegacyLines();
      // In v1.2.3 a blocked board is recoverable: NOVA or the next level.
      // Previous saved game-over flags must not lock the player out.
      this.state.isGameOver=false;
      if(this.state.rack.every(piece=>piece===null))this.refillRack();
    } else {this.state=createState();this.refillRack();}
  }
  restart() {this.state=createState(this.state.bestScore);this.refillRack();}
  canPlace(piece,row,col) {
    if(!piece||!Object.hasOwn(SHAPES,piece.shape)||!Number.isInteger(row)||!Number.isInteger(col))return false;
    return SHAPES[piece.shape].every(t=>{
      const r=row+t.row,c=col+t.col;
      return r>=0&&c>=0&&r<SIDE&&c<SIDE&&this.state.board[r][c]===null;
    });
  }
  anyPlacement(piece) {
    for(let r=0;r<SIDE;r++)for(let c=0;c<SIDE;c++)if(this.canPlace(piece,r,c))return true;
    return false;
  }
  hasAnyMove() {return this.state.rack.some(p=>p!==null&&this.anyPlacement(p));}
  availableShapes() {return SHAPE_IDS.filter(shape=>this.anyPlacement({shape,hue:0}));}
  randomChoice(array) {return array[Math.min(array.length-1,Math.floor(this.random()*array.length))];}
  refillRack() {
    const available=this.availableShapes();
    if(!available.length){
      this.state.rack=[null,null,null];
      this.checkStuck();
      return false;
    }
    // A guaranteed small piece avoids three simultaneously impossible large pieces.
    const small=available.filter(shape=>SHAPES[shape].length<=3);
    const chosen=[this.randomChoice(small.length?small:available),this.randomChoice(available),this.randomChoice(available)];
    this.state.rack=chosen.map(shape=>({shape,hue:Math.min(HUES-1,Math.floor(this.random()*HUES))}));
    this.state.isGameOver=false;
    return true;
  }
  // No automatic replacement of awkward pieces. Instead, pause and offer NOVA
  // when no offered piece fits. The UI reads needsNova after every move.
  checkStuck() {
    const blocked=!this.hasAnyMove();
    // Do not end the whole game on a blocked board. Offer NOVA first; if
    // unavailable, the player can continue with a new level and keep points.
    this.state.isGameOver=false;
    return {gameOver:false,needsNova:blocked&&this.state.novaTokens>0,
      readyForNextLevel:blocked&&this.state.novaTokens===0};
  }
  repairLegacyLines() {
    const s=this.state,{cleared,lines}=findFilledLines(s.board);
    if(!lines)return;
    cleared.forEach(t=>{s.board[t.row][t.col]=null;});
    // A completely full line may have persisted from a broken earlier version.
    // Credit those lines rather than silently discard the user's progress.
    s.score+=lines*100;
    s.bestScore=Math.max(s.bestScore,s.score);
    s.totalLines+=lines;
    s.levelLines+=lines;
    while(s.levelLines>=linesNeeded(s.level)){
      s.levelLines-=linesNeeded(s.level);
      s.level++;
      // Never wipe the remaining board just because a line was repaired.
      // All other blocks remain exactly where they were.
    }
  }
  place(index,row,col) {
    const s=this.state;
    if(s.isGameOver||!Number.isInteger(index)||index<0||index>2||!s.rack[index]||!this.canPlace(s.rack[index],row,col))return null;
    const piece=s.rack[index];
    const placed=SHAPES[piece.shape].map(t=>({row:row+t.row,col:col+t.col}));
    placed.forEach(t=>{s.board[t.row][t.col]=piece.hue;});
    s.rack[index]=null;
    const {cleared,lines}=findFilledLines(s.board);
    const clearedHues=cleared.map(t=>s.board[t.row][t.col]);
    cleared.forEach(t=>{s.board[t.row][t.col]=null;});
    s.combo=lines>0?s.combo+1:0;
    s.maxCombo=Math.max(s.maxCombo,s.combo);
    const lineBonus=lines===0?0:lines*100+Math.max(0,lines-1)*75;
    const comboBonus=lines>0?Math.max(0,s.combo-1)*60:0;
    let gained=placed.length*10+lineBonus+comboBonus;
    s.moves++;
    s.totalLines+=lines;
    s.levelLines+=lines;
    const previousTokens=s.novaTokens;
    s.novaEnergy+=lines;
    while(s.novaEnergy>=4){s.novaEnergy-=4;s.novaTokens=Math.min(3,s.novaTokens+1);}
    const fromLevel=s.level;
    let levelUp=false;
    while(s.levelLines>=linesNeeded(s.level)){
      s.levelLines-=linesNeeded(s.level);
      gained+=250*s.level; // Clear level objective reward.
      s.level++;
      levelUp=true;
    }
    s.score+=gained;
    s.bestScore=Math.max(s.bestScore,s.score);
    let replenished=false;
    // A milestone changes level and awards points, but it does not wipe
    // the rest of the board or replace unused offered pieces.
    if(s.rack.every(p=>p===null))replenished=this.refillRack();
    const {gameOver,needsNova,readyForNextLevel}=this.checkStuck();
    return {placed,cleared,clearedHues,clearedLines:lines,gained,
      novaEarned:s.novaTokens-previousTokens,combo:s.combo,levelUp,fromLevel,toLevel:s.level,
      gameOver,needsNova,readyForNextLevel,replenished};
  }
  /**
   * Player has run out of legal placements. NOVA remains the preferred rescue.
   * Moving on explicitly starts a fresh board while keeping total points,
   * record and unused NOVA. This is the ONLY routine that clears a board
   * for level progression.
   */
  advanceBlockedLevel() {
    const s=this.state;
    if(this.hasAnyMove())return false;
    const previousLevel=s.level;
    s.level++;
    s.levelLines=0;
    s.board=blankBoard();
    s.combo=0;
    s.isGameOver=false;
    this.refillRack();
    return {fromLevel:previousLevel,toLevel:s.level};
  }
  useNova(row,col) {
    const s=this.state;
    if(s.isGameOver||s.novaTokens<1||!Number.isInteger(row)||!Number.isInteger(col)
      ||row<0||row>=SIDE||col<0||col>=SIDE||s.board[row][col]===null)return false;
    s.board[row][col]=null;
    s.novaTokens--;
    s.combo=0;
    if(s.rack.every(p=>p===null))this.refillRack();
    this.checkStuck();
    return true;
  }
}
export function loadState(storage) {
  try{const raw=(storage??globalThis.localStorage).getItem(SAVE_KEY);return raw?migrateSaved(JSON.parse(raw)):null;}catch{return null;}
}
export function saveState(state,storage) {
  try{(storage??globalThis.localStorage).setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}
}
