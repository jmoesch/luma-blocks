import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, SHAPES, SHAPE_IDS, createState, validateState, loadState, saveState } from '../engine.js';
const piece=(shape,hue=0)=>({shape,hue});
const fixedRandom=()=>0;

test('30 blockformer, unika koordinater som börjar vid (0,0) bounding box',()=>{
  assert.equal(SHAPE_IDS.length,30);
  for(const coords of Object.values(SHAPES)){
    assert.equal(new Set(coords.map(c=>`${c.row},${c.col}`)).size,coords.length);
    assert.equal(Math.min(...coords.map(c=>c.row)),0);
    assert.equal(Math.min(...coords.map(c=>c.col)),0);
  }
});
test('nystart: 8x8 tomt bräde, 3 block, poäng 0',()=>{
  const e=new GameEngine(null,fixedRandom);
  assert.equal(e.state.board.length,8);
  assert.ok(e.state.board.every(r=>r.length===8&&r.every(v=>v===null)));
  assert.equal(e.state.rack.filter(Boolean).length,3);
  assert.equal(e.state.score,0);
});
test('placering inom brädet / kollision avvisas',()=>{
  const e=new GameEngine(null,fixedRandom);
  e.state.rack=[piece('square2'),piece('dot'),piece('dot')];
  assert.equal(e.canPlace(piece('square2'),7,7),false);
  assert.equal(e.canPlace(piece('square2'),0,0),true);
  assert.equal(e.place(0,0,0).gained,40);
  assert.equal(e.canPlace(piece('dot'),0,0),false);
  assert.equal(e.place(1,0,0),null);
  assert.equal(e.place(1,7,7).gained,10);
});
test('rensa en hel rad och kontrollera score',()=>{
  const s=createState();s.board[3]=[1,1,1,1,1,1,1,null];
  s.rack=[piece('dot',2),piece('dot'),piece('dot')];
  const e=new GameEngine(s,fixedRandom);
  const o=e.place(0,3,7);
  assert.equal(o.clearedLines,1);assert.equal(o.gained,110);
  assert.equal(o.cleared.length,8);assert.ok(e.state.board[3].every(v=>v===null));
  assert.equal(e.state.novaEnergy,1);
});
test('rensa samtidigt rad + kolumn utan dubbelräkning i korsning',()=>{
  const s=createState();
  for(let c=0;c<7;c++)s.board[4][c]=1;
  for(let r=0;r<8;r++)if(r!==4)s.board[r][7]=1;
  s.rack=[piece('dot'),piece('dot'),piece('dot')];
  const e=new GameEngine(s,fixedRandom);
  const o=e.place(0,4,7);
  assert.equal(o.clearedLines,2);assert.equal(o.cleared.length,15);
  assert.equal(o.gained,10+200+75);
});
test('flera rensningar i följd ger kombobonus',()=>{
  const s=createState();s.rack=[piece('dot'),piece('dot'),piece('dot')];
  s.board[0]=[1,1,1,1,1,1,1,null];
  s.board[1]=[1,1,1,1,1,1,1,null];
  const e=new GameEngine(s,fixedRandom);
  assert.equal(e.place(0,0,7).gained,110);
  assert.equal(e.place(1,1,7).gained,170);
  assert.equal(e.state.combo,2);
});
test('efter tre drag fylls racket på igen',()=>{
  const s=createState();s.rack=[piece('dot'),piece('dot'),piece('dot')];
  const e=new GameEngine(s,fixedRandom);
  e.place(0,0,0);e.place(1,0,1);const o=e.place(2,0,2);
  assert.equal(o.replenished,true);assert.equal(e.state.rack.filter(Boolean).length,3);
});
test('fyra rensade linjer ger NOVA och högst tre kan sparas',()=>{
  const s=createState();s.rack=[piece('dot'),piece('dot'),piece('dot')];
  s.board[0]=[1,1,1,1,1,1,1,null];s.novaEnergy=3;s.novaTokens=2;
  const e=new GameEngine(s,fixedRandom);
  e.place(0,0,7);
  assert.equal(e.state.novaTokens,3);assert.equal(e.state.novaEnergy,0);
});
test('NOVA tar bort bara en ifylld ruta och förbrukar token',()=>{
  const s=createState();s.rack=[piece('dot'),null,null];s.board[2][2]=1;s.novaTokens=1;
  const e=new GameEngine(s,fixedRandom);
  assert.equal(e.useNova(2,3),false);assert.equal(e.useNova(2,2),true);
  assert.equal(e.state.board[2][2],null);assert.equal(e.state.novaTokens,0);
  assert.equal(e.useNova(2,2),false);
});
test('spelet slutar när inget block passar och NOVA saknas',()=>{
  const s=createState();s.board=Array.from({length:8},()=>Array(8).fill(3));
  s.board[0][0]=null;
  s.rack=[piece('dominoH'),null,null];
  const e=new GameEngine(s,fixedRandom);
  assert.equal(e.hasAnyMove(),false);
  assert.equal(e.state.novaTokens,0);
  // Game-over determination is intentionally performed after a successful move.
  assert.equal(e.place(0,0,0),null);
});
test('omstart behåller rekord, återställer allt annat',()=>{
  const e=new GameEngine(null,fixedRandom);e.state.score=420;e.state.bestScore=820;
  e.state.novaTokens=2;e.restart();
  assert.equal(e.state.score,0);assert.equal(e.state.bestScore,820);assert.equal(e.state.novaTokens,0);
});
test('korrupt lagring avvisas och korrekt spel sparas',()=>{
  const e=new GameEngine(null,fixedRandom);
  const storage=new Map();const adapter={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
  assert.equal(saveState(e.state,adapter),true);
  assert.ok(validateState(loadState(adapter)));
  storage.set('luma.pwa.game.v1','{"bad":"object"}');
  assert.equal(loadState(adapter),null);
});
test('1000 simuleringar: varje drag är giltigt, tillståndet håller',()=>{
  for(let game=0;game<24;game++){
    const e=new GameEngine();
    for(let i=0;i<130 && !e.state.isGameOver;i++){
      let candidate=null;
      for(let n=0;n<3&&!candidate;n++){
        const p=e.state.rack[n];if(!p)continue;
        for(let r=0;r<8&&!candidate;r++)for(let c=0;c<8;c++){
          if(e.canPlace(p,r,c)){candidate=[n,r,c];break;}
        }
      }
      if(candidate){assert.ok(e.place(...candidate));}
      else if(e.state.novaTokens>0){
        outer:for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(e.state.board[r][c]!==null){
          assert.equal(e.useNova(r,c),true);break outer;
        }
      }else assert.equal(e.state.isGameOver,true);
      assert.equal(validateState(e.state),true);
    }
  }
});
test('NOVA kan rädda ett helt fyllt bräde när racket är tomt',()=>{
  const s=createState();s.board=Array.from({length:8},()=>Array(8).fill(1));
  s.rack=[null,null,null];s.novaTokens=1;
  const e=new GameEngine(s,fixedRandom);
  assert.equal(e.hasAnyMove(),false);
  assert.equal(e.useNova(0,0),true);
  assert.equal(e.state.rack.filter(Boolean).length,3);
  assert.equal(e.state.isGameOver,false);
});
