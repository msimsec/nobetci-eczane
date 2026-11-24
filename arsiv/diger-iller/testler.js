// ARŞİV: Kayseri / Mersin testleri (test/calistir.js'ten çıkarıldı). Bu dosya çalıştırılmaz.
// Geri eklemek için: (1) dosya başına KAYSERI ve MERSIN örneklerini okuyan satırlar, (2) sayfaAc içine aşağıdaki yol tanımı,
// (3) testler 'sesli okuma' testinden önceye konur.

// (1)
// const KAYSERI = fs.readFileSync(path.join(__dirname, 'ornek', 'kayseri.html'), 'utf8');
// const MERSIN = fs.readFileSync(path.join(__dirname, 'ornek', 'mersin.html'), 'utf8');

// (2) sayfaAc içinde
    // Kayseri / Mersin: sayfanın kendisi okunur. ayar.kayseri / ayar.mersin → html | null (bağlantı yok)
    for (const [ad, host] of [['kayseri', 'www.kayserieo.org.tr'], ['mersin', 'www.mersineczaciodasi.org.tr']]) {
      await ctx.route('https://' + host + '/**', async route => {
        durum.istekler.push(route.request().url());
        const c = durum.ayar[ad] ? await durum.ayar[ad]() : null;
        if (c === null) return route.abort('internetdisconnected');
        return route.fulfill({ status: 200, contentType: 'text/html; charset=UTF-8', headers: { 'access-control-allow-origin': '*' }, body: c });
      });
    }

