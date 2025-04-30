package models

import "time"

type Event struct {
    ReferenceID         string `json:"reference_id"`
    EventType           string `json:"event_type"`
    Severity            string `json:"severity"`
    Description         string `json:"description"`
    LocationDescription string `json:"location"`
    Coordinates         string `json:"coordinates,omitempty"`
    ReporterID          int    `json:"reporter_id,omitempty"`
    CommunityMember     struct {
        FullName string `json:"full_name"`
        Phone    string `json:"phone"`
    } `json:"community_member"`
    CreatedAt time.Time `json:"created_at,omitempty"`
    Status    string    `json:"status,omitempty"`
}
