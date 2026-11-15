import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameAudio} from '../audio.js';

function setup(){
  const clips=[],calls=[],errors=[];
  class Clip{
    constructor(src){this.src=src;clips.push(this);}
    pause(){this.paused=true;}
    play(){
      this.paused=false;this.ended=false;
      calls.push([clips.indexOf(this),this.src.split('/').pop().split('?')[0]]);
      return new Promise((_,reject)=>{this.reject=reject;});
    }
  }
  const sound=createGameAudio(Clip,()=>errors.push(1));
  return {clips,calls,errors,sound};
}
test('snabba drag hörs under fanfaren och vanliga ljud återgår till huvudspelaren efteråt',()=>{
  const {clips:[main,quick],calls,sound}=setup();
  for(let round=0;round<3;round++){
    sound.play('place');sound.play('clear');sound.play('place');
    quick.currentTime=0.05;sound.play('place');
    assert.equal(quick.currentTime,0);
    assert.equal(main.paused,false);assert.match(main.src,/clear\.wav/);
    main.ended=true;sound.play('place');
    assert.deepEqual(calls.splice(0),[[0,'place.wav'],[0,'clear.wav'],[1,'place.wav'],[1,'place.wav'],[0,'place.wav']]);
  }
});
test('ljudet återhämtar sig efter uppspelningsfel och efter avstängning',async()=>{
  const {clips:[main,quick],calls,errors,sound}=setup();
  sound.play('clear');sound.play('place');
  main.reject();await Promise.resolve();assert.deepEqual(errors,[]);
  quick.reject();await Promise.resolve();assert.ok(sound.failed);
  sound.play('place');assert.deepEqual(calls.at(-1),[0,'place.wav']);
  sound.stop();assert.ok(main.paused&&quick.paused);
  sound.play('place');assert.equal(sound.failed,false);
});
test('huvudspelaren kan spela nästa drag även om fanfaren aldrig signalerar slut',t=>{
  let now=0;t.mock.method(performance,'now',()=>now);
  const {sound,calls}=setup();
  sound.play('clear');now=1600;sound.play('place');
  assert.deepEqual(calls.at(-1),[0,'place.wav']);
});
