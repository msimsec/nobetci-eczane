# Nöbetçi Eczane

Şehir ve ilçe seçilir, o günün nöbetçi eczaneleri listelenir. Mikrofon düğmesiyle cadde ya da mahalle adı söylenerek aranır; istenirse sonuç sesli okunur. Önce Android (Capacitor).

- **Veri:** Ankara Eczacı Odası (Ankara ve Kırıkkale). Liste, odanın nöbetçi eczaneler sayfasının kendi kullandığı istekle alınır: `https://www.aeo.org.tr/getPharmacies/YYYY-AA-GG` (telefonun bugünkü tarihi). İstek telefondan doğrudan gider; arada sunucu ve API anahtarı yok.
- **Nöbet günü:** Nöbetin değiştiği saat koda yazılmaz. Sabah nöbet değişene kadar site bir önceki günün listesini verir ve hangi saate kadar geçerli olduğunu söyler; uygulama o saati okur, saat gelince listeyi yeniler. Güncel liste alınamazsa eldeki eski liste kırmızı "Bu liste güncel olmayabilir" uyarısıyla gösterilir.
- **Web kodu:** `www/index.html` (tek dosya, build adımı yok). Yazı tipi `www/vendor/fonts/inter` (SIL OFL 1.1).
- **Test:** `test/calistir.js` ve `test/ornek/` (aşağıda).
- **Android'e özgü kod:** `android-ek/` (`SesPlugin.java`: telefonun ses tanıma penceresi ve metin okuma motoru; `MainActivity.java`).
- **Uygulama kimliği:** `app.simsec.eczane` (`capacitor.config.json`). İlk kurulumdan önce değiştirilebilir.

## İlk kurulum (bilgisayarda, bir kez)

Node.js ve Android Studio kurulu olmalı.

```
npm install
npx cap add android
npm run android:hazirla
npm run android:ac
```

1. `npm install` Capacitor'ı indirir.
2. `npx cap add android` `android/` klasörünü üretir.
3. `npm run android:hazirla` ses eklentisini, `<queries>` bloğunu ve konum iznini Android projesine yerleştirir, sürüm adını yazar, web kodunu kopyalar.
4. `npm run android:ac` projeyi Android Studio'da açar; telefon USB ile bağlıyken ▶ ile kurulur.

## Sonraki değişikliklerde

`www/index.html` ya da `android-ek/` değişince: `npm run android:hazirla`, sonra Android Studio'da yeniden derleme.

## Test

```
npm test
```

Uygulamayı Playwright ile açar; siteye istek gitmez, `aeo.org.tr` ve Nominatim istekleri kayıtlı cevapla karşılanır. Playwright depoya bağımlılık olarak eklenmedi; bilgisayarda çalıştırmak için bir kez: `npm i -D playwright` ve `npx playwright install chromium`.

- `test/ornek/yapay.html`: elle kurulmuş örnek cevap (uydurma eczaneler). Ayrıştırmanın sınır durumlarını dener.
- `test/ornek/gercek.json`: sitenin gerçek cevabı. Depoda henüz yok; `npm run ornek:al` bugünkü cevabı kaydeder, test bu dosya varsa onu da ayrıştırır. Site yapıyı değiştirdiğinden şüphelenilirse önce bu komut çalıştırılır.

## Bilinen sınırlar

- `android/` klasörü depoda tutulmaz; yukarıdaki komutlarla yeniden üretilir. Android Studio'da elle yapılan değişiklik kalıcı olsun isteniyorsa `android-ek/` ya da `scripts/android-ek.js` içine taşınır.
- "Konumuma en yakın" telefonun konumunu yalnız mesafe hesabı için kullanır; konum saklanmaz ve dışarı gönderilmez. Mesafeler kuş uçuşudur.
- Tarayıcıda (bilgisayarda `index.html` açılınca) liste gelmez: tarayıcı başka sitenin sayfasını okutmaz (CORS). Uygulama telefonda Capacitor'ın yerel HTTP'siyle okur.
- Kaynak resmî bir API değil. Oda cevabın yapısını değiştirirse `SRC_AEO.parse` güncellenir.
- Site nöbet saatlerini vermez (hafta içi akşam, pazar tam gün gibi); uygulama yalnız hangi günün listesinin geçerli olduğunu gösterir.
- "Bulunamazsa en yakını göster" açıkken aranan yer adı konum için OpenStreetMap'e (Nominatim) gönderilir; Ayarlar'dan kapatılabilir.
- Yeni il ya da API eklemek için `index.html` içindeki `SOURCES` dizisine yeni kaynak yazılır; ekran kodu değişmez.
