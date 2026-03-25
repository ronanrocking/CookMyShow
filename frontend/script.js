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



// ---------- MOCK EVENTS (NEW FORMAT) ----------
const mockEvents = [
  { 
    event_id: 1, 
    title: "Sunburn Manipal", 
    description: "The biggest music festival in the student hub. Join us for a night of electronic beats and neon lights.", 
    event_type: "Music & Performances", 
    language: "English", 
    duration: 180 
  },
  { 
    id: 2, 
    title: "Inter-College Cricket Finals", 
    description: "MIT vs KMC. The ultimate showdown for the championship trophy at the end of the semester.", 
    event_type: "Sports", 
    language: "Hindi/English", 
    duration: 210 
  },
  { 
    id: 3, 
    title: "JS & React Workshop", 
    description: "Build your first portfolio website and learn how to host it on a Raspberry Pi 3B+.", 
    event_type: "Workshops & Talks", 
    language: "English", 
    duration: 120 
  }
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
  
  // Replace with your friend's IP address
  //const response = await fetch("http://192.168.x.x:8000/events"); 
  //const events = await response.json();

  const events = await fetchEvents();
  eventsDiv.innerHTML = "";

  events.forEach(event => {
    const card = document.createElement("div");
    card.className = "event-card";

    // Mapping the new database fields here
    card.innerHTML = `
      <div class="event-type-badge">${event.event_type}</div>
      <h3 class="event-title">${event.title}</h3>
      <p class="event-desc">${event.description}</p>
      
      <div class="event-meta">
        <span><strong>Language:</strong> ${event.language}</span>
        <span><strong>Duration:</strong> ${event.duration} mins</span>
      </div>

      <button class="book-btn" data-id="${event.event_id}">Book Now</button>
    `;

    // Handle Redirect
    const button = card.querySelector(".book-btn");
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      window.location.href = `booking.html?eventId=${id}`;
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