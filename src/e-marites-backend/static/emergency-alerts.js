document.addEventListener("DOMContentLoaded", () => {
  fetchCommunityEvents();
  setupReportButton();
  setupRealTimeChecking();

  const enhancedStyles = document.createElement("style");
  enhancedStyles.textContent = `
    .event-card {
      border-left: 4px solid transparent;
      transition: all 0.2s ease;
    }
    
    .event-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .event-card.new-event {
      border-left-color: var(--bs-primary);
      background-color: rgba(13, 110, 253, 0.05);
      animation: pulseHighlight 2s ease-out;
    }
    
    .badge-severity-critical {
      background-color: #dc3545;
      color: white;
    }
    
    .badge-severity-high {
      background-color: #fd7e14;
      color: white;
    }
    
    .badge-type-fire {
      background-color: #dc3545;
      color: white;
    }
    
    .badge-type-medical {
      background-color: #198754;
      color: white;
    }
    
    @keyframes pulseHighlight {
      0% { background-color: rgba(13, 110, 253, 0.15); }
      100% { background-color: rgba(13, 110, 253, 0.05); }
    }
    
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
    
    .loading-pulse {
      animation: pulse 1.5s infinite ease-in-out;
    }
  `;
  document.head.appendChild(enhancedStyles);
  ensureEnhancedStyles();
});

const eventsListContainer = document.getElementById("communityEventsList");
const reportButton = document.getElementById("reportButton");
const reportStatusDiv = document.getElementById("reportStatus");
const agencySelection = document.getElementById("agencySelection");
const agencyErrorDiv = document.getElementById("agencyError");
let selectedEventIds = [];
let selectedAgency = null;
let lastCheckTimestamp = new Date().toISOString();
let isSubmitting = false;
const seenEventIds = new Set();

function setupRealTimeChecking() {
  const checkInterval = 5000;
  setInterval(checkForNewEvents, checkInterval);

  const statusBar = document.createElement("div");
  statusBar.className =
    "alert alert-info d-flex align-items-center justify-content-between mb-3 py-2 px-3 rounded-3";
  statusBar.id = "realtimeStatusBar";
  statusBar.innerHTML = `
    <div class="d-flex align-items-center">
      <div class="spinner-grow spinner-grow-sm text-primary me-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <span>Monitoring for new verified events</span>
    </div>
    <small class="text-muted">Last checked: Just now</small>
  `;

  eventsListContainer.parentNode.insertBefore(statusBar, eventsListContainer);

  checkForNewEvents();
}

