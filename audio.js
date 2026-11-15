// A small fixed pool lets a placement ring out over an earlier clear.
export function createGameAudio(AudioElement,onFailure){
  const pools=new Map();
  for(const name of ['place','clear']){
    const clips=Array.from({length:2},()=>{
      const clip=new AudioElement('./assets/'+name+'.wav?v=1.3.2');
      clip.preload='auto';
      return clip;
    });
    pools.set(name,{clips,next:0});
  }
  let attempt=0,failed=false;
  function stop(){
    attempt++;
    for(const {clips} of pools.values())for(const clip of clips)clip.pause();
    failed=false;
  }
  function play(name){
    const pool=pools.get(name),clip=pool.clips[pool.next];
    pool.next=(pool.next+1)%pool.clips.length;
    const ticket=++attempt;
    failed=false;
    function report(){
      if(ticket!==attempt)return;
      failed=true;onFailure();
    }
    try{
      if(clip.error)clip.load();
      if(clip.currentTime)clip.currentTime=0;
      clip.play().catch(report);
    }catch{report();}
  }
  return {play,stop,get failed(){return failed;}};
}
