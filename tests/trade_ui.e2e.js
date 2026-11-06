const {test,expect}=require('@playwright/test');
const {fork}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {once}=require('node:events');
let child,dir,url;
test.beforeAll(async()=>{
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'eo-trade-ui-'));
 child=fork('-e',[`const http=require('node:http');const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>{process.env.PUBLIC_URL='http://127.0.0.1:'+port;const {server}=require(${JSON.stringify(require.resolve('../server'))});process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});server.listen(port,'127.0.0.1',()=>process.send({port}));});});`],{env:{...process.env,NODE_ENV:'test',ECONOMY_BACKEND:'sqlite',DATA_DIR:path.join(dir,'world'),LOCAL_ECONOMY_DIR:path.join(dir,'economy')},silent:true});
 child.stdout.resume();child.stderr.on('data',d=>process.stderr.write(d));
 const [info]=await once(child,'message');url='http://127.0.0.1:'+info.port;
});
test.afterAll(async()=>{if(child?.exitCode===null){const exited=once(child,'exit');child.send('stop');await exited;}if(dir)fs.rmSync(dir,{recursive:true,force:true});});
test('two authenticated player sessions trade inside the game, including mobile and reload',async({browser},testInfo)=>{
 const ca=await browser.newContext({viewport:{width:1280,height:800}}),cb=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const a=await ca.newPage(),b=await cb.newPage();
 for(const page of [a,b]){
  await page.goto(url);await page.locator('.trade-entry').click();
  await page.getByRole('button',{name:'Sunucu hesabını hazırla',exact:true}).click();
  await expect(page.getByTestId('server-gold')).toHaveText('420 altın');
 }
 await a.getByRole('button',{name:'Sunucudan yenile',exact:true}).click();
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
 await b.locator('#trade-gold').fill('10');await b.getByRole('button',{name:'Teklifi kaydet',exact:true}).click();
 await a.getByRole('button',{name:'Sunucudan yenile',exact:true}).click();
 await expect(a.locator('.trade-columns')).not.toContainText('Onayladın');
 await b.screenshot({path:testInfo.outputPath('mobile-offer.png')});
 const bounds=await b.locator('.trade-panel').evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth}));
 expect(bounds.width).toBeLessThanOrEqual(390);expect(bounds.scroll).toBeLessThanOrEqual(bounds.client+1);
 await b.reload();await b.locator('.trade-entry').click();await expect(b.locator('#trade-gold')).toHaveValue('10');
 await a.getByRole('button',{name:'İki teklifi onayla',exact:true}).click();
 // Commit on the real server, then drop only the HTTP response seen by the player.
 await b.route('**/api/trade',async route=>{await route.fetch();await route.abort();});
 await b.getByRole('button',{name:'İki teklifi onayla',exact:true}).click();
 await expect(b.getByRole('button',{name:'Sonucu doğrula / yeniden dene',exact:true})).toBeVisible();
 await expect(b.locator('.trade-result')).toHaveCount(0);
 await b.screenshot({path:testInfo.outputPath('mobile-lost-response.png')});
 await b.unroute('**/api/trade');
 await b.getByRole('button',{name:'Sonucu doğrula / yeniden dene',exact:true}).click();
 for(const page of [a,b]){await page.getByRole('button',{name:'Sunucudan yenile',exact:true}).click();await expect(page.locator('.trade-result')).toContainText('Takas tamamlandı');}
 await expect(a.getByTestId('server-gold')).toHaveText('390 altın');await expect(b.getByTestId('server-gold')).toHaveText('450 altın');
 await b.screenshot({path:testInfo.outputPath('mobile-completed.png')});
 // A previous completed trade must not look like success for an uncertain new invitation.
 await a.route('**/api/trade',route=>route.abort());
 await a.getByRole('button',{name:'Takas teklif et',exact:true}).click();
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
