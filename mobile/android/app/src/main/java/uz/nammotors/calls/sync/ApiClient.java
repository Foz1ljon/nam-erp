package uz.nammotors.calls.sync;

import android.content.Context;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.json.JSONException;
import org.json.JSONObject;

/** Minimal client for the ERP's /api/mobile endpoints (bearer device token). */
public final class ApiClient {

    /** The server rejected the device token: the user must sign in again. */
    public static final class UnauthorizedException extends IOException {

        public UnauthorizedException(String message) {
            super(message);
        }
    }

    private static final int TIMEOUT_MS = 30_000;
    private static final int UPLOAD_TIMEOUT_MS = 180_000;

    private final Context context;
    private final String baseUrl;
    private final String token;

    public ApiClient(Context context, String baseUrl, String token) {
        this.context = context.getApplicationContext();
        this.baseUrl = baseUrl;
        this.token = token;
    }

    public JSONObject postJson(String path, JSONObject body) throws IOException {
        HttpURLConnection conn = open(path, TIMEOUT_MS);
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
        conn.setFixedLengthStreamingMode(bytes.length);
        try (OutputStream out = conn.getOutputStream()) {
            out.write(bytes);
        }
        return read(conn);
    }

    /** Streams a recording as multipart/form-data field "file". */
    public JSONObject uploadFile(String path, Recording recording) throws IOException {
        String boundary = "----namerp" + UUID.randomUUID().toString().replace("-", "");
        byte[] head = (
            "--" + boundary + "\r\n" +
            "Content-Disposition: form-data; name=\"file\"; filename=\"" + recording.fileName.replace("\"", "") + "\"\r\n" +
            "Content-Type: " + recording.mimeType + "\r\n\r\n"
        ).getBytes(StandardCharsets.UTF_8);
        byte[] tail = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8);

        HttpURLConnection conn = open(path, UPLOAD_TIMEOUT_MS);
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
        conn.setChunkedStreamingMode(64 * 1024);
        try (InputStream in = context.getContentResolver().openInputStream(recording.uri); OutputStream out = conn.getOutputStream()) {
            if (in == null) throw new IOException("Yozuv faylini ochib bo'lmadi");
            out.write(head);
            byte[] buffer = new byte[64 * 1024];
            int n;
            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
            out.write(tail);
        }
        return read(conn);
    }

    /**
     * Posts the recording straight to Cloudinary with the signed fields the ERP issued, and returns
     * Cloudinary's raw JSON response (the ERP verifies its signature).
     */
    public JSONObject uploadToCloudinary(String url, JSONObject fields, Recording recording) throws IOException {
        String boundary = "----namerp" + UUID.randomUUID().toString().replace("-", "");
        StringBuilder head = new StringBuilder();
        java.util.Iterator<String> keys = fields.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            head.append("--").append(boundary).append("\r\n")
                .append("Content-Disposition: form-data; name=\"").append(key).append("\"\r\n\r\n")
                .append(fields.optString(key)).append("\r\n");
        }
        head.append("--").append(boundary).append("\r\n")
            .append("Content-Disposition: form-data; name=\"file\"; filename=\"").append(recording.fileName.replace("\"", "")).append("\"\r\n")
            .append("Content-Type: ").append(recording.mimeType).append("\r\n\r\n");
        byte[] tail = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8);

        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setConnectTimeout(TIMEOUT_MS);
        conn.setReadTimeout(UPLOAD_TIMEOUT_MS);
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
        conn.setChunkedStreamingMode(64 * 1024);
        try (InputStream in = context.getContentResolver().openInputStream(recording.uri); OutputStream out = conn.getOutputStream()) {
            if (in == null) throw new IOException("Yozuv faylini ochib bo'lmadi");
            out.write(head.toString().getBytes(StandardCharsets.UTF_8));
            byte[] buffer = new byte[64 * 1024];
            int n;
            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
            out.write(tail);
        }
        try {
            int status = conn.getResponseCode();
            InputStream stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
            JSONObject json = new JSONObject(stream == null ? "{}" : readAll(stream));
            if (status >= 400) {
                JSONObject error = json.optJSONObject("error");
                throw new IOException("Cloudinary: " + (error != null ? error.optString("message") : "xato " + status));
            }
            return json;
        } catch (JSONException e) {
            throw new IOException("Cloudinary javobi noto'g'ri", e);
        } finally {
            conn.disconnect();
        }
    }

    private HttpURLConnection open(String path, int timeout) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(baseUrl + "/api/mobile" + path).openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setConnectTimeout(TIMEOUT_MS);
        conn.setReadTimeout(timeout);
        conn.setRequestProperty("Accept", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + token);
        return conn;
    }

    /** Returns the `data` of the `{ success, data }` envelope or throws with the server's message. */
    private static JSONObject read(HttpURLConnection conn) throws IOException {
        try {
            int status = conn.getResponseCode();
            InputStream stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
            String text = stream == null ? "" : readAll(stream);
            JSONObject json = text.isEmpty() ? new JSONObject() : new JSONObject(text);
            if (status == 401) throw new UnauthorizedException(json.optString("message", "Qayta kiring"));
            if (status >= 400) throw new IOException(json.optString("message", "Server xatosi (" + status + ")"));
            JSONObject data = json.optJSONObject("data");
            return data == null ? new JSONObject() : data;
        } catch (JSONException e) {
            throw new IOException("Server javobi noto'g'ri", e);
        } finally {
            conn.disconnect();
        }
    }

    private static String readAll(InputStream in) throws IOException {
        try (InputStream stream = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int n;
            while ((n = stream.read(buffer)) != -1) out.write(buffer, 0, n);
            return out.toString("UTF-8");
        }
    }
}
