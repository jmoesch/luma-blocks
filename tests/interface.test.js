import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, SAVE_KEY} from '../engine.js';

// Exercise the actual UI event handlers with a minimal DOM and a controlled clock.
async function withUI(run){
  const timers=[];
  class Element extends EventTarget {
    style={}; dataset={}; classList={toggle(){},add(){},remove(){}};
    children=[];
    querySelector(){return new Element();}
    getBoundingClientRect(){return {width:320,height:320,left:0,top:0,right:320,bottom:320};}
    getContext(){return new Proxy({}, {get:(_,k)=>k==='createLinearGradient'?
      ()=>({addColorStop(){}}):()=>{}});}
    pause(){} play(){return Promise.resolve();}
    setAttribute(){} focus(){this.fire('focus');} setPointerCapture(){}
    replaceChildren(){this.children=[];} append(el){this.children.push(el);}
    fire(type,props={}){this.dispatchEvent(Object.assign(new Event(type),props));}
  }
  const ids=new Map();
  const id=k=>{if(!ids.has(k))ids.set(k,new Element());return ids.get(k);};
  const slots=Array.from({length:3},(_,index)=>Object.assign(new Element(),{dataset:{index}}));
  const doc=Object.assign(new Element(),{getElementById:id,querySelector:id,
    querySelectorAll:k=>k==='.piece-slot'?slots:[],createElement:()=>new Element()});
  const data=new Map(), frames=[];
  const overrides={window:new Element(),document:doc,Audio:Element,navigator:{},
    localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i],get length(){return data.size;}},
    requestAnimationFrame:f=>frames.push(f),cancelAnimationFrame(){},
    setTimeout:(f,ms)=>timers.push({f,ms}),clearTimeout(){}};
  const original=new Map();
  try{
    for(const [k,v] of Object.entries(overrides)){
      original.set(k,Object.getOwnPropertyDescriptor(globalThis,k));
      Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
    }
    await run({data,id,slots,frames,timers,doc});
  }finally{
    for(const [k,desc] of original){
      if(desc)Object.defineProperty(globalThis,k,desc);else delete globalThis[k];
    }
  }
}

test('låst bräde kan räddas även efter hjälp, avbruten NOVA och fördröjd varning',()=>withUI(async({data,id,slots,frames,timers})=>{
    const s=createState();s.board=s.board.map((row,r)=>row.map((_,c)=>(r+c)%2?1:null));
    s.rack=[{shape:'dot',hue:0},{shape:'dominoH',hue:1},null];
    s.novaTokens=1;data.set(SAVE_KEY,JSON.stringify(s));
    await import('../game.js');
    id('.game-area').clientWidth=id('.game-area').clientHeight=334;
    frames.shift()();
    slots[0].fire('click',{detail:0});
    const finger={button:0,pointerType:'touch',pointerId:7,clientX:20,clientY:134};
    id('board').fire('pointerdown',finger);
    id('board').fire('pointercancel',finger);
    assert.equal(JSON.parse(data.get(SAVE_KEY)).moves,0);
    id('board').fire('pointerdown',finger);
    const release={...finger,clientY:94};
    id('board').fire('pointermove',release);
    id('board').fire('pointerup',release);
    id('board').fire('click',{...release,detail:1});
    assert.equal(JSON.parse(data.get(SAVE_KEY)).moves,1);
    id('helpBtn').fire('click');
    timers.find(t=>t.ms===160).f();
    id('modalActions').children[0].fire('click');
    assert.equal(id('modalTitle').textContent,'Använd NOVA?');
    assert.equal(id('modalActions').children.length,1);
    id('modalActions').children[0].fire('click');
    id('novaBtn').fire('click');
    assert.equal(id('modal').hidden,false);
    id('modalActions').children[0].fire('click');
    assert.equal(id('cellStatus').textContent,undefined);
    const work=[];
    navigator.locks={request:(_,fn)=>{work.push(fn);return Promise.resolve();}};
    id('board').fire('pointerdown',{...finger,clientX:60,clientY:20});
    id('board').fire('pointerup',{...finger,clientX:60,clientY:20});
    timers.find(t=>t.ms===250).f();
    assert.equal(id('modal').hidden,true);
    const journal=[...data.keys()].find(k=>k.startsWith(SAVE_KEY+'.pending.'));
    assert.equal(JSON.parse(data.get(journal)).state.novaTokens,0);
    assert.equal(JSON.parse(data.get(SAVE_KEY)).novaTokens,1);
    work.shift()();
    assert.equal(data.has(journal),false);
    const saved=JSON.parse(data.get(SAVE_KEY));
    assert.equal(saved.board[0][1],null);
    assert.equal(saved.novaTokens,0);
    assert.equal(saved.score,10);
    assert.equal(saved.level,1);
}));

