# Nöbetçi Eczane

Şehir ve ilçe seçilir, o günün nöbetçi eczaneleri listelenir. Mikrofon düğmesiyle cadde ya da mahalle adı söylenerek aranır; istenirse sonuç sesli okunur. Önce Android (Capacitor).

- **Veri:** Ankara Eczacı Odası, `https://www.aeo.org.tr/nobetci-eczaneler` (Ankara ve Kırıkkale). Sayfa telefondan doğrudan okunur; arada sunucu ve API anahtarı yok.
- **Web kodu:** `www/index.html` (tek dosya, build adımı yok). Yazı tipi `www/vendor/fonts/inter` (SIL OFL 1.1).
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
3. `npm run android:hazirla` ses eklentisini ve `<queries>` bloğunu Android projesine yerleştirir, web kodunu kopyalar.
4. `npm run android:ac` projeyi Android Studio'da açar; telefon USB ile bağlıyken ▶ ile kurulur.

## Sonraki değişikliklerde

`www/index.html` ya da `android-ek/` değişince: `npm run android:hazirla`, sonra Android Studio'da yeniden derleme.

## Bilinen sınırlar

- Tarayıcıda (bilgisayarda `index.html` açılınca) liste gelmez: tarayıcı başka sitenin sayfasını okutmaz (CORS). Uygulama telefonda Capacitor'ın yerel HTTP'siyle okur.
- Kaynak resmî bir API değil. Oda sayfanın yapısını değiştirirse `SRC_AEO.parse` güncellenir.
- "Bulunamazsa en yakını göster" açıkken aranan yer adı konum için OpenStreetMap'e (Nominatim) gönderilir; Ayarlar'dan kapatılabilir.
- Yeni il ya da API eklemek için `index.html` içindeki `SOURCES` dizisine yeni kaynak yazılır; ekran kodu değişmez.
