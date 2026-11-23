// Uygulama simgesini ve açılış ekranını android-ek/res/ altına üretir ("npm run simge:uret").
// Kaynak çizim bu dosyadadır (konum iğnesi içinde artı, koyu zemin). Çıktılar depoda durur;
// "npm run android:hazirla" onları Android projesine kopyalar. Yalnız çizim değişince yeniden çalıştırılır.
// Playwright gerekir (npm test ile aynı).
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright bulunamadı. Kurmak için:  npm i -D playwright && npx playwright install chromium'); process.exit(1); }

const RES = path.join(__dirname, '..', 'android-ek', 'res');
const DEFS = '<defs>'
  + '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#28AD7C"/><stop offset="1" stop-color="#16744F"/></linearGradient>'
  + '<linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F2638"/><stop offset="1" stop-color="#0D1017"/></linearGradient>'
  + '</defs>';
const ZEMIN = '<rect width="512" height="512" fill="url(#n)"/>';
// İğne: 512'lik karede ortalanmış çizim
const IGNE = '<ellipse cx="256" cy="412" rx="58" ry="12" fill="#000" opacity="0.35"/>'
  + '<path d="M256 408 C196 330 158 282 158 220 A98 98 0 1 1 354 220 C354 282 316 330 256 408Z" fill="url(#g)"/>'
  + '<circle cx="256" cy="220" r="62" fill="#fff"/>'
  + '<rect x="218" y="208" width="76" height="24" rx="7" fill="#1D8A61"/><rect x="244" y="182" width="24" height="76" rx="7" fill="#1D8A61"/>';
const svg = (govde, ek) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" ' + (ek || '') + '>' + DEFS + govde + '</svg>';
// Uyarlanır simge katmanları 108 dp'dir, görünen alan ortadaki 72 dp: çizim 2/3 ölçekle ortaya konur.
const ON = svg('<g transform="translate(85.33 85.33) scale(0.6667)">' + IGNE + '</g>');
const ARKA = svg(ZEMIN);
const TAM = svg(ZEMIN + IGNE);
const BOYUT = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const ACILIS = { 'drawable': [480, 320], 'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280], 'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280], 'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920] };

(async () => {
  const tarayici = await chromium.launch();
  const page = await tarayici.newPage();
  async function ciz(dosya, en, boy, html, saydam) {
    fs.mkdirSync(path.dirname(dosya), { recursive: true });
    await page.setViewportSize({ width: en, height: boy });
    await page.setContent('<body style="margin:0;background:' + (saydam ? 'transparent' : '#10131B') + ';display:flex;align-items:center;justify-content:center;width:' + en + 'px;height:' + boy + 'px;overflow:hidden">' + html + '</body>');
    await page.screenshot({ path: dosya, omitBackground: !!saydam });
  }
  for (const [ad, k] of Object.entries(BOYUT)) {
    const d = path.join(RES, 'mipmap-' + ad), b = Math.round(48 * k), u = Math.round(108 * k);
    const kutu = s => '<div style="width:' + b + 'px;height:' + b + 'px;overflow:hidden;border-radius:' + s + '">' + TAM.replace('<svg ', '<svg width="' + b + '" height="' + b + '" ') + '</div>';
    await ciz(path.join(d, 'ic_launcher.png'), b, b, kutu('22%'), true);                     // eski Android: köşeli
    await ciz(path.join(d, 'ic_launcher_round.png'), b, b, kutu('50%'), true);               // eski Android: yuvarlak
    await ciz(path.join(d, 'ic_launcher_foreground.png'), u, u, ON.replace('<svg ', '<svg width="' + u + '" height="' + u + '" '), true);
    await ciz(path.join(d, 'ic_launcher_background.png'), u, u, ARKA.replace('<svg ', '<svg width="' + u + '" height="' + u + '" '), false);
  }
  for (const [ad, [en, boy]] of Object.entries(ACILIS)) {
    const s = Math.round(Math.min(en, boy) * 0.42);
    await ciz(path.join(RES, ad, 'splash.png'), en, boy, svg(IGNE, 'width="' + s + '" height="' + s + '"'), false);
  }
  await tarayici.close();
  const xml = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    + '    <background android:drawable="@mipmap/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n';
  fs.mkdirSync(path.join(RES, 'mipmap-anydpi-v26'), { recursive: true });
  fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'), xml);
  fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), xml);
  fs.writeFileSync(path.join(__dirname, '..', 'tasarim', 'simge.svg'), TAM.replace('<svg ', '<svg width="512" height="512" ') + '\n');
  console.log('Simge ve açılış ekranı üretildi: android-ek/res/');
})().catch(e => { console.error(e); process.exit(1); });
