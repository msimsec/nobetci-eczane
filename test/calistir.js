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
    // Paylaşma / harita eklentisi taklidi: çağrıları window.__paylas içine kaydeder.
    if (ayar.paylas) await page.addInitScript(() => {
      const k = window.__paylas = { metin: [], harita: [] };
      window.Capacitor.Plugins.Paylas = { metin: async o => { k.metin.push(o); }, harita: async o => { k.harita.push(o); } };
    });
    await ctx.route('https://www.aeo.org.tr/**', async route => {
      durum.istekler.push(route.request().url());
      const c = await durum.ayar.cevap(route.request().url());
      if (c === null) return route.abort('internetdisconnected');
      const govde = typeof c === 'string' ? JSON.stringify({ status: 'success', html: c }) : c.bozuk;
      return route.fulfill({ status: 200, contentType: 'text/html; charset=UTF-8', headers: { 'access-control-allow-origin': '*' }, body: govde });
    });
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
    // Yardım: başlıklar kapalı gelir, dokununca açılır
    assert.strictEqual(await page.locator('#helpCard details').count(), 9);
    assert.strictEqual(await page.locator('#helpCard details[open]').count(), 0);
    await page.click('#helpCard summary:has-text("Sesli arama")');
    // Gizlilik metni uygulamada; iletişim adresi boşken geri bildirim kartı görünmez
