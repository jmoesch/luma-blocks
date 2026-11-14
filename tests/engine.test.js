import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, SHAPES, SHAPE_IDS, createState, validateState, loadState, saveState, linesNeeded } from '../engine.js';
const piece=(shape,hue=0)=>({shape,hue});
const fixedRandom=()=>0;
const testEngine=(s)=>new GameEngine(s,fixedRandom);
const diagonalGapBoard=()=>Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>r===c?null:1));

test('30 olika blockformer med unika koordinater',()=>{
  assert.equal(SHAPE_IDS.length,30);
  for(const coords of Object.values(SHAPES)){
    assert.equal(new Set(coords.map(c=>`${c.row},${c.col}`)).size,coords.length);
    assert.equal(Math.min(...coords.map(c=>c.row)),0);
    assert.equal(Math.min(...coords.map(c=>c.col)),0);
  }
});
test('nytt spel börjar på nivå 1 med tre block',()=>{
  const e=new GameEngine(null,fixedRandom);
  assert.ok(e.state.board.every(r=>r.length===8&&r.every(v=>v===null)));
  assert.equal(e.state.rack.filter(Boolean).length,3);
  assert.equal(e.state.score,0);
  assert.equal(e.state.level,1);
  assert.equal(linesNeeded(1),5);
  assert.equal(linesNeeded(2),7);
  assert.equal(linesNeeded(6),15);
});
test('felaktig placering nekas och poäng ges bara för giltiga block',()=>{
  const s=createState();s.rack=[piece('square2'),piece('dot'),piece('dot')];
  const e=testEngine(s);
  assert.equal(e.canPlace(piece('square2'),7,7),false);
  assert.equal(e.place(0,0,0).gained,40);
  assert.equal(e.place(1,0,0),null);
  assert.equal(e.place(1,7,7).gained,10);
});
test('en rad rensas och ger poäng men INTE ny nivå eller tom spelplan',()=>{
  const s=createState();s.board[3]=[1,1,1,1,1,1,1,null];s.rack=[piece('dot',2),piece('dot'),piece('dot')];
  s.board[2][0]=4;
  const e=testEngine(s);
  const o=e.place(0,3,7);
  assert.equal(o.clearedLines,1);
  assert.equal(o.levelUp,false);
  assert.equal(o.toLevel,1);
  assert.equal(o.gained,110);
  assert.equal(e.state.score,110);
  assert.ok(e.state.board[3].every(v=>v===null));
  assert.equal(e.state.board[2][0],4,'ett block utanför full rad MÅSTE ligga kvar');
  assert.equal(e.state.levelLines,1);
  assert.equal(e.state.totalLines,1);
  assert.equal(e.state.rack.filter(Boolean).length,2);
});
test('nivåuppgång efter fem rensade linjer bevarar ALLA andra block och racket',()=>{
  const s=createState();s.levelLines=4;
  s.board[3]=[1,1,1,1,1,1,1,null];s.board[2][0]=4;
  s.rack=[piece('dot',2),piece('square2'),piece('bar3H')];
  const e=testEngine(s),o=e.place(0,3,7);
  assert.equal(o.levelUp,true);
  assert.equal(o.toLevel,2);
  assert.equal(e.state.level,2);
  assert.equal(e.state.levelLines,0);
  assert.equal(o.gained,360);
  assert.equal(e.state.board[2][0],4,'nivåbyte får ALDRIG tömma befintlig spelplan');
  assert.ok(e.state.board[3].every(v=>v===null));
  assert.equal(e.state.rack[1].shape,'square2','oanvänt block måste vara kvar');
  assert.equal(e.state.rack[2].shape,'bar3H');
});
test('rad och kolumn rensas samtidigt, korsning räknas bara en gång',()=>{
  const s=createState();s.level=3;
  for(let c=0;c<7;c++)s.board[4][c]=1;
  for(let r=0;r<8;r++)if(r!==4)s.board[r][7]=1;
  s.rack=[piece('dot'),piece('dot'),piece('dot')];
  const e=testEngine(s),o=e.place(0,4,7);
  assert.equal(o.clearedLines,2);
  assert.equal(o.cleared.length,15);
  assert.equal(o.gained,285);
  assert.equal(e.state.levelLines,2);
  assert.ok(e.state.board[4].every(v=>v===null));
  assert.ok(e.state.board.every(row=>row[7]===null));
});
test('rensningar i följd ger kombobonus före nästa nivå',()=>{
  const s=createState();s.level=4;s.rack=[piece('dot'),piece('dot'),piece('dot')];
  s.board[0]=[1,1,1,1,1,1,1,null];s.board[1]=[1,1,1,1,1,1,1,null];
  const e=testEngine(s);
  assert.equal(e.place(0,0,7).gained,110);
  assert.equal(e.place(1,1,7).gained,170);
  assert.equal(e.state.combo,2);
});
test('efter tre drag fylls racket på igen',()=>{
  const s=createState();s.rack=[piece('dot'),piece('dot'),piece('dot')];
  const e=testEngine(s);
  e.place(0,0,0);e.place(1,0,1);const o=e.place(2,0,2);
  assert.equal(o.replenished,true);
  assert.equal(e.state.rack.filter(Boolean).length,3);
});
test('fyra rensade linjer ger NOVA och högst tre sparas',()=>{
  const s=createState();s.level=4;s.rack=[piece('dot'),piece('dot'),piece('dot')];
  s.board[0]=[1,1,1,1,1,1,1,null];s.novaEnergy=3;s.novaTokens=2;
  const e=testEngine(s);
  e.place(0,0,7);
  assert.equal(e.state.novaTokens,3);
  assert.equal(e.state.novaEnergy,0);
});
test('NOVA tar bort exakt en ifylld ruta och konsumerar en token',()=>{
  const s=createState();s.rack=[piece('dot'),null,null];s.board[2][2]=1;s.novaTokens=1;
  const e=testEngine(s);
  assert.equal(e.useNova(2,3),false);
  assert.equal(e.useNova(2,2),true);
  assert.equal(e.state.board[2][2],null);
  assert.equal(e.state.novaTokens,0);
  assert.equal(e.useNova(2,2),false);
});
test('inget block får plats + NOVA => varning behövs, ingen game over',()=>{
  const s=createState();s.board=diagonalGapBoard();s.rack=[piece('dominoH'),null,null];s.novaTokens=1;
  const e=testEngine(s);
  assert.equal(e.hasAnyMove(),false);
  const status=e.checkStuck();
  assert.equal(status.needsNova,true);
  assert.equal(status.gameOver,false);
  assert.equal(e.state.isGameOver,false);
});
test('NOVA ger ett nytt möjligt drag genom att öppna rätt ruta',()=>{
  const s=createState();s.board=diagonalGapBoard();s.rack=[piece('dominoH'),null,null];s.novaTokens=1;
  const e=testEngine(s);
  assert.equal(e.hasAnyMove(),false);
  assert.equal(e.useNova(0,1),true);
  assert.equal(e.state.novaTokens,0);
  assert.equal(e.hasAnyMove(),true);
  assert.equal(e.state.isGameOver,false);
  assert.ok(e.place(0,0,0));
});
test('låst bräde utan NOVA avslutar omgången även efter omladdning',()=>{
  const s=createState();s.board=diagonalGapBoard();s.rack=[piece('square3'),null,null];
  s.level=3;s.levelLines=2;s.score=735;s.bestScore=900;s.novaTokens=1;
  const e=testEngine(s);
  assert.equal(e.checkStuck().needsNova,true);
  assert.ok(e.useNova(0,1));
  for(const game of [e,testEngine(e.state)]){
    assert.equal(game.state.isGameOver,true);
    assert.equal(game.state.level,3);
    assert.equal(game.state.levelLines,2);
    assert.equal(game.state.score,735);
    assert.equal(game.state.bestScore,900);
    assert.equal(game.place(0,0,0),null);
  }
});
test('NOVA som inte öppnar ett drag kan ge förnyad varning om token finns',()=>{
  const s=createState();s.board=diagonalGapBoard();s.rack=[piece('square3'),null,null];s.novaTokens=2;
  const e=testEngine(s);
  assert.equal(e.useNova(0,1),true);
  assert.equal(e.checkStuck().needsNova,true);
  assert.equal(e.state.novaTokens,1);
  assert.equal(e.state.isGameOver,false);
});
test('tomt blockställ vid återläsning fylls utan att förbruka NOVA eller byta nivå',()=>{
  for(const tokens of [0,1]){
    const s=createState();s.board=diagonalGapBoard();s.novaTokens=tokens;
    const e=testEngine(s);
    assert.equal(e.hasAnyMove(),true);
    assert.equal(e.state.rack.filter(Boolean).length,3);
    assert.equal(e.state.novaTokens,tokens);
    assert.equal(e.state.level,1);
    assert.deepEqual(e.state.board,s.board);
  }
});
test('NOVA-belöning räknas vid dubbelrensning och respekterar taket',()=>{
  for(const tokens of [0,2,3]){
    const s=createState();s.novaEnergy=3;s.novaTokens=tokens;
    s.rack=[piece('dot'),null,null];
    for(let i=1;i<8;i++){s.board[i][0]=1;s.board[0][i]=2;}
    const e=testEngine(s),outcome=e.place(0,0,0);
    assert.equal(outcome.novaEarned,tokens===3?0:1);
    assert.equal(e.state.novaEnergy,1);
    assert.equal(e.state.novaTokens,Math.min(3,tokens+1));
  }
});
test('gammal v1.1-lagring migreras utan att poäng och bräde tappas',()=>{
  const s=createState();delete s.level;delete s.levelLines;delete s.totalLines;delete s.rescuesUsed;
  s.score=360;s.bestScore=360;s.board[1][2]=3;s.rack=[piece('dot'),null,null];
  const e=testEngine(s);
  assert.equal(e.state.level,1);
  assert.equal(e.state.score,360);
  assert.equal(e.state.board[1][2],3);
  assert.equal(e.state.bestScore,360);
});
test('omstart behåller rekord men återställer nivå, poäng och NOVA',()=>{
  const e=new GameEngine(null,fixedRandom);e.state.score=420;e.state.bestScore=820;
  e.state.novaTokens=2;e.state.level=4;e.restart();
  assert.equal(e.state.score,0);assert.equal(e.state.bestScore,820);
  assert.equal(e.state.novaTokens,0);assert.equal(e.state.level,1);
});
test('sparning och korrupt data',()=>{
  const e=new GameEngine(null,fixedRandom);
  const storage=new Map(),adapter={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
  assert.equal(saveState(e.state,adapter),true);
  assert.ok(validateState(loadState(adapter)));
  storage.set('luma.pwa.game.v1','{"bad":"object"}');
  assert.equal(loadState(adapter),null);
});
test('slumpmässiga spel håller alltid giltigt tillstånd',()=>{
  for(let game=0;game<24;game++){
    const e=new GameEngine();
    for(let i=0;i<130 && !e.state.isGameOver;i++){
      let candidate=null;
      for(let n=0;n<3&&!candidate;n++){
        const p=e.state.rack[n];if(!p)continue;
        for(let r=0;r<8&&!candidate;r++)for(let c=0;c<8;c++)if(e.canPlace(p,r,c)) {candidate=[n,r,c];break;}
      }
      if(candidate)assert.ok(e.place(...candidate));
      else if(e.state.novaTokens>0){
        outer:for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(e.state.board[r][c]!==null){
          assert.equal(e.useNova(r,c),true);break outer;
        }
      }else {
        assert.equal(e.checkStuck().gameOver,true);
      }
      assert.equal(validateState(e.state),true);
    }
  }
});
