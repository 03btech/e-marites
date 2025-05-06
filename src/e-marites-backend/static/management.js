document.addEventListener("DOMContentLoaded", () => {
  loadAgencies();
  loadMembers();
});

const API_BASE_URL = ""; // Assuming API is served from the same origin

// --- Agency Functions ---

async function loadAgencies() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/agencies`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const agencies = await response.json();
    const tableBody = document.getElementById("agenciesTableBody");
    tableBody.innerHTML = ""; // Clear existing rows
    agencies.forEach((agency) => {
      const row = tableBody.insertRow();
      row.innerHTML = `
                <td>${agency.agency_id}</td>
                <td>${escapeHTML(agency.name)}</td>
                <td>${escapeHTML(agency.phone_number || "")}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="editAgency(${
                      agency.agency_id
                    }, '${escapeHTML(agency.name)}', '${escapeHTML(
        agency.phone_number || ""
      )}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAgency(${
                      agency.agency_id
                    })"><i class="bi bi-trash"></i></button>
                </td>
            `;
    });
  } catch (error) {
    console.error("Error loading agencies:", error);
    alert("Failed to load agencies. See console for details.");
  }
}

function prepareAgencyModal(id = null, name = "", phone = "") {
  document.getElementById("agencyId").value = id || "";
  document.getElementById("agencyName").value = name;
  document.getElementById("agencyPhone").value = phone;
  document.getElementById("agencyModalLabel").textContent = id
    ? "Edit Agency"
    : "Add Agency";
}

function editAgency(id, name, phone) {
  prepareAgencyModal(id, name, phone);
  const modal = new bootstrap.Modal(document.getElementById("agencyModal"));
  modal.show();
}

async function saveAgency() {
  const agencyId = document.getElementById("agencyId").value;
  const name = document.getElementById("agencyName").value;
  const phone = document.getElementById("agencyPhone").value;

  if (!name) {
    alert("Agency name is required.");
    return;
  }

  const agencyData = {
    name: name,
    phone_number: phone || null, // Send null if empty
  };

  const method = agencyId ? "PUT" : "POST";
  const url = agencyId
    ? `${API_BASE_URL}/api/agencies/${agencyId}`
    : `${API_BASE_URL}/api/agencies`;

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        // Add authorization headers if needed
        // 'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: JSON.stringify(agencyData),
    });

    if (!response.ok) {
      const errorData = await response.text(); // Or response.json() if backend sends JSON error
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorData}`
      );
    }

    // Close modal and reload data
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("agencyModal")
    );
    modal.hide();
    loadAgencies();
  } catch (error) {
    console.error("Error saving agency:", error);
    alert(`Failed to save agency: ${error.message}`);
  }
}

async function deleteAgency(id) {
  if (!confirm("Are you sure you want to delete this agency?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/agencies/${id}`, {
      method: "DELETE",
      headers: {
        // Add authorization headers if needed
        // 'Authorization': 'Bearer YOUR_TOKEN'
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorData}`
      );
    }

    loadAgencies(); // Reload the list
  } catch (error) {
    console.error("Error deleting agency:", error);
    alert(`Failed to delete agency: ${error.message}`);
  }
}

// --- Community Member Functions ---

async function loadMembers() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/community-members`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const members = await response.json();
    const tableBody = document.getElementById("membersTableBody");
    tableBody.innerHTML = ""; // Clear existing rows
    members.forEach((member) => {
      const row = tableBody.insertRow();
      // Ensure all fields exist or provide defaults
      const memberId = member.member_id || "N/A";
      const fullName = member.full_name || "";
      const phone = member.phone || "";
      const address = member.address || "";
      const familyName = member.family_name || "";

      row.innerHTML = `
                <td>${memberId}</td>
                <td>${escapeHTML(fullName)}</td>
                <td>${escapeHTML(phone)}</td>
                <td>${escapeHTML(address)}</td>
                <td>${escapeHTML(familyName)}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="editMember(${memberId}, '${escapeHTML(
        fullName
      )}', '${escapeHTML(phone)}', '${escapeHTML(address)}', '${escapeHTML(
        familyName
      )}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMember(${memberId})"><i class="bi bi-trash"></i></button>
                </td>
            `;
    });
  } catch (error) {
    console.error("Error loading members:", error);
    alert("Failed to load community members. See console for details.");
  }
}

function prepareMemberModal(
  id = null,
  name = "",
  phone = "",
  address = "",
  familyName = ""
) {
  document.getElementById("memberId").value = id || "";
  document.getElementById("memberName").value = name;
  document.getElementById("memberPhone").value = phone;
  document.getElementById("memberAddress").value = address;
  document.getElementById("memberFamilyName").value = familyName;
  document.getElementById("memberModalLabel").textContent = id
    ? "Edit Member"
    : "Add Member";
}

function editMember(id, name, phone, address, familyName) {
  prepareMemberModal(id, name, phone, address, familyName);
  const modal = new bootstrap.Modal(document.getElementById("memberModal"));
  modal.show();
}

async function saveMember() {
  const memberId = document.getElementById("memberId").value;
  const name = document.getElementById("memberName").value;
  const phone = document.getElementById("memberPhone").value;
  const address = document.getElementById("memberAddress").value;
  const familyName = document.getElementById("memberFamilyName").value;

  if (!name || !phone) {
    alert("Member name and phone are required.");
    return;
  }

  const memberData = {
    full_name: name,
    phone: phone,
    address: address || null,
    family_name: familyName || null,
  };

  const method = memberId ? "PUT" : "POST";
  const url = memberId
    ? `${API_BASE_URL}/api/community-members/${memberId}`
    : `${API_BASE_URL}/api/community-members`;

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        // 'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: JSON.stringify(memberData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorData}`
      );
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("memberModal")
    );
    modal.hide();
    loadMembers();
  } catch (error) {
    console.error("Error saving member:", error);
    alert(`Failed to save member: ${error.message}`);
  }
}

async function deleteMember(id) {
  if (!confirm("Are you sure you want to delete this community member?")) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/community-members/${id}`,
      {
        method: "DELETE",
        headers: {
          // 'Authorization': 'Bearer YOUR_TOKEN'
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorData}`
      );
    }

    loadMembers(); // Reload the list
  } catch (error) {
    console.error("Error deleting member:", error);
    alert(`Failed to delete member: ${error.message}`);
  }
}

// Utility function to prevent XSS
function escapeHTML(str) {
  if (str === null || str === undefined) {
    return "";
  }
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
