# notifications/telegram_notifier.py — CrowdGuard v3.0
# Sends instant Telegram push notifications when crowd alerts fire

import time
import requests

class TelegramNotifier:
    """
    Sends CrowdGuard alerts to a Telegram chat/group.

    Cooldown logic:
      - Per TILE: if the same tile fires again within 5 minutes → skip.
      - Different tile going red → always sends immediately, no cooldown check.
    """

    def __init__(self, bot_token, chat_ids):
        self.bot_token = bot_token
        self.chat_ids  = chat_ids if isinstance(chat_ids, list) else [chat_ids]
        self.api_url   = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        self.sent_log  = {}   # key: tile_str  →  last sent timestamp
        self.cooldown  = 300  # 5 minutes per tile

    def notify_red_tile(self, tile_str, count, css, venue_name, severity):
        """
        Call this when a specific tile turns RED.
        tile_str  : e.g. "(0,2)"
        count     : int — people currently in that tile
        css       : float — current master CSS score
        venue_name: string — e.g. "college"
        severity  : string — "HIGH", "CRITICAL", "EMERGENCY"

        Cooldown is per-tile. A different tile firing does NOT block this.
        """
        now = time.time()

        # Cooldown check — keyed to this specific tile only
        last_sent = self.sent_log.get(tile_str, 0)
        if now - last_sent < self.cooldown:
            remaining = int(self.cooldown - (now - last_sent))
            print(f"[Telegram] Tile {tile_str} in cooldown — {remaining}s remaining, skipping.")
            return

        emoji = self._get_emoji(severity)
        message = (
            f"{emoji} CROWDGUARD RED ZONE ALERT\n"
            f"{'─' * 26}\n"
            f"Venue   : {venue_name.upper()}\n"
            f"Zone    : {tile_str}\n"
            f"People  : {count}\n"
            f"CSS     : {css:.1f}\n"
            f"Severity: {severity}\n"
            f"{'─' * 26}\n"
            f"Action  : Deploy staff to Zone {tile_str} immediately.\n"
            f"Time    : {time.strftime('%Y-%m-%d %H:%M:%S')}"
        )

        for chat_id in self.chat_ids:
            self._send(chat_id, message)

        # Record cooldown for THIS tile only
        self.sent_log[tile_str] = now

    def notify(self, alert, venue_name, css):
        """
        Legacy method — kept for backward compatibility with any
        other call sites. Internally calls notify_red_tile.
        """
        tile_str = str(alert.get("tile", "unknown"))
        count    = int(alert.get("count", 0))
        severity = alert.get("severity", "HIGH")
        self.notify_red_tile(tile_str, count, css, venue_name, severity)

    def send_startup(self, venue_name):
        """Send a message when CrowdGuard starts."""
        message = (
            f"✅ CROWDGUARD STARTED\n"
            f"Venue   : {venue_name.upper()}\n"
            f"Status  : Monitoring active\n"
            f"Alerts  : Fires when any zone turns RED\n"
            f"Cooldown: 5 min per zone\n"
            f"Time    : {time.strftime('%Y-%m-%d %H:%M:%S')}"
        )
        for chat_id in self.chat_ids:
            self._send(chat_id, message)

    def send_status(self, venue_name, css, total_count, level):
        """Send a periodic status update."""
        emoji = self._get_emoji(level)
        message = (
            f"{emoji} CROWDGUARD STATUS\n"
            f"Venue: {venue_name.upper()}\n"
            f"CSS: {css:.1f} | Level: {level}\n"
            f"Total Count: {total_count}\n"
            f"Time: {time.strftime('%H:%M:%S')}"
        )
        for chat_id in self.chat_ids:
            self._send(chat_id, message)

    def _send(self, chat_id, message):
        try:
            response = requests.post(
                self.api_url,
                data={"chat_id": chat_id, "text": message},
                timeout=3
            )
            if response.status_code == 200:
                print(f"[Telegram] Alert sent to chat {chat_id}")
            elif response.status_code == 429:
                print(f"[Telegram] Rate limited — will retry after cooldown")
            else:
                print(f"[Telegram] Failed: {response.status_code} — {response.text[:80]}")
        except Exception as e:
            print(f"[Telegram] Error: {e}")

    def _get_emoji(self, severity_or_level):
        s = str(severity_or_level).upper()
        if "EMERGENCY" in s: return "🚨🚨"
        if "CRITICAL"  in s: return "🚨"
        if "SEVERE"    in s: return "🔴"
        if "HIGH"      in s: return "🟠"
        if "ELEVATED"  in s: return "🟡"
        return "🟢"