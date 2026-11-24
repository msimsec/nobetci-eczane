# Arşiv: Ankara dışındaki iller

2026-11-24'te uygulamanın kapsamı **Ankara ve Kırıkkale**'ye indirildi, adı "Ankara Nöbetçi Eczane" oldu. Uygulama ileride Türkiye geneline yayılırsa buradaki çalışma kullanılır. Bu klasördeki hiçbir dosya uygulamaya ya da teste dahil değildir.

## İçindekiler

- `kaynak-oben.js`: Kayseri ve Mersin eczacı odası kaynakları (`obenSource`). Telefonda çalıştığı görüldü (kullanıcı, 2026-11-24: Kayseri'de 08:30 – 01:00 / 08:30 – 08:30, Mersin'de 18:00 – 08:00 / 17:00 – 08:00 saatleri geldi).
- `kayseri.html`, `mersin.html`: iki sitenin 22.11.2026 sayfasından kısaltılmış örnek kartlar.
- `testler.js`: bu kaynakların testleri.

## Geri eklemek için

1. `kaynak-oben.js` içindeki kodu `www/index.html`'de `SRC_AEO`'dan sonraya koy; `SOURCES` dizisine kaynakları ekle.
2. İçerik güvenlik politikasındaki `connect-src`'ye sitelerin adreslerini yaz.
3. Arama dolgu sözcüklerine (`STOP_WORDS`) il adlarını ekle.
4. Örnek sayfaları `test/ornek/` altına, testleri `test/calistir.js` içine geri koy (`testler.js` başındaki nota bak).
5. "Veri ve hakkında" metnini güncelle.

Uygulamadaki genel altyapı yerinde bırakıldı: kaynak başına önbellek (`cacheKey`, `syncSource`), eczane başına nöbet saati (`from` / `to`, `dutyState`, `hoursText`), konumdan ile geçiş (`cityAt`).

## 81 il için bakılan yollar

### 1. Eczacı odalarının siteleri (ücretsiz, sunucusuz)

TEB'in listesinde **60 bölge eczacı odası** var; 81 ili bunlar kapsıyor. 2026-11-24 taraması (sayfalar tarayıcı gibi açan bir araçla görüldü; betik çalışmadan gelen ham HTML ayrıca doğrulanmadı):

| Grup | Oda | Yaklaşık il | İş |
|---|---|---|---|
| Kayseri / Mersin ile aynı yapı (`.nobet-kart`) | 10 | 10 | `obenSource` ile oda başına birkaç satır |
| Aynı firma (Oben Teknoloji), farklı tema | 34 | ~49 | Ayrıştırıcı genelleştirilmeli (kart sınıfı değişiyor: `.nobetci`, `.nobetciecz`, sınıfsız; başlık `h4.tred`, `h4.text-danger`, `h3`) |
| Farklı yazılım | 15 | ~20 | Her site için ayrı kod |
| Ankara (kendi yapısı, `getPharmacies`) | 1 | 2 | Uygulamada |

- **Aynı yapı (10):** Kayseri, Mersin, Denizli, Sakarya (Bolu belirsiz), Hatay, Kocaeli, Osmaniye (saat satırı yok), Erzincan, Düzce, Adıyaman.
- **Aynı firma, farklı tema (34):** İzmir, Adana, Bursa, Diyarbakır, Erzurum (+Ardahan, Bayburt, Iğdır, Kars; liste ilçe seçince geliyor olabilir), Kahramanmaraş, Isparta, Zonguldak (+Bartın), Trabzon (+Artvin, Gümüşhane; il başına alt sayfa `/nobetci-eczaneler/61`, `/8`, `/29`), Tekirdağ, Aydın, Malatya, Elazığ (+Tunceli, Bingöl; form gerekebilir), Kastamonu (+Çankırı, Karabük), Manisa, Balıkesir, Muğla, Afyon, Aksaray (+Kırşehir), Kütahya, Çanakkale, Sivas, Van (+Bitlis, Hakkari), Edirne, Kırklareli, Mardin, Batman (+Muş), Çorum, Yozgat, Nevşehir, Burdur, Ağrı, Şırnak, Siirt.
- **Farklı yazılım (15):** İstanbul (`/nobetci-eczane/`), Konya (dış siteye yönlendiriyor), Samsun, Gaziantep, Eskişehir (+Bilecik; `/eskisehir-nobetci-eczaneler`), Antalya (`/tr/nobetci-eczaneler`; Alanya ve Manavgat ayrı siteler), Ordu, Şanlıurfa, Tokat (`/NobetciEczane.aspx`), Giresun, Uşak, Amasya, Karaman (`/nobet-listesi`), Niğde, Rize.
- Hangi odaya bağlı olduğu görülemeyen iller: Sinop, Yalova, Kilis.
- Alan adları TEB'in güncel listesinden alınmalı; eski listelerdeki bazı adresler el değiştirmiş (ör. `aksarayeo.org` artık oda sitesi değil, doğrusu `aksarayeo.org.tr`).
- Taramada Gaziantep odasının sitesine yabancı bir betik gömülmüş görünüyordu; o il odanın sitesinden okunacaksa dikkat.

### 2. Ücretsiz API: Turkpidya

`https://turkpidya.com/wp-json/turkpidya-data/v1/pharmacies/on-duty?city=adana` (public-apis listesinden). Anahtarsız, telefon başına dakikada 60 istek, ara sunucu gerekmez. Koşul: verinin yanında görünür, tıklanabilir "Veri: Turkpidya" bağlantısı. 2026-11-24'te 16 il döndü: Adana, Ankara (yalnız 9 eczane, eksik), Antalya, Balıkesir, Bursa, Denizli, Eskişehir, Gaziantep, İstanbul, İzmir, Kilis, Kocaeli, Mersin, Muğla, Şanlıurfa, Yalova. Kayseri yok; Kırıkkale ve Konya "engelli". Alanlar: ad, ilçe, adres, telefon, konum; bazı illerde nöbet başlangıç / bitiş saati. Küçük ve yeni bir site (Haziran 2026); kesintisizlik garantisi yok.

### 3. Ücretli API: NosyAPI

81 il. Ayda 500 ücretsiz kredi, 6 $ / 5.000 kredi; nöbet başlangıç / bitiş saati veriyor. Anahtar uygulamaya gömülemeyeceği için küçük bir ara sunucu gerekir. Sayfasında "kredi sonuç sayısı kadar düşer" notu fiyat tablosuyla çelişiyor; hesap açıp denenmedi.

### Önerilmiş sıra (uygulanmadı)

1. Aynı yapıdaki 8 il. 2. Ayrıştırıcıyı genelleştirip ~49 il. 3. Kalanlardan 7'si Turkpidya'dan, ~13'ü ayrı kodla.
