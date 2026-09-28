package uz.nammotors.calls.sync;

import android.content.Context;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

public final class SyncScheduler {

    private static final String PERIODIC = "call-sync-periodic";
    private static final String NOW = "call-sync-now";

    private SyncScheduler() {}

    private static Constraints network() {
        return new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
    }

    /** Safety net: runs even if the call-ended broadcast was missed (e.g. the app was force-stopped). */
    public static void schedulePeriodic(Context context) {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(CallSyncWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(network())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
            .build();
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    /** Sync shortly after a call ends, leaving the phone's recorder time to save the file. */
    public static void syncSoon(Context context, long delaySeconds) {
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(CallSyncWorker.class)
            .setInitialDelay(delaySeconds, TimeUnit.SECONDS)
            .setConstraints(network())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build();
        WorkManager.getInstance(context).enqueueUniqueWork(NOW, ExistingWorkPolicy.REPLACE, request);
    }

    /** One extra pass for recordings that were not written yet (not unique, so it never cancels the running work). */
    static void followUp(Context context) {
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(CallSyncWorker.class)
            .setInitialDelay(60, TimeUnit.SECONDS)
            .setConstraints(network())
            .build();
        WorkManager.getInstance(context).enqueue(request);
    }

    public static void cancelAll(Context context) {
        WorkManager manager = WorkManager.getInstance(context);
        manager.cancelUniqueWork(PERIODIC);
        manager.cancelUniqueWork(NOW);
    }
}