// (3) testler
  const sehirSec = async (page, ad) => { await page.click('#cityBtn'); await page.click('#pickList .opt:has-text("' + ad + '")'); };
  const kartlar = page => page.locator('#list .ph').evaluateAll(l => l.map(e => e.querySelector('.p-name').textContent + ' | ' + (e.querySelector('.p-hours') || {}).textContent));

  await dene('Kayseri: sayfa ayrıştırılır, nöbet saatleri görünür; nöbeti biten eczane sona düşer ve sayılmaz', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-22T14:00:00+03:00', cevap: () => YAPAY, kayseri: () => KAYSERI });
    await page.waitForSelector('#list .ph');
    await sehirSec(page, 'Kayseri');
    await page.waitForSelector('#list .p-name:has-text("ŞUBAT")');
    assert.strictEqual(durum.istekler[1], 'https://www.kayserieo.org.tr/nobetci-eczaneler');
    assert.deepStrictEqual(await kartlar(page), [
      'ŞUBAT ECZANESİ | Nöbetçi · bitiş yarın 08:30', 'SOYLU ECZANESİ | Nöbetçi · bitiş yarın 08:30',
      'İSTASYON ECZANESİ | Nöbetçi · bitiş yarın 01:00', 'ÇAKMAK ECZANESİ | Nöbetçi · bitiş yarın 01:00']);
    assert.deepStrictEqual(await page.locator('#list .p-dist').allInnerTexts(), ['Melikgazi', 'Kocasinan', 'Kocasinan', 'Talas']);
    const soylu = page.locator('#list .ph', { hasText: 'SOYLU' });
    assert.strictEqual(await soylu.locator('.p-addr').innerText(), 'GEVHER NESIBE MAH. GÖK GEÇIDI SOK. 13/D');
    assert.strictEqual(await soylu.locator('.p-note').innerText(), 'SYSTEM HOSPİTAL YANI');
    assert.strictEqual(await soylu.locator('.p-act a').nth(1).getAttribute('href'), 'https://www.google.com/maps/dir/?api=1&destination=38.725245,35.481343');
    const cakmak = page.locator('#list .ph', { hasText: 'ÇAKMAK' });                        // sitede baştaki 0 eksik
    assert.strictEqual(await cakmak.locator('a.call').getAttribute('href'), 'tel:03524373356');
    assert.strictEqual(await cakmak.locator('.p-phone').innerText(), '0 (352) 437 33 56');
    assert.strictEqual(await metin(page, '#heroDate'), '22 Kasım Pazar');
    assert.strictEqual(await metin(page, '#heroCount'), '4');
    assert.strictEqual(await metin(page, '#footNote').then(t => t.includes('Kayseri Eczacı Odası')), true);
    assert.deepStrictEqual(durum.hata, []);
    // Gece 02:00, bağlantı yok: 01:00'e kadar nöbetçi olanlar "bitti" olur, sona düşer, sayılmaz; liste hâlâ geçerli
    durum.ayar.kayseri = () => null;
    await page.clock.setFixedTime(new Date('2026-11-23T02:00:00+03:00'));
    await page.reload();
    await page.waitForSelector('#list .ph.off');
    assert.deepStrictEqual(await kartlar(page), [
      'ŞUBAT ECZANESİ | Nöbetçi · bitiş bugün 08:30', 'SOYLU ECZANESİ | Nöbetçi · bitiş bugün 08:30',
      'İSTASYON ECZANESİ | Nöbeti bitti · bugün 01:00', 'ÇAKMAK ECZANESİ | Nöbeti bitti · bugün 01:00']);
    assert.strictEqual(await metin(page, '#heroCount'), '2');
    assert.strictEqual(await page.locator('#oldBox').isHidden(), true);
    // Son nöbet de bitince (08:30) liste eski sayılır
    await page.clock.setFixedTime(new Date('2026-11-23T09:00:00+03:00'));
    await page.reload();
    await page.waitForSelector('#oldBox:not([hidden])');
    await ctx.close();
  });

  await dene('Mersin: ilçe başlıktan okunur; site yeni güne geçince nöbeti süren eski eczaneler korunur', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-22T20:00:00+03:00', cevap: () => YAPAY, mersin: () => MERSIN });
    await page.waitForSelector('#list .ph');
    await sehirSec(page, 'Mersin');
    await page.waitForSelector('#list .p-name:has-text("DAMLA")');
    assert.deepStrictEqual(await kartlar(page), [
      'DAMLA ECZANESİ | Nöbetçi · bitiş yarın 08:00', 'SAĞLAM ECZANESİ | Nöbetçi · bitiş bugün 24:00', 'SOFİA ECZANESİ | Nöbetçi · bitiş yarın 08:00',
      'DARENDE ECZANESİ | Nöbetçi · bitiş yarın 08:00', 'SUSANOĞLU ECZANESİ | Nöbeti bitti · bugün 19:00']);
    assert.deepStrictEqual(await page.locator('#list .p-dist').allInnerTexts(), ['Toroslar', 'Yenişehir', 'Mezitli', 'Tarsus', 'Silifke']);
    assert.strictEqual(await page.locator('#list .ph', { hasText: 'DAMLA' }).locator('.p-note').innerText(), 'ÇUKUROVA İLKOKULU VE TOZKOPARAN ASM KARŞISI');
    assert.strictEqual(await page.locator('#list .ph', { hasText: 'SOFİA' }).locator('.p-note').count(), 0);
    await page.fill('#searchInput', 'tarsus');                                              // ilçe adıyla arama
    await page.waitForSelector('#resultBox:not([hidden])');
    assert.deepStrictEqual(await adlar(page), ['DARENDE ECZANESİ']);
    await page.click('#resultClose');
    // 23 Kasım 03:00: site 23 Kasım listesine geçmiş (08:00'de başlayacak); dünün nöbeti süren eczaneleri kaybolmaz
    durum.ayar.mersin = () => MERSIN.replace(/22\.11\.2026/g, '23.11.2026').replace(/23\.11\.2026 (0[08]:00 nöb)/g, '24.11.2026 $1')
      .replace(/DAMLA/g, 'YARINKİ').replace(/SAĞLAM/g, 'ÖBÜR').replace(/SOFİA/g, 'BAŞKA').replace(/DARENDE/g, 'DİĞER').replace(/SUSANOĞLU/g, 'SON');
    await page.clock.setFixedTime(new Date('2026-11-23T03:00:00+03:00'));
    await page.reload();
    await page.waitForSelector('#list .p-name:has-text("YARINKİ")');
    assert.deepStrictEqual(await kartlar(page), [
      'DAMLA ECZANESİ | Nöbetçi · bitiş bugün 08:00', 'SOFİA ECZANESİ | Nöbetçi · bitiş bugün 08:00', 'DARENDE ECZANESİ | Nöbetçi · bitiş bugün 08:00',
      'YARINKİ ECZANESİ | Henüz nöbetçi değil · başlangıç bugün 08:00', 'ÖBÜR ECZANESİ | Henüz nöbetçi değil · başlangıç bugün 08:00',
      'BAŞKA ECZANESİ | Henüz nöbetçi değil · başlangıç bugün 08:00', 'DİĞER ECZANESİ | Henüz nöbetçi değil · başlangıç bugün 08:00',
      'SON ECZANESİ | Henüz nöbetçi değil · başlangıç bugün 08:00']);
    assert.deepStrictEqual(durum.hata, []);
    await ctx.close();
  });

  await dene('şehir değişince doğru kaynağın listesi gelir; kaynak yanıt vermezse o şehir için hata görünür', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-22T14:00:00+03:00', cevap: () => YAPAY, kayseri: () => KAYSERI });
    await page.waitForSelector('#list .ph');
    await sehirSec(page, 'Mersin');                                                         // mersin yanıt vermiyor
    await page.waitForSelector('#retryBtn');
    assert.strictEqual(await page.locator('#list .ph').count(), 0);
    await sehirSec(page, 'Kayseri');
    await page.waitForSelector('#list .p-name:has-text("ŞUBAT")');
    assert.strictEqual((await adlar(page)).length, 4);
    await sehirSec(page, 'Ankara');                                                         // kayıtlı liste hemen gelir
    await page.waitForSelector('#list .p-name:has-text("CİNNAH")');
    assert.strictEqual((await adlar(page)).length, 5);
    await page.click('#distBtn');
    assert.ok((await page.locator('#pickList .opt').allInnerTexts()).some(t => t.startsWith('Çankaya')));
    await ctx.close();
  });

  await dene('konumuma en yakın: konum başka ildeyse o ile geçer', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-22T14:00:00+03:00', cevap: () => YAPAY, kayseri: () => KAYSERI, konum: [38.7260, 35.4820] });
    await page.waitForSelector('#list .ph');
    await page.click('#locBtn');                                                            // seçili şehir Ankara, konum Kayseri
    await page.waitForSelector('#list .ph.near');
    assert.strictEqual((await adlar(page))[0], 'SOYLU ECZANESİ');
    await page.click('#resultClose');
    assert.strictEqual(await metin(page, '#cityBtn'), 'Kayseri');
    await ctx.close();
  });

