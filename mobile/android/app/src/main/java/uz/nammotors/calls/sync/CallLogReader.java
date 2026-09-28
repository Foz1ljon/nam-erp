package uz.nammotors.calls.sync;

import android.Manifest;
import android.content.ContentResolver;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;
import android.provider.ContactsContract;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.List;

/** Reads new entries from the system call log (requires READ_CALL_LOG). */
public final class CallLogReader {

    private static final int BATCH = 100;

    private CallLogReader() {}

    public static List<PhoneCall> readSince(Context context, long since) {
        List<PhoneCall> calls = new ArrayList<>();
        ContentResolver resolver = context.getContentResolver();
        String[] projection = {
            CallLog.Calls._ID,
            CallLog.Calls.NUMBER,
            CallLog.Calls.CACHED_NAME,
            CallLog.Calls.TYPE,
            CallLog.Calls.DATE,
            CallLog.Calls.DURATION,
        };
        boolean canReadContacts =
            ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;

        try (
            Cursor c = resolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                CallLog.Calls.DATE + " > ?",
                new String[] { String.valueOf(since) },
                CallLog.Calls.DATE + " ASC"
            )
        ) {
            if (c == null) return calls;
            while (c.moveToNext() && calls.size() < BATCH) {
                String number = c.getString(1);
                String direction = direction(c.getInt(3));
                // Hidden numbers and voicemail/blocked entries cannot become a lead.
                if (number == null || number.trim().isEmpty() || direction == null) continue;
                String cachedName = c.getString(2);
                String name = cachedName;
                boolean inContacts = cachedName != null && !cachedName.isEmpty();
                if (canReadContacts) {
                    // The call log's cached name alone already means "saved contact": PhoneLookup can miss
                    // numbers stored in another format (8 90…, without +998), which must stay private too.
                    String contact = lookupContact(resolver, number);
                    if (contact != null) {
                        inContacts = true;
                        name = contact;
                    }
                }
                calls.add(new PhoneCall(c.getString(0) + "-" + c.getLong(4), number, name, inContacts, direction, c.getLong(4), c.getLong(5)));
            }
        }
        return calls;
    }

    private static String direction(int type) {
        switch (type) {
            case CallLog.Calls.INCOMING_TYPE:
                return "in";
            case CallLog.Calls.OUTGOING_TYPE:
                return "out";
            case CallLog.Calls.MISSED_TYPE:
                return "missed";
            case CallLog.Calls.REJECTED_TYPE:
                return "rejected";
            default:
                return null;
        }
    }

    private static String lookupContact(ContentResolver resolver, String number) {
        Uri uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number));
        try (Cursor c = resolver.query(uri, new String[] { ContactsContract.PhoneLookup.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (RuntimeException ignored) {
            // Some ROMs throw on malformed numbers; treat as "not in contacts".
        }
        return null;
    }
}
