package ir.dokoonapp.restaurant;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import ir.dokoonapp.plugins.DokoonNativePlugin;

/**
 * Restaurant panel shell (KAN-71).
 * - Phones (smallest width < 600dp) are locked to portrait; tablets rotate freely (the panel has a
 *   side rail + list/detail split from 720px).
 * - The WebView may play sound without a tap, so the app skips the browser-only «شروع شیفت» gesture
 *   screen and the new-order alert can ring right after launch.
 */
public class MainActivity extends BridgeActivity {
    static final int TABLET_MIN_DP = 600;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Dokoon's own plugin (KAN-72): Keystore session, keep-awake, vibration, new-order notification.
        registerPlugin(DokoonNativePlugin.class);
        super.onCreate(savedInstanceState);
        boolean tablet = getResources().getConfiguration().smallestScreenWidthDp >= TABLET_MIN_DP;
        setRequestedOrientation(
            tablet ? ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        );
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
    }
}
