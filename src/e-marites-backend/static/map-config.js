document.addEventListener("DOMContentLoaded", function () {
  const map = L.map("map-container", {
    center: [10.716699000872625, 123.51552988317307],
    zoom: 15.5,
    fullscreenControl: true,
  });

  const icons = {
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
    onAdd: function () {
      const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
      const button = L.DomUtil.create(
        "a",
        "leaflet-control-fullscreen",
        container
      );
      button.href = "#";
      button.title = "Fullscreen";
      button.innerHTML = "&nbsp;";
      L.DomEvent.on(button, "click", L.DomEvent.stop).on(
        button,
        "click",
        function () {
          const elem = document.getElementById("map-container");
          if (!document.fullscreenElement) {
            elem.requestFullscreen().catch((err) => {
              console.error(`Fullscreen error: ${err.message}`);
            });
          } else {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            }
          }
        }
      );
      return container;
    },
  });

  map.addControl(new L.Control.Fullscreen());

  let currentMarkers = {};

  function addSingleMarker(event) {
    const defaultIcon = new L.Icon.Default();

    if (
      typeof event.latitude !== "number" ||
      typeof event.longitude !== "number"
    ) {
      console.warn(
        `Skipping event ID ${event.event_id} due to invalid coordinates:`,
        event.latitude,
        event.longitude
      );
      return null;
    }

    try {
      const coords = [event.latitude, event.longitude];
      const iconKey = `${event.event_type}_${event.severity}`;
      const markerIcon = icons[iconKey] || defaultIcon;

      const marker = L.marker(coords, {
        icon: markerIcon,
      }).addTo(map);

      const eventDate = new Date(event.created_at).toLocaleString();

      let badgeClass = "bg-secondary";
      if (event.severity === "High") {
        badgeClass = "bg-danger";
      } else if (event.severity === "Medium") {
        badgeClass = "bg-warning";
      } else if (event.severity === "Low") {
        badgeClass = "bg-info";
      }

      marker.bindPopup(`
        <b>${event.event_type.toUpperCase()}</b><br>
        <small>Reported: ${eventDate}</small><br>
        Details: ${event.description || "N/A"}<br>
        Location: ${event.location_description || "N/A"}<br>
        Status: ${event.status || "N/A"}<br>
        <span class="badge ${badgeClass}">
          ${event.severity.toUpperCase()} PRIORITY
        </span>
      `);

      console.log(
        `Marker added/updated for event ID ${event.event_id} at ${coords}`
      );
      return marker;
    } catch (error) {
      console.error(
        `Error creating marker for event ID ${event.event_id}: ${error}`
      );
      return null;
    }
  }

  function fetchEvents() {
    // Calculate the date 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    // Format as YYYY-MM-DD
    const fromDateString = oneWeekAgo.toISOString().split("T")[0];

    // Add the from_date query parameter to the API endpoint
    fetch(`/api/community-events?from_date=${fromDateString}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched events from last week:", data); // Updated log message
        if (!Array.isArray(data)) {
          console.error("Fetched data is not an array:", data);
          return;
        }

        const newMarkers = {};
        const receivedEventIds = new Set();

        data.forEach((event) => {
          if (!event || typeof event.event_id === "undefined") {
            console.warn("Skipping event with missing ID:", event);
            return;
          }
          const eventId = event.event_id;
          receivedEventIds.add(eventId);

          // Check if marker exists and update/add
          let marker = currentMarkers[eventId];
          if (marker) {
            // Optional: Update existing marker popup if needed
            // marker.setPopupContent(...)
            newMarkers[eventId] = marker; // Keep existing marker
            delete currentMarkers[eventId]; // Remove from old list
          } else {
            // Add new marker if it doesn't exist
            const newMarker = addSingleMarker(event);
            if (newMarker) {
              newMarkers[eventId] = newMarker;
            }
          }
        });

        // Remove markers for events that are no longer in the fetched data (older than a week)
        Object.keys(currentMarkers).forEach((eventId) => {
          console.log(
            `Removing marker for event ID ${eventId} (older than a week or removed)`
          );
          map.removeLayer(currentMarkers[eventId]);
        });

        currentMarkers = newMarkers; // Update the global marker list
      })
      .catch((error) => {
        console.error("Error fetching event data:", error);
      });
  }

  fetchEvents();

  function updateOnlineStatus() {
    const status = document.getElementById("online-status");
    if (!status) return;
    if (navigator.onLine) {
      status.innerHTML = '<i class="bi bi-wifi"></i> Online';
      status.className = "text-success";
    } else {
      status.innerHTML = '<i class="bi bi-wifi-off"></i> Offline';
      status.className = "text-danger";
    }
  }

  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  const syncButton = document.getElementById("sync-button");
  let syncInterval = null;

  if (syncButton) {
    syncButton.addEventListener("click", () => {
      if (navigator.onLine) {
        if (syncInterval) {
          clearInterval(syncInterval);
          syncInterval = null;
          syncButton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sync Data';
          console.log("Stopped automatic sync");
          alert("Automatic sync stopped");
        } else {
          syncInterval = setInterval(fetchEvents, 5000);
          syncButton.innerHTML = '<i class="bi bi-stop-fill"></i> Stop Sync';
          console.log("Started automatic sync");
          alert("Automatic sync started - refreshing every second");

          fetchEvents();
        }
      } else {
        alert("Cannot sync while offline");
      }
    });
  } else {
    console.warn("Sync button element not found.");
  }

  window.addEventListener("beforeunload", function () {
    if (syncInterval) {
      clearInterval(syncInterval);
    }
  });
});
