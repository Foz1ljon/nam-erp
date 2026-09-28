package uz.nammotors.calls.sync;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.IOException;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Sends new call-log entries to the ERP and uploads their recordings. Runs after every call, every
 * 15 minutes and on demand; the server ignores calls it has already received.
 */
public class CallSyncWorker extends Worker {

    private static final String TAG = "CallSync";
    private static final Object LOCK = new Object();
    /** The recorder may still be writing the file right after the call; give up after about a day. */
    private static final int MAX_RECORDING_ATTEMPTS = 20;

    public CallSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        synchronized (LOCK) {
            Context context = getApplicationContext();
            SyncPrefs prefs = new SyncPrefs(context);
            if (!prefs.isConfigured()) return Result.success();
            if (!granted(context, Manifest.permission.READ_CALL_LOG)) {
                prefs.finish("Qo'ng'iroqlar jurnaliga ruxsat berilmagan");
                return Result.success();
            }

            prefs.setRunning(true);
            ApiClient api = new ApiClient(context, prefs.getBaseUrl(), prefs.getToken());
            try {
                syncCalls(context, prefs, api);
                uploadPendingRecordings(context, prefs, api);
                prefs.finish(null);
                if (recordingJustQueued(prefs)) SyncScheduler.followUp(context);
                return Result.success();
            } catch (ApiClient.UnauthorizedException e) {
                prefs.finish(e.getMessage());
                return Result.success(); // retrying cannot help until the user signs in again
            } catch (IOException | RuntimeException e) {
                Log.w(TAG, "sync failed", e);
                prefs.finish(e.getMessage() == null ? "Sinxronlashda xatolik" : e.getMessage());
                return Result.retry();
            }
        }
    }

    private void syncCalls(Context context, SyncPrefs prefs, ApiClient api) throws IOException {
        List<PhoneCall> calls = CallLogReader.readSince(context, prefs.getCursor());
        for (PhoneCall call : calls) {
            JSONObject res = api.postJson("/calls", toJson(call, prefs.getCapture()));
            boolean tracked = res.optBoolean("tracked");
            String callId = res.optString("callId", "");
            if (tracked && res.optBoolean("needsRecording")) queueRecording(prefs, call, callId);
            prefs.putRecent(call.id, recentEntry(call, tracked ? "lead" : "private", "none", null));
            prefs.setCursor(call.startedAt); // only after the server accepted the call
        }
    }

    private void uploadPendingRecordings(Context context, SyncPrefs prefs, ApiClient api) throws IOException {
        JSONArray pending = prefs.getPendingRecordings();
        if (pending.length() == 0) return;
        boolean canReadAudio = granted(context, audioPermission());
        JSONArray remaining = new JSONArray();
        IOException failure = null;

        for (int i = 0; i < pending.length(); i++) {
            JSONObject item = pending.optJSONObject(i);
            if (item == null) continue;
            PhoneCall call = fromPending(item);
            Recording recording = canReadAudio ? RecordingFinder.find(context, prefs, call.number, call.startedAt, call.duration) : null;

            if (recording == null || failure != null) {
                int attempts = item.optInt("attempts") + (failure == null ? 1 : 0);
                if (attempts < MAX_RECORDING_ATTEMPTS) {
                    putQuietly(item, "attempts", attempts);
                    remaining.put(item);
                } else {
                    prefs.putRecent(call.id, recentEntry(call, "lead", "not_found", null));
                }
                continue;
            }
            try {
                uploadRecording(api, item.optString("callId"), recording);
                prefs.markRecordingUsed(recording.mediaId);
                prefs.putRecent(call.id, recentEntry(call, "lead", "uploaded", null));
            } catch (ApiClient.UnauthorizedException e) {
                throw e;
            } catch (IOException e) {
                failure = e; // keep this and the rest for the next run
                remaining.put(item);
            }
        }
        prefs.setPendingRecordings(remaining);
        if (failure != null) throw failure;
    }

    /**
     * Direct upload: the ERP signs the request, the phone sends the file straight to Cloudinary (no size
     * limit from the ERP's host), then the ERP checks Cloudinary's signed answer and attaches it to the call.
     */
    private static void uploadRecording(ApiClient api, String callId, Recording recording) throws IOException {
        JSONObject signed = api.postJson("/calls/" + callId + "/upload", new JSONObject());
        if (signed.optBoolean("alreadyUploaded")) return;
        JSONObject fields = signed.optJSONObject("fields");
        String url = signed.optString("url", "");
        if (fields == null || url.isEmpty()) throw new IOException("Yuklash uchun imzo olinmadi");

        JSONObject uploaded = api.uploadToCloudinary(url, fields, recording);
        JSONObject result = new JSONObject();
        for (String key : new String[] { "public_id", "version", "signature", "format", "bytes", "duration" }) {
            if (uploaded.has(key)) putQuietly(result, key, uploaded.opt(key));
        }
        api.postJson("/calls/" + callId + "/recording-complete", result);
    }

    /** A fresh recording is often finalized a minute after the call: look again soon instead of in 15 minutes. */
    private static boolean recordingJustQueued(SyncPrefs prefs) {
        JSONArray pending = prefs.getPendingRecordings();
        for (int i = 0; i < pending.length(); i++) {
            JSONObject item = pending.optJSONObject(i);
            if (item != null && item.optInt("attempts") < 3) return true;
        }
        return false;
    }

    private static void queueRecording(SyncPrefs prefs, PhoneCall call, String callId) {
        JSONArray pending = prefs.getPendingRecordings();
        JSONObject item = new JSONObject();
        putQuietly(item, "callId", callId);
        putQuietly(item, "id", call.id);
        putQuietly(item, "phone", call.number);
        putQuietly(item, "name", call.name);
        putQuietly(item, "direction", call.direction);
        putQuietly(item, "startedAt", call.startedAt);
        putQuietly(item, "duration", call.duration);
        putQuietly(item, "attempts", 0);
        pending.put(item);
        prefs.setPendingRecordings(pending);
    }

    private static PhoneCall fromPending(JSONObject item) {
        return new PhoneCall(
            item.optString("id"),
            item.optString("phone"),
            item.optString("name", null),
            false,
            item.optString("direction"),
            item.optLong("startedAt"),
            item.optLong("duration")
        );
    }

    private static JSONObject toJson(PhoneCall call, String capture) {
        JSONObject json = new JSONObject();
        putQuietly(json, "deviceCallId", call.id);
        putQuietly(json, "phone", call.number);
        if (call.name != null && !call.name.isEmpty()) putQuietly(json, "contactName", call.name);
        putQuietly(json, "inContacts", call.inContacts);
        putQuietly(json, "direction", call.direction);
        putQuietly(json, "startedAt", call.startedAt);
        putQuietly(json, "duration", call.duration);
        putQuietly(json, "capture", capture);
        return json;
    }

    private static JSONObject recentEntry(PhoneCall call, String result, String recording, String error) {
        JSONObject json = new JSONObject();
        putQuietly(json, "phone", call.number);
        if (call.name != null) putQuietly(json, "name", call.name);
        putQuietly(json, "direction", call.direction);
        putQuietly(json, "startedAt", call.startedAt);
        putQuietly(json, "duration", call.duration);
        putQuietly(json, "result", result);
        putQuietly(json, "recording", recording);
        if (error != null) putQuietly(json, "error", error);
        return json;
    }

    private static void putQuietly(JSONObject json, String key, Object value) {
        try {
            json.put(key, value);
        } catch (JSONException ignored) {
            // keys are constant strings; put() only throws for NaN numbers
        }
    }

    static String audioPermission() {
        return android.os.Build.VERSION.SDK_INT >= 33 ? Manifest.permission.READ_MEDIA_AUDIO : Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    private static boolean granted(Context context, String permission) {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED;
    }
}
