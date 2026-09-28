package uz.nammotors.calls.sync;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;

/** Starts a sync when a call ends (phone state returns to IDLE). */
public class CallStateReceiver extends BroadcastReceiver {

    private static final long RECORDER_GRACE_SECONDS = 20;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(intent.getAction())) return;
        if (!TelephonyManager.EXTRA_STATE_IDLE.equals(intent.getStringExtra(TelephonyManager.EXTRA_STATE))) return;
        if (!new SyncPrefs(context).isConfigured()) return;
        SyncScheduler.syncSoon(context, RECORDER_GRACE_SECONDS);
    }
}