assert.strictEqual(await page.locator('#privCard .pv-list li').count(), 12);                  // 5 söz + 7 izin / servis
    assert.ok((await metin(page, '#privCard')).includes('Hakkınızda veri toplamıyoruz'));
    assert.strictEqual(await page.locator('#fbCard').isVisible(), true);
    assert.ok((await page.locator('#fbBug').getAttribute('href')).startsWith('mailto:ankaraeczane@simsec.app?subject='));
    assert.ok(decodeURIComponent(await page.locator('#fbIdea').getAttribute('href')).includes('Önerim:'));
    const fb = await page.evaluate(() => [feedbackUrl('hata', 'ornek@example.com'), feedbackUrl('oneri', 'ornek@example.com')]);
    assert.ok(fb[0].startsWith('mailto:ornek@example.com?subject=') && decodeURIComponent(fb[0]).includes('Hata bildirimi') && decodeURIComponent(fb[0]).includes('Ne yapıyordum, ne oldu:'), fb[0]);
    assert.ok(decodeURIComponent(fb[1]).includes('Öneri') && decodeURIComponent(fb[1]).includes('Ankara Nöbetçi Eczane ' + require('../package.json').version), fb[1]);
    assert.strictEqual(await page.locator('#helpCard details[open] p').first().isVisible(), true);
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
  await dene('sonraki nöbet günü: liste ayrı istenir, uyarısıyla gösterilir; site vermiyorsa "yayımlanmamış" denir', async () => {
    const YARIN = YAPAY.replace(/CİNNAH/g, 'YARINKİ').replace(/ALİ PAŞA/g, 'ÖBÜR').replace(/ETLİK/g, 'BAŞKA');
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: url => url.endsWith('2026-11-22') ? YARIN : YAPAY });
    await page.waitForSelector('#list .ph');
    assert.deepStrictEqual(await page.locator('#daySeg button').allInnerTexts(), ['21 Kasım Cumartesi', '22 Kasım Pazar']);
    await page.click('#daySeg button[data-v="1"]');
    await page.waitForSelector('#list .p-name:has-text("YARINKİ")');
    assert.strictEqual(durum.istekler[1], 'https://www.aeo.org.tr/getPharmacies/2026-11-22');
    assert.strictEqual(await metin(page, '#heroDate'), '22 Kasım Pazar');
    assert.strictEqual(await metin(page, '#heroCount'), '5');
    assert.ok((await metin(page, '#noticeBox')).includes('sonraki nöbet gününün listesidir'));
    await page.fill('#searchInput', 'cinnah caddesi');                                      // arama gösterilen günde yapılır
    await page.waitForSelector('#resultBox:not([hidden])');
    assert.strictEqual((await adlar(page))[0], 'YARINKİ ÖRNEK ECZANESİ');
    assert.strictEqual((await adlar(page)).length, 1);
    await page.click('#resultClose');
    await page.click('#daySeg button[data-v="0"]');
    await page.waitForSelector('#list .p-name:has-text("CİNNAH")');
    assert.strictEqual(await metin(page, '#heroDate'), '21 Kasım Cumartesi');
    assert.strictEqual(await page.locator('#noticeBox').isHidden(), true);
    // Site sonraki gün için de bugünkü listeyi verirse sonraki gün diye gösterilmez
    durum.ayar.cevap = () => YAPAY;
    await page.evaluate(() => { nextData = null; });
    await page.click('#daySeg button[data-v="1"]');
    await page.waitForSelector('#dayBack');
    assert.ok((await metin(page, '#list')).includes('henüz yayımlanmamış'));
    assert.strictEqual(await metin(page, '#heroCount'), '–');
    await page.click('#dayBack');
    await page.waitForSelector('#list .p-name:has-text("CİNNAH")');
    assert.deepStrictEqual(durum.hata, []);
    await ctx.close();
  });

  await dene('paylaş: eczane bilgisi telefonun paylaşma penceresine gider', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, paylas: true });
    await page.waitForSelector('#list .ph');
    await page.locator('#list .ph', { hasText: 'CİNNAH' }).locator('button.share').click();
    const m = await page.evaluate(() => window.__paylas.metin);
    assert.strictEqual(m.length, 1);
    assert.strictEqual(m[0].baslik, 'CİNNAH ÖRNEK ECZANESİ');
    assert.strictEqual(m[0].metin, ['CİNNAH ÖRNEK ECZANESİ', 'Cinnah Cad. No:12/A Çankaya', 'Kuğulu Park karşısı', 'Tel: 0 (312) 555 01 01',
      'Nöbet günü: 21 Kasım Cumartesi', 'Yol tarifi: https://www.google.com/maps/dir/?api=1&destination=39.9015,32.861', 'Gitmeden önce eczaneyi arayın.'].join('\n'));
    // "Yanlış bilgi bildir": her kartta, destek adresine hazır e-posta
    assert.strictEqual(await page.locator('#list .p-rep').count(), 5);
    assert.ok(decodeURIComponent(await page.locator('#list .p-rep').first().getAttribute('href')).startsWith('mailto:ankaraeczane@simsec.app?subject=Nöbet bilgisi hatası: CİNNAH ÖRNEK ECZANESİ'));
    const h = await page.evaluate(() => reportHref(data.list[0], 'ornek@example.com'));
    assert.ok(h.startsWith('mailto:ornek@example.com?subject=') && decodeURIComponent(h).includes('Eczane: CİNNAH ÖRNEK ECZANESİ') && decodeURIComponent(h).includes('21 Kasım Cumartesi'), h);
    await ctx.close();
  });

  await dene('yakına göre: liste mesafeye göre sıralanır, kartta km yazar; konumsuz eczane sona düşer', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, konum: [39.9690, 32.8310] });
    await page.waitForSelector('#list .ph');
    assert.strictEqual((await adlar(page))[0], 'CİNNAH ÖRNEK ECZANESİ');
    await page.click('#sortBtn');
    await page.waitForSelector('#sortBtn.on');
    const a = await adlar(page);
    assert.deepStrictEqual([a[0], a[a.length - 1]], ['ETLİK ECZANESİ', '<img src=x onerror=window.__xss=1> ECZANESİ']);   // sonuncunun konumu yok
    assert.strictEqual(await page.locator('#list .p-dist').first().innerText(), 'Keçiören · 150 m');
    assert.strictEqual(await page.locator('#list .ph.near').count(), 0);
    await page.click('#sortBtn');                                                           // kapatınca eski sıra
    assert.strictEqual((await adlar(page))[0], 'CİNNAH ÖRNEK ECZANESİ');
    assert.strictEqual(await page.locator('#list .p-dist').first().innerText(), 'Çankaya');
    await ctx.close();
  });

  await dene('yol tarifi: "her seferinde seç" açıkken harita uygulaması seçtirilir', async () => {
    const { ctx, page } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, paylas: true });
    await page.waitForSelector('#list .ph');
    await page.click('#appTabs button[data-tab="ayarlar"]');
    assert.strictEqual(await page.locator('#navCard').isVisible(), true);
    await page.click('#navSeg button[data-v="sec"]');
    await page.click('#appTabs button[data-tab="liste"]');
    await page.locator('#list .ph', { hasText: 'CİNNAH' }).locator('a.dir').click();
    assert.deepStrictEqual(await page.evaluate(() => window.__paylas.harita), [{ lat: 39.9015, lng: 32.861, ad: 'CİNNAH ÖRNEK ECZANESİ', adres: 'Cinnah Cad. No:12/A Çankaya' }]);
    assert.strictEqual(ctx.pages().length, 1);                                              // Google bağlantısı ayrıca açılmadı
    await ctx.close();
  });

  await dene('nöbet değişimi: site henüz yeni listeye geçmediyse bunu söyler ve kendiliğinden yeniden dener', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-22T09:32:00+03:00', sahteSaat: true, cevap: () => uyari('22.11.2026', '21.11.2026') + YAPAY });
    await page.waitForSelector('#oldBox:not([hidden])');
    assert.ok((await metin(page, '#oldText')).includes('henüz yeni nöbet listesine geçmemiş'), await metin(page, '#oldText'));
    assert.strictEqual((await adlar(page)).length, 5);
    durum.ayar.cevap = () => YAPAY.replace(/CİNNAH/g, 'PAZAR');                             // site bir dakika sonra yeni listeye geçti
    await page.clock.fastForward(61000);
    await page.waitForSelector('#list .p-name:has-text("PAZAR")');
    assert.strictEqual(durum.istekler.length, 2);
    assert.strictEqual(await page.locator('#oldBox').isHidden(), true);
    assert.strictEqual(await metin(page, '#heroDate'), '22 Kasım Pazar');
    await ctx.close();
  });

  await dene('liste alınamazsa aralıklarla yeniden denenir; telefonun saat dilimi farklı olsa da geçerlilik saati doğru', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-22T08:00:00+03:00', sahteSaat: true, cevap: () => uyari('22.11.2026', '21.11.2026') + YAPAY });
    await page.waitForSelector('#list .ph');
    assert.strictEqual(await page.evaluate(() => data.until), Date.parse('2026-11-22T09:30:00+03:00'));
    durum.ayar.cevap = () => null;                                                          // 09:30'da bağlantı yok
    await page.clock.fastForward(91 * 60000);
    await page.waitForSelector('#oldBox:not([hidden])');
    assert.ok((await metin(page, '#oldText')).includes('Güncel liste alınamadı'));
    const once = durum.istekler.length;
    durum.ayar.cevap = () => YAPAY.replace(/CİNNAH/g, 'PAZAR');                             // bağlantı geri geldi
    await page.clock.fastForward(11 * 60000);
    await page.waitForSelector('#list .p-name:has-text("PAZAR")');
    assert.ok(durum.istekler.length > once);
    await ctx.close();
    // Saat dilimi Tokyo olan telefonda da "09:30" Türkiye saatiyle yorumlanır
    const ctx2 = await tarayici.newContext({ timezoneId: 'Asia/Tokyo' }); const p2 = await ctx2.newPage();
    await p2.goto(adres);
    assert.strictEqual(await p2.evaluate(h => SRC_AEO.parse(h, '2026-11-22').until, uyari('22.11.2026', '21.11.2026') + YAPAY), Date.parse('2026-11-22T09:30:00+03:00'));
    await ctx2.close();
  });

  await dene('konumuma en yakın: liste yenilenince sonuç yeni listeyle hesaplanır; kapsam dışı konum söylenir', async () => {
    let s = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, konum: [39.9690, 32.8310] });
    await s.page.waitForSelector('#list .ph');
    await s.page.click('#locBtn');
    await s.page.waitForSelector('#list .ph.near');
    assert.strictEqual((await adlar(s.page))[0], 'ETLİK ECZANESİ');
    s.durum.ayar.cevap = () => YAPAY.replace(/ETLİK/g, 'YENİ GÜN');
    await s.page.click('#refreshBtn');
    await s.page.waitForSelector('#list .p-name:has-text("YENİ GÜN")');
    assert.strictEqual(await s.page.locator('#list .p-name:has-text("ETLİK")').count(), 0);
    await s.ctx.close();
    s = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, konum: [41.0082, 28.9784] });     // İstanbul
    await s.page.waitForSelector('#list .ph');
    await s.page.click('#locBtn');
    await s.page.waitForSelector('#resultBox.warn:not([hidden])');
    assert.ok((await metin(s.page, '#resultText')).includes('Ankara ve Kırıkkale dışında görünüyor'));
    assert.strictEqual(await s.page.locator('#list .ph').count(), 0);
    assert.deepStrictEqual(await s.page.evaluate(() => [kmText(0.01), kmText(0.024), kmText(0.03), kmText(0.976), kmText(1.24)]), ['50 m’den yakın', '50 m’den yakın', '50 m', '1,0 km', '1,2 km']);
    await s.ctx.close();
  });

  await dene('arama: "cd" / "mh" kısaltmaları ve yalnız dolgu sözcüğünden oluşan sorgular', async () => {
    const { ctx, page, durum } = await sayfaAc({ saat: '2026-11-21T20:00:00+03:00', cevap: () => YAPAY, yer: [39.9690, 32.8310] });
    await page.waitForSelector('#list .ph');
    await page.fill('#searchInput', 'yunus emre cd');
    await page.waitForSelector('#resultBox:not([hidden])');
    assert.deepStrictEqual(await adlar(page), ['ETLİK ECZANESİ']);
    await page.fill('#searchInput', 'tuzlucayir mh');
    await page.waitForSelector('#list .p-name:has-text("onerror")');
    assert.deepStrictEqual(await page.evaluate(() => { const q = parseQuery('ankara caddesi'); return [q.core, q.type, q.filler]; }), [['ankara'], 'caddesi', true]);
    assert.deepStrictEqual(await page.evaluate(() => { const q = parseQuery('cinnah caddesinde nöbetçi eczane'); return [q.core, q.filler]; }), [['cinnah'], false]);
    await page.fill('#searchInput', 'ankara caddesi'); await page.press('#searchInput', 'Enter');   // eşleşme yok; dolgu sözcüğü için konum aranmaz
    await page.waitForSelector('#resultBox.warn:not([hidden])');
    assert.strictEqual(durum.yerIstek.length, 0);
    // İlçe adı sabit listedeki yazımla eşlenir; iki numaralı telefonda ilki aranır
    assert.deepStrictEqual(await page.evaluate(() => [SRC_AEO.label('ÇANKAYA '), SRC_AEO.label('kazan'), SRC_AEO.cityOf('KIRIKKALE MERKEZ', ''), telHref('0312 555 01 01 / 02')]),
      ['Çankaya', 'Kahramankazan', 'Kırıkkale', 'tel:03125550101']);
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

  await tarayici.close(); sunucu.close();
  console.log('\n' + gecen + ' geçti, ' + kalan + ' kaldı');
  process.exit(kalan ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
