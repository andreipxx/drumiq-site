package ro.gopampa.drumiq.overlay

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class OverlayModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DPOverlay"

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        try {
            val ok = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                Settings.canDrawOverlays(reactApplicationContext) else true
            promise.resolve(ok)
        } catch (e: Exception) { promise.reject("ERR_CHECK_OVERLAY", e) }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactApplicationContext.packageName}")
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR_REQ_OVERLAY", e) }
    }

    @ReactMethod
    fun show(data: ReadableMap, promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val intent = Intent(ctx, DPOverlayService::class.java)
            intent.action = DPOverlayService.ACTION_SHOW
            putString(intent, DPOverlayService.EXTRA_MODE,     data, "mode",     "simple")
            putString(intent, DPOverlayService.EXTRA_VERDICT,  data, "verdict",  "decide")
            putString(intent, DPOverlayService.EXTRA_LABEL,    data, "label",    "")
            putString(intent, DPOverlayService.EXTRA_PICKUP,   data, "pickup",   "")
            putString(intent, DPOverlayService.EXTRA_TRIP,     data, "trip",     "")
            putString(intent, DPOverlayService.EXTRA_DURATION, data, "duration", "")
            putString(intent, DPOverlayService.EXTRA_GROSS,    data, "gross",    "")
            putString(intent, DPOverlayService.EXTRA_PROFITKM, data, "profitKm", "")
            putString(intent, DPOverlayService.EXTRA_PROFITMIN,data, "profitMin","")
            putString(intent, DPOverlayService.EXTRA_SOURCE,   data, "source",   "fallback")
            putString(intent, DPOverlayService.EXTRA_NET,      data, "net",      "")
            val shortRide = data.hasKey("shortRide") && !data.isNull("shortRide") && data.getBoolean("shortRide")
            intent.putExtra(DPOverlayService.EXTRA_SHORT_RIDE, shortRide)
            val sanityError = data.hasKey("sanityError") && !data.isNull("sanityError") && data.getBoolean("sanityError")
            intent.putExtra(DPOverlayService.EXTRA_SANITY, sanityError)
            putString(intent, DPOverlayService.EXTRA_DAILY,    data, "dailyProgress", "")
            ctx.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR_SHOW", e) }
    }

    @ReactMethod
    fun hide(promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val intent = Intent(ctx, DPOverlayService::class.java)
            intent.action = DPOverlayService.ACTION_HIDE
            ctx.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR_HIDE", e) }
    }

    private fun putString(intent: Intent, key: String, data: ReadableMap, dataKey: String, default: String) {
        val v = if (data.hasKey(dataKey) && !data.isNull(dataKey)) data.getString(dataKey) ?: default else default
        intent.putExtra(key, v)
    }

    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                promise.resolve(pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) { promise.reject("ERR_CHECK_BATTERY", e) }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:${reactApplicationContext.packageName}")
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR_REQ_BATTERY", e) }
    }

    @ReactMethod fun addListener(eventName: String) { }
    @ReactMethod fun removeListeners(count: Int) { }
}
