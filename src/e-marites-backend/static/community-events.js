// community-events.js
document.addEventListener("DOMContentLoaded", function () {
  loadReportedCommunityEvents();
  setInterval(loadReportedCommunityEvents, 5000);
});

function loadReportedCommunityEvents() {
  fetch("/api/community-events?status=reported")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((events) => {
      displayCommunityEvents(events);
    })
    .catch((error) => {
      console.error("Error loading community events:", error);
      const cardBody = document.querySelector(
        ".card.rectangular-card.mobile-card .card-body"
      );
      cardBody.innerHTML =
        '<div class="alert alert-danger">Failed to load events</div>';
    });
}

function displayCommunityEvents(events) {
  const cardBody = document.querySelector(
    ".card.rectangular-card.mobile-card .card-body"
  );
  cardBody.innerHTML = "";

  if (events.length === 0) {
    cardBody.innerHTML =
      '<div class="text-center py-3">No community-reported events</div>';
    return;
  }

  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const displayEvents = events.slice(0, 5);

  displayEvents.forEach((event) => {
    const iconKey = `${event.event_type}_${event.severity}`;
    let iconClass = "bi bi-info-circle text-primary";

    if (event.event_type === "Flooding") {
      iconClass = `bi bi-water text-${getSeverityColor(event.severity)}`;
    } else if (event.event_type === "Landslide") {
      iconClass = `bi bi-mountains text-${getSeverityColor(event.severity)}`;
    } else if (event.event_type === "Accident") {
      iconClass = `bi bi-car-front text-${getSeverityColor(event.severity)}`;
    } else if (event.event_type === "Fire") {
      iconClass = `bi bi-fire text-${getSeverityColor(event.severity)}`;
    } else if (event.event_type === "Power_Outage") {
      iconClass = `bi bi-lightning-charge text-${getSeverityColor(
        event.severity
      )}`;
    } else if (event.event_type === "Road_Hazard") {
      iconClass = `bi bi-exclamation-triangle text-${getSeverityColor(
        event.severity
      )}`;
    }

    const eventTime = new Date(event.created_at);
    const currentTime = new Date();
    const timeDifferenceInSeconds = Math.floor(
      (currentTime - eventTime) / 1000
    );
    const isNewEvent = timeDifferenceInSeconds < 60;

    const communityItem = document.createElement("div");
    communityItem.className = "community-item";
    communityItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>
                    <i class="${iconClass} me-2"></i>${event.description}
                </span>
                ${isNewEvent ? '<span class="badge bg-danger">New</span>' : ""}
            </div>
            <div class="d-flex justify-content-between align-items-center mt-1">
                <div class="community-time">${getTimeAgo(eventTime)}</div>
                <button class="btn btn-sm btn-outline-success verify-event" data-id="${
                  event.event_id
                }">
                    <i class="bi bi-check-circle"></i> Verify
                </button>
            </div>
        `;

    cardBody.appendChild(communityItem);
  });

  document.querySelectorAll(".verify-event").forEach((button) => {
    button.addEventListener("click", function () {
      const eventId = this.getAttribute("data-id");
      verifyEvent(eventId, this);
    });
  });
}

function verifyEvent(eventId, buttonElement) {
  buttonElement.disabled = true;
  buttonElement.innerHTML =
    '<i class="bi bi-hourglass-split"></i> Verifying...';

  fetch(`/api/community-events/${eventId}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to verify event");
      }
      return response.json();
    })
    .then(() => {
      const parentItem = buttonElement.closest(".community-item");
      const badge = parentItem.querySelector(".badge");

      buttonElement.innerHTML =
        '<i class="bi bi-check-circle-fill"></i> Verified';

      setTimeout(loadReportedCommunityEvents, 3000);
    })
    .catch((error) => {
      console.error("Error verifying event:", error);
      buttonElement.disabled = false;
      buttonElement.innerHTML = '<i class="bi bi-check-circle"></i> Verify';
      alert("Failed to verify event. Please try again.");
    });
}

function getSeverityColor(severity) {
  switch (severity) {
    case "High":
      return "danger";
    case "Medium":
      return "warning";
    case "Low":
      return "primary";
    default:
      return "secondary";
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + " years ago";
  if (interval === 1) return "1 year ago";

  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + " months ago";
  if (interval === 1) return "1 month ago";

  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + " days ago";
  if (interval === 1) return "1 day ago";

  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + " hours ago";
  if (interval === 1) return "1 hour ago";

  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + " minutes ago";
  if (interval === 1) return "1 minute ago";

  return "just now";
}
