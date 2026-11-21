package ir.dokoonapp.customer;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import ir.dokoonapp.plugins.DokoonNativePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Dokoon's own plugin (KAN-72): Keystore session storage. Must be registered before super.onCreate.
        registerPlugin(DokoonNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