async function checkForNewEvents() {
  try {
    const statusBar = document.getElementById("realtimeStatusBar");
    const lastCheckedEl = statusBar?.querySelector("small");
    const statusTextEl = statusBar?.querySelector("span");

    if (statusTextEl) {
      statusTextEl.textContent = "Checking for new events...";
    }

    const response = await fetch(
      `/api/community-events/since?timestamp=${encodeURIComponent(
        lastCheckTimestamp
      )}&status=verified`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newEvents = await response.json();
    lastCheckTimestamp = new Date().toISOString();

    if (newEvents && newEvents.length > 0) {
      const trulyNewEvents = newEvents.filter(
        (event) => !seenEventIds.has(event.event_id)
      );

      if (trulyNewEvents.length > 0) {
        addNewEventsToUI(trulyNewEvents);
        showNewEventsNotification(trulyNewEvents.length);
      }
    }

    if (lastCheckedEl) {
      lastCheckedEl.textContent = `Last checked: ${new Date().toLocaleTimeString()}`;
    }

    if (statusTextEl) {
      statusTextEl.textContent = "Monitoring for new events";
    }
  } catch (error) {
    console.error("Error checking for new events:", error);
    const statusBar = document.getElementById("realtimeStatusBar");

    if (statusBar) {
      statusBar.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="bi bi-exclamation-triangle text-warning me-2"></i>
          <span>Error checking for new events</span>
        </div>
        <small class="text-muted">Last checked: ${new Date().toLocaleTimeString()}</small>
      `;
    }
  }
}

function addNewEventsToUI(newEvents) {
  const newEventIds = newEvents.map((event) => event.event_id);
  fetchCommunityEvents(new Set(newEventIds));
}

function showNewEventsNotification(count) {
  const notification = document.createElement("div");
  notification.className =
    "alert alert-primary d-flex align-items-center justify-content-between fade show";
  notification.role = "alert";
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border: none;
    animation: slideIn 0.3s ease-out;
  `;

  notification.innerHTML = `
    <div class="d-flex align-items-center gap-3">
      <div class="bg-white rounded-circle p-2">
        <i class="bi bi-bell-fill text-primary fs-4"></i>
      </div>
      <div>
        <h6 class="mb-1">New Alert${count > 1 ? "s" : ""} Received</h6>
        <p class="mb-0 small">${count} new verified event${
    count > 1 ? "s" : ""
  } added to your list</p>
      </div>
    </div>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  document.body.appendChild(notification);

  if (!document.getElementById("notification-animations")) {
    const style = document.createElement("style");
    style.id = "notification-animations";
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    notification.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

async function fetchCommunityEvents(newlyAddedEventIds = new Set()) {
  reportStatusDiv.style.display = "none";
  if (newlyAddedEventIds.size === 0) {
    eventsListContainer.innerHTML =
      '<div class="text-center p-3 loading-pulse">Loading community events...</div>';
  }

  try {
    const response = await fetch("/api/community-events?status=verified");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const events = await response.json();

    seenEventIds.clear();
    events.forEach((event) => {
      seenEventIds.add(event.event_id);
    });

    renderCommunityEvents(events, newlyAddedEventIds);
  } catch (error) {
    console.error("Error fetching community events:", error);
    eventsListContainer.innerHTML =
      '<div class="alert alert-danger">Failed to load community events. Please try again later.</div>';
    reportStatusDiv.textContent = "Error loading events.";
    reportStatusDiv.className = "alert alert-danger";
    reportStatusDiv.style.display = "block";
  }
}

function renderCommunityEvents(events, newlyAddedEventIds = new Set()) {
  const previouslySelectedIds = new Set(
    Array.from(
      eventsListContainer.querySelectorAll('input[type="checkbox"]:checked')
    ).map((cb) => parseInt(cb.value, 10))
  );

  eventsListContainer.innerHTML = "";

  if (!events || events.length === 0) {
    eventsListContainer.innerHTML =
      '<div class="text-center p-3 text-muted">No verified community events currently require reporting.</div>';
    return;
  }

  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  events.forEach((event) => {
    const isNew = newlyAddedEventIds.has(event.event_id);
    const eventElement = document.createElement("div");
    eventElement.className =
      "list-group-item list-group-item-action d-flex align-items-start p-3 rounded-3 mb-2 shadow-sm event-card";

    if (isNew) {
      eventElement.classList.add("new-event");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input flex-shrink-0 me-3 mt-1";
    checkbox.value = event.event_id;
    checkbox.id = `event-${event.event_id}`;
    checkbox.setAttribute("data-event-id", event.event_id);
    if (previouslySelectedIds.has(event.event_id)) {
      checkbox.checked = true;
    }

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "flex-grow-1";

    const titleLabel = document.createElement("label");
    titleLabel.className = "form-check-label w-100 cursor-pointer";
    titleLabel.htmlFor = `event-${event.event_id}`;

    const severityBadgeClass = getSeverityBadgeClass(event.severity);
    const formattedTime = formatEventTime(event.created_at);
    titleLabel.innerHTML = `
      <div class="d-flex w-100 justify-content-between align-items-start">
        <div>
          <h6 class="mb-1 fw-semibold">${
            event.title || `Incident ${event.event_id}`
          }</h6>
          <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
            <span class="badge ${getEventTypeBadgeClass(event.event_type)}">${
      event.event_type || "N/A"
    }</span>
            <span class="badge ${severityBadgeClass}">${
      event.severity || "N/A"
    }</span>
            <span class="text-muted small"><i class="bi bi-geo-alt-fill"></i> ${
              event.location_description || "N/A"
            }</span>
          </div>
        </div>
        <small class="text-muted text-nowrap">${formattedTime}</small>
      </div>
      <p class="mb-2 text-muted">${
        event.description || "No description provided"
      }</p>
      <div class="d-flex justify-content-between align-items-center">
        <small class="text-muted">Status: <span class="badge ${getStatusBadgeClass(
          event.status
        )}">${event.status || "N/A"}</span></small>
        ${isNew ? '<span class="badge bg-primary pulse-new">New</span>' : ""}
      </div>
    `;
    detailsDiv.appendChild(titleLabel);
    eventElement.appendChild(checkbox);
    eventElement.appendChild(detailsDiv);
    eventsListContainer.appendChild(eventElement);

    if (isNew) {
      setTimeout(() => {
        eventElement.classList.remove("new-event");
      }, 5000);
    }
  });

  ensureEnhancedStyles();
}

function ensureEnhancedStyles() {
  if (!document.getElementById("enhanced-styles")) {
    const style = document.createElement("style");
    style.id = "enhanced-styles";
    style.textContent = `
      .list-group-item.event-card {
        transition: all 0.2s ease;
        border-left: 4px solid transparent;
      }
      .list-group-item.event-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .cursor-pointer {
        cursor: pointer;
      }
      .event-card.new-event {
        border-left-color: var(--bs-primary);
        background-color: rgba(13, 110, 253, 0.05);
        animation: pulseHighlight 1.5s ease-out;
      }
      @keyframes pulseHighlight {
        0% { background-color: rgba(13, 110, 253, 0.15); }
        100% { background-color: rgba(13, 110, 253, 0.05); }
      }
      .pulse-new {
        animation: pulseBadge 1.5s infinite ease-in-out;
      }
      @keyframes pulseBadge {
         0% { opacity: 1; }
         50% { opacity: 0.6; }
         100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

function getEventTypeBadgeClass(eventType) {
  const typeMap = {
    fire: "bg-danger",
    medical: "bg-success",
    police: "bg-primary",
    hazard: "bg-warning text-dark",
    flooding: "bg-info text-dark",
    landslide: "bg-dark text-white",
    accident: "bg-secondary text-white",
  };
  return typeMap[eventType?.toLowerCase()] || "bg-secondary";
}

function getSeverityBadgeClass(severity) {
  const severityMap = {
    critical: "bg-danger",
    high: "bg-danger-subtle text-danger-emphasis",
    medium: "bg-warning-subtle text-warning-emphasis",
    low: "bg-info-subtle text-info-emphasis",
  };
  return severityMap[severity?.toLowerCase()] || "bg-secondary";
}

function getStatusBadgeClass(status) {
  const statusMap = {
    reported: "bg-primary",
    verified: "bg-info",
    in_progress: "bg-warning",
    resolved: "bg-success",
    false_alarm: "bg-secondary",
  };
  return statusMap[status?.toLowerCase()] || "bg-secondary";
}

function formatEventTime(timestamp) {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffHours = Math.floor((now - eventTime) / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMins = Math.floor((now - eventTime) / (1000 * 60));
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return eventTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

function setupReportButton() {
  if (!reportButton) return;
  reportButton.removeEventListener("click", handleReportButtonClick);
  reportButton.addEventListener("click", handleReportButtonClick);
}

async function handleReportButtonClick() {
  selectedEventIds = Array.from(
    document.querySelectorAll(
      '#communityEventsList input[type="checkbox"]:checked'
    )
  ).map((checkbox) => parseInt(checkbox.value));

  const selectedAgencyRadio = document.querySelector(
    'input[name="agency"]:checked'
  );
  if (!selectedAgencyRadio) {
    agencyErrorDiv.textContent = "Please select an agency";
    agencyErrorDiv.style.display = "block";
    return;
  }
  selectedAgency = selectedAgencyRadio.value;

  if (isSubmitting) {
    console.log("Submission already in progress, ignoring click");
    return;
  }

  isSubmitting = true;
  reportButton.disabled = true;
  reportButton.innerHTML = `
    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    <span>Processing...</span>
  `;

  const progressBar = document.createElement("div");
  progressBar.className = "progress mt-2";
  progressBar.style.height = "4px";
  progressBar.innerHTML = `
    <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
  `;
  reportButton.parentNode.insertBefore(progressBar, reportButton.nextSibling);

  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 10;
    const bar = progressBar.querySelector(".progress-bar");
    if (bar) bar.style.width = `${Math.min(progress, 90)}%`;
  }, 200);

  try {
    await createEmergencyAlerts(selectedEventIds, selectedAgency);

    const bar = progressBar.querySelector(".progress-bar");
    if (bar) {
      bar.style.width = "100%";
      bar.classList.remove("progress-bar-animated", "progress-bar-striped");
      bar.classList.add("bg-success");
    }

    reportStatusDiv.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-check-circle-fill text-success fs-4"></i>
        <div>
          <h5 class="mb-1">Report Successful</h5>
          <p class="mb-0">Created alerts for ${selectedEventIds.length} event(s) assigned to ${selectedAgency}.</p>
        </div>
      </div>
    `;
    reportStatusDiv.className = "alert alert-success d-flex align-items-center";
    clearSelections();
    setTimeout(() => fetchCommunityEvents(), 1500);
  } catch (error) {
    reportStatusDiv.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-exclamation-triangle-fill text-danger fs-4"></i>
        <div>
          <h5 class="mb-1">Report Failed</h5>
          <p class="mb-0">${error.message || "Unknown error occurred"}</p>
        </div>
      </div>
    `;
    reportStatusDiv.className = "alert alert-danger d-flex align-items-center";

    if (progressBar) {
      progressBar.querySelector(".progress-bar").classList.add("bg-danger");
    }
  } finally {
    clearInterval(progressInterval);
    reportButton.disabled = false;
    reportButton.innerHTML = `
      <i class="bi bi-send-fill"></i>
      <span>Report Selected Events</span>
    `;

    setTimeout(() => {
      if (progressBar && progressBar.parentNode) {
        progressBar.parentNode.removeChild(progressBar);
      }
      isSubmitting = false;
    }, 3000);
  }
}

async function createEmergencyAlerts(eventIds, agency) {
  const response = await fetch("/api/emergency-alerts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_ids: eventIds.map((id) => parseInt(id, 10)),
      assigned_team: agency,
    }),
  });

  if (!response.ok) {
    let errorMsg = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorData.error || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

function clearSelections() {
  document
    .querySelectorAll('#communityEventsList input[type="checkbox"]:checked')
    .forEach((checkbox) => {
      checkbox.checked = false;
    });

  const selectedAgencyRadio = document.querySelector(
    'input[name="agency"]:checked'
  );
  if (selectedAgencyRadio) {
    selectedAgencyRadio.checked = false;
  }

  selectedEventIds = [];
  selectedAgency = null;

  agencyErrorDiv.style.display = "none";
}
