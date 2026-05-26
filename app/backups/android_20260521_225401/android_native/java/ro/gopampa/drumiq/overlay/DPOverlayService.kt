package ro.gopampa.drumiq.overlay

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import ro.gopampa.drumiq.R

class DPOverlayService : Service() {

    companion object {
        private const val TAG = "DPOverlay"
        const val ACTION_SHOW   = "ro.gopampa.drumiq.OVERLAY_SHOW"
        const val ACTION_HIDE   = "ro.gopampa.drumiq.OVERLAY_HIDE"
        const val ACTION_UPDATE = "ro.gopampa.drumiq.OVERLAY_UPDATE"
        const val EXTRA_MODE    = "mode"        // "simple" or "full"
        const val EXTRA_VERDICT = "verdict"     // critic|decide|bun|premium
        const val EXTRA_LABEL   = "label"
        const val EXTRA_PICKUP  = "pickup"
        const val EXTRA_TRIP    = "trip"
        const val EXTRA_DURATION= "duration"
        const val EXTRA_GROSS   = "gross"
        const val EXTRA_PROFITKM= "profitKm"
        const val EXTRA_PROFITMIN= "profitMin"
        const val EXTRA_SOURCE   = "source"      // fallback|api|cache
        const val EXTRA_NET      = "net"         // profit net estimat în buzunar
        const val EXTRA_SHORT_RIDE = "shortRide" // pickup >= tripKm warning
        const val EXTRA_DAILY    = "dailyProgress" // "earned/goal lei" or ""
        const val EXTRA_SANITY    = "sanityError"   // tripKm > 50 = suspect

        private const val PREFS = "dp_overlay_prefs"
        private const val KEY_X = "pos_x"
        private const val KEY_Y = "pos_y"
        private const val AUTO_HIDE_MS = 30_000L
    }

