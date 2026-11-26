# Play Console rehberi: hesap, form cevapları, imzalı paket, kapalı test

Hazırlandığı gün: 2026-11-26 · Ankara Nöbetçi Eczane (`app.simsec.eczane`). Görev & Not için hazırlanan rehberin bu uygulamaya uyarlanmış hâlidir.

Bu belge sırayla ilerlemeniz için yazıldı. Console'un ekranlarını ben göremiyorum; ekranlar zaman zaman değişir ve Türkçe arayüzde başlıklar farklı çevrilmiş olabilir. Bir soru burada yoksa ya da farklı soruluyorsa ekran görüntüsünü gönderin, cevabını birlikte yazarız. Cevapların dayanağı uygulamanın gerçek davranışı ve `site-ankaraeczane/gizlilik.html`'dir; uygulamaya izin, ağ isteği ya da veri gönderen bir özellik eklenirse bu belge de değişir.

## Görev & Not'tan farkları

Bu uygulama Görev & Not gibi "hiçbir ağ isteği yapmaz" diyemez. Formlarda dikkat isteyen üç yer var:

1. **İnternet:** nöbet listesi Ankara Eczacı Odası'nın sitesinden alınır; ayar açıkken aranan yer adı OpenStreetMap'in Nominatim hizmetine gider.
2. **Konum izni:** yalnız kullanıcı düğmeye basınca, yalnız uygulama açıkken kullanılır; telefonun dışına çıkmaz.
3. **Kaynak resmî bir kurum:** uygulama odanın resmî uygulaması değildir. Mağaza metni kaynağı ve bağlantısız olduğunu açıkça yazmalıdır.

## Henüz hazır olmayanlar

| Eksik | Durum |
|---|---|
| Mağaza metinleri (ad, kısa ve tam açıklama) | Yazılmadı |
| Ekran görüntüleri ve öne çıkan görsel | Üretilmedi |
| 512 × 512 mağaza simgesi | Üretilmedi (çizim `scripts/simge-uret.js` içinde hazır) |
| Sitenin açılması (`ankaraeczane.simsec.app`) | Firebase sertifikası bekleniyor |
| Uygulama kimliğinin kesinleşmesi | Şu an `app.simsec.eczane`; mağazadan sonra değişmez (bölüm 4) |
| Ankara Eczacı Odası'ndan izin | Karar verilmedi (zorunlu değil, önerildi) |

## Sıra

1. Geliştirici hesabı (bölüm 1). Görev & Not için açtıysanız aynı hesap kullanılır.
2. Uygulamayı oluşturun, mağaza girişini doldurun (bölüm 2).
3. "Uygulama içeriği" formlarını doldurun (bölüm 3).
4. İmzalı paketi hazırlayın (bölüm 4). Önce bana haber verin.
5. Kapalı testi başlatın (bölüm 5): en az 12 kişi, 14 gün kesintisiz.
6. 14 gün dolunca üretim erişimi için başvurun, sonra yayımlayın (bölüm 6).

## 1. Geliştirici hesabı

- Görev & Not için hesap açıldıysa **aynı hesap** kullanılır; ikinci kez ücret ya da kimlik doğrulaması istenmez. Bir hesapta birden çok uygulama olur.
- Açılmadıysa: `play.google.com/console/signup`, bir kerelik 25 ABD doları, hesap türü **Kişisel**, geliştirici adı **simsec.app** (gizlilik politikasındaki yayıncı adıyla aynı).
- Geliştirici hesabının iletişim adresi hesap geneli içindir. Bu uygulamanın mağaza sayfasında görünecek adres ayrıca girilir: `ankaraeczane@simsec.app` (bölüm 2).

## 2. Uygulamayı oluşturun ve mağaza girişi

**Uygulama oluştur**

| Soru | Cevap |
|---|---|
| Uygulama adı | Ankara Nöbetçi Eczane |
| Varsayılan dil | Türkçe (tr-TR) |
| Uygulama mı, oyun mu | Uygulama |
| Ücretsiz mi, ücretli mi | Ücretsiz (sonradan ücretliye çevrilemez) |

