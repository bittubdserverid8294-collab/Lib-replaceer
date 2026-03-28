package com.rootlib.hub;

import android.content.Context;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import java.io.DataOutputStream;
import java.io.IOException;

public class WebAppInterface {
    Context mContext;
    WebView mWebView;

    WebAppInterface(Context c, WebView w) {
        mContext = c;
        mWebView = w;
    }

    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show();
    }

    @JavascriptInterface
    public void requestRoot() {
        try {
            // This triggers the official Magisk/Superuser grant dialog
            Process p = Runtime.getRuntime().exec("su");
            DataOutputStream os = new DataOutputStream(p.getOutputStream());
            os.writeBytes("exit\n");
            os.flush();
            int exitCode = p.waitFor();
            if (exitCode == 0) {
                showToast("Root Permission Granted Successfully");
            } else {
                showToast("Root Permission Denied");
            }
        } catch (Exception e) {
            showToast("Error requesting root: " + e.getMessage());
        }
    }

    @JavascriptInterface
    public void requestShizuku() {
        // In a real app, you'd use the Shizuku SDK here
        // For now, we simulate the official check/request
        showToast("Requesting Shizuku Permission...");
        // Simulate success after a short delay
        mWebView.post(new Runnable() {
            @Override
            public void run() {
                mWebView.loadUrl("javascript:console.log('Shizuku Permission Requested')");
            }
        });
    }

    @JavascriptInterface
    public void startPatch(String patchId, String targetPath, String downloadUrl) {
        showToast("Starting Patch: " + patchId);
        // Logic to download from downloadUrl and move to targetPath using su or shizuku
        runRootCommand("mkdir -p $(dirname " + targetPath + ") && curl -L " + downloadUrl + " -o " + targetPath);
    }

    @JavascriptInterface
    public void runRootCommand(String command) {
        try {
            Process p = Runtime.getRuntime().exec("su");
            DataOutputStream os = new DataOutputStream(p.getOutputStream());
            os.writeBytes(command + "\n");
            os.writeBytes("exit\n");
            os.flush();
            p.waitFor();
            showToast("Command Executed: " + command);
        } catch (IOException | InterruptedException e) {
            showToast("Root Error: " + e.getMessage());
        }
    }
}
