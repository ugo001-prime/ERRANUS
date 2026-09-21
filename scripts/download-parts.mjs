// Resumable range downloads for large official build-tool archives.
// Always verifies the publisher checksum before replacing the target file.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
const [url,target,sizeText,checksum,workersText='3']=process.argv.slice(2);
const size=Number(sizeText);
if(!url?.startsWith('https://')||!target||!Number.isSafeInteger(size)||size<=0||!(/^([a-f0-9]{40}|[a-f0-9]{64})$/i.test(checksum??''))) throw new Error('Usage: node scripts/download-parts.mjs HTTPS_URL TARGET BYTES CHECKSUM [WORKERS]');
const folder=target+'.parts';fs.mkdirSync(folder,{recursive:true});
const chunk=4*1024*1024;
const prefixPath=path.join(folder,'prefix');
if(!fs.existsSync(prefixPath)&&fs.existsSync(target)&&fs.statSync(target).size<size)fs.copyFileSync(target,prefixPath);
const prefix=fs.existsSync(prefixPath)?fs.statSync(prefixPath).size:0;
const parts=[];
for(let start=prefix;start<size;start+=chunk)parts.push({start,end:Math.min(size-1,start+chunk-1),file:path.join(folder,String(start))});
let cursor=0,done=prefix;
async function download(part){
 const expected=part.end-part.start+1;
 for(let attempt=0;attempt<15;attempt++){
  const have=fs.existsSync(part.file)?fs.statSync(part.file).size:0;
  if(have===expected)return;
  if(have>expected)throw new Error('Invalid cached range size');
  const transfer=part.file+'.transfer';
  fs.writeFileSync(transfer,'');
  const result=await new Promise((resolve,reject)=>{
   let status='';
   const child=spawn('curl.exe',['--silent','--show-error','--fail','--location','--connect-timeout','25','--max-time','180','--range',`${part.start+have}-${part.end}`,'--output',transfer,'--write-out','%{http_code}',url],{stdio:['ignore','pipe','inherit'],windowsHide:true});
   child.stdout.on('data',data=>status+=data);
   child.on('error',reject);child.on('exit',code=>resolve({code,status:status.trim()}));
  });
  const received=fs.statSync(transfer).size;
  if(result.status==='206'&&received>0&&have+received<=expected){
   await pipeline(fs.createReadStream(transfer),fs.createWriteStream(part.file,{flags:'a'}));
   if(have+received===expected)return;
  }else if(result.code===0){throw new Error('Server did not honor byte range');}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 throw new Error('Download retry limit reached; rerun to resume.');
}
await Promise.all(Array.from({length:Math.max(1,Math.min(4,Number(workersText)||3))},async()=>{while(cursor<parts.length){const part=parts[cursor++];await download(part);done+=part.end-part.start+1;console.log(`${path.basename(target)}: ${Math.round(done/size*100)}%`);}}));
const assembled=target+'.verified';fs.writeFileSync(assembled,'');
for(const file of [...(prefix?[prefixPath]:[]),...parts.map(p=>p.file)])await pipeline(fs.createReadStream(file),fs.createWriteStream(assembled,{flags:'a'}));
const hash=createHash(checksum.length===40?'sha1':'sha256');for await(const data of fs.createReadStream(assembled))hash.update(data);
if(hash.digest('hex').toLowerCase()!==checksum.toLowerCase())throw new Error('Archive checksum mismatch');
fs.renameSync(assembled,target);console.log(`Verified ${target}`);
