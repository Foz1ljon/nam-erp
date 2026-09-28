package uz.nammotors.calls.sync;

import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Android does not let ordinary apps record calls, so recordings come from the phone's own recorder
 * (Samsung, Xiaomi, Honor, Oppo…). They land in the shared audio library, e.g. "Recordings/Call" or
 * "MIUI/sound_recorder/call_rec"; we pick the file written during the call.
 */
public final class RecordingFinder {

    /** Folder or file names used by built-in call recorders across vendors. */
    private static final Pattern CALL_RECORDER = Pattern.compile(
        "call|record|rec[_/ ]|запис|звон|qo'ng'iroq|通话|録音",
        Pattern.CASE_INSENSITIVE
    );
    private static final long EARLY_SLACK_S = 60;
    private static final long LATE_SLACK_S = 600;

    private RecordingFinder() {}

    public static Recording find(Context context, SyncPrefs prefs, String phone, long startedAtMs, long durationS) {
        long start = startedAtMs / 1000;
        long end = start + durationS;
        String digits = phone.replaceAll("\\D", "");
        String tail = digits.length() > 7 ? digits.substring(digits.length() - 7) : digits;

        Uri collection = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
            : MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        String pathColumn = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? MediaStore.Audio.Media.RELATIVE_PATH : MediaStore.Audio.Media.DATA;
        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.DATE_ADDED,
            MediaStore.Audio.Media.DATE_MODIFIED,
            pathColumn,
        };
        // A recording is created when the call starts and finished when it ends.
        String selection = MediaStore.Audio.Media.DATE_ADDED + " BETWEEN ? AND ?";
        String[] args = { String.valueOf(start - EARLY_SLACK_S), String.valueOf(end + LATE_SLACK_S) };

        Recording best = null;
        long bestScore = Long.MAX_VALUE;
        try (Cursor c = context.getContentResolver().query(collection, projection, selection, args, null)) {
            if (c == null) return null;
            while (c.moveToNext()) {
                long id = c.getLong(0);
                String name = c.getString(1) == null ? "" : c.getString(1);
                String path = c.getString(6) == null ? "" : c.getString(6);
                long size = c.getLong(3);
                if (size <= 0 || prefs.isRecordingUsed(id)) continue;

                boolean numberInName = !tail.isEmpty() && name.replaceAll("\\D", "").contains(tail);
                boolean recorderFolder = CALL_RECORDER.matcher((path + "/" + name).toLowerCase(Locale.ROOT)).find();
                if (!numberInName && !recorderFolder) continue;

                // Closest start and end times win; a file named with the caller's number wins outright.
                long score = Math.abs(c.getLong(4) - start) + Math.abs(c.getLong(5) - end);
                if (numberInName) score -= 100_000;
                if (score < bestScore) {
                    bestScore = score;
                    String mime = c.getString(2) == null ? "audio/mpeg" : c.getString(2);
                    best = new Recording(id, ContentUris.withAppendedId(collection, id), name, mime, size);
                }
            }
        } catch (SecurityException e) {
            return null; // audio permission not granted
        }
        return best;
    }
}
