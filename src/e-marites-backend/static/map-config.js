document.addEventListener("DOMContentLoaded", function () {
  // Initialize map with coordinates for Negros Occidental
  const map = L.map("map-container", {
    center: [10.716699000872625, 123.51552988317307],
    zoom: 15.5,
    fullscreenControl: true,
  });

  // Custom icons
  const icons = {
    Flooding_low: L.icon({
      iconUrl: "./js/leaflet/images/high.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
    }),
    Landslide_low: L.icon({
      iconUrl: "./js/leaflet/images/medium.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
    }),
    Vehicular_Accident_: L.icon({
      iconUrl: "./js/leaflet/images/low.svg",
      iconSize: [30, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
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
          const elem = document.getElementById("map-container").parentElement;
          if (!document.fullscreenElement) {
            elem.requestFullscreen().catch((err) => {
              console.error(`Fullscreen error: ${err.message}`);
            });
          } else {
            document.exitFullscreen();
          }
        }
      );
      return container;
    },
  });

  map.addControl(new L.Control.Fullscreen());

  // Sample mishap data (replace with real data)
  const mishaps = [
    {
      type: "Flooding",
      coords: [10.641, 122.968],
      date: "2025-04-04 08:30",
      details: "Severe flooding in Barangay Poblacion",
      severity: "High",
    },
    {
      type: "Accident",
      coords: [10.643, 122.97],
      date: "2025-04-04 09:15",
      details: "Vehicle collision near market",
      severity: "Medium",
    },
    {
      type: "Landslide",
      coords: [10.638, 122.965],
      date: "2025-04-04 10:45",
      details: "Landslide blocking mountain road",
      severity: "High",
    },
  ];

  // Add markers to map
  function addMarkers(data) {
    const defaultIcon = new L.Icon.Default();

    data.forEach((mishap) => {
      try {
        const marker = L.marker(mishap.coords, {
          icon: icons[concat(mishap.type, "_", mishap.severity)] || defaultIcon,
        }).addTo(map);

        marker.bindPopup(`
        <b>${mishap.type.toUpperCase()}</b><br>
        <small>${mishap.date}</small><br>
        ${mishap.details}<br>
        <span class="badge bg-${
          mishap.severity === "High" ? "danger" : "warning"
        }">
          ${mishap.severity.toUpperCase()} PRIORITY
        </span>
      `);

        console.log(`Marker added at ${mishap.coords}`);
      } catch (error) {
        console.error(`Error creating marker: ${error}`);
      }
    });
  }

  // Initial load
  addMarkers(mishaps);

  // Offline detection
  function updateOnlineStatus() {
    const status = document.getElementById("online-status");
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
  document.getElementById("sync-button").addEventListener("click", () => {
    if (navigator.onLine) {
      // Implement your sync logic here
      console.log("Syncing data...");
      alert("Data sync initiated");
    } else {
      alert("Cannot sync while offline");
    }
  });
});
