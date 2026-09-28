package uz.nammotors.calls;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import uz.nammotors.calls.sync.CallSyncPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CallSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