**Ana mağaza girişi**

| Alan | Değer |
|---|---|
| Uygulama adı | Ankara Nöbetçi Eczane (21 karakter; sınır 30) |
| Kısa açıklama (en çok 80) | Henüz yazılmadı |
| Tam açıklama (en çok 4000) | Henüz yazılmadı |
| Uygulama simgesi (512 × 512) | Henüz üretilmedi |
| Öne çıkan görsel (1024 × 500) | Henüz üretilmedi |
| Telefon ekran görüntüleri | Henüz üretilmedi |
| Tablet ekran görüntüleri | Boş bırakılabilir |

Uygulama yalnız Türkçe olduğu için İngilizce mağaza girişi eklemek zorunlu değildir.

**Tam açıklamada mutlaka bulunacak iki cümle** (Google'ın yanıltıcı beyan kuralı, resmî kurum bilgisi sunan uygulamalardan kaynağı ve bağlantısızlığı açıkça yazmasını ister; eczacı odası bir kamu kurumu niteliğinde meslek kuruluşudur, o yüzden aynı özeni gösteriyoruz):

- Kaynak: "Nöbet listesi Ankara Eczacı Odası'nın herkese açık nöbet sayfasından (https://www.aeo.org.tr/nobetci-eczaneler) alınır."
- Bağlantısızlık: "Bu uygulama Ankara Eczacı Odası'nın ya da herhangi bir kamu kurumunun resmî uygulaması değildir."

Odadan izin alınırsa ikinci cümlenin yanına "Ankara Eczacı Odası'nın izniyle" eklenebilir; izin yokken bu ifade kullanılmaz.

**Mağaza ayarları**

| Alan | Değer |
|---|---|
| Uygulama kategorisi | Sağlık ve Fitness (İstanbul Eczacı Odası'nın uygulaması da bu kategoride). "Tıp" kategorisi de olur; ilki daha yaygın. |
| Etiketler | Listede olanlardan en yakınları (eczane, sağlık hizmetleri) |
| E-posta | `ankaraeczane@simsec.app` |
| Web sitesi | `https://ankaraeczane.simsec.app` |
| Telefon | Boş bırakılabilir |

## 3. Uygulama içeriği formları

### Gizlilik politikası
`https://ankaraeczane.simsec.app/gizlilik.html` (site açıldıktan sonra girilir; açılmayan adres reddedilir).

### Uygulama erişimi
**Bütün işlevler özel erişim olmadan kullanılabilir.** (Hesap, giriş, abonelik yok.)

### Reklamlar
**Hayır, uygulamamda reklam yok.**

### İçerik derecelendirmesi (IARC anketi)
- E-posta: `ankaraeczane@simsec.app`
- Kategori: **Yardımcı program, verimlilik, iletişim ya da diğer** (oyun ve sosyal ağ değil).
- Şiddet, korku, cinsellik, kumar, kaba dil: **Hayır.**
- Uyuşturucu / alkol / tütün: **Hayır.** Uygulama ilaç tanıtmaz, satmaz, ilaç bilgisi vermez; yalnız eczanelerin adını, adresini ve telefonunu gösterir. Anket "ilaç ya da eczane ürünü satışı / yönlendirmesi" gibi ayrı bir soru sorarsa cevap yine Hayır'dır; emin olamazsanız ekran görüntüsünü gönderin.
- Kullanıcılar birbiriyle iletişim kurabiliyor ya da içerik paylaşabiliyor mu: **Hayır.** (Paylaş düğmesi eczane bilgisini telefondaki başka bir uygulamaya verir; uygulamanın içinde başka kullanıcı yok.)
- Kullanıcının konumunu başkalarıyla paylaşıyor mu: **Hayır.** (Konum yalnız telefonda mesafe hesabında kullanılır.)
- Dijital satın alma: **Hayır.** Web tarayıcısı / arama motoru: **Hayır.**
- Beklenen sonuç: Herkes / PEGI 3.

### Hedef kitle ve içerik
- Hedef yaş grupları: **13–15, 16–17, 18 ve üzeri.** 13 yaş altını **işaretlemeyin** (işaretlenirse Aileler politikasının ek şartları devreye girer; uygulama çocuklara özel değil, gizlilik politikası da böyle söylüyor).
- Mağaza girişiniz çocukların ilgisini çekebilir mi: **Hayır.**

### Veri güvenliği

Bu form Görev & Not'takinden farklı dolar. Google'ın tanımıyla "toplama", verinin uygulama tarafından **telefonun dışına gönderilmesidir**; yalnız telefonda işlenen veri toplanmış sayılmaz.

| Veri | Telefondan çıkıyor mu? | Formda |
|---|---|---|
| Konum (yaklaşık ve kesin) | Hayır. Mesafe telefonda hesaplanır. | Beyan edilmez |
| Seçilen şehir / ilçe, ayarlar, kayıtlı liste | Hayır. | Beyan edilmez |
| Ses | Uygulama almaz; telefonun ses tanıma servisi işler, uygulama mikrofon izni istemez. | Beyan edilmez |
| Aranan yer adı | **Evet**, ayar açıkken ve kullanıcı "en yakını bul" dediğinde OpenStreetMap Nominatim'e gider. | Aşağıya bakın |
| Nöbet listesi isteği | Odanın sitesine yalnız tarih gider; kullanıcıya ait veri gitmez. | Beyan edilmez |

**Aranan yer adı için önerdiğim cevap (temkinli yol):**

- Uygulamanız gerekli kullanıcı verisi türlerinden herhangi birini topluyor ya da paylaşıyor mu: **Evet.**
- Veri türü: **Uygulama etkinliği → Uygulama içi arama geçmişi** (In-app search history).
- Toplanıyor mu: **Evet.** Paylaşılıyor mu: **Evet** (üçüncü taraf: OpenStreetMap Nominatim).
- Geçici olarak mı işleniyor (ephemeral): **Evet.** Uygulama bu veriyi saklamaz.
- Zorunlu mu, isteğe bağlı mı: **İsteğe bağlı** (Ayarlar → "Bulunamazsa en yakını göster" kapatılabilir).
- Amaç: **Uygulama işlevselliği.**
- Aktarım sırasında şifreleniyor mu: **Evet** (bütün istekler HTTPS).
- Kullanıcı verilerinin silinmesini isteyebilir mi: uygulama veriyi saklamadığı için silinecek bir şey yok; form "silme isteği yolu sağlıyor musunuz" diye sorarsa **Hayır** (hesap yok, geliştiricide veri yok).

Neden temkinli yol: bu sorunun cevabından emin değilim. Google, kullanıcının kendi başlattığı ve gönderileceğini beklediği aktarımları "paylaşma" saymayabiliyor; o yoruma göre "Hayır, veri toplamıyorum" demek de savunulabilir. Ancak eksik beyan uygulamanın reddine ya da kaldırılmasına yol açabilir, fazla beyan ise yalnız mağaza sayfasında bir satır demektir. Mağazada "Arama geçmişi · üçüncü taraflarla paylaşılabilir" gibi bir satır görünür.

Alternatif: "Bulunamazsa en yakını göster" özelliği varsayılan olarak kapalı gelirse bile aktarım yine mümkün olduğu için beyan değişmez. Özellik tamamen kaldırılırsa form "Hayır" ile biter.

- Hesap oluşturma / hesap silme adresi sorulursa: **uygulamada hesap oluşturulmuyor.**

### Reklam kimliği
**Hayır**, uygulama reklam kimliği kullanmıyor (`AD_ID` izni yok). Yüklenen pakette bu iznin olmadığına Console'un "Uygulama paketi gezgini → İzinler" ekranından bir kez bakın; Capacitor'ın şablonu bu izni eklemiyor, yine de doğrulamak iyi olur.

### Sağlık uygulamaları beyanı
Uygulama kategorisi "Sağlık ve Fitness" olduğu için Console büyük olasılıkla bu formu ister. Seçeneklerin tam listesini bilmiyorum; ilke şu:

- Uygulama **sağlık verisi toplamaz, işlemez, saklamaz**; kullanıcıdan sağlık bilgisi istemez.
- Tıbbi cihaz değildir; teşhis, tedavi, ilaç önerisi sunmaz.
- En yakın seçenek büyük olasılıkla "sağlık hizmetleri ve yönetimi" altındaki eczane / sağlık kuruluşu bulma türü bir maddedir. Listede tam karşılığı yoksa "Diğer" seçilip şu açıklama yazılır: "Ankara ve Kırıkkale'deki nöbetçi eczanelerin adını, adresini ve telefonunu listeler. Sağlık verisi toplamaz."
- Bu formu doldururken ekran görüntüsünü gönderin; seçeneği birlikte seçelim.

### Öteki beyanlar

| Form | Cevap |
|---|---|
| Haber uygulaması | Hayır |
| Devlet uygulaması | **Hayır.** Uygulama bir kamu kurumu adına yayımlanmıyor. (Bu yüzden mağaza metnindeki kaynak ve bağlantısızlık cümleleri önemli.) |
| Finansal özellikler | Uygulamam finansal özellik sunmuyor |
| Konum izni beyanı | Bu form yalnız **arka planda** konum kullanan uygulamalara çıkar. Uygulama konumu yalnız açıkken, kullanıcı düğmeye basınca kullanır (`ACCESS_BACKGROUND_LOCATION` yok); form çıkmamalı. Çıkarsa: "Yalnız ön planda, kullanıcı 'Konumuma en yakın' ya da 'Yakına göre' düğmesine bastığında, eczanelere uzaklığı telefonda hesaplamak için. Konum saklanmaz ve gönderilmez." |
| Ön plan hizmeti, fotoğraf / video izni, tam zamanlı alarm | Kullanılmıyor; bu formlar büyük olasılıkla hiç çıkmaz |

**Paketteki izinler** (bilginiz olsun; `scripts/android-ek.js` ve Capacitor şablonu ekler): `INTERNET`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`. Mikrofon, bildirim, depolama, kişiler, kamera izni yoktur.

## 4. İmzalı paket (AAB)

**Önce bana söyleyin.** Paketi hazırlamadan önce üç şeyi birlikte kesinleştireceğiz:

1. **Uygulama kimliği.** Şu an `app.simsec.eczane`. Mağazaya yüklendikten sonra hiç değişmez. `app.simsec.<uygulama>` düzeninize uyuyor; site ve e-posta adı `ankaraeczane` olduğu için kimliği de `app.simsec.ankaraeczane` yapmak isteyebilirsiniz. Değişirse telefonunuzdaki şimdiki kurulum ayrı bir uygulama olarak kalır (silinip yenisi kurulur; kaybolacak veri yalnız ayarlardır).
2. **Sürüm adı.** `package.json`'da şu an `0.1.0`; mağazaya `1.0` olarak çıkmak isteyebilirsiniz.
3. **Sürüm sayacı (`versionCode`).** Kullanıcı görmez; her yüklemede 1 artması gerekir. `android/` klasörü depoda tutulmadığı ve yeniden üretildiği için bu sayı şu an hiçbir yerde saklanmıyor; paket hazırlığından önce `package.json`'a ekleyip betiğin `build.gradle`'a yazmasını sağlayacağım. Bu yapılmadan ikinci sürüm yüklenemez.

**İmza anahtarı (bir kez oluşturulur)**
1. Proje klasöründe `npm run android:hazirla`, sonra Android Studio'yu açın.
2. Menü: **Build → Generate Signed App Bundle / APK…** → **Android App Bundle** → Next.
3. **Create new…**
   - Key store path: proje klasörünün **dışında** bir yer (ör. Belgeler'de `anahtarlar/ankaraeczane-upload.jks`). Görev & Not'un anahtarından ayrı bir dosya olsun.
   - Password: güçlü bir şifre. Alias: `upload`. Key password: aynı şifre olabilir.
   - Validity: 25 yıl. Ad alanlarına adınızı ya da `simsec.app` yazın.
4. Next → **release** → Create. Çıkan dosya: `android/app/release/app-release.aab`.

**Anahtarı korumak**
- `.jks` dosyasını ve şifreyi en az iki yerde saklayın (ör. şifre yöneticisi + harici disk). Git'e girmez; depo bunu zaten engelliyor (`*.jks`, `android/`).
- Console ilk yüklemede **Play Uygulama İmzalama**'yı önerir; kabul edin. Asıl imzayı Google tutar, sizdeki "yükleme anahtarı" olur; kaybederseniz Google'dan sıfırlatılabilir.

**Dikkat: `android/` klasörü silinip yeniden üretilirse** Android Studio'da elle yaptığınız ayarlar gider. İmza anahtarı proje dışında durduğu için etkilenmez; sihirbazda aynı anahtarı yeniden seçmeniz yeter.

**Her yeni sürümde**
1. Bana söyleyin, sürüm sayacını 1 artırayım.
2. `npm run android:hazirla` → Build → Generate Signed App Bundle → aynı anahtar → release.
3. Yeni `.aab` dosyasını Console'a yükleyin.

## 5. Kapalı test (zorunlu)

Kişisel hesapta üretime çıkmadan önce: **en az 12 test kullanıcısı, kesintisiz 14 gün** testte kayıtlı kalmalı.

1. Console → **Test → Kapalı test** → kanal oluşturun (hazır "Alpha" kanalı olur).
2. **Test kullanıcıları:** bir e-posta listesi oluşturun, kişilerin **Google hesabı (Gmail) adreslerini** ekleyin. 12 şart; birkaç kişi vazgeçebileceği için 15–20 kişi ekleyin. Görev & Not için bir liste oluşturduysanız aynı liste burada da seçilebilir.
3. **Ülkeler:** Türkiye.
4. **Sürüm oluştur:** `.aab` dosyasını yükleyin, sürüm notu yazın ("İlk test sürümü"), incelemeye gönderin. İlk inceleme birkaç gün sürebilir.
5. Onaylanınca Console bir **katılım bağlantısı** verir. Kişiler bağlantıyı açıp "Test kullanıcısı ol"a basar, sonra uygulamayı Play Store'dan kurar. **Sayaç, kişi katıldığında işlemeye başlar;** listeye eklemek yetmez.
6. 14 gün boyunca kimse testten çıkmasın. Ankara ya da Kırıkkale'de yaşayan test kullanıcıları gerçek kullanım açısından daha değerlidir; arada bir uygulamayı açmaları ve bir iki geri bildirim yazmaları başvuruyu güçlendirir.

Kendi telefonunuz: Android Studio'dan kurduğunuz sürüm ile Play'den gelen sürümün imzası farklıdır, üst üste kurulmaz. Play'den kurmadan önce eskisini silin. Kaybolacak veri yalnız seçimleriniz ve ayarlarınızdır.

## 6. Üretim erişimi ve yayın

1. 14 gün dolunca Console'da **Üretim erişimi için başvur** düğmesi açılır. Kısa sorular gelir: testi nasıl yaptınız, kaç kişi kullandı, ne geri bildirim aldınız, neyi düzelttiniz, uygulama kimin için. Cevapları o gün birlikte yazarız (test sırasında gelen geri bildirimleri not alın).
2. Onay genelde birkaç gün sürer.
3. **Üretim → Yeni sürüm oluştur:** aynı ya da güncel `.aab`, sürüm notu, ülke (Türkiye), incelemeye gönderin.
4. Yayımlanınca `site-ankaraeczane/index.html` sayfasına mağaza bağlantısını ekliyorum (bana söyleyin).

## Yüklemeden hemen önce

- "Ankara Nöbetçi Eczane" adını telefondan Play Store'da bir kez aratın; birebir aynı adlı yeni bir uygulama çıkmış mı bakın. (2026-11-25'te üç aramada Ankara'ya özel bir nöbetçi eczane uygulaması çıkmamıştı.)
- `https://ankaraeczane.simsec.app/gizlilik.html` açılıyor mu bakın.
- Uygulamadaki Ayarlar → Gizlilik ile site sayfası aynı şeyi söylüyor mu bir kez karşılaştırın.
- Odadan izin isteyip istemeyeceğinize karar verin; izin geldiyse mağaza metnine eklenir.
