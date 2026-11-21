package ir.dokoonapp.plugins;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Dokoon's native bridge (KAN-72), registered by both apps' MainActivity. JS side: src/lib/native.ts.
 * - secureGet / secureSet / secureRemove: Keystore-encrypted session storage (D-38).
 * - keepAwake: the screen stays on during the restaurant shift.
 * - vibrate: the new-order alert pattern.
 * - notifyOrder / cancelOrder / requestNotifications: local new-order notification with the alert sound
 *   while the app is in the background and the live socket is still connected (real push waits for D-50).
 */
@CapacitorPlugin(
    name = "DokoonNative",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class DokoonNativePlugin extends Plugin {
    static final String CHANNEL = "new_orders_v1";
    private static final int NOTIFICATION_ID = 1;

    private SecureStore store;

    @Override
    public void load() {
        store = new SecureStore(getContext());
    }

    @PluginMethod
    public void secureGet(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("value", store.get(call.getString("key", "")));
        call.resolve(ret);
    }

    @PluginMethod
    public void secureSet(PluginCall call) {
        try {
            store.set(call.getString("key", ""), call.getString("value", ""));
            call.resolve();
        } catch (Exception e) {
            call.reject("secure storage unavailable", e);
        }
    }

    @PluginMethod
    public void secureRemove(PluginCall call) {
        store.remove(call.getString("key", ""));
        call.resolve();
    }

    @PluginMethod
    public void keepAwake(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity()
            .runOnUiThread(() -> {
                if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                call.resolve(result("ok", true));
            });
    }

    @PluginMethod
    public void vibrate(PluginCall call) {
        Vibrator v = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
        JSArray arr = call.getArray("pattern", new JSArray());
        if (v == null || !v.hasVibrator()) {
            call.resolve(result("ok", false));
            return;
        }
        try {
            long[] timings = new long[arr.length() + 1]; // leading 0 = start at once
            long total = 0;
            for (int i = 0; i < arr.length(); i++) {
                timings[i + 1] = arr.getLong(i);
                total += timings[i + 1];
            }
            if (total == 0) v.cancel();
            else v.vibrate(VibrationEffect.createWaveform(timings, -1));
            call.resolve(result("ok", true));
        } catch (Exception e) {
            call.resolve(result("ok", false));
        }
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(result("granted", notificationsOn()));
            return;
        }
        requestPermissionForAlias("notifications", call, "onNotificationsAnswer");
    }

    @PermissionCallback
    private void onNotificationsAnswer(PluginCall call) {
        call.resolve(result("granted", notificationsOn()));
    }

    @PluginMethod
    public void notifyOrder(PluginCall call) {
        String id = call.getString("id", "");
        if (id.isEmpty() || !notificationsOn()) {
            call.resolve(result("shown", false));
            return;
        }
        ensureChannel();
        Context ctx = getContext();
        // Tap → the app's own deep link (scheme = package id), handled by src/panel/native/app.ts.
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(ctx.getPackageName() + "://order/" + Uri.encode(id)));
        open.setPackage(ctx.getPackageName());
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            ctx,
            id.hashCode(),
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(ctx.getApplicationInfo().icon)
            .setContentTitle(call.getString("title", ""))
            .setContentText(call.getString("body", ""))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setContentIntent(pi);
        try {
            NotificationManagerCompat.from(ctx).notify(id, NOTIFICATION_ID, b.build());
            call.resolve(result("shown", true));
        } catch (SecurityException e) {
            call.resolve(result("shown", false));
        }
    }

    @PluginMethod
    public void cancelOrder(PluginCall call) {
        NotificationManagerCompat.from(getContext()).cancel(call.getString("id", ""), NOTIFICATION_ID);
        call.resolve();
    }

    private boolean notificationsOn() {
        return NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
    }

    /** High-importance channel with our own alert sound (res/raw/new_order.wav, D-98). */
    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = getContext().getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "سفارش جدید", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("هشدار سفارش تازه وقتی اپ در پس‌زمینه است");
        Uri sound = Uri.parse("android.resource://" + getContext().getPackageName() + "/raw/new_order");
        ch.setSound(
            sound,
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        );
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[] { 0, 400, 150, 400 });
        nm.createNotificationChannel(ch);
    }

    private static JSObject result(String key, boolean value) {
        JSObject r = new JSObject();
        r.put(key, value);
        return r;
    }
}
