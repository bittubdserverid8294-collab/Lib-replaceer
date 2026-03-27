package com.rajnish.modz;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView myWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        myWebView = new WebView(this);
        WebSettings webSettings = myWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        
        // Connect the React UI to Java
        myWebView.addJavascriptInterface(new WebAppInterface(this), "Android");
        
        myWebView.setWebViewClient(new WebViewClient());
        
        // Load the React build from assets
        myWebView.loadUrl("file:///android_asset/index.html");
        
        setContentView(myWebView);
    }
}
