// Sitenin bugünkü gerçek cevabını test/ornek/gercek.json dosyasına kaydeder ("npm run ornek:al").
// Test bu dosya varsa onu da ayrıştırır; site yapıyı değiştirdiyse test burada kırılır.
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
