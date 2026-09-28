package uz.nammotors.calls.sync;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Everything the background worker needs, stored in the app's private SharedPreferences. */
public final class SyncPrefs {

    private static final String FILE = "call_sync";
    private static final int RECENT_LIMIT = 30;
    private static final int USED_RECORDINGS_LIMIT = 300;
    /** On first sign-in only the last day of calls is sent, not the whole call history. */
    public static final long FIRST_SYNC_WINDOW_MS = 24L * 60 * 60 * 1000;

    private final SharedPreferences prefs;

    public SyncPrefs(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    public boolean isConfigured() {
        return !getBaseUrl().isEmpty() && !getToken().isEmpty();
    }

    public String getBaseUrl() {
        return prefs.getString("baseUrl", "");
    }

    public String getToken() {
        return prefs.getString("token", "");
    }

    public String getUserName() {
        return prefs.getString("userName", "");
    }

    public String getCapture() {
        return prefs.getString("capture", "new_contacts");
    }

    public void configure(String baseUrl, String token, String userName, String capture) {
        prefs
            .edit()
            .clear()
            .putString("baseUrl", baseUrl)
            .putString("token", token)
            .putString("userName", userName)
            .putString("capture", capture)
            .putLong("cursor", System.currentTimeMillis() - FIRST_SYNC_WINDOW_MS)
            .apply();
    }

    public void setCapture(String capture) {
        prefs.edit().putString("capture", capture).apply();
    }

    public void clear() {
        prefs.edit().clear().apply();
    }

    /** Date (ms) of the last call-log entry already sent to the server. */
    public long getCursor() {
        return prefs.getLong("cursor", System.currentTimeMillis() - FIRST_SYNC_WINDOW_MS);
    }

    public void setCursor(long cursor) {
        prefs.edit().putLong("cursor", cursor).apply();
    }

    public boolean isRunning() {
        return prefs.getBoolean("running", false);
    }

    public void setRunning(boolean running) {
        prefs.edit().putBoolean("running", running).apply();
    }

    public long getLastSyncAt() {
        return prefs.getLong("lastSyncAt", 0);
    }

    public String getLastError() {
        return prefs.getString("lastError", null);
    }

    public void finish(String error) {
        SharedPreferences.Editor editor = prefs.edit().putBoolean("running", false);
        if (error == null) editor.putLong("lastSyncAt", System.currentTimeMillis()).remove("lastError");
        else editor.putString("lastError", error);
        editor.apply();
    }

    // ---------------------------------------------------------------- recent calls (shown in the app)

    public JSONArray getRecent() {
        return readArray("recent");
    }

    /** Adds or replaces (same call id) an entry at the top of the list. */
    public void putRecent(String key, JSONObject entry) {
        JSONArray current = getRecent();
        JSONArray next = new JSONArray();
        try {
            entry.put("key", key);
            next.put(entry);
            for (int i = 0; i < current.length() && next.length() < RECENT_LIMIT; i++) {
                JSONObject item = current.getJSONObject(i);
                if (!key.equals(item.optString("key"))) next.put(item);
            }
        } catch (JSONException ignored) {
            return;
        }
        prefs.edit().putString("recent", next.toString()).apply();
    }

    // ---------------------------------------------------------------- recordings waiting to be uploaded

    public JSONArray getPendingRecordings() {
        return readArray("pendingRecordings");
    }

    public void setPendingRecordings(JSONArray pending) {
        prefs.edit().putString("pendingRecordings", pending.toString()).apply();
    }

    /** MediaStore ids of recordings already attached to a call, so one file is never sent twice. */
    public boolean isRecordingUsed(long mediaId) {
        JSONArray used = readArray("usedRecordings");
        for (int i = 0; i < used.length(); i++) if (used.optLong(i) == mediaId) return true;
        return false;
    }

    public void markRecordingUsed(long mediaId) {
        JSONArray used = readArray("usedRecordings");
        JSONArray next = new JSONArray();
        next.put(mediaId);
        for (int i = 0; i < used.length() && next.length() < USED_RECORDINGS_LIMIT; i++) next.put(used.optLong(i));
        prefs.edit().putString("usedRecordings", next.toString()).apply();
    }

    private JSONArray readArray(String key) {
        try {
            return new JSONArray(prefs.getString(key, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }
}
