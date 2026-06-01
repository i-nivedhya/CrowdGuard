# src/recommendation_engine.py — CrowdGuard AI v2.0
# Returns venue-specific crowd management recommendations
 
# Recommendation table.
# Key:   (venue_type, alert_type, severity)
# Value: list of recommendation strings (use {tile} as placeholder)
RECOMMENDATIONS = {
    ('temple', 'SURGE', 'HIGH'): [
        'Deploy staff to Zone {tile} immediately to redirect devotees.',
        'Open secondary exit corridor if available.',
        'Announce crowd guidance on PA system.',
    ],
    ('temple', 'CASCADE_RISK', 'CRITICAL'): [
        'HALT entry to the main hall. Activate one-way flow protocol.',
        'Alert temple management and security coordinator.',
        'Do not allow counter-flow in Zone {tile} corridor.',
    ],
    ('temple', 'IMMINENT_RED', 'HIGH'): [
        'Pre-redirect devotees away from Zone {tile}.',
        'Station staff at Zone {tile} entrance now.',
    ],
    ('stadium', 'SURGE', 'HIGH'): [
        'Open additional gates near Zone {tile}.',
        'Redirect crowd flow away from Zone {tile}.',
        'Alert stewards in sections adjacent to Zone {tile}.',
    ],
    ('stadium', 'CASCADE_RISK', 'CRITICAL'): [
        'Activate emergency exit protocol for Zone {tile}.',
        'Halt new admissions until Zone {tile} clears.',
    ],
    ('stadium', 'CHAOS', 'HIGH'): [
        'Deploy barrier team to Zone {tile}.',
        'Identify and isolate cause of chaos near Zone {tile}.',
    ],
    ('rally', 'SURGE', 'HIGH'): [
        'Widen crowd lanes near Zone {tile}.',
        'Establish clear movement corridor through Zone {tile}.',
    ],
    ('rally', 'CHAOS', 'HIGH'): [
        'Dispatch crowd management team to Zone {tile}.',
        'Establish clear movement lanes using barriers.',
        'Instruct stage to pause performance and address crowd calmly.',
    ],
    ('rally', 'CASCADE_RISK', 'CRITICAL'): [
        'Stage announcement: ask crowd to move back from Zone {tile}.',
        'Open all available entry/exit points.',
    ],
    ('college', 'PRE_WARNING', 'MODERATE'): [
        'Zone {tile} approaching capacity — redirect students to adjacent area.',
        'Open overflow zone or secondary gathering space.',
    ],
    ('college', 'SURGE', 'HIGH'): [
        'Security to Zone {tile} — manage student crowd.',
        'Announce alternate gathering area on speaker system.',
    ],
    ('college', 'CHAOS', 'HIGH'): [
        'Security intervention needed at Zone {tile}.',
        'Identify incident source at Zone {tile}.',
    ],
}
 
# Generic fallback used when no specific rule matches
GENERIC_RECOMMENDATION = [
    'Monitor Zone {tile} closely.',
    'Deploy available staff to Zone {tile}.',
    'Consider opening additional exit routes.',
]
 
 
def get_recommendation(venue, alert_type, severity, tile):
    """
    Look up venue+alert+severity in the table.
    Falls back to (venue, alert_type, 'HIGH') if exact match not found.
    Falls back to GENERIC if no venue match either.
 
    Returns list of formatted recommendation strings.
    """
    key = (venue, alert_type, severity)
    fallback_key = (venue, alert_type, 'HIGH')
 
    recs = RECOMMENDATIONS.get(
        key,
        RECOMMENDATIONS.get(fallback_key, GENERIC_RECOMMENDATION)
    )
 
    # Replace {tile} placeholder with actual tile coordinates
    return [r.format(tile=tile) for r in recs]
 
 
def get_recommendations_for_alerts(alerts, venue):
    """
    Convenience function: takes the full list of surge alerts and
    returns a combined list of all relevant recommendations.
    """
    all_recs = []
    seen = set()  # avoid duplicate recommendations
 
    for alert in alerts:
        tile     = alert.get('tile', '?')
        atype    = alert.get('type', 'SURGE')
        severity = alert.get('severity', 'HIGH')
 
        recs = get_recommendation(venue, atype, severity, tile)
        for rec in recs:
            if rec not in seen:
                all_recs.append(rec)
                seen.add(rec)
 
    return all_recs[:4]  # show maximum 4 recommendations at once
