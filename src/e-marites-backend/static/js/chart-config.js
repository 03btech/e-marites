// Historical Accident Trend Chart

async function createAccidentChart() {
  try {
    console.log("Initializing accident chart...");

    const canvas = document.getElementById("accidentChart");
    if (!canvas) {
      throw new Error("Canvas element with ID 'accidentChart' not found.");
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context from canvas.");
    }

    console.log("Fetching accident trend data...");
    const response = await fetch("/api/accident-trend-data");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const chartData = await response.json();
    console.log("Accident data received:", chartData);

    new Chart(ctx, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Incident Count",
            data: chartData.data,
            backgroundColor: "rgba(40, 52, 68, 0.2)",
            borderColor: "rgba(40, 52, 68, 1)",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {},
          },

          x: {
            ticks: {
              autoSkip: true,
              maxRotation: 0,
            },
          },
        },
      },
    });

    console.log("Accident chart rendered successfully with dynamic data.");
  } catch (error) {
    console.error("Error creating accident chart:", error.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  createAccidentChart();
});
