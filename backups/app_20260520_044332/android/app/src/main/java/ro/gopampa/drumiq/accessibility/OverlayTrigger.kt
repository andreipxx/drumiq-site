package ro.gopampa.drumiq.accessibility

import android.content.Context
import android.content.Intent

/** Builds and sends Intents to DPOverlayService. */
object OverlayTrigger {

    fun show(ctx: Context, parsed: ParsedBoltRide, a: ProfitAnalysisKt, mode: String) {
        val verdictStr = when (a.verdict) {
            ProfitVerdict.CRITIC  -> "critic"
            ProfitVerdict.DECIDE  -> "decide"
            ProfitVerdict.BUN     -> "bun"
            ProfitVerdict.PREMIUM -> "premium"
        }
        val label = buildLabel(parsed, a)

        val intent = Intent(ctx, ro.gopampa.drumiq.overlay.DPOverlayService::class.java).apply {
            action = "ro.gopampa.drumiq.OVERLAY_SHOW"
            putExtra("mode", mode)
            putExtra("verdict", verdictStr)
            putExtra("label", label)
            putExtra("pickup", if (parsed.pickupKm != null)
                "${parsed.pickupKm} km / ${parsed.pickupMin ?: '?'} min" else "—")
            putExtra("trip", "~${a.tripKmEstimate} km")
            putExtra("duration", parsed.pickupMin?.let { "$it min" } ?: "—")
            putExtra("gross", "%.2f lei".format(parsed.grossNet ?: 0.0))
            putExtra("profitKm", "%.2f RON/km".format(a.profitPerKm))
        }
        try {
            ctx.startService(intent)
        } catch (e: Exception) {
            android.util.Log.e("DPOverlayTrigger", "show failed: ${e.message}")
        }
    }

    fun hide(ctx: Context) {
        val intent = Intent(ctx, ro.gopampa.drumiq.overlay.DPOverlayService::class.java).apply {
            action = "ro.gopampa.drumiq.OVERLAY_HIDE"
        }
        try {
            ctx.startService(intent)
        } catch (_: Exception) {}
    }

    private fun buildLabel(parsed: ParsedBoltRide, a: ProfitAnalysisKt): String {
        return when (a.proOverride) {
            "pickup_too_far"  -> "Pickup ${a.pickupKm}km — REFUZA"
            "rating_too_low"  -> "Rating ${parsed.passengerRating} — REFUZA"
            else -> when (a.verdict) {
                ProfitVerdict.CRITIC  -> "Du-te pe JOS!"
                ProfitVerdict.DECIDE  -> "Ma mai gandesc!"
                ProfitVerdict.BUN     -> "Duc un sarac"
                ProfitVerdict.PREMIUM -> "Asa DA!"
            }
        }
    }
}
