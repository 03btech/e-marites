// Global variables
let map;
let markers = [];
let selectedEventId = null;
let icons = {};

document.addEventListener("DOMContentLoaded", function () {
  initMap();
  loadEvents();
  setupEventListeners();
});

function initMap() {
  if (map) {
    map.remove();
  }

  map = L.map("map-container", {
    center: [10.716699000872625, 123.51552988317307],
    zoom: 15.5,
  });

  icons = {
    Default: L.icon({
      iconUrl: "./js/leaflet/images/marker-icon.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Flooding_High: L.icon({
      iconUrl: "./js/leaflet/images/flood-severity/flood-high.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Flooding_Medium: L.icon({
      iconUrl: "./js/leaflet/images/flood-severity/flood-medium.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Flooding_Low: L.icon({
      iconUrl: "./js/leaflet/images/flood-severity/flood-low.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Landslide_High: L.icon({
      iconUrl: "./js/leaflet/images/landslide-severity/landslide-high.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Landslide_Medium: L.icon({
      iconUrl: "./js/leaflet/images/landslide-severity/landslide-medium.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Landslide_Low: L.icon({
      iconUrl: "./js/leaflet/images/landslide-severity/landslide-low.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Vehicular_Accident_High: L.icon({
      iconUrl:
        "./js/leaflet/images/vehicular-accident-severity/vehicular-accident-high.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Vehicular_Accident_Medium: L.icon({
      iconUrl:
        "./js/leaflet/images/vehicular-accident-severity/vehicular-accident-medium.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Vehicular_Accident_Low: L.icon({
      iconUrl:
        "./js/leaflet/images/vehicular-accident-severity/vehicular-accident-low.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Fire_High: L.icon({
      iconUrl: "./js/leaflet/images/fire-severity/fire-high.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Fire_Medium: L.icon({
      iconUrl: "./js/leaflet/images/fire-severity/fire-medium.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Fire_Low: L.icon({
      iconUrl: "./js/leaflet/images/fire-severity/fire-low.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Power_Outage_High: L.icon({
      iconUrl:
        "./js/leaflet/images/power-outage-severity/power-outage-high.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Power_Outage_Medium: L.icon({
      iconUrl:
        "./js/leaflet/images/power-outage-severity/power-outage-medium.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Power_Outage_Low: L.icon({
      iconUrl: "./js/leaflet/images/power-outage-severity/power-outage-low.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Road_Hazard_High: L.icon({
      iconUrl: "./js/leaflet/images/road-hazard-severity/road-hazard-high.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Road_Hazard_Medium: L.icon({
      iconUrl:
        "./js/leaflet/images/road-hazard-severity/road-hazard-medium.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Road_Hazard_Low: L.icon({
      iconUrl: "./js/leaflet/images/road-hazard-severity/road-hazard-low.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
  };

  const osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const osmAttrib =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  L.tileLayer(osmUrl, {
    attribution: osmAttrib,
    maxZoom: 18,
  }).addTo(map);

  L.Control.Fullscreen = L.Control.extend({
    onAdd: function (map) {
      const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
      const button = L.DomUtil.create(
        "a",
        "leaflet-control-fullscreen",
        container
      );
      button.href = "#";
      button.title = "Toggle Fullscreen";
      L.DomEvent.on(button, "click", L.DomEvent.stop).on(
        button,
        "click",
        function () {
          const elem = map.getContainer();
          if (!document.fullscreenElement) {
            elem.requestFullscreen().catch((err) => {
              console.error(`Fullscreen error: ${err.message}`);
            });
          } else {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            }
          }
        },
        this
      );
      return container;
    },
  });

  map.addControl(new L.Control.Fullscreen());

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      map.invalidateSize();
    }
  });
}

function setupEventListeners() {
  document
    .getElementById("apply-filters")
    .addEventListener("click", loadEvents);

  document
    .getElementById("save-resolution")
    .addEventListener("click", function () {
      if (selectedEventId) {
        resolveEvent(
          selectedEventId,
          document.getElementById("resolution-notes").value
        );
      }
    });
}

