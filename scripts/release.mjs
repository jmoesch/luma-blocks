// Run from the project root with the next version as the argument.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const next=process.argv[2];
const old=JSON.parse(readFileSync('package.json','utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(next)||next===old)throw Error('Ange ett nytt versionsnummer');
const targets=['index.html','README.md','engine.js','audio.js','game.js','sw.js','package.json',
  ...readdirSync('tests').filter(f=>f.endsWith('.js')).map(f=>'tests/'+f)];
for(const file of targets){
  const before=readFileSync(file,'utf8'),after=before.replaceAll(old,next);
  if(before!==after)writeFileSync(file,after);
}
function check(dir){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules','CHANGELOG.md'].includes(entry.name))continue;
    const path=dir+'/'+entry.name;
    if(entry.isDirectory())check(path);
    else if(readFileSync(path).includes(Buffer.from(old)))throw Error('Tidigare version kvar i '+path);
  }
}
check('.');
execFileSync(process.execPath,['--test',...readdirSync('tests').filter(f=>f.endsWith('.test.js')).map(f=>'tests/'+f)],{stdio:'inherit'});
