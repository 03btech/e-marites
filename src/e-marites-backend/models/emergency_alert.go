// models/emergency_alert.go
package models

import (
	"database/sql"
	"time"
)

type EmergencyAlert struct {
	AlertID             int          `json:"alert_id,omitempty"`
	EventID             int          `json:"event_id"`
	Title               string       `json:"title"`
	AlertType           string       `json:"alert_type"`
	Severity            string       `json:"severity"`
	Description         string       `json:"description"`
	LocationDescription string       `json:"location_description"`
	Coordinates         string       `json:"coordinates,omitempty"`
	AssignedTeam        string       `json:"assigned_team"`
	Status              string       `json:"status"`
	CreatedAt           time.Time    `json:"created_at,omitempty"`
	UpdatedAt           time.Time    `json:"updated_at,omitempty"`
	ResolvedAt          sql.NullTime `json:"resolved_at,omitempty"`
}

type CreateEmergencyAlertsRequest struct {
	EventIDs     []int  `json:"event_ids"`
	AssignedTeam string `json:"assigned_team"`
}
