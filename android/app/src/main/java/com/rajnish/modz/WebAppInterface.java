package com.rajnish.modz;

import android.content.Context;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import java.io.DataOutputStream;
import java.util.HashMap;

public class WebAppInterface {
    Context mContext;
    private HashMap<String, String> secretUrls;

    WebAppInterface(Context c) {
        mContext = c;
        secretUrls = new HashMap<>();
        // ADD YOUR SECRET URLS HERE
        secretUrls.put("ff", "https://your-server.com/files/ff_patch_v1.zip");
        secretUrls.put("ffmax", "https://your-server.com/files/ffmax_patch_v1.zip");
    }

    @JavascriptInterface
    public void startPatch(String patchId, String packageName, String fileName) {
        String url = secretUrls.get(patchId);
        if (url == null) {
            showToast("Invalid Patch ID");
            return;
        }

        // 1. Download the file hiddenly
        // 2. Extract it
        // 3. Move to /data/data/ using Root
        runRootCommand("cp /sdcard/Download/" + fileName + " /data/data/" + packageName + "/files/");
    }

    @JavascriptInterface
    public void runRootCommand(String cmd) {
        try {
            Process p = Runtime.getRuntime().exec("su");
            DataOutputStream os = new DataOutputStream(p.getOutputStream());
            os.writeBytes(cmd + "\n");
            os.writeBytes("exit\n");
            os.flush();
            p.waitFor();
        } catch (Exception e) {
            showToast("Root Access Denied!");
        }
    }

    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show();
    }
}
