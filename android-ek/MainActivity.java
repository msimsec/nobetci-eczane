package app.simsec.eczane;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Uygulamanın kendi eklentileri (npm'den gelmeyen) burada kaydedilir.
        registerPlugin(SesPlugin.class); // Sesli arama ve sesli yanıt
        registerPlugin(PaylasPlugin.class); // Paylaşma penceresi ve harita uygulaması seçimi
        super.onCreate(savedInstanceState);
    }
}
