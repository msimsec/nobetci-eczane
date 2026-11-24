# Uygulamanın sitesi ve destek adresi

Mağaza bir gizlilik politikası adresi ve bir iletişim e-postası ister. Görev & Not'taki düzenin aynısı kullanılır:
alan adı `simsec.app`, barındırma Firebase Hosting, DNS ve e-posta yönlendirmesi Cloudflare.

| | Görev & Not | Ankara Nöbetçi Eczane |
|---|---|---|
| Site klasörü | `site-tasknote/` | `site-eczane/` |
| Firebase Hosting sitesi | `simsec-tasknote` | `simsec-eczane` |
| Adres | `tasknote.simsec.app` | `eczane.simsec.app` |
| Gizlilik politikası | `https://tasknote.simsec.app/gizlilik.html` | `https://eczane.simsec.app/gizlilik.html` |
| Destek e-postası | `tasknote@simsec.app` | `eczane@simsec.app` |

Firebase projesi aynı: `gunluk-haftalik-rapor` (`.firebaserc`).

## Bir kez yapılacaklar

1. **Cloudflare → E-posta → E-posta Yönlendirme:** `eczane@simsec.app` için bir kural ekle, hedef olarak kendi posta kutunu seç
   (`tasknote@simsec.app` kuralıyla aynı). Bu yapılana kadar uygulamadaki "Geri bildirim" ve "Yanlış bilgi bildir" e-postaları geri döner.
2. **Firebase'de siteyi oluştur** (bu depo klasöründe):

   ```
   firebase hosting:sites:create simsec-eczane
   ```

3. **Yayımla:**

   ```
   firebase deploy --only hosting
   ```

   Site önce `https://simsec-eczane.web.app` adresinde açılır.
4. **Firebase Console → Hosting → simsec-eczane → Özel alan adı ekle:** `eczane.simsec.app`. Firebase'in verdiği DNS kaydını
   **Cloudflare → DNS**'e ekle (`tasknote` için eklenen kaydın benzeri; Firebase sertifikayı kendisi alacağı için kayıt "yalnız DNS" olmalı,
   turuncu bulut kapalı).
5. `https://eczane.simsec.app/gizlilik.html` açılıyorsa bu adres Play Console'da gizlilik politikası olarak yazılır.

## Sonraki değişikliklerde

`site-eczane/` içindeki bir dosya değişince: `firebase deploy --only hosting`. Uygulamadaki Ayarlar → Gizlilik bölümü ile
`site-eczane/gizlilik.html` aynı şeyi anlatır; biri değişirse diğeri de güncellenir.
