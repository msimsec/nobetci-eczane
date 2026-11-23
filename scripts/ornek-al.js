// Sitenin bugünkü gerçek cevabını test/ornek/gercek.json dosyasına kaydeder ("npm run ornek:al").
// Kayseri ve Mersin sayfaları da test/ornek/gercek-kayseri.html ve gercek-mersin.html olarak kaydedilir.
// Test bu dosyalar varsa onları da ayrıştırır; site yapıyı değiştirdiyse test burada kırılır.
const fs = require('fs');
const path = require('path');

const d = new Date();
const tarih = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const url = 'https://www.aeo.org.tr/getPharmacies/' + tarih;

fetch(url, { headers: {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9'
} }).then(async r => {
  const metin = await r.text();
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = JSON.parse(metin);
  if (j.status !== 'success' || typeof j.html !== 'string') throw new Error('Beklenmeyen cevap (durum: ' + j.status + ')');
  const hedef = path.join(__dirname, '..', 'test', 'ornek', 'gercek.json');
  fs.writeFileSync(hedef, JSON.stringify({ tarih, status: j.status, html: j.html }, null, 1));
  console.log('Kaydedildi: ' + path.relative(path.join(__dirname, '..'), hedef) + ' (' + j.html.length + ' karakter, ' + tarih + ')');
}).catch(e => { console.error('Örnek alınamadı: ' + url + '\n' + (e && e.message || e)); process.exit(1); });

// Kayseri ve Mersin: nöbet sayfasının kendisi
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
for (const [ad, adres] of [['kayseri', 'https://www.kayserieo.org.tr/nobetci-eczaneler'], ['mersin', 'https://www.mersineczaciodasi.org.tr/nobetci-eczaneler']]) {
  fetch(adres, { headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'tr-TR,tr;q=0.9' } }).then(async r => {
    const metin = await r.text();
    if (!r.ok) throw new Error('HTTP ' + r.status);
    if (!metin.includes('nobet-kart')) throw new Error('Sayfada eczane kartı (nobet-kart) yok, ' + metin.length + ' karakter');
    const hedef = path.join(__dirname, '..', 'test', 'ornek', 'gercek-' + ad + '.html');
    fs.writeFileSync(hedef, '<!-- ' + tarih + ' ' + adres + ' -->\n' + metin);
    console.log('Kaydedildi: ' + path.relative(path.join(__dirname, '..'), hedef) + ' (' + metin.length + ' karakter)');
  }).catch(e => { console.error('Örnek alınamadı: ' + adres + '\n' + (e && e.message || e)); process.exitCode = 1; });
}
