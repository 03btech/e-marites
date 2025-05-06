package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time" // Import time

	"github.com/03btech/e-marites-backend/db"
	"github.com/03btech/e-marites-backend/models"
	"github.com/gorilla/mux"
	"github.com/lib/pq" // Import pq for error checking
)

// GetCommunityMembersHandler handles requests to fetch all community members
func GetCommunityMembersHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT member_id, full_name, phone, address, family_name, created_at FROM community_members ORDER BY full_name")
	if err != nil {
		log.Printf("Error querying community members: %v", err)
		http.Error(w, "Failed to fetch community members", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var members []models.CommunityMember
	for rows.Next() {
		var member models.CommunityMember
		var address, familyName sql.NullString
		var createdAt sql.NullTime // Use sql.NullTime for nullable timestamp

		if err := rows.Scan(&member.ID, &member.FullName, &member.Phone, &address, &familyName, &createdAt); err != nil {
			log.Printf("Error scanning community member row: %v", err)
			continue // Skip problematic row
		}

		// Assign optional fields if they are valid
		if address.Valid {
			member.Address = &address.String
		}
		if familyName.Valid {
			member.FamilyName = &familyName.String
		}
		if createdAt.Valid {
			member.CreatedAt = &createdAt.Time
		}

		members = append(members, member)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating community member rows: %v", err)
		http.Error(w, "Failed to process community member data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(members); err != nil {
		log.Printf("Error encoding community members to JSON: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// CreateCommunityMemberHandler handles requests to create a new community member
func CreateCommunityMemberHandler(w http.ResponseWriter, r *http.Request) {
	var member models.CommunityMember
	if err := json.NewDecoder(r.Body).Decode(&member); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if member.FullName == "" || member.Phone == "" {
		http.Error(w, "Full name and phone number are required", http.StatusBadRequest)
		return
	}

	// Use sql.NullString for optional fields
	var address, familyName sql.NullString
	if member.Address != nil && *member.Address != "" {
		address = sql.NullString{String: *member.Address, Valid: true}
	}
	if member.FamilyName != nil && *member.FamilyName != "" {
		familyName = sql.NullString{String: *member.FamilyName, Valid: true}
	}

	query := `
		INSERT INTO community_members (full_name, phone, address, family_name)
		VALUES ($1, $2, $3, $4)
		RETURNING member_id, created_at`

	var createdAt time.Time
	err := db.DB.QueryRow(query, member.FullName, member.Phone, address, familyName).Scan(&member.ID, &createdAt)
	if err != nil {
		log.Printf("Error creating community member: %v", err)
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // unique_violation (likely on full_name + phone)
			http.Error(w, "Community member with this name and phone already exists", http.StatusConflict)
		} else {
			http.Error(w, "Failed to create community member", http.StatusInternalServerError)
		}
		return
	}
	member.CreatedAt = &createdAt // Assign the returned timestamp

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(member)
}

// UpdateCommunityMemberHandler handles requests to update an existing community member
func UpdateCommunityMemberHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		http.Error(w, "Member ID is required", http.StatusBadRequest)
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid Member ID", http.StatusBadRequest)
		return
	}

	var member models.CommunityMember
	if err := json.NewDecoder(r.Body).Decode(&member); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if member.FullName == "" || member.Phone == "" {
		http.Error(w, "Full name and phone number are required", http.StatusBadRequest)
		return
	}

	// Use sql.NullString for optional fields
	var address, familyName sql.NullString
	if member.Address != nil && *member.Address != "" {
		address = sql.NullString{String: *member.Address, Valid: true}
	}
	if member.FamilyName != nil && *member.FamilyName != "" {
		familyName = sql.NullString{String: *member.FamilyName, Valid: true}
	}

	query := `
		UPDATE community_members
		SET full_name = $1, phone = $2, address = $3, family_name = $4, updated_at = CURRENT_TIMESTAMP
		WHERE member_id = $5`

	result, err := db.DB.Exec(query, member.FullName, member.Phone, address, familyName, id)
	if err != nil {
		log.Printf("Error updating community member %d: %v", id, err)
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // unique_violation
			http.Error(w, "Another community member with this name and phone already exists", http.StatusConflict)
		} else {
			http.Error(w, "Failed to update community member", http.StatusInternalServerError)
		}
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected after update for member %d: %v", id, err)
		// Continue, update might have succeeded
	} else if rowsAffected == 0 {
		http.Error(w, "Community member not found", http.StatusNotFound)
		return
	}

	member.ID = id // Set the ID in the response object
	// We don't return created_at on update, could query it again if needed
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(member)
}

// DeleteCommunityMemberHandler handles requests to delete a community member
func DeleteCommunityMemberHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		http.Error(w, "Member ID is required", http.StatusBadRequest)
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid Member ID", http.StatusBadRequest)
		return
	}

	query := "DELETE FROM community_members WHERE member_id = $1"
	result, err := db.DB.Exec(query, id)
	if err != nil {
		log.Printf("Error deleting community member %d: %v", id, err)
		// Check for foreign key constraint violation (e.g., if member reported events)
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23503" { // foreign_key_violation
			http.Error(w, "Cannot delete member: they are referenced by reported events", http.StatusConflict)
		} else {
			http.Error(w, "Failed to delete community member", http.StatusInternalServerError)
		}
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected after delete for member %d: %v", id, err)
		// Continue
	} else if rowsAffected == 0 {
		http.Error(w, "Community member not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent) // Successfully deleted
}
