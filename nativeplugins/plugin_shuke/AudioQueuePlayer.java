package com.example.plugin_shuke;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.LinkedList;
import java.util.Queue;

/**
 * 🎧 音频任务队列播放器（MediaPlayer 纯系统版）
 */
public class AudioQueuePlayer {

    public enum OutputMode { SPEAKER, EARPIECE, BLUETOOTH }

    public interface Listener {
        void onQueued(String id, int queueSize);
        void onStart(String id, int queueSize);
        void onProgress(String id, long positionMs, long durationMs);
        void onComplete(String id, int queueSize);
        void onError(String id, String message);
        void onQueueEmpty();
        void onOutputModeChanged(OutputMode mode);
    }

    private static final String TAG = "AudioQueuePlayer";
    private static final long PROGRESS_INTERVAL = 300L;

    private final Context ctx;
    private final AudioManager audioManager;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Queue<AudioTask> queue = new LinkedList<>();

    private MediaPlayer player;
    private boolean isPlaying = false;
    private Listener listener;

    private static class AudioTask {
        final String id;
        final String base64;
        AudioTask(String id, String base64) {
            this.id = id;
            this.base64 = base64;
        }
    }

    public AudioQueuePlayer(Context context) {
        this.ctx = context.getApplicationContext();
        this.audioManager = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
    }

    public void setListener(Listener l) { this.listener = l; }

    public void enqueue(String id, String base64) {
        if (base64 == null || base64.isEmpty()) {
            if (listener != null) listener.onError(id, "empty_input");
            return;
        }
        queue.offer(new AudioTask(id, base64));
        if (listener != null) listener.onQueued(id, queue.size());
        if (!isPlaying) playNext();
    }

    private void playNext() {
        final AudioTask task = queue.poll();
        if (task == null) {
            isPlaying = false;
            if (listener != null) listener.onQueueEmpty();
            return;
        }

        isPlaying = true;
        stop();

        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            );

            String b64 = task.base64;
            if (b64.startsWith("data:")) {
                int idx = b64.indexOf("base64,");
                if (idx != -1) b64 = b64.substring(idx + 7);
            }
            byte[] data = Base64.decode(b64, Base64.DEFAULT);
            File tmp = File.createTempFile("audio_", ".mp3", ctx.getCacheDir());
            try (FileOutputStream fos = new FileOutputStream(tmp)) {
                fos.write(data);
            }

            player.setDataSource(tmp.getAbsolutePath());
            player.setOnPreparedListener(mp -> {
                if (listener != null) listener.onStart(task.id, queue.size());
                mp.start();
                startProgress();
            });

            player.setOnCompletionListener(mp -> {
                stopProgress();
                if (listener != null) listener.onComplete(task.id, queue.size());
                playNext();
            });

            player.setOnErrorListener((mp, what, extra) -> {
                stopProgress();
                if (listener != null) listener.onError(task.id, "MediaPlayer error: " + what);
                playNext();
                return true;
            });

            player.prepareAsync();

        } catch (IOException e) {
            Log.e(TAG, "播放失败: " + e.getMessage());
            if (listener != null) listener.onError(task.id, e.getMessage());
            playNext();
        }
    }

    private void stop() {
        stopProgress();
        if (player != null) {
            try {
                player.stop();
                player.release();
            } catch (Throwable ignored) {}
            player = null;
        }
    }

    public void clear() {
        stop();
        queue.clear();
        if (listener != null) listener.onQueueEmpty();
    }

    public void release() {
        stop();
        queue.clear();
    }

    public int getQueueSize() { return queue.size(); }

    public void setOutputMode(OutputMode mode) {
        try {
            switch (mode) {
                case SPEAKER:
                    audioManager.setMode(AudioManager.MODE_NORMAL);
                    audioManager.setSpeakerphoneOn(true);
                    break;
                case EARPIECE:
                    audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                    audioManager.setSpeakerphoneOn(false);
                    break;
                case BLUETOOTH:
                    audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                    audioManager.setSpeakerphoneOn(false);
                    tryStartBluetoothSco();
                    break;
            }
        } catch (Throwable t) {
            Log.w(TAG, "切换音频输出失败: " + t.getMessage());
        }
        if (listener != null) listener.onOutputModeChanged(mode);
    }

    private void tryStartBluetoothSco() {
        try {
            if (!audioManager.isBluetoothScoOn()) {
                audioManager.startBluetoothSco();
                audioManager.setBluetoothScoOn(true);
            }
        } catch (Throwable ignored) {}
    }

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            if (player != null && player.isPlaying()) {
                long pos = player.getCurrentPosition();
                long dur = player.getDuration();
                if (listener != null) listener.onProgress("playing", pos, dur);
                handler.postDelayed(this, PROGRESS_INTERVAL);
            }
        }
    };

    private void startProgress() {
        handler.post(tick);
    }

    private void stopProgress() {
        handler.removeCallbacks(tick);
    }
}
