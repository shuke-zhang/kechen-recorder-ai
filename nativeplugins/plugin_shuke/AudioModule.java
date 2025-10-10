package com.example.plugin_shuke;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.alibaba.fastjson.JSONObject;
import java.lang.ref.WeakReference;
import io.dcloud.feature.uniapp.annotation.UniJSMethod;
import io.dcloud.feature.uniapp.bridge.UniJSCallback;
import io.dcloud.feature.uniapp.common.UniModule;

/**
 * 🔌 音频模块 - UniApp 插件入口
 * 被 UniApp 框架动态加载（无需直接引用）
 */
@SuppressWarnings({
        "unused", // ✅ 消除 “never used”
        "RedundantDefaultParameterValue" // ✅ 消除默认参数重复赋值
})
public class AudioModule extends UniModule {
    private static final String TAG = "AudioModule";
    private static WeakReference<AudioQueuePlayer> weakRef = new WeakReference<>(null);
    private volatile UniJSCallback eventCallback;
    private final Handler main = new Handler(Looper.getMainLooper());

    private AudioQueuePlayer getPlayer() {
        AudioQueuePlayer p = weakRef.get();
        if (p == null) {
            Context ctx = mUniSDKInstance != null ? mUniSDKInstance.getContext() : null;
            if (ctx != null) {
                p = new AudioQueuePlayer(ctx);
                weakRef = new WeakReference<>(p);
                attachListener(p);
                Log.i(TAG, "✅ AudioQueuePlayer 初始化完成");
            } else {
                Log.e(TAG, "❌ 无法初始化播放器，context为空");
            }
        }
        return p;
    }

    private void attachListener(AudioQueuePlayer p) {
        p.setListener(new AudioQueuePlayer.Listener() {
            @Override public void onQueued(String id, int queueSize) {
                emit("queued", json(o -> { o.put("id", id); o.put("queueSize", queueSize); }));
            }
            @Override public void onStart(String id, int queueSize) {
                emit("start", json(o -> { o.put("id", id); o.put("queueSize", queueSize); }));
            }
            @Override public void onProgress(String id, long positionMs, long durationMs) {
                double progress = durationMs > 0 ? (double) positionMs / durationMs : 0;
                emit("progress", json(o -> {
                    o.put("id", id);
                    o.put("positionMs", positionMs);
                    o.put("durationMs", durationMs);
                    o.put("progress", progress);
                }));
            }
            @Override public void onComplete(String id, int queueSize) {
                emit("complete", json(o -> { o.put("id", id); o.put("queueSize", queueSize); }));
            }
            @Override public void onError(String id, String message) {
                emit("error", json(o -> { o.put("id", id); o.put("message", message); }));
            }
            @Override public void onQueueEmpty() { emit("queueEmpty", new JSONObject()); }
            @Override public void onOutputModeChanged(AudioQueuePlayer.OutputMode mode) {
                emit("modeChanged", json(o -> o.put("mode", mode.name())));
            }
        });
    }

    @UniJSMethod(uiThread = true)
    public void onEvent(UniJSCallback cb) {
        this.eventCallback = cb;
        emit("ready", new JSONObject());
    }

    @UniJSMethod(uiThread = true)
    public void addTask(String id, String base64, UniJSCallback callback) {
        AudioQueuePlayer p = getPlayer();
        if (p == null) {
            if (callback != null) callback.invoke("初始化失败");
            return;
        }
        try {
            p.enqueue(id, base64);
            if (callback != null) callback.invoke("任务添加成功：" + id);
        } catch (Exception e) {
            Log.e(TAG, "addTask error: " + e.getMessage());
            if (callback != null) callback.invoke("❌ 任务添加失败：" + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void clear() {
        AudioQueuePlayer p = getPlayer();
        if (p != null) p.clear();
    }

    @UniJSMethod(uiThread = true)
    public void setOutputMode(String mode, UniJSCallback callback) {
        AudioQueuePlayer p = getPlayer();
        if (p == null) {
            if (callback != null) callback.invoke("Player未初始化");
            return;
        }

        String m = (mode != null && !mode.isEmpty()) ? mode.toLowerCase() : "speaker";
        switch (m) {
            case "earpiece":
                p.setOutputMode(AudioQueuePlayer.OutputMode.EARPIECE);
                break;
            case "bluetooth":
                p.setOutputMode(AudioQueuePlayer.OutputMode.BLUETOOTH);
                break;
            default:
                p.setOutputMode(AudioQueuePlayer.OutputMode.SPEAKER);
        }
        if (callback != null) callback.invoke("切换为：" + m);
    }

    @UniJSMethod(uiThread = true)
    public void release() {
        AudioQueuePlayer p = weakRef.get();
        if (p != null) {
            p.release();
            weakRef.clear();
        }
        emit("released", new JSONObject());
        eventCallback = null;
    }

    private interface Filler { void fill(JSONObject o); }
    private static JSONObject json(Filler f) {
        JSONObject o = new JSONObject();
        try { f.fill(o); } catch (Throwable ignored) {}
        return o;
    }

    private void emit(String type, JSONObject data) {
        if (eventCallback == null) return;
        JSONObject payload = new JSONObject();
        payload.put("type", type);
        payload.put("data", data == null ? new JSONObject() : data);
        main.post(() -> {
            try { eventCallback.invokeAndKeepAlive(payload); } catch (Throwable t) {
                Log.e(TAG, "事件回调失败: " + t.getMessage());
            }
        });
    }
}
