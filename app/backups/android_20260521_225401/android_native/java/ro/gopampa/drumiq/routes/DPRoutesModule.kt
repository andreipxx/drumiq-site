package ro.gopampa.drumiq.routes

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class DPRoutesModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DPRoutes"

    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    @ReactMethod
    fun getRoute(origin: String, destination: String, apiKey: String, promise: Promise) {
        Thread {
            try {
                val body = JSONObject().apply {
                    put("origin", JSONObject().put("address", origin))
                    put("destination", JSONObject().put("address", destination))
                    put("travelMode", "DRIVE")
                    put("routingPreference", "TRAFFIC_AWARE")
                    put("computeAlternativeRoutes", false)
                    put("languageCode", "ro")
                    put("units", "METRIC")
                }

                val request = Request.Builder()
                    .url("https://routes.googleapis.com/directions/v2:computeRoutes")
                    .addHeader("Content-Type", "application/json")
                    .addHeader("X-Goog-Api-Key", apiKey)
                    .addHeader("X-Goog-FieldMask", "routes.distanceMeters,routes.duration")
                    .post(body.toString().toRequestBody("application/json".toMediaType()))
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""
                if (!response.isSuccessful) {
                    Log.w("DPRoutes", "HTTP ${response.code}: ${responseBody.take(200)}")
                    val errMap = Arguments.createMap().apply {
                        putDouble("distanceKm", 0.0)
                        putInt("durationMin", 0)
                        putString("error", "HTTP ${response.code}")
                    }
                    promise.resolve(errMap)
                    return@Thread
                }

                val json = JSONObject(responseBody)
                val route = json.optJSONArray("routes")?.optJSONObject(0)
                if (route == null) {
                    Log.w("DPRoutes", "Empty routes: ${responseBody.take(200)}")
                    promise.resolve(null)
                    return@Thread
                }

                val distanceM = route.optInt("distanceMeters", 0)
                val durStr = route.optString("duration", "0s")
                val durSec = durStr.replace(Regex("[^0-9]"), "").toIntOrNull() ?: 0

                val result = Arguments.createMap().apply {
                    putDouble("distanceKm", Math.round(distanceM / 100.0) / 10.0)
                    putInt("durationMin", Math.round(durSec / 60.0f).toInt())
                }
                promise.resolve(result)
            } catch (e: Exception) {
                Log.w("DPRoutes", "Exception: ${e.message}")
                promise.resolve(null)
            }
        }.start()
    }
}
