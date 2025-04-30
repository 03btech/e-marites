package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/03btech/e-marites-backend/models"
	"github.com/google/uuid"
)

type CommunityEvent struct {
    EventID             int       `json:"event_id"`
    EventType           string    `json:"event_type"`
    Severity            string    `json:"severity"`
    Description         string    `json:"description"`
    LocationDescription string    `json:"location_description"`
    Latitude            *float64  `json:"latitude"`
    Longitude           *float64  `json:"longitude"`
    Status              string    `json:"status"`
    CreatedAt           time.Time `json:"created_at"`
    ResolutionNotes     *string   `json:"resolution_notes"`
}

func GetCommunityEvents(w http.ResponseWriter, r *http.Request, db *sql.DB) {
    w.Header().Set("Content-Type", "application/json")

    queryParams := r.URL.Query()
    statusFilter := queryParams.Get("status")
    severityFilter := queryParams.Get("severity")
    typeFilter := queryParams.Get("type")
    dateFrom := queryParams.Get("from_date")
    dateTo := queryParams.Get("to_date")

    query := `
        SELECT
            event_id, event_type, severity::text, description, location_description,
            ST_Y(coordinates::geometry) as latitude,
            ST_X(coordinates::geometry) as longitude,
            status::text, created_at
        FROM community_reported_events
        WHERE coordinates IS NOT NULL`

    var args []interface{}
    var whereClauses []string

    if statusFilter != "" {
        whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", len(args)+1))
        args = append(args, statusFilter)
    }

    if severityFilter != "" {
        whereClauses = append(whereClauses, fmt.Sprintf("severity = $%d", len(args)+1))
        args = append(args, severityFilter)
    }

    if typeFilter != "" {
        whereClauses = append(whereClauses, fmt.Sprintf("event_type = $%d", len(args)+1))
        args = append(args, typeFilter)
    }

    if dateFrom != "" {
        whereClauses = append(whereClauses, fmt.Sprintf("created_at >= $%d", len(args)+1))
        args = append(args, dateFrom)
    }

    if dateTo != "" {
        whereClauses = append(whereClauses, fmt.Sprintf("created_at <= $%d", len(args)+1))
        args = append(args, dateTo+" 23:59:59")
    }

    if len(whereClauses) > 0 {
        query += " AND " + strings.Join(whereClauses, " AND ")
    }

    query += " ORDER BY created_at DESC"

    rows, err := db.Query(query, args...)
    if err != nil {
        log.Printf("Database query error: %v", err)
        http.Error(w, "Failed to fetch events", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    events := []CommunityEvent{}
    for rows.Next() {
        var event CommunityEvent
        if err := rows.Scan(
            &event.EventID, &event.EventType, &event.Severity, &event.Description,
            &event.LocationDescription, &event.Latitude, &event.Longitude,
            &event.Status, &event.CreatedAt,
        ); err != nil {
            log.Printf("Error scanning event row: %v", err)
            continue
        }
        events = append(events, event)
    }

    if err = rows.Err(); err != nil {
        log.Printf("Error after iterating event rows: %v", err)
        http.Error(w, "Failed to process events", http.StatusInternalServerError)
        return
    }

    if err := json.NewEncoder(w).Encode(events); err != nil {
        log.Printf("Error encoding events to JSON: %v", err)
        http.Error(w, "Failed to encode events", http.StatusInternalServerError)
    }
}

func SubmitEventReport(w http.ResponseWriter, r *http.Request, db *sql.DB) {
    w.Header().Set("Content-Type", "application/json")
    if r.Header.Get("Content-Type") != "application/json" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Content-Type must be application/json",
        })
        return
    }
    var event models.Event
    if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Invalid JSON format: " + err.Error(),
        })
        return
    }

    if event.EventType == "" || event.Description == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Missing required fields (event_type, description)",
        })
        return
    }

    var memberID int
    err := db.QueryRow(`
            SELECT member_id FROM community_members 
            WHERE full_name = $1 AND phone = $2`,
        event.CommunityMember.FullName,
        event.CommunityMember.Phone,
    ).Scan(&memberID)

    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "Community member not registered", http.StatusNotFound)
            return
        }
        http.Error(w, "Database error while verifying member", http.StatusInternalServerError)
        return
    }

    event.ReferenceID = "EM-" + uuid.New().String()[:6]
    event.CreatedAt = time.Now()
    event.Status = "reported"

    var latVal, lngVal sql.NullFloat64
    if event.Coordinates != "" {
        parts := strings.Split(event.Coordinates, ",")
        if len(parts) == 2 {
            latStr := strings.TrimSpace(parts[0])
            lngStr := strings.TrimSpace(parts[1])
            if pLat, err := strconv.ParseFloat(latStr, 64); err == nil {
                latVal = sql.NullFloat64{Float64: pLat, Valid: true}
            }
            if pLng, err := strconv.ParseFloat(lngStr, 64); err == nil {
                lngVal = sql.NullFloat64{Float64: pLng, Valid: true}
            }
        }
    }

    baseQuery := `INSERT INTO community_reported_events (
        reference_id, event_type, severity, description, location_description, 
        coordinates, reporter_id, member_id, status, created_at
    ) VALUES ($1, $2, $3, $4, $5, `

    baseArgs := []interface{}{
        event.ReferenceID,
        event.EventType,
        event.Severity,
        event.Description,
        event.LocationDescription,
    }

    var finalQuery string
    var finalArgs []interface{}

    if latVal.Valid && lngVal.Valid {
        finalQuery = baseQuery + `ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9, $10, $11)`
        finalArgs = append(baseArgs, lngVal.Float64, latVal.Float64, event.ReporterID, memberID, event.Status, event.CreatedAt)
    } else {
        finalQuery = baseQuery + `$6, $7, $8, $9, $10)`
        finalArgs = append(baseArgs, nil, event.ReporterID, memberID, event.Status, event.CreatedAt)
    }

    _, err = db.Exec(finalQuery, finalArgs...)

    if err != nil {
        fmt.Printf("Database insertion error: %v\n", err)
        http.Error(w, "Failed to save event", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(event)
}

func GetSingleCommunityEvent(w http.ResponseWriter, r *http.Request, db *sql.DB, eventID string) {
    w.Header().Set("Content-Type", "application/json")

    query := `
        SELECT
            event_id, event_type, severity::text, description, location_description,
            ST_Y(coordinates::geometry) as latitude,
            ST_X(coordinates::geometry) as longitude,
            status::text, created_at, resolution_notes
        FROM community_reported_events
        WHERE event_id = $1`

    var event CommunityEvent
    var resolutionNotes sql.NullString

    err := db.QueryRow(query, eventID).Scan(
        &event.EventID, &event.EventType, &event.Severity, &event.Description,
        &event.LocationDescription, &event.Latitude, &event.Longitude,
        &event.Status, &event.CreatedAt, &resolutionNotes,
    )

    if err != nil {
        w.Header().Set("Content-Type", "application/json")
        if err == sql.ErrNoRows {
            w.WriteHeader(http.StatusNotFound)
            json.NewEncoder(w).Encode(map[string]string{"error": "Event not found"})
        } else {
            log.Printf("Error fetching single event: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch event"})
        }
        return
    }

    if resolutionNotes.Valid {
        event.ResolutionNotes = &resolutionNotes.String
    } else {
        event.ResolutionNotes = nil
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(event)
}

func UpdateCommunityEvent(w http.ResponseWriter, r *http.Request, db *sql.DB, eventID string) {
    w.Header().Set("Content-Type", "application/json")

    var updateData struct {
        EventType           string `json:"event_type"`
        Severity            string `json:"severity"`
        Description         string `json:"description"`
        LocationDescription string `json:"location_description"`
        Status              string `json:"status"`
        Coordinates         string `json:"coordinates"`
    }

    if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    id, err := strconv.Atoi(eventID)
    if err != nil {
        http.Error(w, "Invalid event ID", http.StatusBadRequest)
        return
    }

    tx, err := db.Begin()
    if err != nil {
        log.Printf("Failed to begin transaction for updating event %d: %v", id, err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    defer func() {
        if p := recover(); p != nil {
            tx.Rollback()
            panic(p)
        } else if err != nil {
            rbErr := tx.Rollback()
            if rbErr != nil {
                log.Printf("Error rolling back transaction for event %d: %v", id, rbErr)
            }
        }
    }()

    if updateData.Status != "" && updateData.Status != "resolved" {
        _, err = tx.Exec(`DELETE FROM emergency_alerts WHERE event_id = $1`, id)
        if err != nil {
            log.Printf("Error deleting from emergency_alerts for event %d: %v", id, err)
            http.Error(w, "Failed to delete related emergency alert(s)", http.StatusInternalServerError)
            return
        }
    }

    var coordQuery string
    var coordArgs []interface{}

    if updateData.Coordinates != "" {
        parts := strings.Split(updateData.Coordinates, ",")
        if len(parts) == 2 {
            lat, latErr := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
            lng, lngErr := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)

            if latErr == nil && lngErr == nil {
                coordQuery = `ST_SetSRID(ST_MakePoint($6, $7), 4326)`
                coordArgs = []interface{}{lng, lat}
            }
        }
    }

    baseQuery := `
        UPDATE community_reported_events
        SET 
            event_type = $1,
            severity = $2,
            description = $3,
            location_description = $4,
            status = $5,
            updated_at = CURRENT_TIMESTAMP,
            coordinates = `

    if coordQuery != "" {
        baseQuery += coordQuery
    } else {
        baseQuery += "coordinates"
    }

    args := []interface{}{
        updateData.EventType,
        updateData.Severity,
        updateData.Description,
        updateData.LocationDescription,
        updateData.Status,
    }
    args = append(args, coordArgs...)
    idPlaceholderIndex := len(args) + 1
    args = append(args, id)

    baseQuery += `
        WHERE event_id = $` + strconv.Itoa(idPlaceholderIndex) + `
        RETURNING event_id`

    var updatedID int
    err = tx.QueryRow(baseQuery, args...).Scan(&updatedID)

    if err != nil {
        log.Printf("Error updating event: %v", err)
        http.Error(w, "Failed to update event", http.StatusInternalServerError)
        return
    }

    err = tx.Commit()
    if err != nil {
        log.Printf("Failed to commit transaction for updating event %d: %v", id, err)
        http.Error(w, "Database error during commit", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"message": "Event updated successfully"})
}

func DeleteCommunityEvent(w http.ResponseWriter, r *http.Request, db *sql.DB, eventID string) {
    w.Header().Set("Content-Type", "application/json")

    query := `DELETE FROM community_reported_events WHERE event_id = $1`
    result, err := db.Exec(query, eventID)
    if err != nil {
        log.Printf("Error deleting event: %v", err)
        http.Error(w, "Failed to delete event", http.StatusInternalServerError)
        return
    }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        http.Error(w, "Event not found", http.StatusNotFound)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"message": "Event deleted successfully"})
}

