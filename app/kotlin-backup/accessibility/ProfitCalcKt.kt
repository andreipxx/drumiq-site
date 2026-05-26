package ro.gopampa.drumiq.accessibility

enum class ProfitVerdict { CRITIC, DECIDE, BUN, PREMIUM }

data class FuelSettingsKt(
    val type: String,
    val consumption: Double,
    val pricePerUnit: Double,
    val consumptionGpl: Double? = null,
    val pricePerUnitGpl: Double? = null,
    val wearPerKm: Double,
)

data class ProOverridesKt(
    val maxPickupKm: Double,
    val minPassengerRating: Double,
)

data class ProfitAnalysisKt(
    val netAfterTax: Double,
    val totalKm: Double,
    val pickupKm: Double,
    val tripKmEstimate: Double,
    val vehicleCost: Double,
    val profit: Double,
    val profitPerKm: Double,
    val verdict: ProfitVerdict,
    val isExternalRide: Boolean,
    val proOverride: String?,  // "pickup_too_far", "rating_too_low", or null
)

object ProfitCalc {

    private const val CRITIC_MAX = 1.86
    private const val DECIDE_MAX = 2.35
    private const val BUN_MAX    = 3.00
    private const val TAX_RATE   = 0.33
    private const val EXT_PICKUP_THRESHOLD = 15.0
    private const val EXT_MULTIPLIER = 1.25
    private const val DEFAULT_TRIP_KM = 2.0
    private const val FALLBACK_PICKUP_KM = 1.0

    fun verdictFromPpkm(p: Double): ProfitVerdict = when {
        p < CRITIC_MAX -> ProfitVerdict.CRITIC
        p < DECIDE_MAX -> ProfitVerdict.DECIDE
        p < BUN_MAX    -> ProfitVerdict.BUN
        else           -> ProfitVerdict.PREMIUM
    }

    private fun fuelCostPerKm(s: FuelSettingsKt): Double {
        val main = (s.consumption / 100.0) * s.pricePerUnit
        if (s.type == "benzina_gpl" && s.consumptionGpl != null && s.pricePerUnitGpl != null) {
            val petrolPart = (s.consumption / 100.0) * s.pricePerUnit * 0.20
            val gplPart = (s.consumptionGpl / 100.0) * s.pricePerUnitGpl * 0.80
            return petrolPart + gplPart
        }
        return main
    }

    private fun totalCostPerKm(s: FuelSettingsKt): Double = fuelCostPerKm(s) + s.wearPerKm

    fun analyze(
        parsed: ParsedBoltRide,
        fuel: FuelSettingsKt,
        plan: String,
        proOverrides: ProOverridesKt?,
    ): ProfitAnalysisKt? {
        if (parsed.grossNet == null) return null
        if (parsed.screen != BoltScreen.RIDE_OFFER) return null

        val pickupKm = parsed.pickupKm ?: FALLBACK_PICKUP_KM
        val tripKm = DEFAULT_TRIP_KM
        val totalKm = pickupKm + tripKm

        val net = parsed.grossNet * (1.0 - TAX_RATE)
        val costPerKm = totalCostPerKm(fuel)
        val vehicleCost = totalKm * costPerKm
        var profit = net - vehicleCost
        val isExternal = pickupKm >= EXT_PICKUP_THRESHOLD
        if (isExternal) profit *= EXT_MULTIPLIER
        val ppkm = if (totalKm > 0) profit / totalKm else 0.0
        var verdict = verdictFromPpkm(ppkm)
        var proOverride: String? = null

        if (plan == "pro" && proOverrides != null) {
            if (pickupKm > proOverrides.maxPickupKm) {
                verdict = ProfitVerdict.CRITIC
                proOverride = "pickup_too_far"
            } else if (parsed.passengerRating != null && parsed.passengerRating < proOverrides.minPassengerRating) {
                verdict = ProfitVerdict.CRITIC
                proOverride = "rating_too_low"
            }
        }

        return ProfitAnalysisKt(
            netAfterTax = round2(net),
            totalKm = round2(totalKm),
            pickupKm = round2(pickupKm),
            tripKmEstimate = round2(tripKm),
            vehicleCost = round2(vehicleCost),
            profit = round2(profit),
            profitPerKm = round2(ppkm),
            verdict = verdict,
            isExternalRide = isExternal,
            proOverride = proOverride,
        )
    }

    private fun round2(n: Double): Double = Math.round(n * 100.0) / 100.0
}
