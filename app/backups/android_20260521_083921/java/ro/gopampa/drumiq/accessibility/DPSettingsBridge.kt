package ro.gopampa.drumiq.accessibility

import android.content.Context

/**
 * Bridge between RN AsyncStorage and native code.
 * RN writes to SharedPreferences via AccessibilityModule.syncSettings().
 * Native code reads here without going through RN bridge (works even when RN is dead).
 */
object DPSettingsBridge {

    private const val PREFS = "dp_native_settings"

    // FUEL SETTINGS
    fun getFuel(ctx: Context): FuelSettingsKt {
        val sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val type = sp.getString("fuel.type", "benzina") ?: "benzina"
        val consumption = sp.getFloat("fuel.consumption", 9.5f).toDouble()
        val pricePerUnit = sp.getFloat("fuel.price", 7.5f).toDouble()
        val wearPerKm = sp.getFloat("fuel.wear", 1.0f).toDouble()
        val hasGpl = sp.contains("fuel.consumption_gpl")
        return FuelSettingsKt(
            type = type,
            consumption = consumption,
            pricePerUnit = pricePerUnit,
            consumptionGpl = if (hasGpl) sp.getFloat("fuel.consumption_gpl", 0f).toDouble() else null,
            pricePerUnitGpl = if (sp.contains("fuel.price_gpl")) sp.getFloat("fuel.price_gpl", 0f).toDouble() else null,
            wearPerKm = wearPerKm,
        )
    }

    fun setFuel(ctx: Context, type: String, consumption: Double, price: Double, wear: Double,
                consumptionGpl: Double?, priceGpl: Double?) {
        val ed = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        ed.putString("fuel.type", type)
        ed.putFloat("fuel.consumption", consumption.toFloat())
        ed.putFloat("fuel.price", price.toFloat())
        ed.putFloat("fuel.wear", wear.toFloat())
        if (consumptionGpl != null) ed.putFloat("fuel.consumption_gpl", consumptionGpl.toFloat())
        else ed.remove("fuel.consumption_gpl")
        if (priceGpl != null) ed.putFloat("fuel.price_gpl", priceGpl.toFloat())
        else ed.remove("fuel.price_gpl")
        ed.apply()
    }

    // PRO OVERRIDES
    fun getProOverrides(ctx: Context): ProOverridesKt {
        val sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return ProOverridesKt(
            maxPickupKm = sp.getFloat("pro.max_pickup", 40f).toDouble(),
            minPassengerRating = sp.getFloat("pro.min_rating", 1.0f).toDouble(),
        )
    }

    fun setProOverrides(ctx: Context, maxPickup: Double, minRating: Double) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putFloat("pro.max_pickup", maxPickup.toFloat())
            .putFloat("pro.min_rating", minRating.toFloat())
            .apply()
    }

    // LICENSE / PLAN
    fun getPlan(ctx: Context): String {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("license.plan", "trial") ?: "trial"
    }

    fun setPlan(ctx: Context, plan: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("license.plan", plan).apply()
    }

    fun isLicenseActive(ctx: Context): Boolean {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean("license.active", false)
    }

    fun setLicenseActive(ctx: Context, active: Boolean) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean("license.active", active).apply()
    }

    // OVERLAY MODE (simple/full)
    fun getOverlayMode(ctx: Context): String {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("overlay.mode", "simple") ?: "simple"
    }

    fun setOverlayMode(ctx: Context, mode: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("overlay.mode", mode).apply()
    }

    // FSM state
    private const val FSM_KEY = "fsm.state"
    fun getFsmState(ctx: Context): String {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(FSM_KEY, "unknown") ?: "unknown"
    }
    fun setFsmState(ctx: Context, state: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(FSM_KEY, state).apply()
    }
}
