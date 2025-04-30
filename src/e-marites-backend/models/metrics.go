package models // Or a suitable package

type ResponseMetrics struct {
	ResponseTimeMinutes int `json:"response_time_minutes"`
	SuccessRatePercent  int `json:"success_rate_percent"` 
	ActiveIncidents     int `json:"active_incidents"`
	ResolvedToday       int `json:"resolved_today"`
}
