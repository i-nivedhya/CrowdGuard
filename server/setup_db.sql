CREATE TABLE crowd_snapshots (
    id          SERIAL PRIMARY KEY,
    venue_id    VARCHAR(64)  NOT NULL,
    timestamp   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    total_count INTEGER,
    css         FLOAT,
    tile_data   JSONB
);
CREATE INDEX idx_snapshots_venue_time ON crowd_snapshots(venue_id, timestamp);

CREATE TABLE alert_events (
    id           SERIAL PRIMARY KEY,
    venue_id     VARCHAR(64)  NOT NULL,
    timestamp    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    alert_type   VARCHAR(32),
    severity     VARCHAR(16),
    tile         VARCHAR(8),
    css_at_alert FLOAT,
    resolved_at  TIMESTAMPTZ,
    duration_secs INTEGER,
    recommendations JSONB
);

CREATE TABLE pa_trigger_log (
    id          SERIAL PRIMARY KEY,
    venue_id    VARCHAR(64),
    timestamp   TIMESTAMPTZ DEFAULT NOW(),
    alert_type  VARCHAR(32),
    message     TEXT,
    triggered_by VARCHAR(64)
);

CREATE TABLE notification_log (
    id          SERIAL PRIMARY KEY,
    venue_id    VARCHAR(64),
    timestamp   TIMESTAMPTZ DEFAULT NOW(),
    contact     VARCHAR(64),
    channel     VARCHAR(16),
    status      VARCHAR(16),
    message     TEXT
);