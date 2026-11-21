package ir.dokoonapp.plugins;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Session tokens encrypted with an AES-256-GCM key that lives in the Android Keystore (D-38, KAN-72).
 * The key never leaves the Keystore; SharedPreferences only hold "iv:ciphertext" (Base64). A value that
 * cannot be decrypted (key lost after a device reset / backup restore) reads as absent: sign in again.
 */
final class SecureStore {
    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String ALIAS = "dokoon-session-key";
    private static final String PREFS = "dokoon_secure";
    private static final String TRANSFORM = "AES/GCM/NoPadding";

    private final SharedPreferences prefs;

    SecureStore(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance(KEYSTORE);
        ks.load(null);
        if (ks.containsAlias(ALIAS)) {
            return ((KeyStore.SecretKeyEntry) ks.getEntry(ALIAS, null)).getSecretKey();
        }
        KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
        gen.init(
            new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        );
        return gen.generateKey();
    }

    String get(String name) {
        String stored = prefs.getString(name, null);
        if (stored == null) return null;
        try {
            String[] parts = stored.split(":", 2);
            Cipher c = Cipher.getInstance(TRANSFORM);
            c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
            return new String(c.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
        } catch (Exception e) {
            prefs.edit().remove(name).apply();
            return null;
        }
    }

    void set(String name, String value) throws Exception {
        Cipher c = Cipher.getInstance(TRANSFORM);
        c.init(Cipher.ENCRYPT_MODE, key());
        String iv = Base64.encodeToString(c.getIV(), Base64.NO_WRAP);
        String data = Base64.encodeToString(c.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
        if (!prefs.edit().putString(name, iv + ":" + data).commit()) {
            throw new IllegalStateException("secure storage write failed");
        }
    }

    void remove(String name) {
        prefs.edit().remove(name).commit();
    }
}
