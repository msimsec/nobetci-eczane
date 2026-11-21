package app.simsec.eczane;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Locale;

/**
 * Sesli arama ve sesli yanıt.
 * Dinleme: telefonun kendi ses tanıma penceresi açılır (Google ya da üreticinin ses tanıması). Uygulama mikrofon izni
 * istemez, sesi kendisi dinlemez; yalnız yazıya dönmüş metni alır. (Görev & Not uygulamasındaki SesPlugin ile aynı yol.)
 * Okuma: telefonun kendi metin okuma motoru (TextToSpeech).
 * durum():                 { var } — telefonda ses tanıma var mı (yoksa mikrofon düğmesi gösterilmez).
 * dinle({dil, ipucu}):     { metin } — söylenen metin (vazgeçildiyse ""), ses tanıma yoksa { yok:true }.
 * oku({metin, dil, hiz}):  { ok } — metni sesli okur; okuma motoru yoksa { yok:true }.
 * sus():                   okumayı keser.
 */
@CapacitorPlugin(name = "Ses")
public class SesPlugin extends Plugin {

    private TextToSpeech tts;
    private boolean ttsHazir = false;

    private Intent niyet(String dil, String ipucu) {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        if (dil != null && !dil.isEmpty()) {
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, dil);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, dil);
        }
        if (ipucu != null && !ipucu.isEmpty()) i.putExtra(RecognizerIntent.EXTRA_PROMPT, ipucu);
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        return i;
    }

    @PluginMethod
    public void durum(PluginCall call) {
        JSObject r = new JSObject();
        r.put("var", niyet(null, null).resolveActivity(getContext().getPackageManager()) != null);
        call.resolve(r);
    }

    @PluginMethod
    public void dinle(PluginCall call) {
        Intent i = niyet(call.getString("dil", ""), call.getString("ipucu", ""));
        if (i.resolveActivity(getContext().getPackageManager()) == null) {
            JSObject r = new JSObject();
            r.put("yok", true);
            call.resolve(r);
            return;
        }
        try {
            startActivityForResult(call, i, "sonuc");
        } catch (ActivityNotFoundException e) {
            JSObject r = new JSObject();
            r.put("yok", true);
            call.resolve(r);
        }
    }

    @ActivityCallback
    private void sonuc(PluginCall call, ActivityResult result) {
        if (call == null) return;
        String metin = "";
        Intent data = result.getData();
        if (result.getResultCode() == Activity.RESULT_OK && data != null) {
            ArrayList<String> l = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (l != null && !l.isEmpty() && l.get(0) != null) metin = l.get(0);
        }
        JSObject r = new JSObject();
        r.put("metin", metin);
        call.resolve(r);
    }

    private void soyle(PluginCall call, String metin, String dil, float hiz) {
        JSObject r = new JSObject();
        try {
            if (dil != null && !dil.isEmpty()) tts.setLanguage(Locale.forLanguageTag(dil));
            tts.setSpeechRate(hiz);
            tts.speak(metin, TextToSpeech.QUEUE_FLUSH, null, "eczane");
            r.put("ok", true);
        } catch (Exception e) {
            r.put("yok", true);
        }
        call.resolve(r);
    }

    @PluginMethod
    public void oku(final PluginCall call) {
        final String metin = call.getString("metin", "");
        final String dil = call.getString("dil", "tr-TR");
        Float h = call.getFloat("hiz", 1.0f);
        final float hiz = (h == null || h < 0.5f || h > 2.0f) ? 1.0f : h;
        if (metin == null || metin.isEmpty()) {
            call.resolve(new JSObject());
            return;
        }
        if (tts != null && ttsHazir) {
            soyle(call, metin, dil, hiz);
            return;
        }
        // İlk kullanım: okuma motoru hazır olunca konuşur.
        try {
            tts = new TextToSpeech(getContext().getApplicationContext(), status -> {
                ttsHazir = (status == TextToSpeech.SUCCESS);
                if (ttsHazir) {
                    soyle(call, metin, dil, hiz);
                } else {
                    tts = null;
                    JSObject r = new JSObject();
                    r.put("yok", true);
                    call.resolve(r);
                }
            });
        } catch (Exception e) {
            tts = null;
            JSObject r = new JSObject();
            r.put("yok", true);
            call.resolve(r);
        }
    }

    @PluginMethod
    public void sus(PluginCall call) {
        try {
            if (tts != null) tts.stop();
        } catch (Exception e) {
            // okuma zaten durmuş
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        try {
            if (tts != null) {
                tts.stop();
                tts.shutdown();
            }
        } catch (Exception e) {
            // kapanırken hata önemli değil
        }
        tts = null;
        ttsHazir = false;
        super.handleOnDestroy();
    }
}
