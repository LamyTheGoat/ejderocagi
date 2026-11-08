const {test,expect}=require('@playwright/test');
const {fork}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {once}=require('node:events');
const children=[];let dir,url,secondUrl;
const network=[];
const multi=process.env.ENG05_MULTI_SERVER==='1';
async function startServer(label){
 const child=fork('-e',[`const http=require('node:http');const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>{process.env.PUBLIC_URL='http://127.0.0.1:'+port;const {server}=require(${JSON.stringify(require.resolve('../server'))});process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});server.listen(port,'127.0.0.1',()=>process.send({port}));});});`],{env:{...process.env,NODE_ENV:'test',ECONOMY_BACKEND:multi?'firestore':'sqlite',GOOGLE_CLOUD_PROJECT:'demo-ejder-ocagi',DATA_DIR:path.join(dir,label),LOCAL_ECONOMY_DIR:path.join(dir,'economy')},silent:true});
 children.push(child);child.stdout.resume();child.stderr.on('data',d=>process.stderr.write(d));
 const [info]=await once(child,'message');return 'http://127.0.0.1:'+info.port;
}
test.beforeAll(async()=>{
 if(multi&&!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw Error('Local emulator required');
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'eo-trade-ui-'));url=await startServer('world-a');secondUrl=multi?await startServer('world-b'):url;
});
test.afterAll(async()=>{for(const child of children)if(child.exitCode===null){const exited=once(child,'exit');child.send('stop');const [code]=await exited;expect(code).toBe(0);}if(dir)fs.rmSync(dir,{recursive:true,force:true});});
test.afterEach(async({},info)=>{await info.attach('trade-network',{body:JSON.stringify(network,null,2),contentType:'application/json'});});

