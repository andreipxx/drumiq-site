package ro.gopampa.drumiq.accessibility

import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.RandomAccessFile
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

import com.facebook.react.bridge.ReadableMap

class AccessibilityModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var receiver: BroadcastReceiver? = null
    private val ioExec = Executors.newSingleThreadExecutor()

    override fun getName(): String = "DPAccessibility"

    @ReactMethod
    fun isEnabled(promise: Promise) {
        try { promise.resolve(isServiceEnabled(reactApplicationContext)) }
        catch (e: Exception) { promise.reject("ERR_CHECK_ENABLED", e) }
    }

    @ReactMethod
    fun openSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR_OPEN_SETTINGS", e) }
    }

    @ReactMethod
    fun getLastCapture(promise: Promise) {
        try {
            val map: WritableMap = Arguments.createMap()
            map.putString("text", DPAccessibilityService.lastCapturedText)
            map.putString("package", DPAccessibilityService.lastCapturedPackage)
            map.putDouble("timestamp", DPAccessibilityService.lastCaptureTimestamp.toDouble())
            promise.resolve(map)
        } catch (e: Exception) { promise.reject("ERR_GET_LAST", e) }
    }

    @ReactMethod
    fun copyLastCapture(promise: Promise) {
        try {
            val text = DPAccessibilityService.lastCapturedText
            if (text.isEmpty()) { promise.reject("ERR_EMPTY", "No capture available yet"); return }
            val cm = reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("DP Capture", text))
            promise.resolve(text.length)
        } catch (e: Exception) { promise.reject("ERR_COPY", e) }
    }

    @ReactMethod
    fun readLog(promise: Promise) {
        ioExec.execute {
            try {
                val ctx = reactApplicationContext
                val dir = ctx.getExternalFilesDir(null)
                if (dir == null) { promise.reject("ERR_NO_DIR", "External files dir is null"); return@execute }
                val logFile = File(dir, "dp_capture.log")
                if (!logFile.exists()) { promise.resolve("(no log yet)"); return@execute }
                val maxBytes = 5L * 1024 * 1024
                val text = if (logFile.length() > maxBytes) {
                    val raf = RandomAccessFile(logFile, "r")
                    raf.seek(logFile.length() - maxBytes)
                    val bytes = ByteArray(maxBytes.toInt())
                    val read = raf.read(bytes)
                    raf.close()
                    "...(tail ${maxBytes / 1024 / 1024}MB of ${logFile.length() / 1024 / 1024}MB)...\n" +
                        String(bytes, 0, read.coerceAtLeast(0))
                } else { logFile.readText() }
                promise.resolve(text)
            } catch (e: Exception) { promise.reject("ERR_READ_LOG", e) }
        }
    }

    @ReactMethod
    fun getLogPath(promise: Promise) {
        try {
            val dir = reactApplicationContext.getExternalFilesDir(null)
            promise.resolve(dir?.let { File(it, "dp_capture.log").absolutePath } ?: "")
        } catch (e: Exception) { promise.reject("ERR_PATH", e) }
    }

    @ReactMethod
    fun clearLog(promise: Promise) {
        ioExec.execute {
            try {
                val dir = reactApplicationContext.getExternalFilesDir(null)
                if (dir == null) { promise.reject("ERR_NO_DIR", "External files dir is null"); return@execute }
                val a = File(dir, "dp_capture.log").let { if (it.exists()) it.delete() else true }
                val b = File(dir, "dp_capture.log.old").let { if (it.exists()) it.delete() else true }
                promise.resolve(a && b)
            } catch (e: Exception) { promise.reject("ERR_CLEAR", e) }
        }
    }

    @ReactMethod
    fun getLogStats(promise: Promise) {
        ioExec.execute {
            try {
                val dir = reactApplicationContext.getExternalFilesDir(null)
                if (dir == null) { promise.reject("ERR_NO_DIR", "External files dir is null"); return@execute }
                val log = File(dir, "dp_capture.log")
                val old = File(dir, "dp_capture.log.old")
                val map: WritableMap = Arguments.createMap()
                map.putBoolean("exists", log.exists())
                map.putDouble("sizeBytes", log.length().toDouble())
                map.putDouble("sizeBytesOld", if (old.exists()) old.length().toDouble() else 0.0)
                if (log.exists() && log.length() > 0) {
                    var captures = 0
                    log.forEachLine { line -> if (line.startsWith("---END---")) captures++ }
                    map.putInt("captures", captures)
                    val firstLine = log.useLines { it.firstOrNull() ?: "" }
                    map.putString("firstLine", firstLine)
                    val lastTs = readLastTimestamp(log)
                    map.putString("lastLine", lastTs)
                } else {
                    map.putInt("captures", 0)
                    map.putString("firstLine", "")
                    map.putString("lastLine", "")
                }
                promise.resolve(map)
            } catch (e: Exception) { promise.reject("ERR_STATS", e) }
        }
    }

    private fun readLastTimestamp(f: File): String {
        try {
            val tail = 8L * 1024
            val raf = RandomAccessFile(f, "r")
            val start = (f.length() - tail).coerceAtLeast(0L)
            raf.seek(start)
            val bytes = ByteArray((f.length() - start).toInt())
            raf.read(bytes); raf.close()
            val text = String(bytes)
            val matches = Regex("""\[20\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\][^\n]*""").findAll(text).toList()
            return matches.lastOrNull()?.value ?: ""
        } catch (_: Exception) { return "" }
    }

    @ReactMethod
    fun copyLogToDownloads(promise: Promise) {
        ioExec.execute {
            try {
                val ctx = reactApplicationContext
                val srcDir = ctx.getExternalFilesDir(null)
                if (srcDir == null) { promise.reject("ERR_NO_DIR", "External files dir is null"); return@execute }
                val src = File(srcDir, "dp_capture.log")
                if (!src.exists() || src.length() == 0L) {
                    promise.reject("ERR_EMPTY", "Log gol — nimic de exportat")
                    return@execute
                }
                val downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloads.exists()) downloads.mkdirs()
                val ts = SimpleDateFormat("yyMMdd_HHmmss", Locale.US).format(Date())
                val dst = File(downloads, "dp_capture_$ts.log")
                src.copyTo(dst, overwrite = true)
                val map: WritableMap = Arguments.createMap()
                map.putString("path", dst.absolutePath)
                map.putDouble("sizeBytes", dst.length().toDouble())
                promise.resolve(map)
            } catch (e: Exception) { promise.reject("ERR_EXPORT", e) }
        }
    }

    @ReactMethod
    fun writeExportToDownloads(content: String, promise: Promise) {
        ioExec.execute {
            try {
                val downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloads.exists()) downloads.mkdirs()
                val ts = SimpleDateFormat("yyMMdd_HHmmss", Locale.US).format(Date())
                val dst = File(downloads, "drumiq_export_$ts.json")
                dst.writeText(content, Charsets.UTF_8)
                val map: WritableMap = Arguments.createMap()
                map.putString("path", dst.absolutePath)
                map.putDouble("sizeBytes", dst.length().toDouble())
                promise.resolve(map)
            } catch (e: Exception) { promise.reject("ERR_WRITE_EXPORT", e) }
        }
    }

    @ReactMethod
    fun startListening() {
        if (receiver != null) return
        val ctx = reactApplicationContext
        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action != "ro.gopampa.drumiq.ACCESSIBILITY_CAPTURE") return
                val map: WritableMap = Arguments.createMap()
                map.putString("text", intent.getStringExtra("text") ?: "")
                map.putString("package", intent.getStringExtra("package") ?: "")
                map.putDouble("timestamp", intent.getLongExtra("timestamp", 0L).toDouble())
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("DPAccessibilityCapture", map)
            }
        }
        val filter = IntentFilter("ro.gopampa.drumiq.ACCESSIBILITY_CAPTURE")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ctx.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            ctx.registerReceiver(receiver, filter)
        }
    }

    @ReactMethod
    fun stopListening() {
        try { receiver?.let { reactApplicationContext.unregisterReceiver(it) } } catch (_: Exception) {}
        receiver = null
    }

    
    @ReactMethod
    fun getAndroidId(promise: Promise) {
        try {
            val id = Settings.Secure.getString(
                reactApplicationContext.contentResolver,
                Settings.Secure.ANDROID_ID
            ) ?: ""
            promise.resolve(id)
        } catch (e: Exception) { promise.reject("ERR_ANDROID_ID", e) }
    }

    @ReactMethod fun addListener(eventName: String) { }
    @ReactMethod fun removeListeners(count: Int) { }

    private fun isServiceEnabled(context: Context): Boolean {
        val expected = ComponentName(context, DPAccessibilityService::class.java).flattenToString()
        val enabledServices = Settings.Secure.getString(
            context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabledServices)
        while (splitter.hasNext()) {
            if (splitter.next().equals(expected, ignoreCase = true)) return true
        }
        return false
    }

    @ReactMethod
    fun syncFuelSettings(map: ReadableMap, promise: com.facebook.react.bridge.Promise) {
        try {
            val ctx = reactApplicationContext
            val type = map.getString("type") ?: "benzina"
            val consumption = map.getDouble("consumption")
            val price = map.getDouble("pricePerUnit")
            val wear = map.getDouble("wearPerKm")
            val cgpl = if (map.hasKey("consumptionGpl") && !map.isNull("consumptionGpl")) map.getDouble("consumptionGpl") else null
            val pgpl = if (map.hasKey("pricePerUnitGpl") && !map.isNull("pricePerUnitGpl")) map.getDouble("pricePerUnitGpl") else null
            DPSettingsBridge.setFuel(ctx, type, consumption, price, wear, cgpl, pgpl)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("SYNC_FUEL_ERR", e.message, e) }
    }

    @ReactMethod
    fun syncProOverrides(map: ReadableMap, promise: com.facebook.react.bridge.Promise) {
        try {
            val ctx = reactApplicationContext
            DPSettingsBridge.setProOverrides(ctx, map.getDouble("maxPickupKm"), map.getDouble("minPassengerRating"))
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("SYNC_PRO_ERR", e.message, e) }
    }

    @ReactMethod
    fun syncLicense(plan: String, active: Boolean, promise: com.facebook.react.bridge.Promise) {
        try {
            val ctx = reactApplicationContext
            DPSettingsBridge.setPlan(ctx, plan)
            DPSettingsBridge.setLicenseActive(ctx, active)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("SYNC_LIC_ERR", e.message, e) }
    }

    @ReactMethod
    fun syncOverlayMode(mode: String, promise: com.facebook.react.bridge.Promise) {
        try {
            DPSettingsBridge.setOverlayMode(reactApplicationContext, mode)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("SYNC_MODE_ERR", e.message, e) }
    }

    @ReactMethod
    fun startLifeService(promise: com.facebook.react.bridge.Promise) {
        try {
            val ctx = reactApplicationContext
            val intent = Intent(ctx, ro.gopampa.drumiq.overlay.DPLifeService::class.java).apply {
                action = ro.gopampa.drumiq.overlay.DPLifeService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent)
            } else {
                ctx.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("LIFE_START_ERR", e.message, e) }
    }

    @ReactMethod
    fun stopLifeService(promise: com.facebook.react.bridge.Promise) {
        try {
            val ctx = reactApplicationContext
            val intent = Intent(ctx, ro.gopampa.drumiq.overlay.DPLifeService::class.java)
            ctx.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("LIFE_STOP_ERR", e.message, e) }
    }

}
