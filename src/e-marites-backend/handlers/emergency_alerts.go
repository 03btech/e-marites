// handlers/emergency_alerts.go
package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/03btech/e-marites-backend/models"
	"github.com/lib/pq"
)

func CreateEmergencyAlerts(w http.ResponseWriter, r *http.Request, db *sql.DB) {
    var request models.CreateEmergencyAlertsRequest
    if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
        http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
        return
    }

    if len(request.EventIDs) == 0 {
        http.Error(w, "At least one event ID is required", http.StatusBadRequest)
        return
    }

    if request.AssignedTeam == "" {
        http.Error(w, "Assigned team is required", http.StatusBadRequest)
        return
    }

    tx, err := db.Begin()
    if err != nil {
        http.Error(w, "Failed to begin transaction: "+err.Error(), http.StatusInternalServerError)
        return
    }

    defer func() {
        if err != nil {
            tx.Rollback()
        }
    }()

    var existingAlerts []int
    rows, err := tx.Query(`
            SELECT event_id FROM emergency_alerts
            WHERE event_id = ANY($1)`, pq.Array(request.EventIDs))
    if err != nil {
        http.Error(w, "Error checking for existing alerts: "+err.Error(), http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    for rows.Next() {
        var eventID int
        if err := rows.Scan(&eventID); err != nil {
            http.Error(w, "Error scanning existing alerts: "+err.Error(), http.StatusInternalServerError)
            return
        }
        existingAlerts = append(existingAlerts, eventID)
    }

    if len(existingAlerts) > 0 {
        http.Error(w, fmt.Sprintf("Alerts already exist for event IDs: %v", existingAlerts), http.StatusConflict)
        return
    }

    createdAlerts := []map[string]interface{}{}

    for _, eventID := range request.EventIDs {
        var event struct {
            EventID             int
            ReferenceID         string
            EventType           string
            Severity            string
            Description         string
            LocationDescription string
            Coordinates         sql.NullString
        }

        err = tx.QueryRow(`
            SELECT 
                event_id, reference_id, event_type, severity, description, 
                location_description, ST_AsText(coordinates) as coordinates
            FROM community_reported_events 
            WHERE event_id = $1`, eventID).Scan(
            &event.EventID, &event.ReferenceID, &event.EventType, &event.Severity,
            &event.Description, &event.LocationDescription, &event.Coordinates,
        )

        if err == sql.ErrNoRows {
            http.Error(w, "Event with ID "+string(eventID)+" not found", http.StatusNotFound)
            return
        } else if err != nil {
            http.Error(w, "Error retrieving event: "+err.Error(), http.StatusInternalServerError)
            return
        }

        title := "Alert: " + event.EventType + " (" + event.ReferenceID + ")"

        var alertID int
        err = tx.QueryRow(`
            INSERT INTO emergency_alerts (
                event_id, title, alert_type, severity, description, 
                location_description, coordinates, assigned_team, status
            ) VALUES (
                $1, $2, $3, $4, $5, $6, 
                ST_GeographyFromText($7), $8, 'reported'
            ) RETURNING alert_id`,
            event.EventID, title, event.EventType, event.Severity, event.Description,
            event.LocationDescription, event.Coordinates.String, request.AssignedTeam,
        ).Scan(&alertID)

        if err != nil {
            http.Error(w, "Error creating emergency alert: "+err.Error(), http.StatusInternalServerError)
            return
        }

        _, err = tx.Exec(`
            UPDATE community_reported_events 
            SET status = 'in_progress', updated_at = NOW() 
            WHERE event_id = $1`,
            event.EventID,
        )

        if err != nil {
            http.Error(w, "Error updating community event status: "+err.Error(), http.StatusInternalServerError)
            return
        }

        createdAlerts = append(createdAlerts, map[string]interface{}{
            "alert_id":   alertID,
            "event_id":   event.EventID,
            "title":      title,
            "alert_type": event.EventType,
            "severity":   event.Severity,
        })
    }

    if err = tx.Commit(); err != nil {
        http.Error(w, "Failed to commit transaction: "+err.Error(), http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "success": true,
        "message": "Emergency alerts created successfully",
        "alerts":  createdAlerts,
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(response)
}
