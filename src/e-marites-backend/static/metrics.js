document.addEventListener("DOMContentLoaded", function () {
  fetchResponseMetrics();
});

function fetchResponseMetrics() {
  fetch("/api/response-metrics")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      document.getElementById("response-time-value").textContent =
        data.response_time_minutes;
      document.getElementById("success-rate-value").textContent =
        data.success_rate_percent + "%";
      document.getElementById("active-incidents-value").textContent =
        data.active_incidents;
      document.getElementById("resolved-today-value").textContent =
        data.resolved_today;
    })
    .catch((error) => {
      console.error("Error fetching response metrics:", error);

      document.getElementById("response-time-value").textContent = "Error";
      document.getElementById("success-rate-value").textContent = "Error";
      document.getElementById("active-incidents-value").textContent = "Error";
      document.getElementById("resolved-today-value").textContent = "Error";
    });
}
