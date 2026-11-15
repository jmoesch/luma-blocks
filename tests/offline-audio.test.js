import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('offlinecachen lämnar rätt WAV-header och ljuddata vid delhämtning',async()=>{
  const code=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  const data=await readFile(new URL('../assets/clear.wav',import.meta.url));
  let fetchHandler;
  const origin='https://example.test',scope=origin+'/game/';
  const self={registration:{scope},location:{origin},addEventListener(name,fn){if(name==='fetch')fetchHandler=fn;}};
  const cache={match:async()=>new Response(data)};
  vm.runInNewContext(code,{self,URL,Response,caches:{open:async()=>cache}});
  for(const [range,start,end] of [['bytes=0-1',0,1],['bytes=2-',2,data.length-1],['bytes=-4',data.length-4,data.length-1]]){
    let pending;
    fetchHandler({request:new Request(scope+'assets/clear.wav?v=1.3.4',{headers:{Range:range}}),respondWith:p=>{pending=p;}});
    const res=await pending;
    assert.equal(res.status,206);
    assert.equal(res.headers.get('content-range'),`bytes ${start}-${end}/${data.length}`);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()),data.subarray(start,end+1));
  }
});
