package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"time"
)

const (
	MaxRetries     = 2
	RetryDelay     = 1 * time.Second
	DefaultSMSDelay = 500 * time.Millisecond
)

type SMSService struct {
	db *sql.DB
}

var SMSHandler *SMSService

func InitializeSMSService(db *sql.DB) {
	SMSHandler = &SMSService{db: db}
}

func (s *SMSService) SendBulkSMS(
	ctx context.Context,
	numbers []string,
	message string,
	alertID int,
	eventID int,
) {
	// Validate and format numbers first
	validNumbers := make([]string, 0, len(numbers))
	for _, num := range numbers {
		formatted := formatPhoneNumber(num)
		if isValidPhoneNumber(formatted) {
			validNumbers = append(validNumbers, formatted)
		} else {
			log.Printf("Skipping invalid number: %s", num)
		}
	}

	if len(validNumbers) == 0 {
		log.Println("No valid numbers to process")
		return
	}

	// Create initial queued records in batch
	if err := s.CreateSMSRecords(ctx, alertID, eventID, validNumbers, message); err != nil {
		log.Printf("Failed to create SMS records: %v", err)
		return
	}

	// Process SMS sending with pre-validated numbers
	for _, number := range validNumbers {
		select {
		case <-ctx.Done():
			log.Printf("SMS sending cancelled for alert %d", alertID)
			return
		default:
			s.sendSMSWithRetry(ctx, number, message, alertID, eventID)
			time.Sleep(DefaultSMSDelay)
		}
	}
}

func (s *SMSService) CreateSMSRecords(
	ctx context.Context,
	alertID int,
	eventID int,
	numbers []string,
	message string,
) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO sent_sms (
			alert_id, 
			event_id, 
			recipient, 
			message, 
			status,
			created_at
		) VALUES ($1, $2, $3, $4, 'queued', NOW())`)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for _, number := range numbers {
		if _, err := stmt.ExecContext(ctx, alertID, eventID, number, message); err != nil {
			return fmt.Errorf("failed to insert record for %s: %w", number, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (s *SMSService) sendSMSWithRetry(
	ctx context.Context,
	formattedNumber string,
	message string,
	alertID int,
	eventID int,
) {
	var lastError error
	for attempt := 0; attempt <= MaxRetries; attempt++ {
		startTime := time.Now()
		err := s.sendSMS(formattedNumber, message)

		if err == nil {
			s.updateSMSStatus(ctx, formattedNumber, message, alertID, eventID, 
				"sent", "", startTime)
			return
		}

		lastError = err
		log.Printf("Attempt %d failed for %s: %v", attempt+1, formattedNumber, err)
		s.updateSMSStatus(ctx, formattedNumber, message, alertID, eventID,
			"failed", err.Error(), startTime)

		if attempt < MaxRetries {
			time.Sleep(RetryDelay)
		}
	}
	log.Printf("Final SMS failure for %s: %v", formattedNumber, lastError)
}

func (s *SMSService) updateSMSStatus(
	ctx context.Context,
	number string,
	message string,
	alertID int,
	eventID int,
	status string,
	errorMsg string,
	sentAt time.Time,
) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("Failed to begin SMS status transaction: %v", err)
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		UPDATE sent_sms SET
			status = $1,
			error_message = $2,
			sent_at = $3
		WHERE alert_id = $4
		AND event_id = $5
		AND recipient = $6
		AND message = $7`,
		status,
		errorMsg,
		sentAt,
		alertID,
		eventID,
		number,
		message,
	)

	if err != nil {
		log.Printf("Failed to update SMS status: %v", err)
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Failed to commit SMS status update: %v", err)
	}
}

// Formatting and validation functions remain the same
func formatPhoneNumber(number string) string {
	clean := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, number)

	if strings.HasPrefix(clean, "0") && len(clean) == 11 {
		return "+63" + clean[1:]
	}
	
	if len(clean) == 10 && !strings.HasPrefix(clean, "63") {
		return "+63" + clean
	}
	
	if !strings.HasPrefix(clean, "+") {
		return "+" + clean
	}
	
	return clean
}

func isValidPhoneNumber(number string) bool {
	clean := formatPhoneNumber(number)
	return strings.HasPrefix(clean, "+639") && len(clean) == 13
}

// SMS sending implementation remains the same
func (s *SMSService) sendSMS(number string, message string) error {
	cleanMessage := strings.ReplaceAll(message, `"`, `\"`)
	cleanMessage = strings.ReplaceAll(cleanMessage, "$", `\$`)

	adbCmd := exec.Command("adb", "shell", "service", "call", "isms", "7",
		"i32", "0",
		"s16", "com.android.mms",
		"s16", number,
		"s16", "null",
		"s16", fmt.Sprintf(`"%s"`, cleanMessage),
		"s16", "null",
		"s16", "null",
	)

	output, err := adbCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ADB command failed: %v | Output: %s", err, string(output))
	}

	if strings.Contains(string(output), "Exception") {
		return fmt.Errorf("SMS API error: %s", string(output))
	}

	return nil
}

// Status checking remains the same
func (s *SMSService) GetSMSStatus(ctx context.Context, alertID int) (map[string]interface{}, error) {
	results := make(map[string]interface{})
	var stats struct {
		Total    int
		Sent     int
		Failed   int
		Pending  int
	}

	row := s.db.QueryRowContext(ctx, `
		SELECT 
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status = 'sent') AS sent,
			COUNT(*) FILTER (WHERE status = 'failed') AS failed,
			COUNT(*) FILTER (WHERE status = 'queued') AS pending
		FROM sent_sms
		WHERE alert_id = $1`,
		alertID,
	)

	err := row.Scan(
		&stats.Total,
		&stats.Sent,
		&stats.Failed,
		&stats.Pending,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get SMS stats: %v", err)
	}

	results["stats"] = stats
	results["details"] = s.getSMSDetails(ctx, alertID)

	return results, nil
}

func (s *SMSService) getSMSDetails(ctx context.Context, alertID int) []map[string]interface{} {
	rows, err := s.db.QueryContext(ctx, `
		SELECT recipient, status, sent_at, error_message
		FROM sent_sms
		WHERE alert_id = $1
		ORDER BY sent_at DESC`,
		alertID,
	)
	
	if err != nil {
		log.Printf("Failed to get SMS details: %v", err)
		return nil
	}
	defer rows.Close()

	var details []map[string]interface{}
	for rows.Next() {
		var (
			recipient    string
			status       string
			sentAt       sql.NullTime
			errorMessage sql.NullString
		)

		if err := rows.Scan(&recipient, &status, &sentAt, &errorMessage); err != nil {
			log.Printf("Failed to scan SMS detail row: %v", err)
			continue
		}

		details = append(details, map[string]interface{}{
			"recipient":     recipient,
			"status":        status,
			"sent_at":       sentAt.Time.Format(time.RFC3339),
			"error_message": errorMessage.String,
		})
	}

	return details
}