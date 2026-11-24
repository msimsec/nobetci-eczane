package app.simsec.eczane;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Telefonun paylaşma penceresi ve harita uygulaması seçimi.
 * metin({metin, baslik}):          metni telefonun paylaşma penceresiyle paylaşır (WhatsApp, SMS, e-posta ...).
 * harita({lat, lng, ad, adres}):   konumu telefondaki harita uygulamalarından biriyle açar; kullanıcı uygulamayı seçer.
 *                                  Konum yoksa ad + adres aranır.
 * Uygulama hiçbir izin istemez; veri yalnız kullanıcının seçtiği uygulamaya gider.
 */
@CapacitorPlugin(name = "Paylas")
public class PaylasPlugin extends Plugin {

    @PluginMethod
    public void metin(PluginCall call) {
        String metin = call.getString("metin", "");
        if (metin == null || metin.isEmpty()) {
            call.reject("metin yok");
            return;
        }
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_TEXT, metin);
        String baslik = call.getString("baslik", "");
        try {
            getActivity().startActivity(Intent.createChooser(i, (baslik == null || baslik.isEmpty()) ? null : baslik));
            call.resolve();
        } catch (Exception e) {
            call.reject("paylaşılamadı");
        }
    }

    @PluginMethod
    public void harita(PluginCall call) {
        Double lat = call.getDouble("lat");
        Double lng = call.getDouble("lng");
        String ad = call.getString("ad", "");
        String adres = call.getString("adres", "");
        String uri;
        if (lat != null && lng != null) {
            uri = "geo:" + lat + "," + lng + "?q=" + lat + "," + lng + "(" + Uri.encode(ad == null ? "" : ad) + ")";
        } else {
            uri = "geo:0,0?q=" + Uri.encode(((ad == null ? "" : ad) + " " + (adres == null ? "" : adres)).trim());
        }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
            getActivity().startActivity(Intent.createChooser(i, "Harita uygulaması"));
            call.resolve();
        } catch (Exception e) {
            call.reject("harita açılamadı");
        }
    }
}
