// emergency-alerts.js
document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const alertsContainer = document.querySelector(
    ".card.square-card .card-body"
  );
  const adminReportBtn = document.createElement("button");

  // Severity Icons (using Bootstrap Icons)
  const severityIcons = {
    high: '<i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>',
    medium: '<i class="bi bi-exclamation-circle-fill text-warning me-2"></i>',
    low: '<i class="bi bi-info-circle-fill text-primary me-2"></i>',
  };

  // Sample data (replace with API calls in production)
  let emergencyAlerts = [
    {
      id: 1,
      type: "Vehicle Collision",
      severity: "high",
      timestamp: new Date(Date.now() - 5 * 60000), // 5 mins ago
      location: "Main Road, Barangay Poblacion",
      reporter: "system",
      isNew: true,
    },
    {
      id: 2,
      type: "Landslide",
      severity: "high",
      timestamp: new Date(Date.now() - 15 * 60000), // 15 mins ago
      location: "Mountain Road",
      reporter: "system",
      isNew: false,
    },
    {
      id: 3,
      type: "Flooding",
      severity: "medium",
      timestamp: new Date(Date.now() - 10 * 60000), // 10 mins ago
      location: "Riverside Area",
      reporter: "system",
      isNew: false,
    },
    {
      id: 4,
      type: "Road Closed",
      severity: "low",
      timestamp: new Date(Date.now() - 60 * 60000), // 1 hour ago
      location: "Market Street",
      reporter: "system",
      isNew: false,
    },
  ];

  // Check admin status (replace with actual auth check)
  const isAdmin = true;
  //   checkAdminStatus(); // Implement this function based on your auth system

  // Initialize the alerts display
  function initAlerts() {
    renderAlerts();
    addAdminControls();
  }

  // Render all alerts
  function renderAlerts() {
    alertsContainer.innerHTML = "";

    // Sort by newest first
    const sortedAlerts = [...emergencyAlerts].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    sortedAlerts.forEach((alert) => {
      const alertElement = createAlertElement(alert);
      alertsContainer.appendChild(alertElement);
    });
  }

  // Create individual alert element
  function createAlertElement(alert) {
    const alertDiv = document.createElement("div");
    alertDiv.className = "alert-item";

    const timeAgo = getTimeAgo(alert.timestamp);

    alertDiv.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <span>
          ${severityIcons[alert.severity]}
          ${alert.type}
        </span>
        ${alert.isNew ? '<span class="badge bg-danger">New</span>' : ""}
      </div>
      <div class="alert-time">${timeAgo}</div>
      <div class="alert-location small text-muted">${alert.location}</div>
    `;

    return alertDiv;
  }

  // Add admin controls if user is admin
  function addAdminControls() {
    if (!isAdmin) return;

    const cardHeader = document.querySelector(".card.square-card .card-header");

    adminReportBtn.className = "btn btn-sm btn-danger ms-2";
    adminReportBtn.innerHTML =
      '<i class="bi bi-plus-circle"></i> Report Emergency';
    adminReportBtn.onclick = showReportModal;

    cardHeader.appendChild(adminReportBtn);
  }

  // Show report modal
  function showReportModal() {
    // Create modal HTML
    const modalHTML = `
      <div class="modal fade" id="reportModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Report New Emergency</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="emergencyReportForm">
                <div class="mb-3">
                  <label class="form-label">Emergency Type</label>
                  <select class="form-select" id="emergencyType" required>
                    <option value="">Select type</option>
                    <option value="Vehicle Collision">Vehicle Collision</option>
                    <option value="Landslide">Landslide</option>
                    <option value="Flooding">Flooding</option>
                    <option value="Road Closed">Road Closed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Severity</label>
                  <select class="form-select" id="emergencySeverity" required>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Location</label>
                  <input type="text" class="form-control" id="emergencyLocation" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Details</label>
                  <textarea class="form-control" id="emergencyDetails" rows="3"></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="submitEmergency">Submit Report</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Initialize Bootstrap modal
    const modal = new bootstrap.Modal(document.getElementById("reportModal"));
    modal.show();

    // Handle form submission
    document.getElementById("submitEmergency").addEventListener("click", () => {
      submitEmergencyReport();
      modal.hide();
    });

    // Clean up modal after close
    document
      .getElementById("reportModal")
      .addEventListener("hidden.bs.modal", () => {
        document.getElementById("reportModal").remove();
      });
  }

  // Submit new emergency report
  function submitEmergencyReport() {
    const type = document.getElementById("emergencyType").value;
    const severity = document.getElementById("emergencySeverity").value;
    const location = document.getElementById("emergencyLocation").value;
    const details = document.getElementById("emergencyDetails").value;

    const newAlert = {
      id: Date.now(),
      type,
      severity,
      timestamp: new Date(),
      location,
      details,
      reporter: "admin",
      isNew: true,
    };

    emergencyAlerts.unshift(newAlert);
    renderAlerts();

    // In a real app, you would also send this to your backend
    console.log("New emergency reported:", newAlert);
  }

  // Helper function to calculate time ago
  function getTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - timestamp) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  // Mock admin check - replace with real authentication
  function checkAdminStatus() {
    // In a real app, this would check your auth system
    return localStorage.getItem("userRole") === "admin";
  }

  // Initialize the alerts system
  initAlerts();
});
