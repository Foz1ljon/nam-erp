package uz.nammotors.calls.sync;

import android.net.Uri;

/** An audio file made by the phone's built-in call recorder. */
public final class Recording {

    public final long mediaId;
    public final Uri uri;
    public final String fileName;
    public final String mimeType;
    public final long size;

    public Recording(long mediaId, Uri uri, String fileName, String mimeType, long size) {
        this.mediaId = mediaId;
        this.uri = uri;
        this.fileName = fileName;
        this.mimeType = mimeType;
        this.size = size;
    }
}
