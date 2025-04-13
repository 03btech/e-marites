package models

import "database/sql"

type User struct {
	UserID       int            `json:"id" db:"user_id"`
	Username     string         `json:"username" db:"username"`
	Email        string         `json:"email" db:"email"`
	Password     string         `json:"-" db:"-"`             // Never JSON serialized or scanned directly
	PasswordHash string         `json:"-" db:"password_hash"` // Only for database operations
	FullName     string         `json:"full_name" db:"full_name"`
	Phone        sql.NullString `json:"phone,omitempty" db:"phone"`
	Role         string         `json:"role" db:"role"`
	ProfileImage sql.NullString `json:"profile_image,omitempty" db:"profile_image"`
	CreatedAt    sql.NullTime   `json:"created_at,omitempty" db:"created_at"`
	LastLogin    sql.NullTime   `json:"last_login,omitempty" db:"last_login"`
}
