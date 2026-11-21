// "npx cap add android" ile üretilen Android projesine uygulamanın kendi parçalarını ekler:
//   1) SesPlugin.java ve MainActivity.java (android-ek/ klasöründen)
//   2) AndroidManifest.xml'e ses tanıma / sesli okuma için <queries> bloğu (Android 11+ paket görünürlüğü)
//   3) Google'a otomatik uygulama yedeği kapatılır (allowBackup=false)
// Yinelenebilir: kaç kez çalıştırılırsa çalıştırılsın sonuç aynıdır. "npm run android:hazirla" bunu çağırır.
const fs = require('fs');
const path = require('path');

const kok = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(kok, 'capacitor.config.json'), 'utf8'));
const paket = cfg.appId;
const android = path.join(kok, 'android');
const ana = path.join(android, 'app', 'src', 'main');

if (!fs.existsSync(ana)) {
  console.error('android/ klasörü yok. Önce bir kez şunu çalıştırın:  npx cap add android');
  process.exit(1);
}

// 1) Java dosyaları
const javaHedef = path.join(ana, 'java', ...paket.split('.'));
fs.mkdirSync(javaHedef, { recursive: true });
for (const ad of ['SesPlugin.java', 'MainActivity.java']) {
  let kod = fs.readFileSync(path.join(kok, 'android-ek', ad), 'utf8');
  kod = kod.replace(/^package\s+[\w.]+;/m, 'package ' + paket + ';');
  fs.writeFileSync(path.join(javaHedef, ad), kod);
}

// 2) ve 3) AndroidManifest.xml
const mfYol = path.join(ana, 'AndroidManifest.xml');
let mf = fs.readFileSync(mfYol, 'utf8');
const isaret = '<!-- nobetci-eczane: ses -->';
if (!mf.includes(isaret)) {
  const blok = [
    '',
    '    ' + isaret,
    '    <queries>',
    '        <intent>',
    '            <action android:name="android.speech.action.RECOGNIZE_SPEECH" />',
    '        </intent>',
    '        <intent>',
    '            <action android:name="android.intent.action.TTS_SERVICE" />',
    '        </intent>',
    '    </queries>',
    ''
  ].join('\n');
  const yeni = mf.replace(/(<manifest\b[^>]*>)/, '$1\n' + blok);
  if (yeni === mf) {
    console.error('AndroidManifest.xml içinde <manifest> etiketi bulunamadı; <queries> bloğu eklenemedi.');
    process.exit(1);
  }
  mf = yeni;
}
mf = mf.replace(/android:allowBackup="true"/, 'android:allowBackup="false"');
fs.writeFileSync(mfYol, mf);

console.log('Android ekleri yerleştirildi: ' + path.relative(kok, javaHedef) + ' (SesPlugin, MainActivity), AndroidManifest.xml (<queries>, allowBackup=false).');