function loadEvents() {
  const statusFilter = document.getElementById("filter-status").value;
  const severityFilter = document.getElementById("filter-severity").value;
  const typeFilter = document.getElementById("filter-type").value;
  const dateFromFilter = document.getElementById("filter-date-from").value;
  const dateToFilter = document.getElementById("filter-date-to").value;

  const eventsList = document.getElementById("events-list");
  eventsList.innerHTML =
    '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  const params = new URLSearchParams();
  if (statusFilter) params.append("status", statusFilter);
  if (severityFilter) params.append("severity", severityFilter);
  if (typeFilter) params.append("type", typeFilter);
  if (dateFromFilter) params.append("from_date", dateFromFilter);
  if (dateToFilter) params.append("to_date", dateToFilter);

  fetch(`/api/community-events?${params.toString()}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((events) => {
      displayEvents(events);
      plotEventsOnMap(events);
    })
    .catch((error) => {
      console.error("Error loading events:", error);
      eventsList.innerHTML =
        '<div class="alert alert-danger">Failed to load events. Please try again.</div>';
    });
}
document.getElementById("reset-filters").addEventListener("click", function () {
  document.getElementById("filter-status").value = "";
  document.getElementById("filter-severity").value = "";
  document.getElementById("filter-type").value = "";
  document.getElementById("filter-date-from").value = "";
  document.getElementById("filter-date-to").value = "";
  loadEvents();
});

function displayEvents(events) {
  const eventsList = document.getElementById("events-list");
  eventsList.innerHTML = "";

  if (events.length === 0) {
    eventsList.innerHTML =
      '<div class="alert alert-info">No events found matching your criteria.</div>';
    return;
  }

  events.forEach((event) => {
    const eventCard = document.createElement("div");
    eventCard.className = `card event-card ${event.severity}`;
    eventCard.innerHTML = `
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <h5 class="card-title">${event.event_type}</h5>
                            <span class="badge bg-${getSeverityColor(
                              event.severity
                            )} severity-badge">
                                ${event.severity}
                            </span>
                        </div>
                        <p class="card-text text-muted">
                            <small>
                                <i class="bi bi-geo-alt"></i> ${
                                  event.location_description
                                }
                            </small>
                        </p>
                        <p class="card-text">${truncateDescription(
                          event.description
                        )}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-${getStatusColor(
                              event.status
                            )} status-badge">
                                ${formatStatus(event.status)}
                            </span>
                            <small class="text-muted">${formatDate(
                              event.created_at
                            )}</small>
                        </div>
                        <div class="action-buttons mt-2">
                            <button class="btn btn-sm btn-outline-primary view-details" data-id="${
                              event.event_id
                            }">
                                <i class="bi bi-eye"></i> View
                            </button>
                            <button class="btn btn-sm btn-outline-secondary edit-event" data-id="${
                              event.event_id
                            }">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-event" data-id="${
                              event.event_id
                            }">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                            ${
                              event.status !== "resolved"
                                ? `
                            <button class="btn btn-sm btn-success resolve-event" data-id="${event.event_id}">
                                <i class="bi bi-check-circle"></i> Resolve
                            </button>
                            `
                                : ""
                            }
                        </div>
                    </div>
                `;
    eventsList.appendChild(eventCard);
  });

  document.querySelectorAll(".view-details").forEach((button) => {
    button.addEventListener("click", function () {
      const eventId = this.getAttribute("data-id");
      document.getElementById("resolution-section").classList.add("d-none");
      document.getElementById("map-container").focus();
      showEventDetails(eventId);
    });
  });

  document.querySelectorAll(".edit-event").forEach((button) => {
    button.addEventListener("click", function () {
      const eventId = this.getAttribute("data-id");
      editEvent(eventId);
    });
  });

  document.querySelectorAll(".delete-event").forEach((button) => {
    button.addEventListener("click", function () {
      const eventId = this.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this event?")) {
        deleteEvent(eventId);
      }
    });
  });

  document.querySelectorAll(".resolve-event").forEach((button) => {
    button.addEventListener("click", function () {
      const eventId = this.getAttribute("data-id");
      showResolutionForm(eventId);
    });
  });
}

function plotEventsOnMap(events) {
  if (!map) {
    console.error("Map not initialized before plotting events.");
    return;
  }
  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];

  events.forEach((event) => {
    if (event.latitude && event.longitude) {
      const iconKey = `${event.event_type}_${event.severity}`;
      const selectedIcon = icons[iconKey] || icons.Default;

      const marker = L.marker([event.latitude, event.longitude], {
        icon: selectedIcon,
        eventId: event.event_id,
      })
        .addTo(map)
        .bindPopup(
          `<b>${event.event_type} (${event.severity})</b><br>${event.location_description}`
        )
        .on("click", () => showEventDetails(event.event_id));

      markers.push(marker);
    }
  });

  if (markers.length > 0) {
    const group = new L.featureGroup(markers);
    try {
      map.fitBounds(group.getBounds().pad(0.1));
    } catch (e) {
      console.warn("Could not fit map bounds:", e);
    }
  }
}

function showEventDetails(eventId) {
  fetch(`/api/community-events/${eventId}`)
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errData) => {
          throw new Error(
            errData.error || `HTTP error! status: ${response.status}`
          );
        });
      }
      return response.json();
    })
    .then((event) => {
      selectedEventId = event.event_id;

      document.getElementById("detail-type").textContent =
        event.event_type || "N/A";
      document.getElementById("detail-severity").textContent =
        event.severity || "N/A";
      document.getElementById("detail-status").textContent = formatStatus(
        event.status || "N/A"
      );
      document.getElementById("detail-location").textContent =
        event.location_description || "N/A";
      document.getElementById("detail-description").textContent =
        event.description || "N/A";
      document.getElementById("detail-created").textContent = event.created_at
        ? formatDate(event.created_at)
        : "N/A";

      const resolutionNotesText = event.resolution_notes || "Not resolved yet.";
      document.getElementById("resolution-notes").value =
        event.resolution_notes || "";

      document.getElementById("event-details").classList.remove("d-none");
      if (event.status !== "resolved") {
        document
          .getElementById("resolution-section")
          .classList.remove("d-none");
      } else {
        document.getElementById("resolution-section").classList.add("d-none");
      }

      let foundMarker = false;
      markers.forEach((marker) => {
        if (marker.options.eventId === eventId && marker.getLatLng()) {
          map.setView(marker.getLatLng(), 16);
          marker.openPopup();
          foundMarker = true;
        }
      });
      if (!foundMarker && event.latitude && event.longitude) {
        map.setView([event.latitude, event.longitude], 16);
      }
    })
    .catch((error) => {
      console.error("Error fetching event details:", error);
      alert(`Failed to load event details: ${error.message}`);
      document.getElementById("event-details").classList.add("d-none");
    });
}

function showResolutionForm(eventId) {
  showEventDetails(eventId);
  document.getElementById("resolution-section").classList.remove("d-none");
  document.getElementById("resolution-notes").value = "";
  document.getElementById("resolution-notes").focus();

  document
    .getElementById("event-details")
    .scrollIntoView({ behavior: "smooth" });
}

let editModalMap;
let editModalMarker;
let editModal = new bootstrap.Modal(document.getElementById("editEventModal"));

function editEvent(eventId) {
  fetch(`/api/community-events/${eventId}`)
    .then((response) => response.json())
    .then((event) => {
      document.getElementById("edit-event-id").value = event.event_id;
      document.getElementById("edit-event-type").value = event.event_type;
      document.getElementById("edit-event-severity").value = event.severity;
      document.getElementById("edit-event-status").value = event.status;
      document.getElementById("edit-event-location").value =
        event.location_description;
      document.getElementById("edit-event-description").value =
        event.description;

      if (event.latitude && event.longitude) {
        document.getElementById("edit-event-latitude").value = event.latitude;
        document.getElementById("edit-event-longitude").value = event.longitude;
      } else {
        document.getElementById("edit-event-latitude").value = "";
        document.getElementById("edit-event-longitude").value = "";
      }

      initEditModalMap(
        event.latitude || 10.716699,
        event.longitude || 123.51553
      );

      editModal.show();
    })
    .catch((error) => {
      console.error("Error fetching event for edit:", error);
      alert("Failed to load event for editing. Please try again.");
    });
}

function initEditModalMap(lat, lng) {
  const mapContainer = document.getElementById("edit-event-map-container");
  const instructions = document.getElementById("map-instructions");

  if (!editModalMap) {
    mapContainer.style.display = "block";
    instructions.style.display = "inline";

    editModalMap = L.map("edit-event-map-container", {
      tap: false,
    }).setView([lat, lng], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(editModalMap);

    if (lat && lng) {
      editModalMarker = L.marker([lat, lng], {
        draggable: true,
        autoPan: true,
      }).addTo(editModalMap);

      editModalMarker.on("dragend", function () {
        const newPos = editModalMarker.getLatLng();
        document.getElementById("edit-event-latitude").value =
          newPos.lat.toFixed(6);
        document.getElementById("edit-event-longitude").value =
          newPos.lng.toFixed(6);
      });
    }
  } else {
    editModalMap.setView([lat, lng], 15);
    if (editModalMarker) {
      editModalMarker.setLatLng([lat, lng]);
    }
  }

  setTimeout(() => {
    editModalMap.invalidateSize();
  }, 300);
}

document
  .getElementById("edit-event-update-location")
  .addEventListener("click", function () {
    const latInput = document.getElementById("edit-event-latitude");
    const lngInput = document.getElementById("edit-event-longitude");
    const instructions = document.getElementById("map-instructions");

    let lat = parseFloat(latInput.value) || 10.716699;
    let lng = parseFloat(lngInput.value) || 123.51553;

    initEditModalMap(lat, lng);

    if (!editModalMarker) {
      editModalMarker = L.marker([lat, lng], {
        draggable: true,
        autoPan: true,
      }).addTo(editModalMap);

      editModalMarker.on("dragend", function () {
        const newPos = editModalMarker.getLatLng();
        latInput.value = newPos.lat.toFixed(6);
        lngInput.value = newPos.lng.toFixed(6);
      });
    } else {
      editModalMarker.setLatLng([lat, lng]);
    }

    document.getElementById("edit-event-map-container").style.display = "block";
    instructions.style.display = "inline";

    setTimeout(() => {
      editModalMap.invalidateSize();
    }, 300);
  });

document
  .getElementById("editEventModal")
  .addEventListener("shown.bs.modal", function () {
    if (editModalMap) {
      setTimeout(() => {
        editModalMap.invalidateSize();
        if (editModalMarker) {
          editModalMap.setView(editModalMarker.getLatLng(), 15);
        }
      }, 300);
    }
  });

document
  .getElementById("edit-event-update-location")
  .addEventListener("click", function () {
    const lat =
      parseFloat(document.getElementById("edit-event-latitude").value) ||
      10.716699;
    const lng =
      parseFloat(document.getElementById("edit-event-longitude").value) ||
      123.51553;

    initEditModalMap(lat, lng);

    if (!editModalMarker) {
      editModalMarker = L.marker([lat, lng], { draggable: true }).addTo(
        editModalMap
      );
      editModalMarker.on("dragend", function () {
        const newPos = editModalMarker.getLatLng();
        document.getElementById("edit-event-latitude").value = newPos.lat;
        document.getElementById("edit-event-longitude").value = newPos.lng;
      });
    } else {
      editModalMarker.setLatLng([lat, lng]);
    }

    document.getElementById("edit-event-map-container").style.display = "block";
  });

document
  .getElementById("save-event-changes")
  .addEventListener("click", function () {
    const eventId = document.getElementById("edit-event-id").value;
    const eventData = {
      event_type: document.getElementById("edit-event-type").value,
      severity: document.getElementById("edit-event-severity").value,
      status: document.getElementById("edit-event-status").value,
      description: document.getElementById("edit-event-description").value,
      location_description: document.getElementById("edit-event-location")
        .value,
      coordinates:
        document.getElementById("edit-event-latitude").value &&
        document.getElementById("edit-event-longitude").value
          ? `${document.getElementById("edit-event-latitude").value},${
              document.getElementById("edit-event-longitude").value
            }`
          : "",
    };

    if (
      !eventData.event_type ||
      !eventData.description ||
      !eventData.location_description
    ) {
      alert("Please fill all required fields");
      return;
    }

    fetch(`/api/community-events/${eventId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    })
      .then((response) => {
        if (response.ok) {
          editModal.hide();
          loadEvents();
          alert("Event updated successfully");
        } else {
          throw new Error("Failed to update event");
        }
      })
      .catch((error) => {
        console.error("Error updating event:", error);
        alert("Failed to update event. Please try again.");
      });
  });

