package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath" // Import filepath package

	"github.com/03btech/e-marites-backend/db"
	"github.com/03btech/e-marites-backend/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		// Try loading from parent directory if running from within e-marites-backend
		// Adjust this path if your .env file is elsewhere relative to the executable
		if err = godotenv.Load(filepath.Join("..", ".env")); err != nil {
			log.Println("Warning: .env file not found in current or parent directory.")
		}
	}

	// Initialize database
	db.InitDB()
	if db.DB != nil { // Check if DB connection was successful
		defer db.DB.Close()
	} else {
		log.Println("Warning: Database connection not established. API endpoints requiring DB will fail.")
		// Decide if you want to Fatal or just warn. For serving static files, DB might not be needed immediately.
		// log.Fatal("Failed to initialize database connection.")
	}

	// Create router
	router := mux.NewRouter()

	// --- API Routes ---
	// Handle API routes first using a subrouter
	apiRouter := router.PathPrefix("/api").Subrouter()
	apiRouter.HandleFunc("/events", func(w http.ResponseWriter, r *http.Request) {
		// Ensure DB is not nil before using it, especially if you decided to only warn above
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.SubmitEventReport(w, r, db.DB)
	}).Methods("POST")
	// Add other API routes here using apiRouter.HandleFunc(...)

	// --- Static File Serving ---
	// Determine the correct path to the static directory relative to the executable
	ex, err := os.Executable()
	if err != nil {
		log.Printf("Warning: Failed to get executable path: %v. Using relative path './static'.", err)
		ex = "." // Fallback to relative path
	}
	exPath := filepath.Dir(ex)

	// Construct the path: assumes 'static' is a sibling of 'e-marites-backend' directory
	// Adjust ".." if your structure is different (e.g., executable is in root 'src')
	staticPath := filepath.Join(exPath, "..", "static")
	if _, err := os.Stat(staticPath); os.IsNotExist(err) {
		// Fallback if the above structure isn't found (e.g., running 'go run' from within e-marites-backend)
		wd, _ := os.Getwd() // Get current working directory as another potential base
		staticPath = filepath.Join(wd, "static")
		log.Printf("Static path fallback using working directory: %s", staticPath)
		if _, err := os.Stat(staticPath); os.IsNotExist(err) {
			// Final fallback: assume 'static' is directly relative to executable
			staticPath = filepath.Join(exPath, "static")
			log.Printf("Static path final fallback relative to executable: %s", staticPath)
			if _, err := os.Stat(staticPath); os.IsNotExist(err) {
				log.Fatalf("Static directory not found at expected locations: %v", err)
			}
		}
	}
	log.Printf("Serving static files from: %s", staticPath)

	// Create a file server handler
	fs := http.FileServer(http.Dir(staticPath))

	// Handle all other requests (that didn't match API routes) by serving static files
	// Use http.StripPrefix to remove the leading "/" from the request path
	router.PathPrefix("/").Handler(http.StripPrefix("/", fs))

	// --- Start Server ---
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port if not set
		log.Printf("PORT environment variable not set, defaulting to %s", port)
	}

	log.Printf("✅ Server running on http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router)) // Use the main mux router

}