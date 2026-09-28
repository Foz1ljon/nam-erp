package uz.nammotors.calls.sync;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;

/** Bridge between the Vue UI and the native call sync (see src/plugins/call-sync.ts). */
@CapacitorPlugin(
    name = "CallSync",
    permissions = {
        @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG }),
        @Permission(alias = "phone", strings = { Manifest.permission.READ_PHONE_STATE }),
        @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS }),
        // Android 13+ has a separate audio permission; older versions use storage.
        @Permission(alias = "mediaAudio", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "storage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
    }
)
public class CallSyncPlugin extends Plugin {

    private SyncPrefs prefs;

    @Override
    public void load() {
        prefs = new SyncPrefs(getContext());
        if (prefs.isConfigured()) SyncScheduler.schedulePeriodic(getContext());
    }

    @PluginMethod
    public void configure(PluginCall call) {
        String baseUrl = call.getString("baseUrl", "");
        String token = call.getString("token", "");
        if (baseUrl.isEmpty() || token.isEmpty()) {
            call.reject("baseUrl va token kerak");
            return;
        }
        prefs.configure(baseUrl, token, call.getString("userName", ""), capture(call));
        SyncScheduler.schedulePeriodic(getContext());
        SyncScheduler.syncSoon(getContext(), 0);
        call.resolve();
    }

    @PluginMethod
    public void setCapture(PluginCall call) {
        prefs.setCapture(capture(call));
        call.resolve();
    }

    @PluginMethod
    public void clearConfig(PluginCall call) {
        SyncScheduler.cancelAll(getContext());
        prefs.clear();
        call.resolve();
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        JSObject result = new JSObject();
        if (prefs.isConfigured()) result.put("token", prefs.getToken());
        call.resolve(result);
    }

    @PluginMethod
    public void syncNow(PluginCall call) {
        if (!prefs.isConfigured()) {
            call.reject("Avval tizimga kiring");
            return;
        }
        SyncScheduler.syncSoon(getContext(), 0);
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("configured", prefs.isConfigured());
        result.put("capture", prefs.getCapture());
        result.put("running", prefs.isRunning());
        if (prefs.isConfigured()) {
            result.put("baseUrl", prefs.getBaseUrl());
            result.put("userName", prefs.getUserName());
        }
        if (prefs.getLastSyncAt() > 0) result.put("lastSyncAt", prefs.getLastSyncAt());
        if (prefs.getLastError() != null) result.put("lastError", prefs.getLastError());
        try {
            result.put("recent", new JSArray(prefs.getRecent().toString()));
        } catch (org.json.JSONException e) {
            result.put("recent", new JSArray());
        }
        call.resolve(result);
    }

    @Override
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        call.resolve(permissionResult());
    }

    @Override
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        List<String> aliases = new ArrayList<>();
        aliases.add("callLog");
        aliases.add("phone");
        aliases.add("contacts");
        aliases.add(Build.VERSION.SDK_INT >= 33 ? "mediaAudio" : "storage");
        requestPermissionForAliases(aliases.toArray(new String[0]), call, "permissionsCallback");
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        if (prefs.isConfigured()) SyncScheduler.syncSoon(getContext(), 0);
        call.resolve(permissionResult());
    }

    @SuppressLint("BatteryLife")
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        String pkg = getContext().getPackageName();
        PowerManager power = (PowerManager) getContext().getSystemService(android.content.Context.POWER_SERVICE);
        Intent intent;
        if (power != null && !power.isIgnoringBatteryOptimizations(pkg)) {
            intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + pkg));
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
        }
        try {
            getActivity().startActivity(intent);
        } catch (ActivityNotFoundException e) {
            getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg)));
        }
        call.resolve();
    }

    /** Same shape as CallSyncPermissions in TypeScript. */
    private JSObject permissionResult() {
        JSObject result = new JSObject();
        result.put("callLog", state("callLog"));
        result.put("phone", state("phone"));
        result.put("contacts", state("contacts"));
        result.put("audio", state(Build.VERSION.SDK_INT >= 33 ? "mediaAudio" : "storage"));
        return result;
    }

    private String state(String alias) {
        PermissionState state = getPermissionState(alias);
        return state == null ? "prompt" : state.toString();
    }

    private static String capture(PluginCall call) {
        return "all".equals(call.getString("capture")) ? "all" : "new_contacts";
    }
}