func ResolveCommunityEvent(w http.ResponseWriter, r *http.Request, db *sql.DB, eventIDStr string) {
    w.Header().Set("Content-Type", "application/json")

    var resolutionData struct {
        ResolutionNotes string `json:"resolution_notes"`
    }
    if err := json.NewDecoder(r.Body).Decode(&resolutionData); err != nil {
        http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
        return
    }

    eventID, err := strconv.Atoi(eventIDStr)
    if err != nil {
        http.Error(w, "Invalid event ID format", http.StatusBadRequest)
        return
    }

    tx, err := db.Begin()
    if err != nil {
        log.Printf("Failed to begin transaction for resolving event %d: %v", eventID, err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    defer func() {
        if p := recover(); p != nil {
            tx.Rollback()
            panic(p)
        } else if err != nil {
            rbErr := tx.Rollback()
            if rbErr != nil {
                log.Printf("Error rolling back transaction for event %d: %v", eventID, rbErr)
            }
        }
    }()

    now := time.Now()
    resolutionStatus := "resolved"

    _, err = tx.Exec(`
        UPDATE community_reported_events
        SET status = $1, 
            resolved_at = $2, 
            resolution_notes = $3, 
            updated_at = $2
        WHERE event_id = $4`,
        resolutionStatus, now, resolutionData.ResolutionNotes, eventID)
    if err != nil {
        log.Printf("Error updating community_reported_events for event %d: %v", eventID, err)
        http.Error(w, "Failed to update community event", http.StatusInternalServerError)
        return
    }

    res, err := tx.Exec(`
        UPDATE emergency_alerts
        SET status = $1, 
            resolved_at = $2, 
            updated_at = $2
        WHERE event_id = $3 
          AND status != $1
          AND status != 'false_alarm'`,
        resolutionStatus, now, eventID)
    if err != nil {
        log.Printf("Error updating emergency_alerts for event %d: %v", eventID, err)
        http.Error(w, "Failed to update related emergency alert(s)", http.StatusInternalServerError)
        return
    }

    rowsAffected, _ := res.RowsAffected()
    if rowsAffected == 0 {
        log.Printf("No corresponding emergency_alert found or updated for resolved event_id %d", eventID)
    }

    err = tx.Commit()
    if err != nil {
        log.Printf("Failed to commit transaction for resolving event %d: %v", eventID, err)
        http.Error(w, "Database error during commit", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"message": "Event resolved successfully"})
}

func GetCommunityEventsSince(w http.ResponseWriter, r *http.Request, db *sql.DB) {
    w.Header().Set("Content-Type", "application/json")

    timestamp := r.URL.Query().Get("timestamp")
    if timestamp == "" {
        http.Error(w, "Timestamp parameter is required", http.StatusBadRequest)
        return
    }

    _, err := time.Parse(time.RFC3339, timestamp)
    if err != nil {
        http.Error(w, "Invalid timestamp format. Use RFC3339 format (e.g., 2023-01-01T12:00:00Z)", http.StatusBadRequest)
        return
    }

    status := r.URL.Query().Get("status")

    query := `
        SELECT
            event_id, event_type, severity::text, description, location_description,
            ST_Y(coordinates::geometry) as latitude,
            ST_X(coordinates::geometry) as longitude,
            status::text, created_at
        FROM community_reported_events
        WHERE created_at > $1`

    args := []interface{}{timestamp}

    if status != "" {
        query += fmt.Sprintf(" AND status = $%d", len(args)+1)
        args = append(args, status)
    }

    query += " ORDER BY created_at DESC"

    rows, err := db.Query(query, args...)
    if err != nil {
        log.Printf("Database query error: %v", err)
        http.Error(w, "Failed to fetch events: "+err.Error(), http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    events := []CommunityEvent{}

    for rows.Next() {
        var event CommunityEvent

        err := rows.Scan(
            &event.EventID, &event.EventType, &event.Severity, &event.Description,
            &event.LocationDescription, &event.Latitude, &event.Longitude,
            &event.Status, &event.CreatedAt,
        )

        if err != nil {
            log.Printf("Error scanning event row: %v", err)
            continue
        }

        events = append(events, event)
    }

    if err = rows.Err(); err != nil {
        log.Printf("Error after iterating event rows: %v", err)
        http.Error(w, "Failed to process events", http.StatusInternalServerError)
        return
    }

    if err := json.NewEncoder(w).Encode(events); err != nil {
        log.Printf("Error encoding events to JSON: %v", err)
        http.Error(w, "Failed to encode events", http.StatusInternalServerError)
    }
}

func VerifyCommunityEvent(w http.ResponseWriter, r *http.Request, db *sql.DB, eventID string) {
    w.Header().Set("Content-Type", "application/json")

    tx, err := db.Begin()
    if err != nil {
        log.Printf("Failed to begin transaction for verifying event %s: %v", eventID, err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    defer func() {
        if p := recover(); p != nil {
            tx.Rollback()
            panic(p)
        }
    }()

    _, err = tx.Exec(
        `UPDATE community_reported_events 
         SET status = 'verified', updated_at = CURRENT_TIMESTAMP 
         WHERE event_id = $1`,
        eventID,
    )

    if err != nil {
        tx.Rollback()
        log.Printf("Failed to update event status: %v", err)
        http.Error(w, "Failed to verify event", http.StatusInternalServerError)
        return
    }

    if err = tx.Commit(); err != nil {
        log.Printf("Failed to commit transaction: %v", err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "status":  "success",
        "message": "Event marked as verified",
    })
}
