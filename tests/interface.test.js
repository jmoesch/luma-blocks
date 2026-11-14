import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, SAVE_KEY} from '../engine.js';

// Exercise the actual UI event handlers with a minimal DOM and a controlled clock.
test('låst bräde kan räddas även efter hjälp, avbruten NOVA och fördröjd varning', async ()=>{
  const timers=[];
  class Element extends EventTarget {
    style={}; dataset={}; classList={toggle(){},add(){},remove(){}};
    children=[];
    querySelector(){return new Element();}
    getBoundingClientRect(){return {width:320,height:320,left:0,top:0};}
    getContext(){return new Proxy({}, {get:(_,k)=>k==='createLinearGradient'?
      ()=>({addColorStop(){}}):()=>{}});}
    setAttribute(){} focus(){} setPointerCapture(){}
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
    localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},
    requestAnimationFrame:f=>frames.push(f),cancelAnimationFrame(){},
    setTimeout:(f,ms)=>timers.push({f,ms}),clearTimeout(){}};
  const original=new Map();
  try{
    for(const [k,v] of Object.entries(overrides)){
      original.set(k,Object.getOwnPropertyDescriptor(globalThis,k));
      Object.defineProperty(globalThis,k,{value:v,configurable:true});
    }
    const s=createState();s.board=s.board.map((row,r)=>row.map((_,c)=>(r+c)%2?1:null));
    s.rack=[{shape:'dot',hue:0},{shape:'dominoH',hue:1},null];
    s.novaTokens=1;data.set(SAVE_KEY,JSON.stringify(s));
    await import('../game.js');
    id('.game-area').clientWidth=id('.game-area').clientHeight=334;
    frames.shift()();
    slots[0].fire('click',{detail:0});
    id('board').fire('pointerdown',{clientX:20,clientY:20});
    id('helpBtn').fire('click');
    timers.find(t=>t.ms===160).f();
    id('modalActions').children[0].fire('click');
    assert.equal(id('modalTitle').textContent,'Använd NOVA?');
    assert.equal(id('modalActions').children.length,1);
    id('modalActions').children[0].fire('click');
    id('novaBtn').fire('click');
    assert.equal(id('modal').hidden,false);
    id('modalActions').children[0].fire('click');
    id('board').fire('pointerdown',{clientX:60,clientY:20});
    timers.find(t=>t.ms===250).f();
    assert.equal(id('modal').hidden,true);
    const saved=JSON.parse(data.get(SAVE_KEY));
    assert.equal(saved.board[0][1],null);
    assert.equal(saved.novaTokens,0);
    assert.equal(saved.score,10);
    assert.equal(saved.level,1);
  }finally{
    for(const [k,desc] of original){
      if(desc)Object.defineProperty(globalThis,k,desc);else delete globalThis[k];
    }
  }
});
