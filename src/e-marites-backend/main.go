package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/03btech/e-marites-backend/db"
	"github.com/03btech/e-marites-backend/handlers"
	"github.com/03btech/e-marites-backend/services"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		if err = godotenv.Load(filepath.Join("..", ".env")); err != nil {
			log.Println("Warning: .env file not found")
		}
	}

	db.InitDB()
	if db.DB != nil {
		defer db.DB.Close()
		services.InitializeSMSService(db.DB)

	} else {
		log.Println("Warning: Database connection not established")
	}

	router := mux.NewRouter()

	apiRouter := router.PathPrefix("/api").Subrouter()
	apiRouter.HandleFunc("/events", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.SubmitEventReport(w, r, db.DB)
	}).Methods("POST")

	apiRouter.HandleFunc("/community-events", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.GetCommunityEvents(w, r, db.DB)
	}).Methods("GET")

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

	apiRouter.HandleFunc("/emergency-alerts", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.CreateEmergencyAlerts(w, r, db.DB)
	}).Methods("POST")

	apiRouter.HandleFunc("/community-events/since", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.GetCommunityEventsSince(w, r, db.DB)
	}).Methods("GET")

	apiRouter.HandleFunc("/community-events/{id}", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		vars := mux.Vars(r)
		eventID := vars["id"]
		handlers.GetSingleCommunityEvent(w, r, db.DB, eventID)
	}).Methods("GET")

	apiRouter.HandleFunc("/community-events/{id}", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		vars := mux.Vars(r)
		eventID := vars["id"]
		handlers.UpdateCommunityEvent(w, r, db.DB, eventID)
	}).Methods("PUT")

	apiRouter.HandleFunc("/community-events/{id}", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		vars := mux.Vars(r)
		eventID := vars["id"]
		handlers.DeleteCommunityEvent(w, r, db.DB, eventID)
	}).Methods("DELETE")

	apiRouter.HandleFunc("/community-events/{id}/resolve", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		vars := mux.Vars(r)
		eventID := vars["id"]
		handlers.ResolveCommunityEvent(w, r, db.DB, eventID)
	}).Methods("POST")

	apiRouter.HandleFunc("/response-metrics", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.GetResponseMetrics(w, r, db.DB)
	}).Methods("GET")

	apiRouter.HandleFunc("/community-events/{id}/verify", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		vars := mux.Vars(r)
		eventID := vars["id"]
		handlers.VerifyCommunityEvent(w, r, db.DB, eventID)
	}).Methods("POST")

	apiRouter.HandleFunc("/accident-trend-data", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.GetAccidentTrendData(w, r, db.DB)
	}).Methods("GET")

	apiRouter.HandleFunc("/agencies", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.GetAgenciesHandler(w, r)
	}).Methods("GET")

	// Add Agency CRUD routes
	apiRouter.HandleFunc("/agencies", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.CreateAgencyHandler(w, r)
	}).Methods("POST")

	apiRouter.HandleFunc("/agencies/{id:[0-9]+}", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.UpdateAgencyHandler(w, r)
	}).Methods("PUT")

	apiRouter.HandleFunc("/agencies/{id:[0-9]+}", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.DeleteAgencyHandler(w, r)
	}).Methods("DELETE")

	// Add Community Member CRUD routes
	apiRouter.HandleFunc("/community-members", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.GetCommunityMembersHandler(w, r)
	}).Methods("GET")

	apiRouter.HandleFunc("/community-members", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.CreateCommunityMemberHandler(w, r)
	}).Methods("POST")

	apiRouter.HandleFunc("/community-members/{id:[0-9]+}", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.UpdateCommunityMemberHandler(w, r)
	}).Methods("PUT")

	apiRouter.HandleFunc("/community-members/{id:[0-9]+}", func(w http.ResponseWriter, r *http.Request) {
		if db.DB == nil {
			http.Error(w, "Database connection not available", http.StatusInternalServerError)
			return
		}
		handlers.DeleteCommunityMemberHandler(w, r)
	}).Methods("DELETE")

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

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
