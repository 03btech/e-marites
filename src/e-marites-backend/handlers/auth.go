package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"time"

	"github.com/03btech/e-marites-backend/config"
	"github.com/03btech/e-marites-backend/models"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

func SignupHandler(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	w.Header().Set("Content-Type", "application/json")

	// Only accept JSON content
	if r.Header.Get("Content-Type") != "application/json" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Content-Type must be application/json",
		})
		return
	}

	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid JSON format: " + err.Error(),
		})
		return
	}

	// Validate required fields
	if user.Username == "" || user.Email == "" || user.Password == "" || user.FullName == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Missing required fields (username, email, password, full_name)",
		})
		return
	}

	// Validate username format (4-50 chars, alphanumeric + underscore)
	if matched, _ := regexp.MatchString(`^[a-zA-Z0-9_]{4,50}$`, user.Username); !matched {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Username must be 4-50 characters long and contain only letters, numbers, and underscores",
		})
		return
	}

	// Validate email format
	if matched, _ := regexp.MatchString(`^[^@]+@[^@]+\.[^@]+$`, user.Email); !matched {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid email format",
		})
		return
	}

	// Validate password strength
	if len(user.Password) < 8 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Password must be at least 8 characters long",
		})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to hash password",
		})
		return
	}
	user.PasswordHash = string(hashedPassword)

	// Check if username or email already exists
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM users WHERE username = $1 OR email = $2",
		user.Username, user.Email).Scan(&count)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Database error checking existing users",
		})
		return
	}

	if count > 0 {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Username or email already exists",
		})
		return
	}

	// Insert new user
	_, err = db.Exec(`
		INSERT INTO users (username, password_hash, full_name, email, phone, role, profile_image)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		user.Username,
		user.PasswordHash,
		user.FullName,
		user.Email,
		user.Phone,
		user.Role,
		user.ProfileImage,
	)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to create user: " + err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User created successfully",
	})
}

func LoginHandler(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	// Load JWT config
	jwtConfig, err := config.LoadJWTConfig()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Server configuration error",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Only accept JSON content
	if r.Header.Get("Content-Type") != "application/json" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Content-Type must be application/json",
		})
		return
	}

	var creds struct {
		Identifier string `json:"identifier"`
		Password   string `json:"password"`
		RememberMe bool   `json:"remember_me"`
	}

	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid JSON format: " + err.Error(),
		})
		return
	}

	// Find user by username or email
	var user models.User
	// Update your query scan to match the model
	err = db.QueryRow(`
    SELECT user_id, username, email, password_hash, role, full_name
    FROM users 
    WHERE username = $1 OR email = $1`, creds.Identifier).Scan(
		&user.UserID, &user.Username, &user.Email, &user.PasswordHash, &user.Role, &user.FullName)

	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Invalid credentials",
			})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Database error: " + err.Error(),
			})
		}
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(creds.Password)); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid credentials",
		})
		return
	}
	// Update last login time
	_, err = db.Exec("UPDATE users SET last_login = $1, updated_at = $1 WHERE user_id = $2", time.Now(), user.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to update last login time: " + err.Error(),
		})
		return
	}
	log.Printf("Successfully updated last_login for user %d", user.UserID)

	// Create JWT token
	expirationTime := time.Now().Add(jwtConfig.Expiration)
	if creds.RememberMe {
		expirationTime = time.Now().Add(jwtConfig.Expiration * 7) // 1 week for remember me
	}

	claims := &jwt.RegisteredClaims{
		Subject:   user.Username,
		ExpiresAt: jwt.NewNumericDate(expirationTime),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtConfig.Secret))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to generate token: " + err.Error(),
		})
		return
	}

	// Return token and basic user info
	w.Header().Set("Authorization", "Bearer "+tokenString)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": tokenString,
		"user": map[string]interface{}{
			"id":       user.UserID,
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
		},
	})
}

func VerifySessionHandler(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	jwtConfig, err := config.LoadJWTConfig()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Server configuration error",
		})
		return
	}
	w.Header().Set("Content-Type", "application/json")

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Authorization header required",
		})
		return
	}

	// Extract token from "Bearer <token>"
	tokenString := ""
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		tokenString = authHeader[7:]
	}

	if tokenString == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid authorization format",
		})
		return
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(jwtConfig.Secret), nil

	})

	if err != nil {
		var errorMsg string
		if ve, ok := err.(*jwt.ValidationError); ok {
			if ve.Errors&jwt.ValidationErrorMalformed != 0 {
				errorMsg = "Malformed token"
			} else if ve.Errors&(jwt.ValidationErrorExpired|jwt.ValidationErrorNotValidYet) != 0 {
				errorMsg = "Token expired or not active yet"
			} else {
				errorMsg = "Token validation error"
			}
		} else {
			errorMsg = "Token processing error"
		}

		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": errorMsg,
		})
		return
	}

	if !token.Valid {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid token",
		})
		return
	}

	// Token is valid - return additional claims if needed
	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":  true,
			"user":   claims["sub"], // Subject (username)
			"expiry": claims["exp"], // Expiration time
		})
	} else {
		json.NewEncoder(w).Encode(map[string]bool{
			"valid": true,
		})
	}
}
