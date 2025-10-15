# 📘 plugin_shuke 使用教程

## 🧩 插件简介

`plugin_shuke` 是一个 UniApp 原生插件，用于在 Android 端播放音频任务队列。  
它具备以下功能：

- ✅ **按任务 ID 顺序播放（0 → 1 → 2 → 3...）**
- 🕒 **支持异步任务到达等待**（缺口等待，不会插队）
- 🎯 **支持配置 startPlayId**，忽略小于该 ID 的任务
- 🔄 **播放进度回调、错误回调、输出通道切换回调**
- 🎧 **支持扬声器 / 听筒 / 蓝牙耳机 切换**

## 📂 插件目录结构

```
uni_modules/
└── plugin_shuke/
    ├── package.json
    ├── android/
    │   ├── build.gradle
    │   ├── AndroidManifest.xml
    │   └── src/
    │       └── main/
    │           └── java/
    │               └── com/
    │                   └── example/
    │                       └── plugin_shuke/
    │                           ├── AudioQueuePlayer.java
    │                           └── AudioModule.java
    └── manifest.json
```

## ⚙️ 主要文件说明

- `AudioQueuePlayer.java`: 控制播放逻辑，严格顺序播放。
- `AudioModule.java`: 连接 UniApp 与 Java 层接口。

## 🪄 JS 使用示例

```ts
const plugin = uni.requireNativePlugin('plugin_shuke')

plugin.init?.({ startPlayId: 0 }, (msg: any) => {
  console.log('初始化结果', msg)
})

plugin.onEvent((res: any) => {
  const msg = typeof res === 'string' ? JSON.parse(res) : res
  const { type, data } = msg
  console.log('事件:', type, data)
})

plugin.addTask('1', base64_audio1)
plugin.addTask('2', base64_audio2)
plugin.addTask('0', base64_audio0)
```

## 📡 事件说明

| 事件 | 说明 |
|------|------|
| ready | 插件初始化完成 |
| queued | 任务加入队列 |
| start | 开始播放某个任务 |
| progress | 播放进度更新 |
| complete | 单个任务播放完成 |
| queueEmpty | 队列播放完毕 |
| error | 播放出错 |
| modeChanged | 输出通道切换 |

## 🚀 打包说明

在 Android Studio 中打开 `uni_modules/plugin_shuke/android`，检查：

**build.gradle**
```gradle
apply plugin: 'com.android.library'

android {
  compileSdkVersion 34
  defaultConfig {
    minSdkVersion 24
    targetSdkVersion 34
  }
}

dependencies {
  implementation 'androidx.appcompat:appcompat:1.6.1'
}
```

**AndroidManifest.xml**
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
  <uses-permission android:name="android.permission.BLUETOOTH"/>
  <uses-permission android:name="android.permission.RECORD_AUDIO"/>
</manifest>
```

## 💬 版本信息

| 项目 | 内容 |
|------|------|
| 插件名 | plugin_shuke |
| 平台 | Android |
| 作者 | Shuke Audio Plugin |
| 更新时间 | 2025-10 |
