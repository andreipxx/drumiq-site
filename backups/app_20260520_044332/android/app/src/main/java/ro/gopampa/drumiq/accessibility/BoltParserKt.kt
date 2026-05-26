package ro.gopampa.drumiq.accessibility

/**
 * Native Bolt screen text parser.
 * Mirrors src/services/boltParser.ts exactly. Same regex patterns.
 */

enum class BoltScreen {
    RIDE_OFFER, IN_TRIP_TO_PICKUP, AT_PICKUP_WAITING,
    IN_TRIP_ACTIVE, POST_TRIP_CONFIRM, POST_TRIP_RATE,
    HOME_IDLE, MAP_IDLE, UNKNOWN
}

data class ParsedBoltRide(
    val screen: BoltScreen,
    val grossNet: Double? = null,
    val pickupKm: Double? = null,
    val pickupMin: Int? = null,
    val tripKm: Double? = null,
    val tripMin: Int? = null,
    val passengerRating: Double? = null,
    val passengerName: String? = null,
    val paymentMethod: String? = null,  // "cash" or "card"
    val outsideRange: Boolean = false,
    val surgeMultiplier: Double? = null,
    val pickupAddress: String? = null,
    val destinationAddress: String? = null,
    val hasStops: Boolean = false,
)

object BoltParser {

    private val RE_PRICE_OFFER     = Regex("""(\d+[.,]\d+)\s*lei\s*\(NET""", RegexOption.IGNORE_CASE)
    private val RE_PRICE_IN_TRIP   = Regex("""(\d+[.,]\d+)\s*lei\s*[·•]\s*Net,?\s*cu\s*TVA""", RegexOption.IGNORE_CASE)
    private val RE_PRICE_CONFIRM   = Regex("""Confirmă tariful\s*\n\s*(\d+[.,]\d+)\s*lei""")
    private val RE_PICKUP          = Regex("""(\d+)\s*min\s*[•·*]\s*(\d+(?:[.,]\d+)?)\s*km""")
    private val RE_RATING_NAME     = Regex("""([A-ZĂÂÎŞŢ][a-zăâîşţ]+)\s*[•·]\s*(\d(?:[.,]\d)?)\s*★""")
    private val RE_OUTSIDE         = Regex("""[Îî]n afara razei""")
    private val RE_NUMERAR         = Regex("""Numerar""", RegexOption.IGNORE_CASE)
    private val RE_CARD            = Regex("""\bCard\b""", RegexOption.IGNORE_CASE)
    private val RE_SURGE           = Regex("""Cerere mare\s+(\d+(?:[.,]\d+)?)x""", RegexOption.IGNORE_CASE)
    private val RE_STOPS           = Regex("""\d+\s*oprire""", RegexOption.IGNORE_CASE)
    private val RE_RATING_LINE     = Regex("""^(\d(?:[.,]\d)?)\s*$""", RegexOption.MULTILINE)
    private val RE_PICKUP_MIN_LINE = Regex("""^(<1|\d+)\s*min$""", RegexOption.MULTILINE)
    private val RE_ADDR            = Regex("""\b(Strada|Str\.|B[-]?dul|Bulevardul|Calea|Aleea|Piaţ[ăa]|Piata|Splaiul|Aeroport|VIVO|Auchan|Kaufland|Centrul)\b""", RegexOption.IGNORE_CASE)
    private val RE_ACCEPT_LINE     = Regex("""^(Acceptă|Acceptă următoarea cursă|Acceptare automată)$""", RegexOption.IGNORE_CASE)

    fun classify(text: String): BoltScreen {
        if (text.isEmpty()) return BoltScreen.UNKNOWN
        if (text.contains("Confirmă tariful")) return BoltScreen.POST_TRIP_CONFIRM
        if (text.contains("Evaluează pasagerul")) return BoltScreen.POST_TRIP_RATE
        if (text.contains("Începe cursa") || text.contains("Incepe cursa")) return BoltScreen.AT_PICKUP_WAITING
        if (text.contains("Finalizează cursa")) return BoltScreen.IN_TRIP_ACTIVE
        if (text.contains("Am ajuns")) return BoltScreen.IN_TRIP_TO_PICKUP

        val hasAcceptToken =
            Regex("""Acceptă\b""").containsMatchIn(text) ||
            text.contains("Acceptă următoarea cursă") ||
            text.contains("Acceptare automată")

        if (hasAcceptToken && text.contains("Refuză") && text.contains("lei")) {
            return BoltScreen.RIDE_OFFER
        }
        if (Regex("""Bolt Rewards|Scorul śoferului|Rata de acceptare|Intră online|Deconectează-te""", RegexOption.IGNORE_CASE).containsMatchIn(text)) {
            return BoltScreen.HOME_IDLE
        }
        if (text.contains("Hartă Google")) return BoltScreen.MAP_IDLE
        return BoltScreen.UNKNOWN
    }