function deleteEvent(eventId) {
  fetch(`/api/community-events/${eventId}`, {
    method: "DELETE",
  })
    .then((response) => {
      if (response.ok) {
        loadEvents();
        document.getElementById("event-details").classList.add("d-none");
        alert("Event deleted successfully");
      } else {
        throw new Error("Failed to delete event");
      }
    })
    .catch((error) => {
      console.error("Error deleting event:", error);
      alert("Failed to delete event. Please try again.");
    });
}

function resolveEvent(eventId, notes) {
  fetch(`/api/community-events/${eventId}/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resolution_notes: notes }),
  })
    .then((response) => {
      if (response.ok) {
        loadEvents();
        document.getElementById("resolution-section").classList.add("d-none");
        alert("Event resolved successfully");
      } else {
        throw new Error("Failed to resolve event");
      }
    })
    .catch((error) => {
      console.error("Error resolving event:", error);
      alert("Failed to resolve event. Please try again.");
    });
}

function getSeverityColor(severity) {
  switch (severity) {
    case "High":
      return "danger";
    case "Medium":
      return "warning";
    case "Low":
      return "success";
    default:
      return "secondary";
  }
}

function getStatusColor(status) {
  switch (status) {
    case "reported":
      return "primary";
    case "verified":
      return "info";
    case "in_progress":
      return "warning";
    case "resolved":
      return "success";
    case "false_alarm":
      return "secondary";
    default:
      return "light";
  }
}

function formatStatus(status) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function truncateDescription(text, length = 100) {
  return text.length > length ? text.substring(0, length) + "..." : text;
}
