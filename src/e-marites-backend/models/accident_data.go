// models/accident_data.go (or add to an existing models file)
package models

type AccidentDataPoint struct {
    Month string `json:"month"`
    Count int    `json:"count"`
}

type AccidentTrendData struct {
    Labels []string `json:"labels"`
    Data   []int    `json:"data"`
}