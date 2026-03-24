// ---------- GET EVENT ID FROM URL ----------
const params = new URLSearchParams(window.location.search);
const eventId = params.get("eventId");


// ---------- LOGIN ----------
const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // call backend (replace URL later)
  const success = await loginUser(username, password);

  const status = document.getElementById("loginStatus");

  if (success) {
    status.textContent = "Login successful";

    // hide login, show booking
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("bookingSection").style.display = "block";

    loadEventDetails(); // fetch event after login
  } else {
    status.textContent = "Login failed";
  }
});


// ---------- FAKE LOGIN (replace with FastAPI) ----------
async function loginUser(username, password) {
  // later:
  // const res = await fetch("/login", {...})
  // return res.status === 200

  return username === "admin" && password === "123";
}


// ---------- LOAD EVENT DETAILS ----------
async function loadEventDetails() {
  const event = await fetchEventById(eventId);

  const container = document.getElementById("eventDetails");

  container.innerHTML = `
    <h3>${event.name}</h3>
    <p>Date: ${event.date}</p>
    <p>Location: ${event.location}</p>
  `;
}


// ---------- FAKE EVENT FETCH ----------
async function fetchEventById(id) {
  const events = [
    { id: "1", name: "Music Concert", date: "2026-04-01", location: "Bangalore" },
    { id: "2", name: "Tech Fest", date: "2026-04-05", location: "Manipal" }
  ];

  return events.find(e => e.id == id);
}


// ---------- BOOKING ----------
const bookBtn = document.getElementById("bookBtn");

bookBtn.addEventListener("click", async () => {
  const success = await bookEvent(eventId);

  const status = document.getElementById("bookingStatus");

  if (success) {
    status.textContent = "Booking successful";
  } else {
    status.textContent = "Booking failed";
  }
});


// ---------- FAKE BOOK API ----------
async function bookEvent(eventId) {
  // later:
  // POST /bookings with eventId

  return true;
}