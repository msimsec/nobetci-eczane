# CLAUDE.md — Nöbetçi Eczane

Şehir ve ilçe seçilince o günün nöbetçi eczanelerini listeleyen, cadde / mahalle adıyla yazılı ve sesli arama yapan uygulama. Önce Android (Capacitor). İletişim, commit mesajları, PR açıklamaları ve belgeler **Türkçe** yazılır.

## Yapı

- `www/index.html`: uygulamanın tamamı (tek dosya, build adımı yok). Bölümler: yardımcılar, veri kaynağı, arama, ses, ekran, ayarlar.
- `www/vendor/fonts/inter`: yazı tipi depoda (SIL OFL 1.1). Google Fonts ya da CDN kullanılmaz.
- `android-ek/`: Android'e özgü Java (`SesPlugin.java`: telefonun ses tanıma penceresi + metin okuma motoru; `MainActivity.java`).
- `scripts/android-ek.js`: `android-ek/` dosyalarını ve manifest'teki `<queries>` bloğunu Android projesine yerleştirir. `npm run android:hazirla` bunu ve `cap sync`'i çalıştırır.
- `android/`: `npx cap add android` ile kullanıcının bilgisayarında üretilir.
- Uygulama kimliği `app.simsec.eczane` (`capacitor.config.json`).

## Kararlar (kullanıcı)

- **Veri kaynağı: Ankara Eczacı Odası**, `https://www.aeo.org.tr/nobetci-eczaneler` (Ankara + Kırıkkale). Sayfa telefondan doğrudan okunur (`SRC_AEO.parse`: `#pharmaciesList .inline-box`, `data-district`, harita bağlantısındaki koordinat). Sunucu ve API anahtarı yok.
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
- Test: `www/` http üzerinden açılır, Playwright'ta `aeo.org.tr` ve `nominatim.openstreetmap.org` istekleri kayıtlı cevapla karşılanır; uygulama davranışı için `window.Capacitor` taklit edilir. Tarayıcı siteyi doğrudan okuyamaz (CORS).

## Açık konular

- **Telefonda liste gelmedi (2026-11-21, ilk kurulum):** ekranda "Liste alınamadı" çıktı. Şüphe: yerel HTTP isteği tarayıcı kimliği olmadan gidiyordu. PR #1 isteğe WebView'ın `User-Agent`'ını ekledi ve hata ayrıntısını ekrana yazdırdı; **telefonda doğrulanmadı**. Kullanıcının telefonunda VPN / engelleyici açık görünüyordu, o da neden olabilir. Devam ederken önce ekrandaki ayrıntı satırı sorulur.
- Telefonda henüz denenmeyenler: mikrofon (`Ses.dinle`), sesli okuma (`Ses.oku`), "Ara" ve "Yol tarifi" düğmeleri, geri tuşu.
- Tarih seçimi yok: site hangi günün nöbetini gösteriyorsa o gelir.
- Mağazada yayın düşünülürse Ankara Eczacı Odası'ndan yazılı izin alınması önerildi.
- Simge ve açılış ekranı Capacitor'ın varsayılanı; tasarlanmadı.