    private var wm: WindowManager? = null
    private var view: View? = null
    private var params: WindowManager.LayoutParams? = null
    private var mode: String = "simple"
    private val mainHandler = Handler(Looper.getMainLooper())
    private val autoHideRunnable = Runnable { hideOverlay() }
    private var screenW = 0
    private var screenH = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW   -> showOrUpdate(intent)
            ACTION_UPDATE -> showOrUpdate(intent)
            ACTION_HIDE   -> hideOverlay()
        }
        return START_STICKY
    }

    private fun showOrUpdate(intent: Intent) {
        val newMode = intent.getStringExtra(EXTRA_MODE) ?: "simple"
        if (view == null || newMode != mode) {
            removeView()
            mode = newMode
            inflateAndAdd()
        }
        applyData(intent)
        scheduleAutoHide()
    }

    private fun inflateAndAdd() {
        if (!hasOverlayPermission()) {
            Log.w(TAG, "No SYSTEM_ALERT_WINDOW permission, skipping overlay")
            return
        }
        wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val dm = resources.displayMetrics
        screenW = dm.widthPixels
        screenH = dm.heightPixels

        val layout = if (mode == "full") R.layout.dp_overlay_full else R.layout.dp_overlay_simple
        view = LayoutInflater.from(this).inflate(layout, null)

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

        val defaultX = (16 * dm.density).toInt()
        val defaultY = (screenH * 0.35).toInt()

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
            val cardW = (220 * dm.density).toInt()
            x = sp.getInt(KEY_X, defaultX).coerceIn(0, screenW - cardW)
            y = sp.getInt(KEY_Y, defaultY).coerceIn(0, screenH - (100 * dm.density).toInt())
        }

        attachDrag(view!!)
        try {
            wm?.addView(view, params)
        } catch (e: Exception) {
            Log.e(TAG, "addView failed: ${e.message}")
            view = null
        }
    }

    private fun attachDrag(root: View) {
        var initX = 0; var initY = 0
        var touchX = 0f; var touchY = 0f
        var dragging = false

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
                    if (kotlin.math.abs(dx) > 8 || kotlin.math.abs(dy) > 8) dragging = true
                    params?.x = initX + dx
                    params?.y = initY + dy
                    try { wm?.updateViewLayout(view, params) } catch (_: Exception) {}
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (dragging) {
                        val px = params?.x ?: 0
                        val py = params?.y ?: 0
                        val safePt = ensureNotInRefuzaZone(px, py)
                        if (safePt.first != px || safePt.second != py) {
                            params?.x = safePt.first
                            params?.y = safePt.second
                            try { wm?.updateViewLayout(view, params) } catch (_: Exception) {}
                        }
                        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                            .putInt(KEY_X, params?.x ?: 0)
                            .putInt(KEY_Y, params?.y ?: 0)
                            .apply()
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun applyData(intent: Intent) {
        val v = view ?: return
        val verdict = intent.getStringExtra(EXTRA_VERDICT) ?: "think"
        val dp = resources.displayMetrics.density

        // === v2 verdict colors (matches theme.ts) ===
        val color = when (verdict) {
            "stop"  -> 0xFFFF3366.toInt()  // red
            "think" -> 0xFFFFB800.toInt()  // orange
            "go"    -> 0xFF00FF88.toInt()  // green
            else    -> 0xFF7A8A7C.toInt()  // muted
        }
        val symbol = when (verdict) {
            "stop"  -> "X"
            "think" -> "?"
            "go"    -> "$"
            else    -> "·"
        }

        // === BORDER GLOW — card background stroke + fill per verdict ===
        val cardBgColor = when (verdict) {
            "stop"  -> 0xB01A0808.toInt()  // dark red tint
            "think" -> 0xB01A1508.toInt()  // dark amber tint
            "go"    -> 0xB00A0E0B.toInt()  // dark green tint
            else    -> 0xB00A0A0A.toInt()  // neutral
        }
        (v.background as? android.graphics.drawable.GradientDrawable)?.apply {
            setColor(cardBgColor)
            setStroke((2f * dp).toInt(), color)
        }

        // === Symbol (black on bright fill for max contrast) ===
        v.findViewById<TextView>(R.id.dp_symbol)?.apply {
            text = symbol
            setTextColor(0xFF000000.toInt())
        }

        // === Top color bar (both modes) ===
        v.findViewById<View>(R.id.dp_border)?.setBackgroundColor(color)

        // === Symbol circle fill (verdict color) ===
        v.findViewById<View>(R.id.dp_symbol_wrap)?.apply {
            val gd = background as? android.graphics.drawable.GradientDrawable
            gd?.setColor(color)
            gd?.setStroke((2.5f * dp).toInt(), color)
        }

        // === Obiectiv zilnic (toate planurile: simple + full) ===
        val dailyStr = intent.getStringExtra(EXTRA_DAILY) ?: ""
        v.findViewById<TextView>(R.id.dp_daily)?.apply {
            if (dailyStr.isNotEmpty()) {
                visibility = View.VISIBLE
                text = "AZI: $dailyStr"
                val parts = dailyStr.split("/")
                val earned = parts.getOrNull(0)?.trim()?.toIntOrNull() ?: 0
                val goalNum = parts.getOrNull(1)?.trim()?.replace(Regex("[^0-9]"), "")?.toIntOrNull() ?: 0
                setTextColor(if (goalNum > 0 && earned >= goalNum) 0xFF00FF88.toInt() else 0xFFFFB800.toInt())
            } else {
                visibility = View.GONE
            }
        }

        // === Profit/km for simple mode ===
        v.findViewById<TextView>(R.id.dp_profitkm)?.apply {
            text = intent.getStringExtra(EXTRA_PROFITKM) ?: "—"
            setTextColor(color)
        }

        // === Profit/min (full mode) ===
        v.findViewById<TextView>(R.id.dp_profitmin)?.apply {
            text = intent.getStringExtra(EXTRA_PROFITMIN) ?: "—"
            setTextColor(color)
        }

        // === Full mode fields ===
        if (mode == "full") {
            v.findViewById<TextView>(R.id.dp_pickup)?.text   = intent.getStringExtra(EXTRA_PICKUP) ?: "—"
            v.findViewById<TextView>(R.id.dp_trip)?.text     = intent.getStringExtra(EXTRA_TRIP) ?: "—"
            v.findViewById<TextView>(R.id.dp_duration)?.text = intent.getStringExtra(EXTRA_DURATION) ?: "—"
            v.findViewById<TextView>(R.id.dp_gross)?.text    = intent.getStringExtra(EXTRA_GROSS) ?: "—"
            v.findViewById<TextView>(R.id.dp_net)?.apply {
                text = intent.getStringExtra(EXTRA_NET) ?: "—"
                setTextColor(color)
            }
            val shortRide = intent.getBooleanExtra(EXTRA_SHORT_RIDE, false)
            val sanityError = intent.getBooleanExtra(EXTRA_SANITY, false)
            v.findViewById<TextView>(R.id.dp_short_ride_warn)?.apply {
                if (sanityError) {
                    visibility = View.VISIBLE
                    text = "⚠ km suspect"
                    setTextColor(0xFFFF3366.toInt())
                } else {
                    visibility = if (shortRide) View.VISIBLE else View.GONE
                    text = "⚠ pickup lung"
                    setTextColor(0xFFFFB800.toInt())
                }
            }
            v.findViewById<TextView>(R.id.dp_source)?.apply {
                val src = intent.getStringExtra(EXTRA_SOURCE) ?: "fallback"
                when (src) {
                    "api"   -> { text = "✓ Google trafic real"; setTextColor(0xFF00FF88.toInt()) }
                    "cache" -> { text = "✓ Google (cache)";     setTextColor(0xFF7A8A7C.toInt()) }
                    else    -> { text = "~ estimat";            setTextColor(0xFF7A8A7C.toInt()) }
                }
            }
        }
    }

    private fun scheduleAutoHide() {
        mainHandler.removeCallbacks(autoHideRunnable)
        mainHandler.postDelayed(autoHideRunnable, AUTO_HIDE_MS)
    }

    private fun hideOverlay() {
        mainHandler.removeCallbacks(autoHideRunnable)
        removeView()
    }

    private fun removeView() {
        try { view?.let { wm?.removeView(it) } } catch (_: Exception) {}
        view = null
    }

    private fun ensureNotInRefuzaZone(x: Int, y: Int): Pair<Int, Int> {
        val dp = resources.displayMetrics.density
        val refuzaZoneRight = screenW - (200 * dp).toInt()
        val refuzaZoneBottom = (130 * dp).toInt()
        if (x > refuzaZoneRight && y < refuzaZoneBottom) {
            return Pair(refuzaZoneRight - (20 * dp).toInt(), y)
        }
        return Pair(x, y)
    }

    private fun hasOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            Settings.canDrawOverlays(this) else true
    }

    override fun onDestroy() {
        super.onDestroy()
        mainHandler.removeCallbacks(autoHideRunnable)
        removeView()
    }
}
