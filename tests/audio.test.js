import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameAudio} from '../audio.js';

test('placering och rensning använder samma ljudmotor som återupptas efter avbrott',async()=>{
  const tones=[], contexts=[];
  class Context {
    state='suspended';currentTime=4;resumes=0;
    constructor(){contexts.push(this);}
    async resume(){this.resumes++;this.state='running';}
    createOscillator(){
      const tone={frequency:{},connect(){},disconnect(){},start(t){this.startTime=t;},stop(){}};
      tones.push(tone);return tone;
    }
    createGain(){return {connect(){},disconnect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}};}
  }
  const sound=createGameAudio({AudioContext:Context});
  sound.play('place');
  await new Promise(resolve=>setImmediate(resolve));
  contexts[0].state='interrupted';
  sound.play('clear');
  assert.equal(contexts.length,1);
  assert.equal(contexts[0].resumes,2);
  assert.equal(tones.length,5);
  for(let i=2;i<tones.length;i++){
    assert.ok(tones[i].frequency.value>tones[i-1].frequency.value);
    assert.ok(tones[i].startTime>tones[i-1].startTime);
  }
});
