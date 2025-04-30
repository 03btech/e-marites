document.addEventListener("DOMContentLoaded", function() {
    // Sample risk zone data (replace with real API data)
    const riskZones = [
        { type: "high", lat: 10.716, lng: 123.515, radius: 80, incidents: 15 },
        { type: "medium", lat: 10.718, lng: 123.517, radius: 60, incidents: 8 },
        { type: "low", lat: 10.714, lng: 123.513, radius: 40, incidents: 3 },
        { type: "high", lat: 10.720, lng: 123.520, radius: 70, incidents: 12 },
        { type: "medium", lat: 10.712, lng: 123.510, radius: 50, incidents: 5 }
    ];

    // Initialize the risk zone map
    const riskZoneMap = L.map('riskZoneMap', {
        center: [10.716699, 123.51553],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
    });

    // Add base map layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(riskZoneMap);

    // Create risk zone circles
    const zoneCircles = {};
    const zoneColors = {
        high: '#ff6b6b',
        medium: '#ffc107',
        low: '#28a745'
    };

    // Function to create circle markers
    function createZoneCircle(zone) {
        return L.circle([zone.lat, zone.lng], {
            radius: zone.radius * 5, // Scale for visibility
            color: zoneColors[zone.type],
            fillColor: zoneColors[zone.type],
            fillOpacity: 0.5,
            weight: 2
        }).bindPopup(`
      <b>${zone.type.toUpperCase()} Risk Zone</b><br>
      Incident Count: ${zone.incidents}<br>
      Last Updated: ${new Date().toLocaleDateString()}
    `);
    }

    // Add all zones to map
    riskZones.forEach(zone => {
        const circle = createZoneCircle(zone);
        circle.addTo(riskZoneMap);
        if (!zoneCircles[zone.type]) {
            zoneCircles[zone.type] = [];
        }
        zoneCircles[zone.type].push(circle);
    });

    // Fit map to show all zones
    riskZoneMap.fitBounds(Object.values(zoneCircles).flat().map(circle => circle.getLatLng()));

    // Filter functionality
    document.getElementById('riskZoneFilter').addEventListener('change', function() {
        const filterValue = this.value;

        Object.entries(zoneCircles).forEach(([type, circles]) => {
            const shouldShow = filterValue === 'all' || filterValue === type;
            circles.forEach(circle => {
                if (shouldShow) {
                    riskZoneMap.addLayer(circle);
                } else {
                    riskZoneMap.removeLayer(circle);
                }
            });
        });
    });

    // Update risk zones periodically (every 5 minutes)
    setInterval(updateRiskZones, 300000);

    // Function to update risk zones from API
    function updateRiskZones() {
        fetch('/api/risk-zones')
            .then(response => response.json())
            .then(data => {
                // Remove existing circles
                Object.values(zoneCircles).flat().forEach(circle => {
                    riskZoneMap.removeLayer(circle);
                });

                // Clear existing zones
                Object.keys(zoneCircles).forEach(key => {
                    zoneCircles[key] = [];
                });

                // Add new zones
                data.forEach(zone => {
                    const circle = createZoneCircle(zone);
                    circle.addTo(riskZoneMap);
                    if (!zoneCircles[zone.type]) {
                        zoneCircles[zone.type] = [];
                    }
                    zoneCircles[zone.type].push(circle);
                });
            })
            .catch(error => {
                console.error('Error updating risk zones:', error);
            });
    }
});