package com.rootlib.hub;

import android.os.Bundle;
import android.app.Activity;
import android.widget.TextView;
import android.widget.Button;
import android.view.View;
import android.widget.Toast;
import java.io.DataOutputStream;
import java.io.IOException;

public class MainActivity extends Activity {
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        statusText = (TextView) findViewById(R.id.status_text);
        Button rootBtn = (Button) findViewById(R.id.btn_root);
        Button swapBtn = (Button) findViewById(R.id.btn_swap);

        rootBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                checkRoot();
            }
        });

        swapBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                performLibSwap("libc.so", "libc_optimized.so");
            }
        });
    }

    private void checkRoot() {
        if (isRooted()) {
            statusText.setText("STATUS: ROOT AUTHORIZED");
            statusText.setTextColor(0xFF00FF41); // Matrix Green
            Toast.makeText(this, "Root Access Granted", Toast.LENGTH_SHORT).show();
        } else {
            statusText.setText("STATUS: ROOT DENIED");
            statusText.setTextColor(0xFFFF4444); // Red
            Toast.makeText(this, "Please grant root access", Toast.LENGTH_LONG).show();
        }
    }

    private boolean isRooted() {
        Process p;
        try {
            p = Runtime.getRuntime().exec("su");
            DataOutputStream os = new DataOutputStream(p.getOutputStream());
            os.writeBytes("exit\n");
            os.flush();
            p.waitFor();
            return p.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private void performLibSwap(String target, String replacement) {
        try {
            Process p = Runtime.getRuntime().exec("su");
            DataOutputStream os = new DataOutputStream(p.getOutputStream());
            
            // Mount system as RW (Dangerous!)
            os.writeBytes("mount -o rw,remount /system\n");
            
            // Backup original
            os.writeBytes("cp /system/lib/" + target + " /system/lib/" + target + ".bak\n");
            
            // Replace with new lib (Assuming it's in app data dir)
            String appPath = getFilesDir().getAbsolutePath();
            os.writeBytes("cp " + appPath + "/" + replacement + " /system/lib/" + target + "\n");
            
            // Set permissions
            os.writeBytes("chmod 644 /system/lib/" + target + "\n");
            
            os.writeBytes("exit\n");
            os.flush();
            p.waitFor();
            
            Toast.makeText(this, "Library Swapped Successfully", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "Swap Failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
}
