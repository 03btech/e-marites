document.addEventListener("DOMContentLoaded", function () {
  // Initialize map with coordinates for Negros Occidental
  const map = L.map("map-container", {
    center: [10.716699000872625, 123.51552988317307],
    zoom: 15.5,
    fullscreenControl: true,
  });

  // Custom icons (Adjust keys to match event_type and severity from backend)
  const icons = {
    Flooding_High: L.icon({
      iconUrl: "./js/leaflet/images/high.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png", // Path to your shadow image
      shadowSize: [41, 41], // Size of the shadow
      shadowAnchor: [12, 41], // The same as the icon's anchor for a typical shadow
    }),
    Flooding_Medium: L.icon({
      iconUrl: "./js/leaflet/images/medium.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Flooding_Low: L.icon({
      iconUrl: "./js/leaflet/images/low.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Landslide_High: L.icon({
      iconUrl: "./js/leaflet/images/high.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Landslide_Medium: L.icon({
      iconUrl: "./js/leaflet/images/medium.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Landslide_Low: L.icon({
      iconUrl: "./js/leaflet/images/low.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Accident_High: L.icon({
      iconUrl: "./js/leaflet/images/high.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Accident_Medium: L.icon({
      iconUrl: "./js/leaflet/images/medium.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
    Accident_Low: L.icon({
      iconUrl: "./js/leaflet/images/low.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
      shadowUrl: "./js/leaflet/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    }),
  };

  // Offline tile handling
  const osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const osmAttrib =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  L.tileLayer(osmUrl, {
    attribution: osmAttrib,
    maxZoom: 18,
  }).addTo(map);

  // Fullscreen control
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

  // Add markers to map
  function addMarkers(data) {
    const defaultIcon = new L.Icon.Default();

    data.forEach((event) => {
      if (
        typeof event.latitude !== "number" ||
        typeof event.longitude !== "number"
      ) {
        console.warn(
          `Skipping event ID ${event.event_id} due to invalid coordinates:`,
          event.latitude,
          event.longitude
        );
        return;
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

        console.log(`Marker added for event ID ${event.event_id} at ${coords}`);
      } catch (error) {
        console.error(
          `Error creating marker for event ID ${event.event_id}: ${error}`
        );
      }
    });
  }

  // Fetch event data from the backend
  function fetchEvents() {
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });
    fetch("/api/community-events")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched events:", data);
        if (Array.isArray(data)) {
          addMarkers(data);
        } else {
          console.error("Fetched data is not an array:", data);
        }
      })
      .catch((error) => {
        console.error("Error fetching event data:", error);
        alert(
          "Failed to load event data. Please check the connection or try again later."
        );
      });
  }

  // Initial load of events
  fetchEvents();

  // Offline detection
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

  // Sync button functionality
  const syncButton = document.getElementById("sync-button");
  let syncInterval = null;

  if (syncButton) {
    syncButton.addEventListener("click", () => {
      if (navigator.onLine) {
        if (syncInterval) {
          // If already syncing, stop the interval
          clearInterval(syncInterval);
          syncInterval = null;
          syncButton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sync Data';
          console.log("Stopped automatic sync");
          alert("Automatic sync stopped");
        } else {
          // Start syncing every second
          syncInterval = setInterval(fetchEvents, 5000); // 1000ms = 1 second
          syncButton.innerHTML = '<i class="bi bi-stop-fill"></i> Stop Sync';
          console.log("Started automatic sync");
          alert("Automatic sync started - refreshing every second");

          // Initial immediate refresh
          fetchEvents();
        }
      } else {
        alert("Cannot sync while offline");
      }
    });
  } else {
    console.warn("Sync button element not found.");
  }

  // Make sure to clear the interval when the page is unloaded
  window.addEventListener("beforeunload", function () {
    if (syncInterval) {
      clearInterval(syncInterval);
    }
  });
});
