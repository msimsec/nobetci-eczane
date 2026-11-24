// ARŞİV: Kayseri ve Mersin eczacı odası kaynakları (2026-11-24'te uygulamadan çıkarıldı; kapsam Ankara + Kırıkkale'ye indirildi).
// Bu dosya çalıştırılmaz. Geri eklemek için aşağıdaki kod www/index.html içinde SRC_AEO'dan sonraya yapıştırılır,
// SOURCES dizisine SRC_KAYSERI ve SRC_MERSIN eklenir, CSP connect-src'ye iki sitenin adresi yazılır. Ayrıntı: README.md.
// Koddaki norm, ymd, httpGet, OTHER index.html'deki yardımcılardır.

/* Kayseri ve Mersin eczacı odalarının siteleri aynı yazılımı kullanır: liste /nobetci-eczaneler sayfasının kendi HTML'indedir.
   Kart: .nobet-kart → <h4><strong>AD</strong> [- İLÇE]</h4>, <p> içinde simgeden sonra gelen metinler
   (fa-arrow-right: ilçe, fa-home: adres, fa-arrows: tarif), tel: bağlantısı, harita bağlantısında ?q=enlem,boylam ve
   "22.11.2026 08:30 / 23.11.2026 01:00 nöbetçidir." satırı (eczanenin nöbet başlangıcı / bitişi → from / to). */
function titleTr(s){ return String(s).toLocaleLowerCase('tr').replace(/(^|[\s\-.(])\p{L}/gu, m => m.toLocaleUpperCase('tr')); }
function obenSource(o){
  return {
    id: o.id, ad: o.ad, url: o.url, cities: [o.city], bbox: { [o.city]: o.bbox }, fixedDistricts: { [o.city]: o.districts },
    parse(html){
      const doc = new DOMParser().parseFromString(String(html), 'text/html');
      const list = [], ts = (d, m, y, h, mi) => new Date(+y, m - 1, +d, +h, +mi).getTime();
      doc.querySelectorAll('.nobet-kart').forEach((box, i) => {
        const h4 = box.querySelector('h4'), st = h4 && h4.querySelector('strong'), p = box.querySelector('p');
        const name = (((st || h4) && (st || h4).textContent) || '').replace(/\s+/g, ' ').trim();
        if(!name || !p) return;
        const f = { dist: st ? (h4.textContent || '').replace(st.textContent, '').replace(/^[\s\-–]+/, '') : '', addr: '', note: '' };
        let cur = '';
        p.childNodes.forEach(n => {
          if(n.nodeType === 1){
            if(n.tagName === 'I'){ const c = n.className || ''; cur = /fa-arrow-right/.test(c) ? 'dist' : /fa-home/.test(c) ? 'addr' : /fa-arrows/.test(c) ? 'note' : ''; }
            return;                                        // bağlantı, vurgu, satır sonu: metni alınmaz
          }
          if(cur && n.nodeType === 3) f[cur] += n.textContent || '';
        });
        const clean = t => t.replace(/\s+/g, ' ').trim();
        let phone = '', lat = null, lng = null, from = 0, to = 0;
        box.querySelectorAll('a[href]').forEach(a => {
          const h = a.getAttribute('href') || '';
          const t = /^tel:(.+)$/.exec(h); if(t && !phone) phone = t[1].trim();
          const m = /[?&]q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(h);
          if(m){ const la = parseFloat(m[1]), lo = parseFloat(m[2]); if(la > 35 && la < 43 && lo > 25 && lo < 46){ lat = la; lng = lo; } }
        });
        const hm = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})\s*\/\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/.exec(p.textContent || '');
        if(hm){ const a = ts(hm[1], hm[2], hm[3], hm[4], hm[5]), b = ts(hm[6], hm[7], hm[8], hm[9], hm[10]); if(isFinite(a) && isFinite(b) && b > a){ from = a; to = b; } }
        const rd = clean(f.dist);
        const district = !rd ? OTHER : (o.districts.find(d => norm(d) === norm(rd)) || titleTr(rd));
        list.push({ id: o.id + '-' + i, name, city: o.city, district, address: clean(f.addr), note: clean(f.note), phone, lat, lng, from, to });
      });
      const districts = { [o.city]: o.districts.slice() };
      list.forEach(p => { if(p.district !== OTHER && !districts[o.city].includes(p.district)) districts[o.city].push(p.district); });
      districts[o.city].sort((a, b) => a.localeCompare(b, 'tr'));
      const froms = list.map(p => p.from).filter(Boolean);
      return { duty: ymd(new Date(froms.length ? Math.min.apply(null, froms) : Date.now())), districts, list, notice: '',
               until: list.reduce((m, p) => Math.max(m, p.to), 0) };      // son nöbet de bitince liste eskir
    },
    async fetchAll(){
      const r = await httpGet(this.url, { 'Accept': 'text/html,application/xhtml+xml,*/*' });
      const d = this.parse(r);
      if(!d.list.length) throw new Error('Sayfa geldi ama içinde eczane bulunamadı (' + String(r).length + ' karakter)');
      return d;
    }
  };
}
const SRC_KAYSERI = obenSource({ id: 'kayseri', ad: 'Kayseri Eczacı Odası', url: 'https://www.kayserieo.org.tr/nobetci-eczaneler', city: 'Kayseri',
  bbox: [34.8, 37.7, 36.9, 39.4],
  districts: ['Akkışla','Bünyan','Develi','Felahiye','Hacılar','İncesu','Kocasinan','Melikgazi','Özvatan','Pınarbaşı','Sarıoğlan','Sarız','Talas','Tomarza','Yahyalı','Yeşilhisar'] });
const SRC_MERSIN = obenSource({ id: 'mersin', ad: 'Mersin Eczacı Odası', url: 'https://www.mersineczaciodasi.org.tr/nobetci-eczaneler', city: 'Mersin',
  bbox: [32.5, 35.9, 35.3, 37.5],
  districts: ['Akdeniz','Anamur','Aydıncık','Bozyazı','Çamlıyayla','Erdemli','Gülnar','Mezitli','Mut','Silifke','Tarsus','Toroslar','Yenişehir'] });

const SOURCES = [SRC_AEO, SRC_KAYSERI, SRC_MERSIN];
