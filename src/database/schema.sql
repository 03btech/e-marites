-- Main database schema for the e-MARITES system

-- Enum types for consistent values
CREATE TYPE event_severity AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE event_status AS ENUM ('reported', 'verified', 'in_progress', 'resolved', 'false_alarm');
CREATE TYPE notification_status AS ENUM ('unread', 'read');
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'responder', 'community_member', 'reporter');

-- Users table for authentication and authorization
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'reporter',
    profile_image VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE community_members (
    member_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_member UNIQUE (full_name, phone)
);

-- Community-reported events (main table)
CREATE TABLE community_reported_events (
    event_id SERIAL PRIMARY KEY,
    reference_id VARCHAR(20) NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    severity event_severity NOT NULL,
    description TEXT NOT NULL,
    location_description TEXT NOT NULL,
    coordinates GEOGRAPHY(POINT, 4326),
    reporter_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    member_id INTEGER NOT NULL REFERENCES community_members(member_id) ON DELETE RESTRICT,
    status event_status DEFAULT 'reported',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    images TEXT[]
);

-- Emergency alerts (processed from community reports)
CREATE TABLE emergency_alerts (
    alert_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES community_reported_events(event_id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity event_severity NOT NULL,
    description TEXT NOT NULL,
    location_description TEXT NOT NULL,
    coordinates GEOGRAPHY(POINT, 4326),
    assigned_team VARCHAR(100),
    status event_status NOT NULL DEFAULT 'reported',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Response tracking
CREATE TABLE response_actions (
    action_id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES emergency_alerts(alert_id) ON DELETE CASCADE,
    responder_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_times CHECK (end_time IS NULL OR end_time >= start_time)
);

-- Notifications system
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    status notification_status DEFAULT 'unread',
    related_event_id INTEGER REFERENCES community_reported_events(event_id) ON DELETE SET NULL,
    related_alert_id INTEGER REFERENCES emergency_alerts(alert_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Community radio announcements
CREATE TABLE radio_announcements (
    announcement_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    broadcast_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    created_by INTEGER REFERENCES users(user_id),
    is_live BOOLEAN DEFAULT FALSE,
    audio_file_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Historical data for trends analysis
CREATE TABLE historical_incidents (
    incident_id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity event_severity NOT NULL,
    location_description TEXT NOT NULL,
    coordinates GEOMETRY(POINT, 4326),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    response_time_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Risk zones for predictive analytics
CREATE TABLE risk_zones (
    zone_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    coordinates GEOMETRY(POLYGON, 4326) NOT NULL,
    description TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Response metrics
CREATE TABLE response_metrics (
    metric_id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    avg_response_time_minutes DECIMAL(10,2) NOT NULL,
    resolution_rate DECIMAL(5,2) NOT NULL,
    incidents_reported INTEGER NOT NULL,
    incidents_resolved INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_events_reference_id ON community_reported_events(reference_id);
CREATE INDEX idx_events_status ON community_reported_events(status);
CREATE INDEX idx_events_created_at ON community_reported_events(created_at);
CREATE INDEX idx_events_member ON community_reported_events(member_id);
CREATE INDEX idx_events_coordinates ON community_reported_events USING GIST(coordinates);
CREATE INDEX idx_alerts_status ON emergency_alerts(status);
CREATE INDEX idx_alerts_created_at ON emergency_alerts(created_at);
CREATE INDEX idx_alerts_coordinates ON emergency_alerts USING GIST(coordinates);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_response_actions_alert ON response_actions(alert_id);
CREATE INDEX idx_historical_incidents_occurred_at ON historical_incidents(occurred_at);
CREATE INDEX idx_risk_zones_risk_level ON risk_zones(risk_level);