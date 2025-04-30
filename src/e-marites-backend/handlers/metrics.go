// handlers/metrics.go (or add to an existing relevant file)
package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/03btech/e-marites-backend/models"
)

// GetResponseMetrics calculates and returns key response metrics
func GetResponseMetrics(w http.ResponseWriter, r *http.Request, db *sql.DB) {
    w.Header().Set("Content-Type", "application/json")
    metrics := models.ResponseMetrics{}

    err := db.QueryRow(`
            SELECT COUNT(*) 
            FROM emergency_alerts 
            WHERE status NOT IN ('resolved', 'false_alarm') 
        `).Scan(&metrics.ActiveIncidents)
    if err != nil && err != sql.ErrNoRows {
        log.Printf("Error calculating active incidents: %v", err)
        http.Error(w, "Error calculating metrics", http.StatusInternalServerError)
        return
    }

    todayStart := time.Now().Truncate(24 * time.Hour)
    err = db.QueryRow(`
            SELECT COUNT(*) 
            FROM community_reported_events 
            WHERE status = 'resolved' AND resolved_at >= $1
        `, todayStart).Scan(&metrics.ResolvedToday)
    if err != nil && err != sql.ErrNoRows {
        log.Printf("Error calculating resolved today: %v", err)
        http.Error(w, "Error calculating metrics", http.StatusInternalServerError)
        return
    }

    var avgResponseMinutes sql.NullFloat64
    err = db.QueryRow(`
            SELECT AVG(EXTRACT(EPOCH FROM (cre.resolved_at - ea.created_at)) / 60) 
            FROM community_reported_events cre
            JOIN emergency_alerts ea ON cre.event_id = ea.event_id 
            WHERE cre.status = 'resolved' AND cre.resolved_at IS NOT NULL AND ea.created_at IS NOT NULL
        `).Scan(&avgResponseMinutes)
    if err != nil && err != sql.ErrNoRows {
        log.Printf("Error calculating response time: %v", err)
        metrics.ResponseTimeMinutes = 0
    } else if avgResponseMinutes.Valid {
        metrics.ResponseTimeMinutes = int(avgResponseMinutes.Float64)
    } else {
        metrics.ResponseTimeMinutes = 0
    }

    var resolvedCount, inProgressCount int
    err = db.QueryRow(`SELECT COUNT(*) FROM community_reported_events WHERE status = 'resolved'`).Scan(&resolvedCount)
    if err != nil && err != sql.ErrNoRows {
        log.Printf("Error calculating resolved count for success rate: %v", err)
        http.Error(w, "Error calculating metrics", http.StatusInternalServerError)
        return
    }
    err = db.QueryRow(`SELECT COUNT(*) FROM community_reported_events WHERE status = 'in_progress'`).Scan(&inProgressCount)
    if err != nil && err != sql.ErrNoRows {
        log.Printf("Error calculating in-progress count for success rate: %v", err)
        http.Error(w, "Error calculating metrics", http.StatusInternalServerError)
        return
    }

    totalConsidered := resolvedCount + inProgressCount
    if totalConsidered > 0 {
        metrics.SuccessRatePercent = (resolvedCount * 100) / totalConsidered
    } else {
        metrics.SuccessRatePercent = 0
    }

    err = json.NewEncoder(w).Encode(metrics)
    if err != nil {
        log.Printf("Error encoding metrics to JSON: %v", err)
        if _, ok := w.Header()["Content-Type"]; !ok {
            http.Error(w, "Failed to encode metrics", http.StatusInternalServerError)
        }
        return
    }
}
