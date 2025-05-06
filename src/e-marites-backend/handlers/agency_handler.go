package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/03btech/e-marites-backend/db"
	"github.com/03btech/e-marites-backend/models"
	"github.com/gorilla/mux"
	"github.com/lib/pq"
)

// GetAgenciesHandler handles requests to fetch all agencies
func GetAgenciesHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT agency_id, name, phone_number FROM agencies ORDER BY name")
	if err != nil {
		log.Printf("Error querying agencies: %v", err)
		http.Error(w, "Failed to fetch agencies", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var agencies []models.Agency
	for rows.Next() {
		var agency models.Agency
		var phoneNumber sql.NullString
		if err := rows.Scan(&agency.ID, &agency.Name, &phoneNumber); err != nil {
			log.Printf("Error scanning agency row: %v", err)
			// Decide if you want to skip the row or return an error
			// For now, we skip the problematic row
			continue
		}
		if phoneNumber.Valid {
			agency.PhoneNumber = phoneNumber.String
		}
		agencies = append(agencies, agency)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating agency rows: %v", err)
		http.Error(w, "Failed to process agency data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(agencies); err != nil {
		log.Printf("Error encoding agencies to JSON: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// CreateAgencyHandler handles requests to create a new agency
func CreateAgencyHandler(w http.ResponseWriter, r *http.Request) {
	var agency models.Agency
	if err := json.NewDecoder(r.Body).Decode(&agency); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if agency.Name == "" {
		http.Error(w, "Agency name is required", http.StatusBadRequest)
		return
	}

	// Use NullString for potentially null phone number
	var phoneNumber sql.NullString
	if agency.PhoneNumber != "" {
		phoneNumber = sql.NullString{String: agency.PhoneNumber, Valid: true}
	} else {
		phoneNumber = sql.NullString{Valid: false}
	}

	query := "INSERT INTO agencies (name, phone_number) VALUES ($1, $2) RETURNING agency_id"
	err := db.DB.QueryRow(query, agency.Name, phoneNumber).Scan(&agency.ID)
	if err != nil {
		log.Printf("Error creating agency: %v", err)
		// Check for unique constraint violation (could be name or phone)
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // unique_violation
			http.Error(w, "Agency name or phone number already exists", http.StatusConflict)
		} else {
			http.Error(w, "Failed to create agency", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(agency)
}

// UpdateAgencyHandler handles requests to update an existing agency
func UpdateAgencyHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		http.Error(w, "Agency ID is required", http.StatusBadRequest)
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid Agency ID", http.StatusBadRequest)
		return
	}

	var agency models.Agency
	if err := json.NewDecoder(r.Body).Decode(&agency); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if agency.Name == "" {
		http.Error(w, "Agency name is required", http.StatusBadRequest)
		return
	}

	// Use NullString for potentially null phone number
	var phoneNumber sql.NullString
	if agency.PhoneNumber != "" {
		phoneNumber = sql.NullString{String: agency.PhoneNumber, Valid: true}
	} else {
		phoneNumber = sql.NullString{Valid: false}
	}

	query := "UPDATE agencies SET name = $1, phone_number = $2 WHERE agency_id = $3"
	result, err := db.DB.Exec(query, agency.Name, phoneNumber, id)
	if err != nil {
		log.Printf("Error updating agency %d: %v", id, err)
		// Check for unique constraint violation
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			http.Error(w, "Agency name or phone number already exists", http.StatusConflict)
		} else {
			http.Error(w, "Failed to update agency", http.StatusInternalServerError)
		}
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected after update for agency %d: %v", id, err)
		// Continue even if we can't get rows affected, the update might have succeeded
	} else if rowsAffected == 0 {
		http.Error(w, "Agency not found", http.StatusNotFound)
		return
	}

	agency.ID = id // Set the ID in the response object
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(agency)
}

// DeleteAgencyHandler handles requests to delete an agency
func DeleteAgencyHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		http.Error(w, "Agency ID is required", http.StatusBadRequest)
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid Agency ID", http.StatusBadRequest)
		return
	}

	query := "DELETE FROM agencies WHERE agency_id = $1"
	result, err := db.DB.Exec(query, id)
	if err != nil {
		log.Printf("Error deleting agency %d: %v", id, err)
		// Check for foreign key constraint violation if agencies are linked elsewhere
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23503" { // foreign_key_violation
			http.Error(w, "Cannot delete agency: it is referenced by other records (e.g., emergency alerts)", http.StatusConflict)
		} else {
			http.Error(w, "Failed to delete agency", http.StatusInternalServerError)
		}
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected after delete for agency %d: %v", id, err)
		// Continue even if we can't get rows affected
	} else if rowsAffected == 0 {
		http.Error(w, "Agency not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent) // Successfully deleted
}
