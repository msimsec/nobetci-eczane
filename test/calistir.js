// Uygulama testi ("npm test"). www/ http üzerinden açılır; aeo.org.tr ve nominatim istekleri kayıtlı cevapla karşılanır,
// uygulama davranışı için window.Capacitor taklit edilir. Gerçek siteye istek gitmez.
// Playwright gerekir (depoya bağımlılık olarak eklenmedi):  npm i -D playwright && npx playwright install chromium
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright bulunamadı. Kurmak için:  npm i -D playwright && npx playwright install chromium'); process.exit(1); }

const KOK = path.join(__dirname, '..', 'www');
const YAPAY = fs.readFileSync(path.join(__dirname, 'ornek', 'yapay.html'), 'utf8');
const KAYSERI = fs.readFileSync(path.join(__dirname, 'ornek', 'kayseri.html'), 'utf8');
const MERSIN = fs.readFileSync(path.join(__dirname, 'ornek', 'mersin.html'), 'utf8');
const GERCEK_YOL = path.join(__dirname, 'ornek', 'gercek.json');
const TUR = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2' };
const uyari = (son, nobet) => '<div class="alert alert-nobet">' + son + " saat 09:30'a kadar " + nobet + ' tarihli nöbet listesi geçerlidir.</div>';

const sunucu = http.createServer((q, r) => {
  const yol = path.join(KOK, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!yol.startsWith(KOK) || !fs.existsSync(yol)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': TUR[path.extname(yol)] || 'application/octet-stream' });
  fs.createReadStream(yol).pipe(r);
});

// Capacitor taklidi: uygulama yerel HTTP yolunu (CapacitorHttp) kullanır.
const CAP = () => {
  window.Capacitor = { isNativePlatform: () => true, Plugins: { CapacitorHttp: {
    get: async o => { const r = await fetch(o.url); return { status: r.status, data: await r.text() }; }
  } } };
};

(async () => {
  await new Promise(c => sunucu.listen(0, '127.0.0.1', c));
  const adres = 'http://127.0.0.1:' + sunucu.address().port + '/';
  const tarayici = await chromium.launch();
  let gecen = 0, kalan = 0;

  // ayar: { konum: [lat, lon] (telefon konumu; verilmezse izin yok),
  //         saat, cevap(url) → html | null (bağlantı yok) | {bozuk}, yer: [lat, lon] | null, sahteSaat }
  async function sayfaAc(ayar) {
    const ctx = await tarayici.newContext(Object.assign({ viewport: { width: 390, height: 800 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' },
      ayar.konum ? { geolocation: { latitude: ayar.konum[0], longitude: ayar.konum[1] }, permissions: ['geolocation'] } : {}));
    const page = await ctx.newPage();
    const durum = { ayar, istekler: [], yerIstek: [], hata: [] };
    page.on('console', m => { if (m.type() === 'error' && !/net::ERR_INTERNET_DISCONNECTED/.test(m.text())) durum.hata.push(m.text()); });
    page.on('pageerror', e => durum.hata.push(String(e)));
    await page.addInitScript(CAP);
    // Ses eklentisi taklidi: çağrıları kaydeder; okuma bitişini test tetikler (window.__ses.bitir(kimlik)).
    if (ayar.ses) await page.addInitScript(() => {
      const k = window.__ses = { oku: [], sus: 0, dinle: null, bitir: id => k.dinle && k.dinle({ kimlik: id }) };
      window.Capacitor.Plugins.Ses = { durum: async () => ({ var: false }), oku: async o => { k.oku.push(o); return { ok: true }; },
        sus: async () => { k.sus++; }, addListener: (ad, fn) => { if (ad === 'okumaBitti') k.dinle = fn; } };
    });
    if (ayar.sahteSaat) await page.clock.install({ time: new Date(ayar.saat) });
    else await page.clock.setFixedTime(new Date(ayar.saat));
    await ctx.route('https://www.aeo.org.tr/**', async route => {
      durum.istekler.push(route.request().url());
      const c = await durum.ayar.cevap(route.request().url());
      if (c === null) return route.abort('internetdisconnected');
      const govde = typeof c === 'string' ? JSON.stringify({ status: 'success', html: c }) : c.bozuk;
      return route.fulfill({ status: 200, contentType: 'text/html; charset=UTF-8', headers: { 'access-control-allow-origin': '*' }, body: govde });
    });
    // Kayseri / Mersin: sayfanın kendisi okunur. ayar.kayseri / ayar.mersin → html | null (bağlantı yok)
    for (const [ad, host] of [['kayseri', 'www.kayserieo.org.tr'], ['mersin', 'www.mersineczaciodasi.org.tr']]) {
      await ctx.route('https://' + host + '/**', async route => {
        durum.istekler.push(route.request().url());
        const c = durum.ayar[ad] ? await durum.ayar[ad]() : null;
        if (c === null) return route.abort('internetdisconnected');
        return route.fulfill({ status: 200, contentType: 'text/html; charset=UTF-8', headers: { 'access-control-allow-origin': '*' }, body: c });
      });
    }
    await ctx.route('https://nominatim.openstreetmap.org/**', route => {
      durum.yerIstek.push(decodeURIComponent(route.request().url()));
      const y = durum.ayar.yer;
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(y ? [{ lat: String(y[0]), lon: String(y[1]) }] : []) });
    });
    await page.goto(adres);
    return { ctx, page, durum };
  }
  async function dene(ad, fn) {
    try { await fn(); gecen++; console.log('  geçti  ' + ad); }
    catch (e) { kalan++; console.log('  KALDI  ' + ad + '\n         ' + String(e && e.message || e).split('\n').join('\n         ')); }
  }
  const metin = (page, sec) => page.locator(sec).innerText();
  const adlar = page => page.locator('#list .p-name').allInnerTexts();

  await dene('liste ayrıştırılır, ilçe ve şehir doğru atanır', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY });
    await page.waitForSelector('#list .ph');
    assert.deepStrictEqual(durum.istekler, ['https://www.aeo.org.tr/getPharmacies/2026-11-21']);
    assert.strictEqual((await adlar(page)).length, 5);                       // Ankara: 5 (adsız kutu sayılmaz)
    assert.strictEqual(await metin(page, '#heroCount'), '5');
    assert.strictEqual(await metin(page, '#heroDate'), '21 Kasım Cumartesi');
    assert.strictEqual(await page.locator('#oldBox').isHidden(), true);
    const ilk = page.locator('#list .ph').first();
    assert.strictEqual(await ilk.locator('.p-name').innerText(), 'CİNNAH ÖRNEK ECZANESİ');
    assert.strictEqual(await ilk.locator('.p-addr').innerText(), 'Cinnah Cad. No:12/A Çankaya');
    assert.strictEqual(await ilk.locator('.p-note').innerText(), 'Kuğulu Park karşısı');
    assert.strictEqual(await ilk.locator('.p-phone').innerText(), '0 (312) 555 01 01');
    assert.strictEqual(await ilk.locator('a.call').getAttribute('href'), 'tel:03125550101');
    assert.strictEqual(await ilk.locator('.p-act a').nth(1).getAttribute('href'), 'https://www.google.com/maps/dir/?api=1&destination=39.9015,32.861');
    // "Kazan" → Kahramankazan; telefon yalnız tel: bağlantısında olsa da okunur
    assert.ok((await page.locator('#list .p-dist').allInnerTexts()).includes('Kahramankazan'));
    assert.strictEqual(await page.locator('#list .ph', { hasText: 'ETLİK' }).locator('a.call').getAttribute('href'), 'tel:03125550303');
    // Kırıkkale: ilçe "Kırıkkale" → Merkez, "Belirlenmemiş" + adreste Kırıkkale → Kırıkkale / ilçesiz
    await page.click('#cityBtn'); await page.click('#pickList .opt:has-text("Kırıkkale")');
    assert.strictEqual((await adlar(page)).length, 3);
    assert.deepStrictEqual((await page.locator('#list .p-dist').allInnerTexts()).sort(), ['Keskin', 'Merkez']);
    // İçerik güvenlik politikası hiçbir şeyi engellemedi, yazı tipi yüklendi, sürüm package.json ile aynı
    assert.deepStrictEqual(durum.hata, []);
    assert.strictEqual(await page.evaluate(() => document.fonts.check('16px Inter')), true);
    await page.click('#appTabs button[data-tab="ayarlar"]');
    assert.strictEqual(await metin(page, '#aboutVer'), 'Sürüm ' + require('../package.json').version);
    await ctx.close();
  });

  await dene('siteden gelen metin HTML olarak çalışmaz, bağlantılar kodda üretilir', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY });
    await page.waitForSelector('#list .ph');
    const kart = page.locator('#list .ph', { hasText: 'onerror' });
    assert.strictEqual(await kart.locator('.p-name').innerText(), '<img src=x onerror=window.__xss=1> ECZANESİ');
    assert.strictEqual(await page.locator('#list img, #list b').count(), 0);
    assert.strictEqual(await page.evaluate(() => window.__xss), undefined);
    assert.strictEqual(await kart.locator('a.call').getAttribute('href'), null);           // "abc" telefon değil
    const harita = await kart.locator('.p-act a').nth(1).getAttribute('href');             // 99.9 enlem geçersiz → adla arama
    assert.ok(harita.startsWith('https://www.google.com/maps/dir/?api=1&destination=%3Cimg'), harita);
    assert.strictEqual(await page.locator('#list a[href^="javascript"]').count(), 0);
    await ctx.close();
  });

  await dene('sitenin uyarısı: nöbet günü ve geçerlilik saati okunur, saat geçince liste kendiliğinden yenilenir', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-22T08:00:00+03:00', sahteSaat: true,
      cevap: () => uyari('22.11.2026', '21.11.2026') + YAPAY });
    await page.waitForSelector('#list .ph');
    assert.deepStrictEqual(durum.istekler, ['https://www.aeo.org.tr/getPharmacies/2026-11-22']);
    assert.strictEqual(await metin(page, '#heroDate'), '21 Kasım Cumartesi');
    assert.ok((await metin(page, '#noticeBox')).includes("09:30'a kadar"));
    assert.strictEqual(await page.locator('#oldBox').isHidden(), true);
    durum.ayar.cevap = () => YAPAY.replace('CİNNAH', 'PAZAR');                              // 09:30'dan sonra yeni liste
    await page.clock.fastForward(91 * 60000);
    await page.waitForSelector('#list .p-name:has-text("PAZAR")');
    assert.strictEqual(durum.istekler.length, 2);
    assert.strictEqual(await metin(page, '#heroDate'), '22 Kasım Pazar');
    assert.strictEqual(await page.locator('#noticeBox').isHidden(), true);
    await ctx.close();
  });

  await dene('eski liste: yenisi beklenirken gösterilmez, alınamazsa uyarıyla gösterilir', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY });
    await page.waitForSelector('#list .ph');
    // Ertesi gün öğleden sonra: önbellekte dünün listesi var, istek bekliyor
    let birak; const bekle = new Promise(c => { birak = c; });
    durum.ayar.cevap = async () => { await bekle; return null; };
    await page.clock.setFixedTime(new Date('2026-11-22T14:00:00+03:00'));
    await page.reload();
    await page.waitForSelector('#list .skel');
    assert.strictEqual(await page.locator('#list .ph').count(), 0);
    assert.strictEqual(await metin(page, '#heroCount'), '–');
    birak();
    await page.waitForSelector('#oldBox:not([hidden])');
    assert.strictEqual((await adlar(page)).length, 5);
    const u = await metin(page, '#oldText');
    assert.ok(u.includes('21 Kasım Cumartesi nöbetine ait') && u.includes('20:00'), u);
    // Yeniden dene: liste gelince uyarı kalkar
    durum.ayar.cevap = () => YAPAY;
    await page.click('#oldRetry');
    await page.waitForSelector('#heroDate:has-text("22 Kasım Pazar")');
    assert.strictEqual(await page.locator('#oldBox').isHidden(), true);
    await ctx.close();
  });

  await dene('sitenin söylediği saat geçmiş ve liste yenilenemiyorsa uyarı çıkar; saat geçmemişse çıkmaz', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-22T08:00:00+03:00', cevap: () => uyari('22.11.2026', '21.11.2026') + YAPAY });
    await page.waitForSelector('#list .ph');
    durum.ayar.cevap = () => null;
    await page.clock.setFixedTime(new Date('2026-11-22T09:10:00+03:00'));                   // 30 dk'dan eski ama hâlâ geçerli
    await page.reload();
    await page.waitForSelector('#footNote:has-text("çevrimdışı")');
    assert.strictEqual(await page.locator('#oldBox').isHidden(), true);
    await page.clock.setFixedTime(new Date('2026-11-22T09:31:00+03:00'));
    await page.reload();
    await page.waitForSelector('#oldBox:not([hidden])');
    assert.strictEqual(await page.locator('#noticeBox').isHidden(), true);
    await ctx.close();
  });

  await dene('arama: cadde eşleşir; eşleşme yoksa en yakın üç eczane mesafeyle gelir', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, yer: [39.9690, 32.8310] });
    await page.waitForSelector('#list .ph');
    await page.click('#distBtn'); await page.click('#pickList .opt:has-text("Keçiören")');
    await page.fill('#searchInput', 'cinnah caddesinde nöbetçi eczane');
    await page.waitForSelector('#resultBox:not([hidden])');
    assert.deepStrictEqual(await adlar(page), ['CİNNAH ÖRNEK ECZANESİ']);                   // ilçe seçimi aramayı daraltmaz
    await page.fill('#searchInput', 'alipaşa');
    await page.waitForSelector('#list .p-name:has-text("ALİ PAŞA")');
    await page.fill('#searchInput', 'Ovacık');
    await page.waitForSelector('#nearBtn');
    assert.strictEqual(durum.yerIstek.length, 0);                                           // yazarken dışarı istek gitmez
    await page.press('#searchInput', 'Enter');
    await page.waitForSelector('#list .ph.near');
    assert.strictEqual(durum.yerIstek.length, 1);
    assert.ok(durum.yerIstek[0].includes('q=Ovacık, Ankara, Türkiye'), durum.yerIstek[0]);
    assert.ok(durum.yerIstek[0].includes('bounded=1&viewbox=30.8,40.8,34.1,38.6'), durum.yerIstek[0]);
    assert.strictEqual((await adlar(page))[0], 'ETLİK ECZANESİ');
    assert.strictEqual((await adlar(page)).length, 3);
    assert.strictEqual(await page.locator('#list .ph.near .p-dist').first().innerText(), '150 m');
    await ctx.close();
  });

  await dene('arama: seçili ilçedeki eşleşme üstte, diğerleri "Diğer ilçelerde" başlığı altında', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY });
    await page.waitForSelector('#list .ph');
    await page.fill('#searchInput', 'etlik');
    await page.waitForSelector('#resultBox:not([hidden])');
    assert.deepStrictEqual(await adlar(page), ['ETLİK ECZANESİ', 'KAZAN ECZANESİ']);        // ilçe seçili değil: başlık yok
    assert.strictEqual(await page.locator('#list .sub-head').count(), 0);
    await page.click('#searchClear');
    await page.click('#distBtn'); await page.click('#pickList .opt:has-text("Kahramankazan")');
    await page.fill('#searchInput', 'etlik');
    await page.waitForSelector('#list .sub-head');
    assert.deepStrictEqual(await page.locator('#list > *').evaluateAll(l => l.map(e => e.className === 'sub-head' ? '— ' + e.textContent : e.querySelector('.p-name').textContent)),
      ['KAZAN ECZANESİ', '— Diğer ilçelerde', 'ETLİK ECZANESİ']);
    assert.ok((await metin(page, '#resultText')).includes('2 nöbetçi eczane bulundu (Kahramankazan ilçesinde 1)'));
    await page.fill('#searchInput', 'cinnah');                                              // seçili ilçede yok
    await page.waitForSelector('#list .p-name:has-text("CİNNAH")');
    assert.ok((await metin(page, '#resultText')).includes('(Kahramankazan ilçesinde yok)'));
    assert.strictEqual(await page.locator('#list > *').first().innerText(), 'Diğer ilçelerde');
    await ctx.close();
  });

  await dene('arama: yazım / ses tanıma hatasında benzer adres gelir, istenirse en yakına bakılır', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, yer: [39.9690, 32.8310] });
    await page.waitForSelector('#list .ph');
    await page.fill('#searchInput', 'cinah caddesi');
    await page.waitForSelector('#resultBox.warn:not([hidden])');
    assert.ok((await metin(page, '#resultText')).includes('tam eşleşme yok'));
    assert.deepStrictEqual(await adlar(page), ['CİNNAH ÖRNEK ECZANESİ']);
    await page.fill('#searchInput', 'yunuz emre');                                          // iki sözcük, biri hatalı
    await page.waitForSelector('#list .p-name:has-text("ETLİK")');
    await page.fill('#searchInput', 'no 13');                                               // sayı benzerlikle eşleşmez (No:12 var)
    await page.waitForSelector('#list .empty');
    await page.fill('#searchInput', 'cinah');
    await page.waitForSelector('#list .more #nearBtn');
    assert.strictEqual(durum.yerIstek.length, 0);
    await page.click('#nearBtn');
    await page.waitForSelector('#list .ph.near');
    assert.strictEqual(durum.yerIstek.length, 1);
    await ctx.close();
  });

  await dene('konum araması: il dışında çıkan yer sayılmaz', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, yer: [41.0082, 28.9784] });
    await page.waitForSelector('#list .ph');
    await page.fill('#searchInput', 'Ovacık'); await page.press('#searchInput', 'Enter');
    await page.waitForSelector('#resultBox.warn:not([hidden])');
    assert.ok((await metin(page, '#resultText')).includes('diye bir yer bulunamadı'));
    assert.strictEqual(await page.locator('#list .ph').count(), 0);
    await ctx.close();
  });

  await dene('konumuma en yakın: beş eczane mesafeyle gelir, şehir seçimine bakmaz, konum dışarı gitmez', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, konum: [39.8465, 33.5160] });
    await page.waitForSelector('#list .ph');
    await page.click('#locBtn');                                                            // seçili şehir Ankara, konum Kırıkkale
    await page.waitForSelector('#list .ph.near');
    assert.strictEqual((await adlar(page)).length, 5);
    assert.strictEqual((await adlar(page))[0], 'MERKEZ ECZANESİ');
    assert.strictEqual(await page.locator('#list .ph.near .p-dist').first().innerText(), '100 m');
    assert.ok((await metin(page, '#resultText')).includes('Konumunuza en yakın 5 nöbetçi eczane'));
    assert.strictEqual(await metin(page, '#listTitle'), 'Size en yakın');
    assert.strictEqual(durum.yerIstek.length, 0);
    assert.strictEqual(durum.istekler.length, 1);
    await page.click('#resultClose');                                                       // listeye dönüş
    await page.waitForSelector('#resultBox', { state: 'hidden' });
    assert.strictEqual(await page.locator('#list .ph.near').count(), 0);
    // Ayarlar'dan kapatılınca düğme gizlenir
    await page.click('#appTabs button[data-tab="ayarlar"]');
    await page.locator('#setLoc').uncheck();
    await page.click('#appTabs button[data-tab="liste"]');
    assert.strictEqual(await page.locator('#locBtn').isHidden(), true);
    assert.deepStrictEqual(durum.hata, []);
    await ctx.close();
  });

  await dene('konumuma en yakın: izin verilmezse açıklama çıkar, liste bozulmaz', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY });
    await page.waitForSelector('#list .ph');
    await page.click('#locBtn');
    await page.waitForSelector('#resultBox.warn:not([hidden])');
    assert.ok((await metin(page, '#resultText')).includes('Konum izni verilmedi'));
    await page.click('#resultClose');
    await page.waitForSelector('#list .ph');
    assert.strictEqual((await adlar(page)).length, 5);
    await ctx.close();
  });

  await dene('seçim penceresi: odak içeride döner, arkadaki sayfa etkisizdir, kapanınca düğmeye döner', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY });
    await page.waitForSelector('#list .ph');
    await page.click('#cityBtn');
    const icinde = () => page.evaluate(() => document.getElementById('pickBd').contains(document.activeElement));
    assert.strictEqual(await page.evaluate(() => document.querySelector('.app').inert && document.getElementById('appTabs').inert), true);
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); assert.strictEqual(await icinde(), true, 'Tab ' + i); }
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Shift+Tab'); assert.strictEqual(await icinde(), true, 'Shift+Tab ' + i); }
    await page.keyboard.press('Escape');
    assert.strictEqual(await page.evaluate(() => document.querySelector('.app').inert || document.getElementById('appTabs').inert), false);
    assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'cityBtn');
    await ctx.close();
  });

  const sehirSec = async (page, ad) => { await page.click('#cityBtn'); await page.click('#pickList .opt:has-text("' + ad + '")'); };
  const kartlar = page => page.locator('#list .ph').evaluateAll(l => l.map(e => e.querySelector('.p-name').textContent + ' | ' + (e.querySelector('.p-hours') || {}).textContent));

  await dene('Kayseri: sayfa ayrıştırılır, nöbet saatleri görünür; nöbeti biten eczane sona düşer ve sayılmaz', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-22T14:00:00+03:00', cevap: () => YAPAY, kayseri: () => KAYSERI });
    await page.waitForSelector('#list .ph');
    await sehirSec(page, 'Kayseri');
    await page.waitForSelector('#list .p-name:has-text("ŞUBAT")');
    assert.strictEqual(durum.istekler[1], 'https://www.kayserieo.org.tr/nobetci-eczaneler');
    assert.deepStrictEqual(await kartlar(page), [
      'ŞUBAT ECZANESİ | Nöbet: 08:30 – yarın 08:30', 'SOYLU ECZANESİ | Nöbet: 08:30 – yarın 08:30',
      'İSTASYON ECZANESİ | Nöbet: 08:30 – yarın 01:00', 'ÇAKMAK ECZANESİ | Nöbet: 08:30 – yarın 01:00']);
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
      'ŞUBAT ECZANESİ | Nöbet: dün 08:30 – 08:30', 'SOYLU ECZANESİ | Nöbet: dün 08:30 – 08:30',
      'İSTASYON ECZANESİ | Nöbeti bitti · dün 08:30 – 01:00', 'ÇAKMAK ECZANESİ | Nöbeti bitti · dün 08:30 – 01:00']);
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
      'DAMLA ECZANESİ | Nöbet: 08:00 – yarın 08:00', 'SAĞLAM ECZANESİ | Nöbet: 08:00 – yarın 00:00', 'SOFİA ECZANESİ | Nöbet: 08:00 – yarın 08:00',
      'DARENDE ECZANESİ | Nöbet: 08:00 – yarın 08:00', 'SUSANOĞLU ECZANESİ | Nöbeti bitti · 08:00 – 19:00']);
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
      'DAMLA ECZANESİ | Nöbet: dün 08:00 – 08:00', 'SOFİA ECZANESİ | Nöbet: dün 08:00 – 08:00', 'DARENDE ECZANESİ | Nöbet: dün 08:00 – 08:00',
      'YARINKİ ECZANESİ | Nöbeti henüz başlamadı · 08:00 – yarın 08:00', 'ÖBÜR ECZANESİ | Nöbeti henüz başlamadı · 08:00 – yarın 00:00',
      'BAŞKA ECZANESİ | Nöbeti henüz başlamadı · 08:00 – yarın 08:00', 'DİĞER ECZANESİ | Nöbeti henüz başlamadı · 08:00 – yarın 08:00',
      'SON ECZANESİ | Nöbeti henüz başlamadı · 08:00 – 19:00']);
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

  await dene('sesli okuma: hoparlör düğmesi okurken "durdur" olur, basınca okuma kesilir, bitince kendiliğinden döner', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, ses: true });
    await page.waitForSelector('#list .ph');
    await page.fill('#searchInput', 'cinnah'); await page.press('#searchInput', 'Enter');
    await page.waitForSelector('#speakBtn:not([hidden])');
    const durumu = () => page.evaluate(() => ({ on: document.getElementById('speakBtn').classList.contains('on'),
      ad: document.getElementById('speakBtn').getAttribute('aria-label'), oku: window.__ses.oku.length, sus: window.__ses.sus }));
    assert.deepStrictEqual(await durumu(), { on: false, ad: 'Sonucu sesli oku', oku: 0, sus: 0 });   // yazılı aramada kendiliğinden okumaz
    await page.click('#speakBtn');
    assert.deepStrictEqual(await durumu(), { on: true, ad: 'Okumayı durdur', oku: 1, sus: 0 });
    await page.click('#speakBtn');                                                          // okurken basınca durur
    let d = await durumu();
    assert.deepStrictEqual([d.on, d.ad, d.oku], [false, 'Sonucu sesli oku', 1]); assert.ok(d.sus >= 1);
    await page.click('#speakBtn');                                                          // yeniden okut, bitiş haberi gelsin
    assert.strictEqual((await durumu()).on, true);
    await page.evaluate(() => window.__ses.bitir('eski-okuma'));                            // başka okumanın haberi sayılmaz
    assert.strictEqual((await durumu()).on, true);
    await page.evaluate(() => window.__ses.bitir(window.__ses.oku[window.__ses.oku.length - 1].kimlik));
    assert.strictEqual((await durumu()).on, false);
    await page.click('#speakBtn');                                                          // okurken arama kapatılırsa da durur
    await page.click('#resultClose');
    d = await durumu(); assert.strictEqual(d.on, false); assert.ok(d.sus >= 2);
    await ctx.close();
  });

  await dene('bozuk ya da boş cevapta "Liste alınamadı" ve ayrıntı görünür', async () => {
    let s = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => '<div class="baska-yapi">yok</div>' });
    await s.page.waitForSelector('#retryBtn');
    assert.ok((await metin(s.page, '#list')).includes('içinde eczane bulunamadı'));
    await s.ctx.close();
    s = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => ({ bozuk: '<html>Bakım</html>' }) });
    await s.page.waitForSelector('#retryBtn');
    assert.ok((await metin(s.page, '#list')).includes('beklenen cevap gelmedi'));
    await s.ctx.close();
  });

  if (fs.existsSync(GERCEK_YOL)) {
    await dene('kayıtlı gerçek cevap ayrıştırılır (test/ornek/gercek.json)', async () => {
      const g = JSON.parse(fs.readFileSync(GERCEK_YOL, 'utf8'));
      const { ctx, page } = await sayfaAc({ saat: g.tarih + 'T20:00:00+03:00', cevap: () => g.html });
      await page.waitForSelector('#list .ph');
      const o = await page.evaluate(() => ({ n: data.list.length, adres: data.list.filter(p => p.address).length,
        yer: data.list.filter(p => p.lat != null).length, tel: data.list.filter(p => telHref(p.phone)).length,
        ilce: data.list.filter(p => p.district !== OTHER).length }));
      assert.ok(o.n >= 20, 'eczane sayısı az: ' + o.n);
      for (const k of ['adres', 'yer', 'tel', 'ilce']) assert.ok(o[k] >= o.n * 0.9, k + ' eksik: ' + o[k] + ' / ' + o.n);
      await ctx.close();
    });
  } else console.log('  atlandı  kayıtlı gerçek cevap yok (npm run ornek:al ile alınır)');

  for (const [ad, sehir] of [['kayseri', 'Kayseri'], ['mersin', 'Mersin']]) {
    const yol = path.join(__dirname, 'ornek', 'gercek-' + ad + '.html');
    if (!fs.existsSync(yol)) continue;
    await dene('kayıtlı gerçek sayfa ayrıştırılır (test/ornek/gercek-' + ad + '.html)', async () => {
      const html = fs.readFileSync(yol, 'utf8'), gun = /^<!-- (\d{4}-\d{2}-\d{2}) /.exec(html);
      const { ctx, page } = await sayfaAc({ saat: (gun ? gun[1] : '2026-11-22') + 'T20:00:00+03:00', cevap: () => YAPAY, [ad]: () => html });
      await page.waitForSelector('#list .ph');
      await sehirSec(page, sehir);
      await page.waitForFunction(c => data && data.list.some(p => p.city === c), sehir);
      const o = await page.evaluate(() => ({ n: data.list.length, adres: data.list.filter(p => p.address).length, yer: data.list.filter(p => p.lat != null).length,
        tel: data.list.filter(p => telHref(p.phone)).length, ilce: data.list.filter(p => p.district !== OTHER).length, saat: data.list.filter(p => p.from && p.to).length }));
      assert.ok(o.n >= 3, 'eczane sayısı az: ' + o.n);
      for (const k of ['adres', 'yer', 'tel', 'ilce', 'saat']) assert.ok(o[k] >= o.n * 0.9, k + ' eksik: ' + o[k] + ' / ' + o.n);
      await ctx.close();
    });
  }

  await tarayici.close(); sunucu.close();
  console.log('\n' + gecen + ' geçti, ' + kalan + ' kaldı');
  process.exit(kalan ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
