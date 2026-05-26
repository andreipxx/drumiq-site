package ro.gopampa.drumiq.accessibility

import android.accessibilityservice.AccessibilityService
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.core.app.NotificationCompat
import java.io.BufferedWriter
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class DPAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "DPAccessibility"
        const val BOLT_PACKAGE = "ee.mtakso.driver"
        const val UBER_PACKAGE = "com.ubercab.driver"
        const val WAZE_PACKAGE = "com.waze"
        const val BOLT_SIM_PACKAGE = "ro.gopampa.boltsim"
        private val ALLOWED_PACKAGES = setOf(BOLT_PACKAGE, UBER_PACKAGE, WAZE_PACKAGE, BOLT_SIM_PACKAGE)

        private const val LOG_FILE_NAME = "dp_capture.log"
        private const val LOG_FILE_OLD = "dp_capture.log.old"
        private const val MAX_LOG_BYTES = 50L * 1024 * 1024
        private const val NOTIF_CHANNEL_ID = "dp_capture_debug"
        private const val NOTIF_CHANNEL_NAME = "DP Debug Capture"
        private const val NOTIF_ID = 1001
        private const val NOTIF_PREVIEW_LEN = 180
        private const val DEBUG_MODE = false

        @Volatile var lastCapturedText: String = ""; private set
        @Volatile var lastCapturedPackage: String = ""; private set
        @Volatile var lastCaptureTimestamp: Long = 0L; private set
    }

    private val ioThread = Executors.newSingleThreadExecutor()
    private val logFmt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US)

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "Service connected")
        if (DEBUG_MODE) createNotificationChannel()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val eventPackage = event.packageName?.toString() ?: return
        if (eventPackage !in ALLOWED_PACKAGES) return

        val root = rootInActiveWindow ?: return
        try {
            val rootPackage = root.packageName?.toString()
            if (rootPackage !in ALLOWED_PACKAGES) return
            val effectivePackage = rootPackage ?: eventPackage

            val collected = StringBuilder()
            traverseNode(root, collected)
            val captured = collected.toString().trim()

            if (captured.isNotEmpty() && captured != lastCapturedText) {
                lastCapturedText = captured
                lastCapturedPackage = effectivePackage
                lastCaptureTimestamp = System.currentTimeMillis()
                Log.d(TAG, "Captured from $effectivePackage: ${captured.take(200)}")

                val intent = Intent("ro.gopampa.drumiq.ACCESSIBILITY_CAPTURE")
                intent.setPackage(applicationContext.packageName)
                intent.putExtra("text", captured)
                intent.putExtra("package", effectivePackage)
                intent.putExtra("timestamp", lastCaptureTimestamp)
                sendBroadcast(intent)

                // Build 17: native parallel overlay DISABLED.
                // Reason: native ProfitCalc lacks filter engine integration, causing race
                // conditions where native (no filters) overrode JS (with filters), so user-set
                // filter rules silently failed. JS pipeline (overlayController.ts) is sole driver
                // for overlay. Foreground-service notification keeps RN alive long enough.
                // ioThread.execute {
                //     try { processForOverlay(captured, effectivePackage) }
                //     catch (e: Exception) { android.util.Log.e(TAG, "overlay processing: ${e.message}") }
                // }

                if (DEBUG_MODE) {
                    val ts = lastCaptureTimestamp
                    ioThread.execute { appendToLog(captured, effectivePackage, ts) }
                    showDebugNotification(captured, effectivePackage)
                }
            }
        } finally {
            root.recycle()
        }
    }

    private fun traverseNode(node: AccessibilityNodeInfo?, out: StringBuilder) {
        if (node == null) return
        val text = node.text?.toString()
        if (!text.isNullOrBlank()) {
            out.append(text).append('\n')
        } else {
            val desc = node.contentDescription?.toString()
            if (!desc.isNullOrBlank()) out.append(desc).append('\n')
        }
        val count = node.childCount
        for (i in 0 until count) {
            val child = node.getChild(i)
            traverseNode(child, out)
            child?.recycle()
        }
    }

    private fun appendToLog(text: String, pkg: String, ts: Long) {
        try {
            val dir = getExternalFilesDir(null) ?: return
            if (!dir.exists()) dir.mkdirs()
            val logFile = File(dir, LOG_FILE_NAME)
            if (logFile.exists() && logFile.length() > MAX_LOG_BYTES) {
                val oldFile = File(dir, LOG_FILE_OLD)
                if (oldFile.exists()) oldFile.delete()
                logFile.renameTo(oldFile)
            }
            val timestamp = logFmt.format(Date(ts))
            BufferedWriter(FileWriter(logFile, true)).use { w ->
                w.write("[$timestamp] [$pkg] [chars:${text.length}]\n")
                w.write(text)
                w.write("\n---END---\n")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Log write failed: ${e.message}")
        }
    }

    private fun showDebugNotification(text: String, pkg: String) {
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val preview = if (text.length > NOTIF_PREVIEW_LEN) text.take(NOTIF_PREVIEW_LEN) + "..." else text
            val ts = logFmt.format(Date(System.currentTimeMillis()))
            val notif = NotificationCompat.Builder(this, NOTIF_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_view)
                .setContentTitle("DP Capture - $pkg")
                .setContentText("$ts - ${text.length} chars")
                .setStyle(NotificationCompat.BigTextStyle().bigText(preview))
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOnlyAlertOnce(true)
                .build()
            nm.notify(NOTIF_ID, notif)
        } catch (e: Exception) {
            Log.e(TAG, "Notif failed: ${e.message}")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                NOTIF_CHANNEL_ID, NOTIF_CHANNEL_NAME, NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Live capture preview for Bolt/Uber/Waze screen parsing"
                setSound(null, null); enableVibration(false); setShowBadge(false)
            }
            nm.createNotificationChannel(channel)
        }
    }

    @Volatile private var lastOverlayKey: String = ""
    @Volatile private var lastOverlayShownAt: Long = 0L
    private val OVERLAY_STICKY_MS = 8000L

    private fun processForOverlay(text: String, pkg: String) {
        // Bolt si Bolt Simulator — logica identica, nicio modificare la parsare
        if (pkg != BOLT_PACKAGE && pkg != BOLT_SIM_PACKAGE) return

        val parsed = BoltParser.parse(text)
        Log.d(TAG, "Native parser: screen=${parsed.screen} net=${parsed.grossNet} pickup=${parsed.pickupKm}")

        when (parsed.screen) {
            BoltScreen.RIDE_OFFER -> {
                if (parsed.grossNet == null) return
                val fuel = DPSettingsBridge.getFuel(this)
                val plan = DPSettingsBridge.getPlan(this)
                val proOverrides = if (plan == "pro") DPSettingsBridge.getProOverrides(this) else null
                val mode = DPSettingsBridge.getOverlayMode(this)
                val effectiveMode = if (plan == "pro") mode else "simple"

                val analysis = ProfitCalc.analyze(parsed, fuel, plan, proOverrides) ?: return

                val key = "${parsed.grossNet}|${parsed.pickupKm}|${analysis.verdict}|${analysis.proOverride ?: ""}|${parsed.paymentMethod ?: ""}"
                if (key == lastOverlayKey) return  // dedupe
                lastOverlayKey = key
                lastOverlayShownAt = System.currentTimeMillis()

                Log.d(TAG, "Showing overlay: verdict=${analysis.verdict} ppkm=${analysis.profitPerKm}")
                OverlayTrigger.show(this, parsed, analysis, effectiveMode)
            }
            BoltScreen.HOME_IDLE,
            BoltScreen.MAP_IDLE,
            BoltScreen.POST_TRIP_CONFIRM,
            BoltScreen.POST_TRIP_RATE -> {
                val age = System.currentTimeMillis() - lastOverlayShownAt
                if (age >= OVERLAY_STICKY_MS && lastOverlayKey.isNotEmpty()) {
                    lastOverlayKey = ""
                    OverlayTrigger.hide(this)
                }
            }
            else -> { /* in-trip states keep overlay sticky */ }
        }
    }

    override fun onInterrupt() { Log.d(TAG, "onInterrupt") }
    override fun onDestroy() {
        super.onDestroy()
        try { ioThread.shutdown() } catch (_: Exception) {}
    }
}
