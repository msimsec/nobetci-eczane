# CLAUDE.md — Ankara Nöbetçi Eczane

Ankara ve Kırıkkale için ilçe seçilince o günün nöbetçi eczanelerini listeleyen, cadde / mahalle adıyla yazılı ve sesli arama yapan uygulama. Önce Android (Capacitor). İletişim, commit mesajları, PR açıklamaları ve belgeler **Türkçe** yazılır.

## Yapı

- `www/index.html`: uygulamanın tamamı (tek dosya, build adımı yok). Bölümler: yardımcılar, veri kaynağı, arama, ses, ekran, ayarlar.
- `www/vendor/fonts/inter`: yazı tipi depoda (SIL OFL 1.1). Google Fonts ya da CDN kullanılmaz.
- `android-ek/`: Android'e özgü Java (`SesPlugin.java`: telefonun ses tanıma penceresi + metin okuma motoru; `PaylasPlugin.java`: paylaşma penceresi + harita uygulaması seçimi; `MainActivity.java`).
- `scripts/android-ek.js`: `android-ek/` dosyalarını, manifest'teki `<queries>` bloğunu ve konum iznini Android projesine yerleştirir, sürüm adını `package.json`'dan `build.gradle`'a yazar. `npm run android:hazirla` bunu ve `cap sync`'i çalıştırır.
- `test/calistir.js`: Playwright testi (`npm test`). `test/ornek/yapay.html` elle kurulmuş örnek cevap; `test/ornek/gercek.json` sitenin gerçek cevabı (`npm run ornek:al`, kullanıcının bilgisayarında; bu ortamdan `aeo.org.tr`'ye erişim yok).
- `android-ek/res/`: uygulama simgesi (uyarlanır simge katmanları + eski Android için PNG) ve açılış ekranı. `scripts/simge-uret.js` üretir (`npm run simge:uret`, çizim o dosyadadır; çıktılar depoda durur), `android-ek.js` Android projesine kopyalar ve açılış zemin rengini koyu yapar. Seçilen simge: konum iğnesi içinde artı, koyu zemin (kullanıcı, 2026-11-23; diğer taslaklar `tasarim/simge-ornekleri/`).
- `arsiv/diger-iller/`: Ankara dışındaki iller için yapılan çalışma (Kayseri / Mersin kaynak kodu, örnekleri, testleri; 60 eczacı odasının tarama sonucu; bakılan API'ler). Uygulamaya ve teste dahil değildir.
- `site-ankaraeczane/`: uygulamanın sitesi (`index.html`, `gizlilik.html`); `firebase.json` ile Firebase Hosting'e yayımlanır. Uygulamanın kendisi (`www/`) Firebase'e gitmez.
- `android/`: `npx cap add android` ile kullanıcının bilgisayarında üretilir; depoya konmaz (`.gitignore`). Android'e özgü her şey `android-ek/` ve `scripts/android-ek.js` üzerinden gider.
- Sürüm: `package.json` → `version`. `index.html` içindeki `APP_VERSION` aynı olmalıdır (test denetler).
- Uygulama adı "Ankara Nöbetçi Eczane" (`capacitor.config.json` → `appName`; `android-ek.js` bunu Android'in `strings.xml`'ine yazar). Ana ekranda simgenin altında "Ank Nöbetçi Eczane" yazar (`package.json` → `simgeAdi` → `title_activity_main`; kullanıcı, 2026-11-25). Uygulama kimliği `app.simsec.eczane` değişmedi (değişirse telefonda ayrı bir uygulama olarak kurulur).

## Kararlar (kullanıcı)

- **Kapsam yalnız Ankara ve Kırıkkale; ad "Ankara Nöbetçi Eczane"** (kullanıcı, 2026-11-24). 81 il hedefinden vazgeçildi: ücretsiz yol 60 oda sitesini tek tek eklemek, diğeri ücretli API idi. Kayseri ve Mersin uygulamadan çıkarıldı; ileride genele yayılırsa kullanılmak üzere `arsiv/diger-iller/` altında duruyor (geri ekleme adımları oradaki README'de). **Başka il ya da API önerilmez; kullanıcı isterse arşivden başlanır.**
- **Veri kaynağı: eczacı odalarının siteleri.** Ankara Eczacı Odası (Ankara + Kırıkkale): Liste `https://www.aeo.org.tr/getPharmacies/YYYY-AA-GG` adresinden alınır (sitenin kendi sayfasının kullandığı istek; cevap `{ status:"success", html:"…" }`, içerik türü `text/html` olduğu için metin gelir ve `JSON.parse` edilir). **`/nobetci-eczaneler` sayfasının ham HTML'inde eczane yoktur**, liste sonradan bu istekle dolar; sayfa okunmaz. İstenen tarih telefonun bugünkü tarihidir; sabah nöbet değişene kadar site bir önceki günün listesini kendisi verir ve bunu `.alert-nobet` satırıyla söyler (ekranda `#noticeBox`, nöbet günü bu satırdan okunur). Kutular `SRC_AEO.parse` ile ayrıştırılır (`.inline-box`, `data-district`, harita bağlantısındaki koordinat). İlçe listeleri sabittir (`AEO_DISTRICTS`). Sunucu ve API anahtarı yok.
- Eczane başına nöbet saati altyapısı duruyor (`from` / `to`, `dutyState`, `hoursText`: "Nöbetçi · bitiş yarın 08:30", nöbeti biten soluklaşır ve sona düşer) ama Ankara Eczacı Odası saat vermediği için şu an hiçbir kartta görünmez.
- Her kaynağın listesi ayrı saklanır (`cacheKey`); `data` yalnız seçili şehrin kaynağını tutar (`syncSource`). "Konumuma en yakın" konum başka kaynağın ilindeyse o ile geçer (`cityAt`).
- **Nöbet değişim saati koda yazılmaz** (ile ve güne göre değişir; kullanıcı: Ankara'da yalnız pazar, Adana'da cumartesi ve pazar tam gün nöbet). Geçerlilik sonu sitenin `.alert-nobet` satırından okunur (`until`); o saat ya da gece yarısı geçince liste yenilenir (`scheduleTurn`). Liste eskiyse (`isOutdated`) yenisi beklenirken gösterilmez, alınamazsa `#oldBox` uyarısıyla gösterilir. Yeni kaynak eklenirse `until` vermelidir.
- **Mağaza karşılaştırmasından eklenenler** (kullanıcı, 2026-11-25; 15 uygulama ve ~700 yorum incelendi):
  - **Nöbet günü seçimi** (`#daySeg`, `setDay`, `loadNext`, `V()`): geçerli liste ve bir sonraki gün. Sonraki gün `getPharmacies/<nöbet günü + 1>` ile ayrı istenir, bellekte tutulur, "sonraki nöbet gününün listesidir" uyarısıyla gösterilir. Cevabın günü istenen gün değilse ya da liste bugünküyle birebir aynıysa "henüz yayımlanmamış" denir. Ekrandaki liste her yerde `V()` ile okunur.
  - **Paylaş** (kartta `button.share` → `PaylasPlugin.metin`; tarayıcıda `navigator.share` ya da panoya kopyalama).
  - **Yakına göre** (`#sortBtn`, `toggleSort`): liste mesafeye göre sıralanır, ilçenin yanında km yazar; konum yalnız bellekte (`myPos`).
  - **Yol tarifi uygulaması** (Ayarlar → Yol tarifi, `LS.nav`): Google Haritalar ya da "her seferinde seç" (`PaylasPlugin.harita`, `geo:` bağlantısı).
  - **Yanlış bilgi bildir** ve Ayarlar → **Geri bildirim** (`SUPPORT_EMAIL`, `reportHref`, `feedbackHref`): ikisi de e-posta açar; adres boşken görünmezler.
  - Eklenmeyenler: harita görünümü (dışarıdan harita yüklemek gerekir; rakiplerde yanlış iğne çok şikâyet alıyor), Ankara için nöbet saatleri (oda vermiyor), favori, bildirim / widget.
- **Nöbet değişiminde yeniden deneme:** liste eski kaldıysa (site henüz yeni listeye geçmedi ya da istek başarısız) 1, 2, 5, 10 dakika aralıklarla kendiliğinden yeniden denenir (`RETRY_SEC`, `retryN`); uyarı metni iki durumu ayırır (`data.late`). Sitenin geçerlilik saati Türkiye saati (UTC+3) olarak yorumlanır.
- **Ayarlar'da mağaza için bölümler, Görev & Not'taki düzenle** (kullanıcı, 2026-11-25; örnek depo `msimsec/gunluk-haftalik-rapor-uygulamasi`, Android sürümü `Offline/…(offline).html` içinde `settingsPrivacy`, `settingsFeedback`): Yardım; **Gizlilik** ("Size verdiğimiz sözler" + "İzinler ve telefonun servisleri", simgeli satırlar, `.pv-list`); **Geri bildirim** ("Hata bildir" / "Öneri gönder" satırları, `feedbackUrl`, alıcı `SUPPORT_EMAIL`; e-postaya yalnız uygulama ve Android sürümü eklenir); Hakkında. Bu uygulamada hitap "siz"dir (Görev & Not'ta "sen"). **Lisans bölümü yok** (kullanıcı istemedi; yazı tipinin lisans dosyası `www/vendor/fonts/inter/LICENSE` olarak uygulamayla gidiyor). Mağaza gizlilik sayfası `site-ankaraeczane/gizlilik.html`; Görev & Not'ta karşılığı `site-tasknote/` (Firebase Hosting, `tasknote.simsec.app`, yayıncı adı simsec.app, destek adresi `tasknote@simsec.app`). Bu uygulamada: destek adresi **`ankaraeczane@simsec.app`**, site **`ankaraeczane.simsec.app`** (Firebase Hosting sitesi `simsec-ankaraeczane`, aynı Firebase projesi `gunluk-haftalik-rapor`; `firebase.json`, `.firebaserc`). Alan adı simsec.app kalır, barındırma Firebase, DNS ve e-posta yönlendirmesi Cloudflare (kullanıcı, 2026-11-25); "eczane" adını Claude önerdi. Kurulum adımları `docs/site-yayini.md`.
- **Tema: yalnız koyu ve açık** (+ sistem). Görev & Not uygulamasından yalnız görünüm örnek alındı (dolu üst kart, yuvarlak kartlar, alt sekme çubuğu); başka tema eklenmez.
- **Sesli arama isteğe bağlı**: mikrofon düğmesi, sesli yanıt ve "bulunamazsa en yakını göster" Ayarlar'dan açılıp kapanır.
- **Sesli okuma durdurulabilir** (kullanıcı, 2026-11-23): okuma sürerken sonuç satırındaki hoparlör düğmesi kırmızı "durdur" olur, basınca keser (`setSpeaking`, `stopSpeak`). Bitişi eklenti `okumaBitti { kimlik }` olayıyla bildirir; haber gelmezse düğme metin uzunluğuna göre bir süre sonra kendiliğinden döner. "Sesi dene" düğmesi de okurken "Durdur" olur.
- **Adreste eşleşme yoksa en yakın nöbetçi**: söylenen yer OpenStreetMap Nominatim ile koordinata çevrilir (yer adı dışarı gider; ayarı kapatınca gitmez), en yakın üç eczane mesafesiyle gösterilir.
- **Arama seçili şehrin tamamında yapılır; ilçe seçiliyse o ilçedeki eşleşmeler üstte**, diğerleri "Diğer ilçelerde" başlığıyla altta gösterilir (kullanıcı, 2026-11-22).
- Birebir eşleşme yoksa benzer yazıma bakılır (`fuzzyMatch`: 5+ harfli sözcükte 1, 8+ harflide 2 harf fark; sayı ve kısa sözcük birebir). Benzer sonuçlar "tam eşleşme yok" diye gösterilir, altında "En yakını bul" kalır.
- Konum araması ilin sınır kutusuyla sınırlanır (`SRC_AEO.bbox`); kutu dışında çıkan yer sayılmaz. Yeni kaynak eklenirse illerinin kutusunu vermelidir.
- **Konumuma en yakın** (kullanıcı, 2026-11-22): `#locBtn` → `nearMe`, tarayıcının `navigator.geolocation`'ı (ayrı eklenti yok; izni Capacitor'ın WebView'ı sorar). Konum yalnız telefonda mesafe hesabında kullanılır, saklanmaz, dışarı gitmez. Şehir seçimine bakmaz, en yakın beş eczane. Ayarlar'dan kapatılır.
- "Yol tarifi" Google Haritalar'ın yol tarifi bağlantısını açar (`maps/dir`, başlangıç verilmez).
- **API eklenmiyor.** Bakılanlar (NosyAPI, Turkpidya) `arsiv/diger-iller/README.md`'de.

## Kurallar

- Siteden gelen her metin HTML'e yalnız `escapeHtml` ile yazılır; `tel:` ve harita bağlantıları kodda üretilir, siteden gelen bağlantı olduğu gibi kullanılmaz.
- Tarayıcının `alert` / `confirm` / `prompt` kutuları kullanılmaz.
- Renkler değişkenle yazılır (`var(--text)`, `var(--green)` …); her arayüz değişikliği koyu ve açık temada, 390 px ve 360 px genişlikte denenir.
- Sayfada içerik güvenlik politikası var (`<meta http-equiv="Content-Security-Policy">`): yeni bir siteye istek eklenirse `connect-src`'ye yazılır; dışarıdan betik, stil, resim yüklenmez.
- Ağ isteği `httpGet` ile yapılır: uygulamada `CapacitorHttp` (CORS'a takılmaz), tarayıcıda `fetch`.
- Yeni izin, ağ isteği ya da veriyi dışarı gönderen özellik eklenirse Ayarlar → "Gizlilik" bölümü ve mağaza için tutulan `site-ankaraeczane/gizlilik.html` (Türkçe + İngilizce) birlikte güncellenir.
- Ayarlar → "Yardım" (`#helpCard`, açılır başlıklar) kullanıcıya dönük özellikleri anlatır (kullanıcı, 2026-11-25). Kullanıcının gördüğü bir özellik eklenir, değişir ya da kalkarsa yardım metni de güncellenir.

## Çalışma şekli

- Her iş ayrı branch'te, PR ile `main`'e. Merge'ü kullanıcı yapar.
- Bu ortamda Android derlenemez; derleme ve telefon testi kullanıcıda (Android Studio, `D:\nobetci-eczane`, Samsung telefon USB ile). Java gözle denetlenir; sözdizimi için taklit Android / Capacitor sınıflarıyla `javac` denenebilir (davranışı göstermez).
- Test: `npm test`. Davranış değişikliğinde test de eklenir / güncellenir. `www/` http üzerinden açılır, Playwright'ta `aeo.org.tr` ve `nominatim.openstreetmap.org` istekleri kayıtlı cevapla karşılanır; uygulama davranışı için `window.Capacitor` taklit edilir. Tarayıcı siteyi doğrudan okuyamaz (CORS).

## Açık konular

- **Telefonda liste gelmedi (2026-11-21):** ilk kurulumda "Liste alınamadı". PR #1 hata ayrıntısını ekrana yazdırdı; ayrıntı "sayfa geldi ama içinde eczane bulunamadı" çıktı (liste sayfada değil, ayrı istekteymiş). PR #2 `getPharmacies` isteğine geçti; **telefonda doğrulanacak.**
- **Açılır kutular telefonda açılmadı (2026-11-21, kullanıcı):** neden bilinmiyor. PR #2'de `<select>` kaldırıldı; şehir / ilçe seçimi uygulamanın kendi alt penceresiyle (`openPicker`, `#pickBd`; geri tuşu `closePicker`). **Yeni seçim alanı eklenirse `<select>` kullanılmaz.**
- **Telefonda doğrulanacak (PR #5):** içerik güvenlik politikası uygulamayı bozmuyor mu (liste geliyor, ses çalışıyor mu); "Konumuma en yakın" izin soruyor ve sonuç veriyor mu. Politika sorun çıkarırsa `index.html` başındaki tek `<meta http-equiv="Content-Security-Policy">` satırı kaldırılır.
- Telefonda henüz denenmeyenler: mikrofon (`Ses.dinle`), sesli okuma (`Ses.oku`; Türkçe ses yoksa `dilYok` uyarısı, motor hazırlanırken art arda okuma), "Ara" ve "Yol tarifi" düğmeleri, geri tuşu.
- `test/ornek/gercek.json` yok: ayrıştırma yalnız elle kurulmuş örnekle deneniyor. Kullanıcı `npm run ornek:al` çalıştırıp dosyayı depoya eklerse gerçek yapıyla da denenir.
- **Sonraki nöbet günü telefonda doğrulanacak:** sitenin ileri tarihli istekte ne döndürdüğü bu ortamdan görülemedi. Gece (nöbet değişmeden önce) ve gündüz birer kez "sonraki gün"e basılıp gelen listenin gerçekten o güne ait olduğuna bakılmalı.
- **Telefonda doğrulanacak:** paylaş düğmesi, "her seferinde seç" ile harita uygulaması seçimi, "Yakına göre" sıralama, simgenin altındaki ad.
- **Kullanıcıda bekleyen kurulum** (`docs/site-yayini.md`): Cloudflare'de `ankaraeczane@simsec.app` yönlendirmesi (yapılana kadar geri bildirim e-postaları geri döner), Firebase'de `simsec-ankaraeczane` sitesinin oluşturulup yayımlanması ve `ankaraeczane.simsec.app` alan adının bağlanması. Yapıldığı doğrulanmadı.
- Mağazada yayın düşünülürse Ankara Eczacı Odası'ndan yazılı izin alınması önerildi (zorunlu değil; kullanıcı izinsiz yayını sordu, riskler anlatıldı: oda erişimi kesebilir, mağazaya şikâyet edebilir). İstenirse izin e-postası taslağı yazılacak. Mağazada Ankara'ya özel nöbetçi eczane uygulaması bulunmadı.
- Simge ve açılış ekranı telefonda görülmedi (PR ile eklendi; Capacitor'ın gerçek şablonunda betik denendi, derleme yapılmadı).
