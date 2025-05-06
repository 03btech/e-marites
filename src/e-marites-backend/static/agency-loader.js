document.addEventListener("DOMContentLoaded", function () {
  loadAgencies();
});

async function loadAgencies() {
  const container = document.getElementById("agency-recipients-container");
  if (!container) {
    console.error("Agency recipients container not found.");
    return;
  }

  try {
    const response = await fetch("/api/agencies");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const agencies = await response.json();

    container.innerHTML = ""; // Clear the loading message

    if (!agencies || agencies.length === 0) {
      container.innerHTML =
        '<div class="text-muted small p-2">No agencies found.</div>';
      return;
    }

    agencies.forEach((agency) => {
      const div = document.createElement("div");
      div.className = "form-check";
      div.innerHTML = `
        <input
          class="form-check-input agency-checkbox"
          type="checkbox"
          name="recipient_agency"
          id="agency_${agency.agency_id}"
          value="${agency.agency_id}"
        />
        <label class="form-check-label small" for="agency_${agency.agency_id}">
          ${agency.name} ${
        agency.phone_number ? "(" + agency.phone_number + ")" : ""
      }
        </label>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading agencies:", error);
    container.innerHTML =
      '<div class="alert alert-danger alert-sm small p-2">Failed to load agencies.</div>';
  }
}
