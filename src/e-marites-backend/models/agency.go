package models

type Agency struct {
	ID          int    `json:"agency_id"`
	Name        string `json:"name"`
	PhoneNumber string `json:"phone_number,omitempty"` // omitempty if you don't always need it
}