test('lätta tryck landar på översta, mellersta och nedersta raden utan lyft',()=>withUI(async({data,id,slots,frames})=>{
  const s=createState();
  s.rack=['dot','dot','dominoV'].map(shape=>({shape,hue:2}));
  data.set(SAVE_KEY,JSON.stringify(s));
  await import('../game.js?touch-test');
  id('.game-area').clientWidth=id('.game-area').clientHeight=334;
  frames.shift()();
  for(const [i,row] of [0,4,7].entries()){
    slots[i].fire('click',{detail:0});
    const p={button:0,pointerId:2,pointerType:'touch',clientX:60,clientY:row*40+20};
    id('board').fire('pointerdown',p);
    id('board').fire('pointerup',{...p,clientX:65});
    const saved=JSON.parse(data.get(SAVE_KEY));
    assert.equal(saved.board[row][1],2);
    assert.equal(saved.moves,i+1);
  }
}));

test('ny flik återställer en stängd fliks journal och tar emot nästa drag utan konflikt',()=>withUI(async({data,id,frames})=>{
  const base=createState();base.rack=[{shape:'dot',hue:0},null,null];
  const next={...base,score:10,bestScore:10,moves:1,board:base.board.map(row=>row.slice())};
  next.board[3][2]=0;
  const raw=JSON.stringify(base);
  data.set(SAVE_KEY,raw);
  const key=SAVE_KEY+'.pending.closed';
  data.set(key,JSON.stringify({base:raw,state:next}));
  await import('../game.js?reopen-test');
  assert.equal(data.has(key),false);
  assert.deepEqual(JSON.parse(data.get(SAVE_KEY)),next);
  assert.equal(id('score').textContent,'10');
  const subsequent={...next,score:20,bestScore:20,moves:2};
  data.set(SAVE_KEY,JSON.stringify(subsequent));
  window.fire('storage',{key:SAVE_KEY});
  assert.equal(id('score').textContent,'20');
  assert.equal(id('toast').textContent,undefined);
}));

test('släpp som fyller en rad spelar rensningsljudet även efter vanlig placering',()=>withUI(async({data,id,slots,frames})=>{
  const sounds=[];
  globalThis.Audio=class{
    constructor(src){this.src=src;}
    play(){sounds.push(this.src.split('?')[0]);return Promise.resolve();}
    pause(){}
  };
  const s=createState();
  s.rack=[0,1,2].map(hue=>({shape:'dot',hue}));
  s.board[6].fill(1);s.board[6][7]=null;
  data.set(SAVE_KEY,JSON.stringify(s));
  await import('../game.js?clear-sound-test');
  id('.game-area').clientWidth=id('.game-area').clientHeight=334;
  frames.shift()();
  for(const [i,row,col] of [[0,0,0],[1,6,7],[2,2,2]]){
    slots[i].fire('click',{detail:0});
    const p={button:0,pointerId:1,pointerType:'touch',clientX:col*40+20,clientY:row*40+20};
    id('board').fire('pointerdown',p);id('board').fire('pointerup',p);
  }
  assert.equal(JSON.parse(data.get(SAVE_KEY)).totalLines,1);
  assert.deepEqual(sounds,['./assets/place.wav','./assets/clear.wav','./assets/place.wav']);
}));
