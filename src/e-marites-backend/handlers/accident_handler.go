// handlers/accident_handler.go
package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/03btech/e-marites-backend/models"
)

func GetAccidentTrendData(w http.ResponseWriter, r *http.Request, db *sql.DB) {
    months := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
    monthlyCounts := make(map[string]int)
    for _, m := range months {
        monthlyCounts[m] = 0
    }

    query := `
        SELECT 
            TO_CHAR(created_at, 'Mon') AS month_abbr, 
            COUNT(*) AS count
        FROM 
            community_reported_events 
        WHERE 
-- Removed: event_type = 'Accident' -- <<< Filter removed to count ALL events
            created_at >= $1-- Removed: event_type = 'Accident' -- <<< Filter removed to count ALL events

        GROUP BY 
            month_abbr, EXTRACT(MONTH FROM created_at)
        ORDER BY 
            EXTRACT(MONTH FROM created_at);
    `
    twelveMonthsAgo := time.Now().AddDate(0, -11, 0)
    startOfMonth := time.Date(twelveMonthsAgo.Year(), twelveMonthsAgo.Month(), 1, 0, 0, 0, 0, twelveMonthsAgo.Location())

    rows, err := db.Query(query, startOfMonth)
    if err != nil {
        log.Printf("Error querying event trend data: %v", err)
        http.Error(w, "Failed to retrieve event trend data", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    for rows.Next() {
        var monthAbbr string
        var count int
        if err := rows.Scan(&monthAbbr, &count); err != nil {
            log.Printf("Error scanning event trend data row: %v", err)
            http.Error(w, "Failed to process event trend data", http.StatusInternalServerError)
            return
        }
        monthAbbr = strings.TrimSpace(monthAbbr)
        if _, ok := monthlyCounts[monthAbbr]; ok {
            monthlyCounts[monthAbbr] = count
        } else {
            log.Printf("Warning: Found unexpected month abbreviation from DB: %s", monthAbbr)
        }
    }

    if err = rows.Err(); err != nil {
        log.Printf("Error iterating event trend data rows: %v", err)
        http.Error(w, "Failed processing event trend data results", http.StatusInternalServerError)
        return
    }

    trendData := models.AccidentTrendData{
        Labels: make([]string, 0, 12),
        Data:   make([]int, 0, 12),
    }

    for _, monthName := range months {
        trendData.Labels = append(trendData.Labels, monthName)
        trendData.Data = append(trendData.Data, monthlyCounts[monthName])
    }

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(trendData); err != nil {
        log.Printf("Error encoding event trend data to JSON: %v", err)
        if _, ok := w.Header()["Content-Type"]; !ok {
            http.Error(w, "Failed to serialize event trend data", http.StatusInternalServerError)
        }
    }
}