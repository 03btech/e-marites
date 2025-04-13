import Chart from "chart.js/auto";

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

    new Chart(ctx, {
      type: "line",
      data: {
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        datasets: [
          {
            label: "Accident Count",
            data: [12, 19, 15, 8, 10, 12, 15, 18, 22, 25, 20, 17],
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
            ticks: {
              stepSize: 5,
            },
          },
        },
      },
    });

    console.log("Accident chart rendered successfully.");
  } catch (error) {
    console.error("Error creating accident chart:", error.message);
  }
}

// Auto-run on page load
document.addEventListener("DOMContentLoaded", () => {
  createAccidentChart();
});
