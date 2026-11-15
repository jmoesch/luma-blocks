import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameAudio} from '../audio.js';

test('ett nekat ljud kan startas igen och gamla avbrott ignoreras',async()=>{
  const clips=[],calls=[],errors=[];
  class Clip{
    constructor(src){this.src=src;clips.push(this);}
    pause(){}
    play(){calls.push(this.src);return new Promise((resolve,reject)=>{this.reject=reject;});}
  }
  const sound=createGameAudio(Clip,()=>errors.push(1));
  sound.play('place');
  sound.play('clear');
  clips[0].reject();
  await Promise.resolve();
  assert.deepEqual(errors,[]);
  clips[2].reject();
  await Promise.resolve();
  assert.ok(sound.failed);
  assert.equal(errors.length,1);
  clips[3].currentTime=.2;
  sound.play('clear');
  assert.equal(clips[3].currentTime,0);
  assert.equal(sound.failed,false);
  assert.deepEqual(calls,[clips[0].src,clips[2].src,clips[3].src]);
});