// ENG-11: kalıcı Takas düğmesi yok. Takas arkadaş satırından ([data-trade-with]) ya da gelen davet bildiriminden açılır.
async function enterGame(page,target){await page.goto(target);await page.getByRole('button',{name:/Yeni ocak kur/}).click();await page.getByRole('button',{name:'Ocağa gir',exact:true}).click();await expect(page.locator('#hud')).not.toBeEmpty();}
const handleOf=page=>page.evaluate(()=>fetch('/api/session',{method:'POST',credentials:'same-origin'}).then(r=>r.json()).then(d=>d.handle));
async function befriend(page,handle){
 await page.evaluate(()=>ACT['social-drawer-open']());
 await page.locator('#soc-add-in').fill(handle);await page.getByRole('button',{name:'➕ Arkadaş Ekle',exact:true}).first().click();
 const open=page.getByRole('button',{name:handle+' ile takas teklif et',exact:true});await expect(open).toBeVisible();return open;
}
test('two authenticated player sessions trade inside the game, including mobile and reload',async({browser},testInfo)=>{
 const ca=await browser.newContext({viewport:{width:1280,height:800}}),cb=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const a=await ca.newPage(),b=await cb.newPage();
 for(const [label,page]of [['a',a],['b',b]])page.on('response',async response=>{
  if(!response.url().endsWith('/api/trade'))return;
  try{const data=await response.json();network.push({player:label,status:response.status(),command:response.request().postDataJSON(),error:data.error,trade:data.trade});}catch(_){}
 });
 for(const page of [a,b]){
  await enterGame(page,page===a?url:secondUrl);
  await expect(page.locator('.trade-entry')).toHaveCount(0);
 }
 const [ha,hb]=[await handleOf(a),await handleOf(b)];
 for(const [page,other]of [[a,hb],[b,ha]]){
  await (await befriend(page,other)).click();
  await page.getByRole('button',{name:'Sunucu hesabını hazırla',exact:true}).click();
  await expect(page.getByTestId('server-gold')).toHaveText('420 altın');
 }
 if(multi){
  const {Firestore}=require('@google-cloud/firestore');const db=new Firestore({projectId:'demo-ejder-ocagi',databaseId:'economy'});
  try{for(const page of [a,b]){const state=await (await page.request.get(new URL('/api/trade/state',page.url()).href)).json();
   const ref=db.collection('eo_accounts').doc(state.accountId),doc=await ref.get();await ref.update({gameJson:JSON.stringify(require('./helpers/earned_fixture').earnedFixture(JSON.parse(doc.data().gameJson)))});
  }}finally{await db.terminate();}
 }else require('./helpers/earned_fixture').seedSQLite(path.join(dir,'economy','economy.sqlite'));
 for(const page of [a,b])await page.getByRole('button',{name:'Sunucudan yenile',exact:true}).click();
 await expect(a.getByRole('button',{name:'Takas teklif et',exact:true})).toHaveCount(1);
 await a.getByRole('button',{name:'Takas teklif et',exact:true}).click();
 await b.getByRole('button',{name:'Sunucudan yenile',exact:true}).click();
 await b.getByRole('button',{name:'Kabul et',exact:true}).click();
 await expect(a.locator('#trade-gold')).toBeVisible();
 await a.locator('#trade-gold').fill('40');await a.getByRole('button',{name:'Teklifi kaydet',exact:true}).click();
 await expect(a.locator('.trade-columns').first()).toContainText('40 altın');
 await a.getByRole('button',{name:'İki teklifi onayla',exact:true}).click();
 await expect(a.locator('.trade-columns')).toContainText('Onayladın');
 await b.getByRole('button',{name:'Sunucudan yenile',exact:true}).click();
 await expect(b.locator('.trade-columns section').nth(1)).toContainText('40 altın');
 await b.locator('#trade-gold').fill('10');await b.getByRole('button',{name:'Teklifi kaydet',exact:true}).click();
 await expect(b.locator('.trade-columns section').first()).toContainText('10 altın');
 await a.getByRole('button',{name:'Sunucudan yenile',exact:true}).click();
 await expect(a.locator('.trade-columns')).not.toContainText('Onayladın');
 await b.screenshot({path:testInfo.outputPath('mobile-offer.png')});
 const bounds=await b.locator('.trade-panel').evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth}));
 expect(bounds.width).toBeLessThanOrEqual(390);expect(bounds.scroll).toBeLessThanOrEqual(bounds.client+1);
 await b.reload();await b.locator('.trade-pop').getByRole('button',{name:'Takasa dön'}).click();await expect(b.locator('#trade-gold')).toHaveValue('10');
 await a.getByRole('button',{name:'İki teklifi onayla',exact:true}).click();
 await expect(a.locator('.trade-columns')).toContainText('Onayladın');
 await b.getByRole('button',{name:'Sunucudan yenile',exact:true}).click();
 await expect(b.locator('.trade-columns')).toContainText('Karşı oyuncu onayladı');
 // Commit on the real server, then drop only the HTTP response seen by the player.
 let droppedResolve;const dropped=new Promise(resolve=>droppedResolve=resolve);
 await b.route('**/api/trade',async route=>{
  const response=await route.fetch();expect(response.ok()).toBeTruthy();
  expect((await response.json()).trade.status).toBe('completed');
  await route.abort();droppedResolve();
 });
 await b.getByRole('button',{name:'İki teklifi onayla',exact:true}).click();
 await dropped;
 await expect(b.getByRole('button',{name:'Sonucu doğrula / yeniden dene',exact:true})).toBeVisible();
 await expect(b.locator('.trade-result')).toHaveCount(0);
 await b.screenshot({path:testInfo.outputPath('mobile-lost-response.png')});
 await b.unroute('**/api/trade');
 await b.getByRole('button',{name:'Sonucu doğrula / yeniden dene',exact:true}).click();
 for(const page of [a,b]){await page.getByRole('button',{name:'Sunucudan yenile',exact:true}).click();await expect(page.locator('.trade-result')).toContainText('Takas tamamlandı');}
 await expect(a.getByTestId('server-gold')).toHaveText('390 altın');await expect(b.getByTestId('server-gold')).toHaveText('450 altın');
 await b.screenshot({path:testInfo.outputPath('mobile-completed.png')});
 // A previous completed trade must not look like success for an uncertain new invitation.
 let failedResolve;const failed=new Promise(resolve=>failedResolve=resolve);
 await a.route('**/api/trade',async route=>{await route.abort();failedResolve();});
 await a.getByRole('button',{name:'Takas teklif et',exact:true}).click();
 await failed;
 await expect(a.getByRole('button',{name:'Sonucu doğrula / yeniden dene',exact:true})).toBeVisible();
 await expect(a.locator('.trade-result')).toHaveCount(0);
 await a.screenshot({path:testInfo.outputPath('uncertain-invitation.png')});
 await a.unroute('**/api/trade');
 await a.getByRole('button',{name:'Sonucu doğrula / yeniden dene',exact:true}).click();
 await expect(a.locator('.trade-panel')).toContainText('Davet gönderildi');
 await a.getByRole('button',{name:'Takası iptal et',exact:true}).click();
 await expect(a.locator('.trade-result')).toContainText('Takas iptal edildi');
 await expect(a.getByTestId('server-gold')).toHaveText('390 altın');
 await b.getByRole('button',{name:'Sunucudan yenile',exact:true}).click();
 await expect(b.getByTestId('server-gold')).toHaveText('450 altın');
 await b.keyboard.press('Escape');await expect(b.locator('.trade-panel')).not.toBeVisible();
 await ca.close();await cb.close();
});
