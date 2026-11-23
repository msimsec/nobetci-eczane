// "npx cap add android" ile üretilen Android projesine uygulamanın kendi parçalarını ekler:
//   1) SesPlugin.java ve MainActivity.java (android-ek/ klasöründen)
//   2) AndroidManifest.xml'e ses tanıma / sesli okuma için <queries> bloğu (Android 11+ paket görünürlüğü)
//   3) Google'a otomatik uygulama yedeği kapatılır (allowBackup=false)
//   4) Konum izni ("Konumuma en yakın" düğmesi; izin düğmeye basılınca sorulur)
//   5) Sürüm adı package.json'dan build.gradle'a yazılır
//   6) Simge ve açılış ekranı (android-ek/res/; "npm run simge:uret" ile üretilir) res/ altına kopyalanır,
//      açılış ekranının zemin rengi koyu yapılır
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

// 4) Konum izni
const konumIsaret = '<!-- nobetci-eczane: konum -->';
if (!mf.includes(konumIsaret)) {
  const blok = [
    '',
    '    ' + konumIsaret,
    '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
    '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
    '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />',
    ''
  ].join('\n');
  mf = mf.replace(/(<manifest\b[^>]*>)/, '$1\n' + blok);
}
fs.writeFileSync(mfYol, mf);

// 5) Sürüm adı
const surum = JSON.parse(fs.readFileSync(path.join(kok, 'package.json'), 'utf8')).version;
const gradleYol = path.join(android, 'app', 'build.gradle');
let surumNot = 'build.gradle bulunamadı, sürüm adı yazılmadı';
if (fs.existsSync(gradleYol)) {
  const g = fs.readFileSync(gradleYol, 'utf8');
  const g2 = g.replace(/versionName\s+"[^"]*"/, 'versionName "' + surum + '"');
  if (g2 !== g) fs.writeFileSync(gradleYol, g2);
  surumNot = /versionName\s+"/.test(g) ? 'sürüm adı ' + surum : 'build.gradle içinde versionName bulunamadı';
}

// 6) Simge ve açılış ekranı
const resKaynak = path.join(kok, 'android-ek', 'res'), resHedef = path.join(ana, 'res');
let simgeNot = 'android-ek/res yok, simge kopyalanmadı';
if (fs.existsSync(resKaynak)) {
  let n = 0;
  (function kopyala(k, h) {
    fs.mkdirSync(h, { recursive: true });
    for (const e of fs.readdirSync(k, { withFileTypes: true })) {
      if (e.isDirectory()) kopyala(path.join(k, e.name), path.join(h, e.name));
      else { fs.copyFileSync(path.join(k, e.name), path.join(h, e.name)); n++; }
    }
  })(resKaynak, resHedef);
  simgeNot = 'simge ve açılış ekranı (' + n + ' dosya)';
  // Android 12+ açılışta simgeyi düz bir zemin üstünde gösterir; zemin uygulamanın koyu rengi olsun.
  const stilYol = path.join(resHedef, 'values', 'styles.xml');
  if (fs.existsSync(stilYol)) {
    const st = fs.readFileSync(stilYol, 'utf8');
    if (!st.includes('windowSplashScreenBackground')) {
      const st2 = st.replace(/(<style name="AppTheme\.NoActionBarLaunch" parent="Theme\.SplashScreen">)/, '$1\n        <item name="windowSplashScreenBackground">#10131B</item>');
      if (st2 !== st) fs.writeFileSync(stilYol, st2); else simgeNot += ', açılış zemin rengi yazılamadı (stil bulunamadı)';
    }
  }
}

console.log('Android ekleri yerleştirildi: ' + path.relative(kok, javaHedef) + ' (SesPlugin, MainActivity), AndroidManifest.xml (<queries>, konum izni, allowBackup=false), ' + surumNot + ', ' + simgeNot + '.');
