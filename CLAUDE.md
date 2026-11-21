# CLAUDE.md — Nöbetçi Eczane

Şehir ve ilçe seçilince o günün nöbetçi eczanelerini listeleyen, cadde / mahalle adıyla yazılı ve sesli arama yapan uygulama. Önce Android (Capacitor). İletişim, commit mesajları, PR açıklamaları ve belgeler **Türkçe** yazılır.

## Yapı

- `www/index.html`: uygulamanın tamamı (tek dosya, build adımı yok). Bölümler: yardımcılar, veri kaynağı, arama, ses, ekran, ayarlar.
- `www/vendor/fonts/inter`: yazı tipi depoda (SIL OFL 1.1). Google Fonts ya da CDN kullanılmaz.
- `android-ek/`: Android'e özgü Java (`SesPlugin.java`: telefonun ses tanıma penceresi + metin okuma motoru; `MainActivity.java`).
- `scripts/android-ek.js`: `android-ek/` dosyalarını ve manifest'teki `<queries>` bloğunu Android projesine yerleştirir. `npm run android:hazirla` bunu ve `cap sync`'i çalıştırır.
- `test/calistir.js`: Playwright testi (`npm test`). `test/ornek/yapay.html` elle kurulmuş örnek cevap; `test/ornek/gercek.json` sitenin gerçek cevabı (`npm run ornek:al`, kullanıcının bilgisayarında; bu ortamdan `aeo.org.tr`'ye erişim yok).
- `android/`: `npx cap add android` ile kullanıcının bilgisayarında üretilir.
- Uygulama kimliği `app.simsec.eczane` (`capacitor.config.json`).

## Kararlar (kullanıcı)

- **Veri kaynağı: Ankara Eczacı Odası** (Ankara + Kırıkkale). Liste `https://www.aeo.org.tr/getPharmacies/YYYY-AA-GG` adresinden alınır (sitenin kendi sayfasının kullandığı istek; cevap `{ status:"success", html:"…" }`, içerik türü `text/html` olduğu için metin gelir ve `JSON.parse` edilir). **`/nobetci-eczaneler` sayfasının ham HTML'inde eczane yoktur**, liste sonradan bu istekle dolar; sayfa okunmaz. İstenen tarih telefonun bugünkü tarihidir; sabah nöbet değişene kadar site bir önceki günün listesini kendisi verir ve bunu `.alert-nobet` satırıyla söyler (ekranda `#noticeBox`, nöbet günü bu satırdan okunur). Kutular `SRC_AEO.parse` ile ayrıştırılır (`.inline-box`, `data-district`, harita bağlantısındaki koordinat). İlçe listeleri sabittir (`AEO_DISTRICTS`). Sunucu ve API anahtarı yok.
- **Nöbet değişim saati koda yazılmaz** (ile ve güne göre değişir; kullanıcı: Ankara'da yalnız pazar, Adana'da cumartesi ve pazar tam gün nöbet). Geçerlilik sonu sitenin `.alert-nobet` satırından okunur (`until`); o saat ya da gece yarısı geçince liste yenilenir (`scheduleTurn`). Liste eskiyse (`isOutdated`) yenisi beklenirken gösterilmez, alınamazsa `#oldBox` uyarısıyla gösterilir. Yeni kaynak eklenirse `until` vermelidir.
- **API ile veri alma (NosyAPI vb.) sonra konuşulacak**; şimdi önerilmez. Yeni il / kaynak `SOURCES` dizisine eklenir, ekran kodu kaynağı bilmez.
- **Tema: yalnız koyu ve açık** (+ sistem). Görev & Not uygulamasından yalnız görünüm örnek alındı (dolu üst kart, yuvarlak kartlar, alt sekme çubuğu); başka tema eklenmez.
- **Sesli arama isteğe bağlı**: mikrofon düğmesi, sesli yanıt ve "bulunamazsa en yakını göster" Ayarlar'dan açılıp kapanır.
- **Adreste eşleşme yoksa en yakın nöbetçi**: söylenen yer OpenStreetMap Nominatim ile koordinata çevrilir (yer adı dışarı gider; ayarı kapatınca gitmez), en yakın üç eczane mesafesiyle gösterilir.
- Arama ilçe seçimine bakmaz, seçili şehrin tamamında arar.

## Kurallar

- Siteden gelen her metin HTML'e yalnız `escapeHtml` ile yazılır; `tel:` ve harita bağlantıları kodda üretilir, siteden gelen bağlantı olduğu gibi kullanılmaz.
- Tarayıcının `alert` / `confirm` / `prompt` kutuları kullanılmaz.
- Renkler değişkenle yazılır (`var(--text)`, `var(--green)` …); her arayüz değişikliği koyu ve açık temada, 390 px ve 360 px genişlikte denenir.
- Ağ isteği `httpGet` ile yapılır: uygulamada `CapacitorHttp` (CORS'a takılmaz), tarayıcıda `fetch`.
- Yeni izin, ağ isteği ya da veriyi dışarı gönderen özellik eklenirse Ayarlar → "Veri ve hakkında" metni de güncellenir.

## Çalışma şekli

- Her iş ayrı branch'te, PR ile `main`'e. Merge'ü kullanıcı yapar.
- Bu ortamda Android derlenemez; derleme ve telefon testi kullanıcıda (Android Studio, `D:\nobetci-eczane`, Samsung telefon USB ile). Java yalnız gözle denetlenir.
- Test: `npm test`. Davranış değişikliğinde test de eklenir / güncellenir. `www/` http üzerinden açılır, Playwright'ta `aeo.org.tr` ve `nominatim.openstreetmap.org` istekleri kayıtlı cevapla karşılanır; uygulama davranışı için `window.Capacitor` taklit edilir. Tarayıcı siteyi doğrudan okuyamaz (CORS).

## Açık konular

- **Telefonda liste gelmedi (2026-11-21):** ilk kurulumda "Liste alınamadı". PR #1 hata ayrıntısını ekrana yazdırdı; ayrıntı "sayfa geldi ama içinde eczane bulunamadı" çıktı (liste sayfada değil, ayrı istekteymiş). PR #2 `getPharmacies` isteğine geçti; **telefonda doğrulanacak.**
- **Açılır kutular telefonda açılmadı (2026-11-21, kullanıcı):** neden bilinmiyor. PR #2'de `<select>` kaldırıldı; şehir / ilçe seçimi uygulamanın kendi alt penceresiyle (`openPicker`, `#pickBd`; geri tuşu `closePicker`). **Yeni seçim alanı eklenirse `<select>` kullanılmaz.**
- Telefonda henüz denenmeyenler: mikrofon (`Ses.dinle`), sesli okuma (`Ses.oku`), "Ara" ve "Yol tarifi" düğmeleri, geri tuşu.
- `test/ornek/gercek.json` yok: ayrıştırma yalnız elle kurulmuş örnekle deneniyor. Kullanıcı `npm run ornek:al` çalıştırıp dosyayı depoya eklerse gerçek yapıyla da denenir.
- Tarih seçimi yok: site hangi günün nöbetini gösteriyorsa o gelir.
- Mağazada yayın düşünülürse Ankara Eczacı Odası'ndan yazılı izin alınması önerildi.
- Simge ve açılış ekranı Capacitor'ın varsayılanı; tasarlanmadı.
