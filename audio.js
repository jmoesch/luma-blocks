// Keep the usual media element for both effects. A quick placement during
// the fanfare uses its own preloaded clip so both sounds can finish.
export function createGameAudio(AudioElement,onFailure){
  const source=name=>'./assets/'+name+'.wav?v=1.3.4';
  const main=new AudioElement(source('place'));
  const quick=new AudioElement(source('place'));
  main.preload=quick.preload='auto';
  let current='place',attempt=0,failed=false,protectUntil=0;
  function stop(){
    attempt++;
    protectUntil=0;
    main.pause();quick.pause();
    failed=false;
  }
  function play(name){
    const ticket=++attempt;
    const overlap=name==='place'&&current==='clear'&&!main.ended&&performance.now()<protectUntil;
    const clip=overlap?quick:main;
    failed=false;
    function report(){
      if(ticket!==attempt)return;
      failed=true;
      protectUntil=0;
      onFailure();
    }
    try{
      if(!overlap){
        protectUntil=name==='clear'?performance.now()+1300:0;
        if(current!==name){
          main.src=source(name);
          current=name;
        }
      }
      if(clip.error)clip.load();
      else if(clip.currentTime)clip.currentTime=0;
      clip.play().catch(report);
    }catch{report();}
  }
  return {play,stop,get failed(){return failed;}};
}
