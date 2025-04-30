document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("authToken");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch("/api/verify-session", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem("authToken");
      window.location.href = "login.html";
    } else {
      console.log("Session verified successfully.");
    }
  } catch (error) {
    console.error("Error verifying session:", error);
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  }

  setupMobileInteractions();

  document
    .getElementById("logout-btn")
    ?.addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem("authToken");
      window.location.href = "/login.html";
    });
});

function setupMobileInteractions() {
  const mapContainer = document.getElementById("map-container");
  if (mapContainer) {
    mapContainer.addEventListener(
      "dblclick",
      function (e) {
        e.preventDefault();
      },
      { passive: false }
    );
  }

  const dropdowns = document.querySelectorAll(".dropdown-toggle");
  dropdowns.forEach((dropdown) => {
    dropdown.addEventListener("click", function (e) {
      if (window.innerWidth < 768) {
        e.preventDefault();
        const dropdownMenu = this.nextElementSibling;
        dropdownMenu.style.display =
          dropdownMenu.style.display === "block" ? "none" : "block";
      }
    });
  });
}

window.addEventListener("resize", setupMobileInteractions);
