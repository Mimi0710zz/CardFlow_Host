import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';

const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const enabled=process.env.MATRIX_BROWSER_TEST==='1';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('matrix browser: frozen columns, responsive, filters and green/yellow/red workflows',{skip:!enabled||!existsSync(chrome),timeout:60000},async()=>{
 const workspace=resolve('.'),profile=mkdtempSync(join(tmpdir(),'cardflow-matrix-')),errors=[];
 const fixture=`<!doctype html><html lang="vi"><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><body><main style="padding:16px"><button data-view="transactions">Giao Dịch</button><section id="view-mcc" hidden></section><section id="view-programs" hidden></section><section id="view-transactions" hidden></section><section id="view-coordination"></section><div id="contextMenu" hidden></div></main><script type="module">
 import {canonicalize} from '/services/local-repository.js';
 import {renderCashbackFeatures} from '/services/cashback-feature-ui.js';
 const OriginalDate=Date;globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-09-06T12:00:00']));}static now(){return new OriginalDate('2026-09-06T12:00:00').getTime();}};
 window.state=canonicalize({banks:[{id:'bank',code:'CAKE',name:'Ngân hàng CAKE tên đầy đủ'}],cardProducts:[{id:'p',bankId:'bank',cardId:'CAKE-SIGNATURE',cardBrand:'Visa',cashbackCycleMode:'statement'}],customers:Array.from({length:64},(_,i)=>({id:'c'+i,fullName:i===0?'Nguyễn Quang Minh':i===1?'Nguyễn Văn Trí':i===2?'Trần Hữu Phong':'Khách hàng '+String(i).padStart(2,'0')})),customerCards:Array.from({length:63},(_,i)=>({id:'card'+i,customerId:'c'+i,cardProductId:'p',statementDay:20})),cashbackPrograms:[{id:'pr',bankCardProductId:'p',name:'Online 10%',rate:10,maxCashback:400000,mccCategoryIds:['m'],transactionMethod:'Online'}],mccCategories:[{id:'m',name:'Online',codes:['5411']}],orderTypes:[{id:'o',code:'ONLINE'}],transactions:[{id:'yellow',customerId:'c1',customerCardId:'card1',cashbackProgramId:'pr',amount:1500000,date:'2026-09-03',mccCategoryId:'m',transactionMethod:'Online'},{id:'red1',customerId:'c2',customerCardId:'card2',cashbackProgramId:'pr',amount:1500000,date:'2026-08-23',mccCategoryId:'m',transactionMethod:'Online'},{id:'red2',customerId:'c2',customerCardId:'card2',cashbackProgramId:'pr',amount:2500000,date:'2026-09-03',mccCategoryId:'m',transactionMethod:'Online'}]});
 window.repaint=()=>renderCashbackFeatures({state:window.state,getState:()=>window.state,save:()=>{window.state=canonicalize(window.state);repaint();return window.state;},uuid:()=>crypto.randomUUID(),toast:message=>window.lastToast=message});
 document.querySelector('[data-view="transactions"]').onclick=()=>{document.querySelector('#view-transactions').hidden=false;document.querySelector('#view-coordination').hidden=true;};
 repaint();window.ready=true;
 </script></body></html>`;
 const server=createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return;}const path=resolve(workspace,'.'+pathname);if(!path.startsWith(workspace+requireSeparator())||!existsSync(path)){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',extname(path)==='.css'?'text/css':'text/javascript');res.end(readFileSync(path));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const child=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let socket;
 try{
  child.on('error',error=>errors.push(error.message));
  for(let i=0;i<100&&!existsSync(join(profile,'DevToolsActivePort'));i++)await pause(100);
  const port=readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];
  const targets=await fetch(`http://127.0.0.1:${port}/json`).then(response=>response.json());
  socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let seq=0;const pending=new Map();
  socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const task=pending.get(data.id);pending.delete(data.id);data.error?task.reject(new Error(data.error.message)):task.resolve(data.result);}if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/fixture`});
  for(let i=0;i<100&&!await evaluate('window.ready===true');i++)await pause(50);
  assert.equal(await evaluate('window.ready'),true,errors.join('\n'));
  assert.equal(await evaluate("document.querySelectorAll('[data-coord-tab],.coord-recommend-open').length"),0);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.matrix-table th')].slice(0,3).map(x=>x.textContent.replace(/Kéo để đổi độ rộng.*/,''))"),['Card ID','Phôi','Chương trình hoàn tiền']);
  const geometry=await evaluate(`(()=>{const wrap=document.querySelector('.matrix-scroll'),cells=[...document.querySelectorAll('.matrix-table tbody td')].slice(0,3),before=cells.map(x=>x.getBoundingClientRect().x);wrap.scrollLeft=400;return {before,after:cells.map(x=>x.getBoundingClientRect().x),width:document.querySelector('.matrix-table th:nth-child(4)').getBoundingClientRect().width};})()`);
  assert.deepEqual(geometry.before,geometry.after);assert.ok(geometry.width>=44&&geometry.width<=60);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.matrix-table th')].slice(0,4).map(x=>Math.round(x.getBoundingClientRect().width))"),[88,54,132,56]);
  assert.equal(await evaluate("document.querySelector('.matrix-table tbody td').textContent"),'CAKE-SIGNATURE');
  assert.equal(await evaluate("document.querySelector('.matrix-table tbody td:nth-child(2)').textContent"),'VISA');
  assert.equal(await evaluate("document.querySelector('.matrix-scroll .AVAILABLE').textContent"),'0');
  assert.equal(await evaluate("document.querySelector('.matrix-scroll .IN_PROGRESS').textContent"),'1.5tr/4tr');
  assert.equal(await evaluate("document.querySelector('.matrix-scroll .COMPLETED').textContent"),'4tr/4tr');
  assert.ok(await evaluate("document.querySelector('.matrix-scroll .IN_PROGRESS').getAttribute('aria-label').includes('Nguyễn Văn Trí')"));
  assert.ok(await evaluate("document.querySelector('.matrix-scroll').scrollLeft>0"),'matrix must scroll inside its own container');
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'desktop document must not overflow');
  await evaluate("document.querySelector('[data-matrix-filter]').click()");assert.equal(await evaluate("document.querySelector('[data-matrix-filter-panel]').hidden"),false);
  await evaluate("document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))");assert.equal(await evaluate("document.querySelector('[data-matrix-filter-panel]').hidden"),true);
  await evaluate("document.querySelector('[data-matrix-filter]').click();document.querySelector('[data-draft=\"status\"]').value='AVAILABLE';document.querySelector('[data-apply]').click()");assert.ok(await evaluate("document.querySelector('[data-matrix-filter] b').textContent"));
  await evaluate("document.querySelector('[data-matrix-clear]').click()");
  await evaluate("(()=>{const h=document.querySelector('[data-matrix-resize=card]').getBoundingClientRect(),start=h.left+2;document.querySelector('[data-matrix-resize=card]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:start}));window.dispatchEvent(new PointerEvent('pointermove',{clientX:start+30}));window.dispatchEvent(new PointerEvent('pointerup',{clientX:start+30}));})()");assert.equal(await evaluate("Math.round(document.querySelector('.matrix-table th').getBoundingClientRect().width)"),118);assert.equal(await evaluate("JSON.parse(localStorage.getItem('cardflow-host-matrix-column-widths-v1')).card"),118);
  assert.equal(await evaluate("document.querySelectorAll('[data-matrix-resize]').length"),3);
  await evaluate("(()=>{for(const key of ['brand','program']){const h=document.querySelector(`[data-matrix-resize=${key}]`).getBoundingClientRect(),start=h.left+2;document.querySelector(`[data-matrix-resize=${key}]`).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:start}));window.dispatchEvent(new PointerEvent('pointermove',{clientX:start+18}));window.dispatchEvent(new PointerEvent('pointerup',{clientX:start+18}));}})()");
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.matrix-table th')].slice(0,4).map(x=>Math.round(x.getBoundingClientRect().width))"),[118,72,150,56]);
  assert.deepEqual(await evaluate("(()=>{const x=[...document.querySelectorAll('.matrix-table tbody td')].slice(0,3).map(cell=>Math.round(cell.getBoundingClientRect().x));return [x[1]-x[0],x[2]-x[1]]})()"),[118,72]);
  await evaluate("repaint()");assert.deepEqual(await evaluate("[...document.querySelectorAll('.matrix-table th')].slice(0,4).map(x=>Math.round(x.getBoundingClientRect().width))"),[118,72,150,56]);
  await evaluate("document.querySelector('.matrix-scroll .AVAILABLE').click()");assert.match(await evaluate("document.querySelector('.matrix-modal').textContent"),/Bạn có muốn đánh đơn luôn không/);
  await evaluate("document.querySelector('[data-action]').click()");
  assert.equal(await evaluate("document.querySelector('.feature-modal h2').textContent"),'Thêm đơn mới');
  assert.equal(await evaluate("document.querySelector('.feature-modal [name=customerCardId]').value"),'card3');
  assert.equal(await evaluate("document.querySelector('.feature-modal [name=cashbackProgramId]').value"),'pr');
  assert.equal(await evaluate("document.querySelector('.feature-modal [name=mccCategoryId]').value"),'m');assert.equal(await evaluate("document.querySelector('.feature-modal [name=amount]').value"),'');
  await evaluate("document.querySelector('.feature-modal [name=amount]').value='1500000';document.querySelector('.feature-modal [name=orderTypeCode]').value='ONLINE';document.querySelector('.feature-modal form').requestSubmit()");
  assert.equal(await evaluate("state.transactions.find(tx=>tx.customerId==='c3')?.transactionMethod"),'Online');
  assert.equal(await evaluate("document.querySelector('.matrix-scroll button[title^=\"Khách hàng 03\"]').classList.contains('IN_PROGRESS')"),true);
  await evaluate("document.querySelector('#view-coordination').hidden=false;document.querySelector('#view-transactions').hidden=true;document.querySelector('.matrix-scroll .IN_PROGRESS[title^=\"Nguyễn Văn Trí\"]').click()");
  assert.equal(await evaluate("document.querySelector('.matrix-modal progress').value"),37.5);
  await evaluate("document.querySelector('[data-action]').click()");assert.equal(await evaluate("document.querySelector('.feature-modal [name=customerId]').value"),'c1');
  await evaluate("document.querySelector('.feature-modal').remove();document.querySelector('#view-coordination').hidden=false;document.querySelector('#view-transactions').hidden=true;document.querySelector('.matrix-scroll .COMPLETED').click()");
  assert.equal(await evaluate("document.querySelectorAll('.matrix-modal tbody tr').length"),2);
  await evaluate("document.querySelector('[data-action]').click()");assert.equal(await evaluate("document.querySelectorAll('[data-feature-table=transaction-order] tbody tr').length"),2);
  assert.match(await evaluate("document.querySelector('#view-transactions').textContent"),/23-08-2026/);
  await evaluate("document.querySelector('#view-transactions').hidden=true;document.querySelector('#view-coordination').hidden=false;document.querySelector('[data-matrix-filter]').click();document.querySelector('[data-draft=\"actionable\"]').click();document.querySelector('[data-apply]').click()");assert.equal(await evaluate("document.querySelectorAll('.matrix-scroll .COMPLETED').length"),0);
  await evaluate("document.querySelector('[data-matrix-clear]').click();document.querySelector('[data-matrix-filter]').click();document.querySelector('[data-none]').click();document.querySelector('[data-apply]').click()");assert.match(await evaluate("document.querySelector('[data-matrix-content]').textContent"),/Không có/);
  await evaluate("document.querySelector('[data-matrix-filter]').click();document.querySelector('[data-all]').click();document.querySelector('[data-apply]').click()");
  await evaluate("state.customers[0].fullName='Nguyễn Văn Anh Tuấn';state.cashbackPrograms[0].name='Chương trình hoàn tiền mua sắm trực tuyến với tên rất dài để kiểm tra giới hạn hai dòng';repaint()");
  assert.equal(await evaluate("document.querySelector('.matrix-table th[title=\"Nguyễn Văn Anh Tuấn\"]').textContent"),'N.V.A.Tuấn');
  assert.ok(await evaluate("document.querySelector('.matrix-program-name').getBoundingClientRect().height<=26"));
  assert.ok(await evaluate("document.querySelector('.matrix-table td:nth-child(3)').title.endsWith('hai dòng')"));
  for(const [width,height,stacked] of [[1024,768,false],[768,1024,true],[390,844,true]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   assert.equal(await evaluate("getComputedStyle(document.querySelector('.matrix-stacked')).display!=='none'"),stacked);
   assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),`overflow at ${width}`);
  }
  if(process.env.MATRIX_SCREENSHOT_DIR){await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await evaluate("document.querySelector('.matrix-scroll').scrollLeft=99999");const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(process.env.MATRIX_SCREENSHOT_DIR,'matrix-desktop.png'),Buffer.from(shot.data,'base64'));await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:false});await evaluate("document.querySelector('.matrix-scroll').scrollLeft=99999");const mobile=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(process.env.MATRIX_SCREENSHOT_DIR,'matrix-tablet.png'),Buffer.from(mobile.data,'base64'));}
  assert.deepEqual(errors,[]);
 }finally{socket?.close();child.kill();await new Promise(resolve=>server.close(resolve));assert.ok(resolve(profile).startsWith(resolve(tmpdir())+requireSeparator()+'cardflow-matrix-'));for(let i=0;i<20;i++){try{rmSync(profile,{recursive:true,force:true});break;}catch{await pause(100);}}}
});
function requireSeparator(){return process.platform==='win32'?'\\':'/';}
