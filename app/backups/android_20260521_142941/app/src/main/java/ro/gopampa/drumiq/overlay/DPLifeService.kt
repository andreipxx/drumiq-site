package ro.gopampa.drumiq.overlay

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import ro.gopampa.drumiq.MainActivity
import ro.gopampa.drumiq.R

/**
 * Long-living foreground service.
 *
 * Two responsibilities:
 *  1. Keeps the app process alive in the background, so the JS engine continues
 *     to receive AccessibilityCapture broadcasts even when DRUMIQ is minimized
 *     or on a non-Settings tab. Without this, Android suspends the process and the
 *     overlayController stops getting captures.
 *  2. Shows a persistent floating "D" badge over Bolt to confirm the overlay is
 *     active. Tapping the badge opens DRUMIQ.
 */
class DPLifeService : Service() {

    companion object {
        private const val TAG = "DPLife"
        const val ACTION_START = "ro.gopampa.drumiq.LIFE_START"
        const val ACTION_STOP  = "ro.gopampa.drumiq.LIFE_STOP"

        private const val NOTIF_CHANNEL_ID = "dp_life"
        private const val NOTIF_CHANNEL_NAME = "DRUMIQ activ"
        private const val NOTIF_ID = 2001

        private const val PREFS = "dp_life_prefs"
        private const val KEY_X = "badge_x"
        private const val KEY_Y = "badge_y"
    }

    private var wm: WindowManager? = null
    private var badge: View? = null
    private var params: WindowManager.LayoutParams? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification())
        addBadge()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        // Re-add badge if missing (e.g. permission was just granted)
        if (badge == null) addBadge()
        return START_STICKY
    }

    private fun buildNotification(): android.app.Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val flag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else
            PendingIntent.FLAG_UPDATE_CURRENT
        val contentPI = PendingIntent.getActivity(this, 0, openIntent, flag)

        val stopIntent = Intent(this, DPLifeService::class.java).apply { action = ACTION_STOP }
        val stopPI = PendingIntent.getService(this, 1, stopIntent, flag)

        return NotificationCompat.Builder(this, NOTIF_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle("DRUMIQ activ")
            .setContentText("Overlay pregatit pentru oferte Bolt")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(contentPI)
            .addAction(0, "Oprește", stopPI)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                NOTIF_CHANNEL_ID, NOTIF_CHANNEL_NAME, NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Indicator persistent DRUMIQ"
                setSound(null, null); enableVibration(false); setShowBadge(false)
            }
            nm.createNotificationChannel(channel)
        }
    }

    private fun hasOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            Settings.canDrawOverlays(this) else true
    }

    private fun addBadge() {
        if (badge != null) return
        if (!hasOverlayPermission()) {
            Log.w(TAG, "No SYSTEM_ALERT_WINDOW permission — badge skipped")
            return
        }
        wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        badge = LayoutInflater.from(this).inflate(R.layout.dp_life_badge, null)

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            val sp = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            x = sp.getInt(KEY_X, 24)
            y = sp.getInt(KEY_Y, 600)
        }

        attachInteractions(badge!!)
        try {
            wm?.addView(badge, params)
        } catch (e: Exception) {
            Log.e(TAG, "Badge addView failed: ${e.message}")
            badge = null
        }
    }

    private fun attachInteractions(root: View) {
        var initX = 0; var initY = 0
        var touchX = 0f; var touchY = 0f
        var dragging = false
        val touchSlop = (8 * resources.displayMetrics.density).toInt()

        root.setOnTouchListener { _, ev ->
            when (ev.action) {
                MotionEvent.ACTION_DOWN -> {
                    initX = params?.x ?: 0
                    initY = params?.y ?: 0
                    touchX = ev.rawX
                    touchY = ev.rawY
                    dragging = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (ev.rawX - touchX).toInt()
                    val dy = (ev.rawY - touchY).toInt()
                    if (kotlin.math.abs(dx) > touchSlop || kotlin.math.abs(dy) > touchSlop) {
                        dragging = true
                    }
                    if (dragging) {
                        params?.x = initX + dx
                        params?.y = initY + dy
                        try { wm?.updateViewLayout(badge, params) } catch (_: Exception) {}
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (dragging) {
                        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                            .putInt(KEY_X, params?.x ?: 24)
                            .putInt(KEY_Y, params?.y ?: 600)
                            .apply()
                    } else {
                        val open = Intent(this, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        }
                        try { startActivity(open) } catch (_: Exception) {}
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun removeBadge() {
        try { badge?.let { wm?.removeView(it) } } catch (_: Exception) {}
        badge = null
    }

    override fun onDestroy() {
        super.onDestroy()
        removeBadge()
    }
}
