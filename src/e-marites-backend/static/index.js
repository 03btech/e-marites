// Import Bootstrap CSS
// import "bootstrap/dist/css/bootstrap.min.css";

// // Import Bootstrap JS
// import "bootstrap/dist/js/bootstrap.bundle.min.js";

// Your application code
document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("authToken");

  if (!token) {
    // No token found, redirect to login
    window.location.href = "login.html";
    return; // Stop further execution
  }

  try {
    // Verify the token with the backend
    const response = await fetch("/api/verify-session", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Backend says token is invalid (expired, etc.)
      localStorage.removeItem("authToken"); // Clear bad token
      window.location.href = "login.html";
    } else {
      // Token is valid, user can stay.
      // Optionally decode the token or use the response data if needed.
      console.log("Session verified successfully.");
    }
  } catch (error) {
    console.error("Error verifying session:", error);
    // Network error or other issue, assume invalid session
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  }
});

// Logout functionality
document.getElementById("logout-btn")?.addEventListener("click", function (e) {
  e.preventDefault();
  // Clear any stored tokens
  localStorage.removeItem("authToken");
  // Redirect to login page
  window.location.href = "/login.html";
});

// You can also populate the username dynamically if available
document.addEventListener("DOMContentLoaded", function () {
  const username = localStorage.getItem("username") || "User";
  document.getElementById("profile-username").textContent = username;
});
