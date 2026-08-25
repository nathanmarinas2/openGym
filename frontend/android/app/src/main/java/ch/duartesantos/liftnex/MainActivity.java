package ch.duartesantos.liftnex;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AudioFocusPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
