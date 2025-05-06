package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/03btech/e-marites-backend/models"
	"github.com/03btech/e-marites-backend/services"
	"github.com/lib/pq"
)

// formatPhoneNumberPH formats a given phone number string to the standard +63 Philippines format.
// It handles common variations like "09..." and "639...".
func formatPhoneNumberPH(phone string) string {
	// Remove spaces and hyphens first
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")

	if strings.HasPrefix(phone, "09") && len(phone) == 11 {
		return "+63" + phone[1:] // Replace leading 0 with +63
	}
	if strings.HasPrefix(phone, "639") && len(phone) == 12 {
		return "+" + phone // Add leading + if it's 639...
	}
	// Assume it's already in +639... format or handle other cases if needed
	if strings.HasPrefix(phone, "+639") && len(phone) == 13 {
		return phone // Already correct
	}

	// Fallback: return original if format is unexpected, log the issue
	log.Printf("Unexpected phone number format encountered, returning original: %s", phone)
	return phone
}

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

	if request.AssignedAgencyID <= 0 {
		http.Error(w, "Valid assigned agency ID is required", http.StatusBadRequest)
		return
	}

	tx, err := db.Begin()
	if err != nil {
		log.Printf("Database transaction begin error: %v", err)
		http.Error(w, "Failed to begin transaction", http.StatusInternalServerError)
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
		log.Printf("Existing alerts query error: %v", err)
		http.Error(w, "Error checking for existing alerts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var eventID int
		if err := rows.Scan(&eventID); err != nil {
			log.Printf("Alert scan error: %v", err)
			http.Error(w, "Error processing existing alerts", http.StatusInternalServerError)
			return
		}
		existingAlerts = append(existingAlerts, eventID)
	}

	if len(existingAlerts) > 0 {
		http.Error(w, fmt.Sprintf("Alerts already exist for event IDs: %v", existingAlerts), http.StatusConflict)
		return
	}

	createdAlerts := []map[string]interface{}{}
	familyNumbers := make(map[string]bool)
	var primaryAlertID, primaryEventID int
	var primaryEventDetails struct {
		EventID             int
		ReferenceID         string
		EventType           string
		Severity            string
		Description         string
		LocationDescription string
		Coordinates         sql.NullString
		MemberID            int
	}

	for _, eventID := range request.EventIDs {
		var event struct {
			EventID             int
			ReferenceID         string
			EventType           string
			Severity            string
			Description         string
			LocationDescription string
			Coordinates         sql.NullString
			MemberID            int
		}

		err = tx.QueryRow(`
			SELECT 
				event_id, reference_id, event_type, severity, description, 
				location_description, ST_AsText(coordinates), member_id
			FROM community_reported_events 
			WHERE event_id = $1`, eventID).Scan(
			&event.EventID, &event.ReferenceID, &event.EventType, &event.Severity,
			&event.Description, &event.LocationDescription, &event.Coordinates, &event.MemberID,
		)

		if err == sql.ErrNoRows {
			http.Error(w, fmt.Sprintf("Event with ID %d not found", eventID), http.StatusNotFound)
			return
		} else if err != nil {
			log.Printf("Event retrieval error for ID %d: %v", eventID, err)
			http.Error(w, "Error retrieving event details", http.StatusInternalServerError)
			return
		}

		title := "Alert: " + event.EventType + " (" + event.ReferenceID + ")"

		var alertID int
		err = tx.QueryRow(`
			INSERT INTO emergency_alerts (
				event_id, title, alert_type, severity, description, 
				location_description, coordinates, assigned_agency_id, status 
			) VALUES (
				$1, $2, $3, $4, $5, $6, 
				ST_GeographyFromText($7), $8, 'reported'
			) RETURNING alert_id`,
			event.EventID, title, event.EventType, event.Severity, event.Description,
			event.LocationDescription, event.Coordinates.String, request.AssignedAgencyID,
		).Scan(&alertID)

		if err != nil {
			if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23503" {
				log.Printf("Alert creation error: Invalid assigned_agency_id %d. %v", request.AssignedAgencyID, err)
				http.Error(w, fmt.Sprintf("Invalid assigned agency ID: %d", request.AssignedAgencyID), http.StatusBadRequest)
			} else {
				log.Printf("Alert creation error: %v", err)
				http.Error(w, "Error creating emergency alert", http.StatusInternalServerError)
			}
			return
		}

		if primaryAlertID == 0 {
			primaryAlertID = alertID
			primaryEventID = event.EventID
			primaryEventDetails = event
		}

		_, err = tx.Exec(`
			UPDATE community_reported_events 
			SET status = 'in_progress', updated_at = NOW() 
			WHERE event_id = $1`,
			event.EventID,
		)

		if err != nil {
			log.Printf("Event status update error: %v", err)
			http.Error(w, "Error updating event status", http.StatusInternalServerError)
			return
		}

		if request.NotifyFamily {
			var (
				reporterLastName string
				reporterPhone    string
				reporterName     string
			)
			err = tx.QueryRow(`
				SELECT c.full_name, c.phone, c.family_name 
				FROM community_members c
				WHERE c.member_id = $1`, event.MemberID).Scan(
				&reporterName, &reporterPhone, &reporterLastName,
			)

			if err == nil && reporterLastName != "" {
				rows, err := tx.Query(`
					SELECT phone 
					FROM community_members 
					WHERE family_name = $1 
					AND phone != $2`,
					reporterLastName, reporterPhone)

				if err == nil {
					defer rows.Close()
					for rows.Next() {
						var phone string
						if err := rows.Scan(&phone); err == nil {
							familyNumbers[phone] = true
						}
					}
				} else {
					log.Printf("Error querying family members for %s: %v", reporterLastName, err)
				}
			} else if err != nil && err != sql.ErrNoRows {
				log.Printf("Error querying reporter details for family notification (member_id %d): %v", event.MemberID, err)
			}
		}

		createdAlerts = append(createdAlerts, map[string]interface{}{
			"alert_id":             alertID,
			"event_id":             event.EventID,
			"title":                title,
			"alert_type":           event.EventType,
			"severity":             event.Severity,
			"location_description": event.LocationDescription,
			"assigned_agency_id":   request.AssignedAgencyID,
		})
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Transaction commit error: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// Fetch agency details *after* successful commit
	var agencyName string = "Agency" // Default name
	var agencyPhone sql.NullString
	// Use the main db connection pool now that the transaction is committed
	// Corrected column name from 'phone' to 'phone_number'
	err = db.QueryRow(`SELECT name, phone_number FROM agencies WHERE agency_id = $1`, request.AssignedAgencyID).Scan(&agencyName, &agencyPhone)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Agency with ID %d not found in database for SMS.", request.AssignedAgencyID)
			// agencyName remains "Agency" (the default)
		} else {
			// Log other potential errors
			log.Printf("Could not fetch agency details for SMS (agency_id %d): %v", request.AssignedAgencyID, err)
			// agencyName remains "Agency" (the default)
		}
		// agencyPhone remains invalid (NullString) in case of any error
	}
	// If err was nil, agencyName and agencyPhone were successfully scanned and updated.

	// Proceed with SMS logic only if there are family numbers or a valid agency number
	if len(familyNumbers) > 0 || (agencyPhone.Valid && agencyPhone.String != "") {
		formattedPhoneNumbers := make([]string, 0, len(familyNumbers)+1) // +1 for agency
		for phone := range familyNumbers {
			formattedPhone := formatPhoneNumberPH(phone)
			formattedPhoneNumbers = append(formattedPhoneNumbers, formattedPhone)
		}

		// Add agency phone number if valid
		if agencyPhone.Valid && agencyPhone.String != "" {
			formattedAgencyPhone := formatPhoneNumberPH(agencyPhone.String)
			// Avoid adding duplicates if agency number is already in family list (unlikely but possible)
			found := false
			for _, num := range formattedPhoneNumbers {
				if num == formattedAgencyPhone {
					found = true
					break
				}
			}
			if !found {
				formattedPhoneNumbers = append(formattedPhoneNumbers, formattedAgencyPhone)
				log.Printf("Adding agency phone %s to SMS list for alert %d", formattedAgencyPhone, primaryAlertID)
			}
		}

		// Only proceed with SMS if there are numbers to send to
		if len(formattedPhoneNumbers) == 0 {
			log.Printf("No valid phone numbers (family or agency) found for alert %d, skipping SMS.", primaryAlertID)
		} else {
			var reporterNameForSMS string
			// Use the main db connection pool here as well
			err = db.QueryRow(`SELECT full_name FROM community_members WHERE member_id = $1`, primaryEventDetails.MemberID).Scan(&reporterNameForSMS)
			if err != nil {
				log.Printf("Could not fetch reporter name for SMS (member_id %d): %v", primaryEventDetails.MemberID, err)
				reporterNameForSMS = "N/A"
			}

			maxDescLen := 60
			description := primaryEventDetails.Description
			if len(description) > maxDescLen {
				description = description[:maxDescLen] + "..."
			}
			if description == "" {
				description = "No description provided"
			}

			// Use the fetched (or default) agencyName here
			message := fmt.Sprintf("ALERT: %s reported to %s at %s. \nReporter: %s. \nSeverity: %s. \nDesc: %s. \nRef: %s. \nTime/Date: %s",
				strings.ToUpper(primaryEventDetails.EventType),
				agencyName, // This should now use the fetched name or the default "Agency" if fetch failed
				primaryEventDetails.LocationDescription,
				reporterNameForSMS,
				strings.ToUpper(primaryEventDetails.Severity),
				description,
				primaryEventDetails.ReferenceID,
				time.Now().Format("3:04PM 02/01"),
			)

			const baseSmsTimeout = 30 * time.Second
			estimatedTimePerRecipient := services.DefaultSMSDelay + time.Duration(services.MaxRetries+1)*services.RetryDelay + 2*time.Second
			calculatedTimeout := baseSmsTimeout + time.Duration(len(formattedPhoneNumbers))*estimatedTimePerRecipient

			smsCtx, smsCancel := context.WithTimeout(context.Background(), calculatedTimeout)
			defer smsCancel()

			log.Printf("Starting synchronous SMS processing for alert %d to %d recipients (timeout: %s)", primaryAlertID, len(formattedPhoneNumbers), calculatedTimeout)

			services.SMSHandler.SendBulkSMS(
				smsCtx,
				formattedPhoneNumbers,
				message,
				primaryAlertID,
				primaryEventID,
			)

			log.Printf("Completed synchronous SMS processing for alert %d", primaryAlertID)
		}
	}

	response := map[string]interface{}{
		"success":        true,
		"message":        "Emergency alerts created successfully. SMS processing initiated if applicable.",
		"alerts":         createdAlerts,
		"sms_recipients": len(familyNumbers),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}