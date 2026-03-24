// ---------- TAB SWITCHING ----------
const tabs = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".tab-content");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    contents.forEach(c => c.classList.remove("active"));

    tab.classList.add("active");

    const target = tab.getAttribute("data-tab");
    document.getElementById(target).classList.add("active");
  });
});


// ---------- MOCK EVENTS (READ ONLY) ----------
const mockEvents = [
  { id: 1, name: "Music Concert", date: "2026-04-01", location: "Bangalore" },
  { id: 2, name: "Tech Fest", date: "2026-04-05", location: "Manipal" }
];


// ---------- MOCK FETCH ----------
async function fetchEvents() {
  // simulate delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockEvents;
}


// ---------- LOAD EVENTS ----------
async function loadEvents() {
  const eventsDiv = document.getElementById("events");

  eventsDiv.innerHTML = "Loading...";

  const events = await fetchEvents();

  eventsDiv.innerHTML = "";

  events.forEach(event => {
    const card = document.createElement("div");
    card.className = "event-card";

    card.innerHTML = `
      <div class="event-title">${event.name}</div>
      <div class="event-details">Date: ${event.date}</div>
      <div class="event-details">Location: ${event.location}</div>
      <button class="book-btn" data-id="${event.id}">Book</button>
    `;

    const button = card.querySelector(".book-btn");

    button.addEventListener("click", () => {
      const eventId = button.getAttribute("data-id");
      window.location.href = `booking.html?eventId=${eventId}`;
    });

    eventsDiv.appendChild(card);
  });
}


// ---------- MOCK LOGIN ----------
async function mockLogin(username, password) {
  await new Promise(resolve => setTimeout(resolve, 300));
  return username === "admin" && password === "123";
}


// ---------- BOOKINGS LOGIN ----------
document.getElementById("b_loginBtn").addEventListener("click", async () => {
  const username = document.getElementById("b_username").value;
  const password = document.getElementById("b_password").value;

  const status = document.getElementById("b_loginStatus");

  status.textContent = "Checking...";

  const success = await mockLogin(username, password);

  if (success) {
    status.textContent = "Login successful";

    document.getElementById("bookingLogin").style.display = "none";
    document.getElementById("createEventSection").style.display = "block";
  } else {
    status.textContent = "Login failed";
  }
});


// ---------- MOCK CREATE EVENT (NO UI UPDATE) ----------
async function mockCreateEvent(data) {
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log("Sent to backend:", data);
  return true;
}


// ---------- CREATE EVENT ----------
document.getElementById("createEventBtn").addEventListener("click", async () => {
  const name = document.getElementById("eventName").value;
  const date = document.getElementById("eventDate").value;
  const location = document.getElementById("eventLocation").value;

  const status = document.getElementById("createStatus");

  if (!name || !date || !location) {
    status.textContent = "Fill all fields";
    return;
  }

  status.textContent = "Sending...";

  const success = await mockCreateEvent({ name, date, location });

  if (success) {
    status.textContent = "Event sent to backend (not yet visible)";

    // DO NOT update UI
    // DO NOT push to events list

    document.getElementById("eventName").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("eventLocation").value = "";
  } else {
    status.textContent = "Failed to send";
  }
});


// ---------- INITIAL LOAD ----------
loadEvents();