    fun parse(text: String): ParsedBoltRide {
        val screen = classify(text)
        if (text.isBlank()) return ParsedBoltRide(screen)
        return when (screen) {
            BoltScreen.RIDE_OFFER -> parseRideOffer(text, screen)
            BoltScreen.IN_TRIP_TO_PICKUP, BoltScreen.AT_PICKUP_WAITING, BoltScreen.IN_TRIP_ACTIVE ->
                parseInTrip(text, screen)
            BoltScreen.POST_TRIP_CONFIRM -> parsePostTripConfirm(text, screen)
            else -> ParsedBoltRide(screen)
        }
    }

    private fun toDouble(s: String): Double = s.replace(',', '.').toDoubleOrNull() ?: 0.0

    private fun parseRideOffer(text: String, screen: BoltScreen): ParsedBoltRide {
        val grossNet = RE_PRICE_OFFER.find(text)?.groupValues?.get(1)?.let { toDouble(it) }
        val pickupMatch = RE_PICKUP.find(text)
        val pickupMin = pickupMatch?.groupValues?.get(1)?.toIntOrNull()
        val pickupKm  = pickupMatch?.groupValues?.get(2)?.let { toDouble(it) }

        val rmatch = RE_RATING_NAME.find(text)
        val passengerName   = rmatch?.groupValues?.get(1)
        val passengerRating = rmatch?.groupValues?.get(2)?.let { toDouble(it) }

        val outsideRange = RE_OUTSIDE.containsMatchIn(text)
        val paymentMethod = when {
            RE_NUMERAR.containsMatchIn(text) -> "cash"
            RE_CARD.containsMatchIn(text)    -> "card"
            else -> null
        }
        val surge = RE_SURGE.find(text)?.groupValues?.get(1)?.let { toDouble(it) }
        val hasStops = RE_STOPS.containsMatchIn(text)

        // Address extraction
        val lines = text.split('\n').map { it.trim() }
        val acceptIdx = lines.indexOfFirst { RE_ACCEPT_LINE.matches(it) }
        val candidates = lines
            .let { if (acceptIdx >= 0) it.subList(0, acceptIdx) else it }
            .filter { l -> RE_ADDR.containsMatchIn(l) && l.length in 6..99 }

        val pickupAddress = candidates.firstOrNull()
        val destinationAddress = if (candidates.size >= 2) candidates.last() else null

        return ParsedBoltRide(
            screen = screen,
            grossNet = grossNet,
            pickupKm = pickupKm,
            pickupMin = pickupMin,
            passengerRating = passengerRating,
            passengerName = passengerName,
            paymentMethod = paymentMethod,
            outsideRange = outsideRange,
            surgeMultiplier = surge,
            hasStops = hasStops,
            pickupAddress = pickupAddress,
            destinationAddress = destinationAddress,
        )
    }

    private fun parseInTrip(text: String, screen: BoltScreen): ParsedBoltRide {
        val grossNet = RE_PRICE_IN_TRIP.find(text)?.groupValues?.get(1)?.let { toDouble(it) }
        val rating = RE_RATING_LINE.find(text)?.groupValues?.get(1)?.let { toDouble(it) }
        var pickupMin: Int? = null
        if (screen == BoltScreen.IN_TRIP_TO_PICKUP) {
            val m = RE_PICKUP_MIN_LINE.find(text)?.groupValues?.get(1)
            pickupMin = if (m == "<1") 0 else m?.toIntOrNull()
        }
        return ParsedBoltRide(screen = screen, grossNet = grossNet, passengerRating = rating, pickupMin = pickupMin)
    }

    private fun parsePostTripConfirm(text: String, screen: BoltScreen): ParsedBoltRide {
        val grossNet = RE_PRICE_CONFIRM.find(text)?.groupValues?.get(1)?.let { toDouble(it) }
        return ParsedBoltRide(screen = screen, grossNet = grossNet)
    }
}
