package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/03btech/e-marites-backend/db"
	"github.com/03btech/e-marites-backend/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		if err = godotenv.Load(filepath.Join("..", ".env")); err != nil {
			log.Println("Warning: .env file not found")
		}
	}

	// Initialize database
	db.InitDB()
	if db.DB != nil {
		defer db.DB.Close()
	} else {
		log.Println("Warning: Database connection not established")
	}

	router := mux.NewRouter()

	// API Routes
	apiRouter := router.PathPrefix("/api").Subrouter()
	apiRouter.HandleFunc("/events", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.SubmitEventReport(w, r, db.DB)
	}).Methods("POST")

	apiRouter.HandleFunc("/signup", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.SignupHandler(w, r, db.DB)
	}).Methods("POST")

	apiRouter.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.LoginHandler(w, r, db.DB)
	}).Methods("POST")

	apiRouter.HandleFunc("/verify-session", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.VerifySessionHandler(w, r, db.DB)
	}).Methods("GET")

	// Static File Serving
	ex, err := os.Executable()
	if err != nil {
		ex = "."
	}
	exPath := filepath.Dir(ex)

	staticPath := filepath.Join(exPath, "..", "static")
	if _, err := os.Stat(staticPath); os.IsNotExist(err) {
		wd, _ := os.Getwd()
		staticPath = filepath.Join(wd, "static")
		if _, err := os.Stat(staticPath); os.IsNotExist(err) {
			staticPath = filepath.Join(exPath, "static")
			if _, err := os.Stat(staticPath); os.IsNotExist(err) {
				log.Fatal("Static directory not found")
			}
		}
	}
	log.Printf("Serving static files from: %s", staticPath)

	fs := http.FileServer(http.Dir(staticPath))
	router.PathPrefix("/").Handler(http.StripPrefix("/", fs))

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
