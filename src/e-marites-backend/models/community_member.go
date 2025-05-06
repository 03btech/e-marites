package models

import "time"

type CommunityMember struct {
	ID         int        `json:"member_id"`
	FullName   string     `json:"full_name"`
	Phone      string     `json:"phone"`
	Address    *string    `json:"address,omitempty"`      // Use pointer for optional field
	FamilyName *string    `json:"family_name,omitempty"` // Use pointer for optional field
	CreatedAt  *time.Time `json:"created_at,omitempty"` // Use pointer for read-only field
}
