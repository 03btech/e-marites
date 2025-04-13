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
	Severity            string    `json:"severity"` // Will hold 'Low', 'Medium', 'High' from DB
	Description         string    `json:"description"`
	LocationDescription string    `json:"location_description"`
	Latitude            *float64  `json:"latitude"`  // Use pointers to handle potential NULL
	Longitude           *float64  `json:"longitude"` // Use pointers to handle potential NULL
	Status              string    `json:"status"`
	CreatedAt           time.Time `json:"created_at"`
	// Add other fields as needed
}

// Handler function to get community events
func GetCommunityEvents(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	w.Header().Set("Content-Type", "application/json")

	query := `
		SELECT
			event_id, event_type, severity::text, description, location_description,
			ST_Y(coordinates::geometry) as latitude,  -- Cast to geometry for ST_Y (Latitude)
			ST_X(coordinates::geometry) as longitude, -- Cast to geometry for ST_X (Longitude)
			status::text, created_at
		FROM community_reported_events
		WHERE coordinates IS NOT NULL
		ORDER BY created_at DESC` // Or any other ordering you prefer

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("Database query error: %v", err)
		http.Error(w, "Failed to fetch events", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	events := []CommunityEvent{}
	for rows.Next() {
		var event CommunityEvent
		// Scan latitude and longitude directly
		if err := rows.Scan(
			&event.EventID, &event.EventType, &event.Severity, &event.Description,
			&event.LocationDescription, &event.Latitude, &event.Longitude,
			&event.Status, &event.CreatedAt,
		); err != nil {
			log.Printf("Error scanning event row: %v", err)
			continue // Skip problematic row
		}
		// Only add events where coordinates were successfully scanned (not NULL)
		if event.Latitude != nil && event.Longitude != nil {
			events = append(events, event)
		} else {
			log.Printf("Skipping event ID %d due to NULL coordinates after scan", event.EventID)
		}
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error after iterating event rows: %v", err)
		http.Error(w, "Failed to process events", http.StatusInternalServerError)
		return
	} else {
		log.Printf("Successfully fetched and encoded %d community events", len(events))
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

	// 1. First verify the community member exists
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

	// 2. Prepare the event data
	event.ReferenceID = "EM-" + uuid.New().String()[:6]
	event.CreatedAt = time.Now()
	event.Status = "reported"

	// 3. Handle coordinates
	var latVal, lngVal sql.NullFloat64
	if event.Coordinates != "" {
		parts := strings.Split(event.Coordinates, ",")
		if len(parts) == 2 {
			latStr := strings.TrimSpace(parts[0])
			lngStr := strings.TrimSpace(parts[1])
			// Try parsing, keep Valid=false if parsing fails
			if pLat, err := strconv.ParseFloat(latStr, 64); err == nil {
				latVal = sql.NullFloat64{Float64: pLat, Valid: true}
			}
			if pLng, err := strconv.ParseFloat(lngStr, 64); err == nil {
				lngVal = sql.NullFloat64{Float64: pLng, Valid: true}
			}
		}
	}

	// 4. Insert the event
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
		// Both lat and lng are valid, use ST_SetSRID function in query
		finalQuery = baseQuery + `ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9, $10, $11)`
		finalArgs = append(baseArgs, lngVal.Float64, latVal.Float64, event.ReporterID, memberID, event.Status, event.CreatedAt) // Note lng is first in ST_MakePoint
	} else {
		// Coordinates are invalid or missing, insert NULL
		finalQuery = baseQuery + `$6, $7, $8, $9, $10)` // Placeholder 6 is for NULL coordinates
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
