// Reuse one audio context and resume it on user interaction after interruptions.
export function createGameAudio(host){
  let context, pendingResume, sequence=0;
  const fallback=new Map();
  function unlock(){
    const AudioContext=host.AudioContext||host.webkitAudioContext;
    if(!AudioContext)return;
    try{
      if(!context||context.state==='closed')context=new AudioContext();
      if(context.state!=='running'&&!pendingResume){
        pendingResume=context.resume().catch(()=>{}).finally(()=>{pendingResume=null;});
      }
    }catch{}
  }
  function play(name){
    unlock();
    if(!context||context.state==='closed'){
      try{
        if(!fallback.has(name))fallback.set(name,new Audio('./assets/'+name+'.wav'));
        const clip=fallback.get(name);
        clip.currentTime=0;
        clip.play().catch(()=>{});
      }catch{}
      return;
    }
    const ticket=++sequence;
    if(context.state!=='running'){
      const requested=performance.now();
      pendingResume?.then(()=>{
        if(ticket===sequence && context.state==='running' && performance.now()-requested<400)render(name);
      });
      return;
    }
    render(name);
  }
  function render(name){
    // An ascending major arpeggio for a clear, a single short note for a move.
    const clear=name==='clear';
    const notes=clear?[523.25,659.25,783.99,1046.5]:[330];
    const start=context.currentTime;
    notes.forEach((frequency,index)=>{
      const tone=context.createOscillator(), gain=context.createGain();
      const onset=start+index*0.09, end=onset+(clear?0.26:0.085);
      tone.type=clear?'sine':'triangle';
      tone.frequency.value=frequency;
      gain.gain.setValueAtTime(0.0001,onset);
      gain.gain.exponentialRampToValueAtTime(clear?0.23:0.10,onset+0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001,end);
      tone.connect(gain);
      gain.connect(context.destination);
      tone.onended=()=>{tone.disconnect();gain.disconnect();};
      tone.start(onset);
      tone.stop(end);
    });
  }
  return {unlock,play};
}
