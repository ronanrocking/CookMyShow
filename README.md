# 🎟️ CookMyShow

A full-stack event booking platform inspired by BookMyShow. Users can browse events, book tickets, and organizers can manage events and shows through a dedicated dashboard.
(DBS Sem IV Project)

---

## 🚀 Features

### 👤 User

* Register and login
* Browse and search events
* View event details and show timings
* Book tickets
* View booking history
* Wishlist events

### 🎪 Organizer

* Create and manage events
* Schedule shows
* Update show capacity
* View analytics dashboard

---

## 🧱 Tech Stack

### Frontend

* HTML
* CSS
* JavaScript (Vanilla)

### Backend

* FastAPI (Python)
* MySQL
* JWT Authentication

---

## 📁 Project Structure

```
CookMyShow/
│
├── backend/
│   ├── app/
│   │   └── main.py
│   ├── venv/
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── index.html
│   ├── event.html
│   ├── booking.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── organizer-dashboard.html
│   ├── my-bookings.html
│   ├── app.js
│   └── styles.css
│
└── .gitignore
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```
git clone https://github.com/ronanrocking/CookMyShow.git
cd CookMyShow
```

---

### 2️⃣ Backend Setup

```
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# OR
source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
```

---

### 3️⃣ Environment Variables

Create a `.env` file inside `backend/`:

```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=cookmyshow

JWT_SECRET=your_secret_key
```

---

### 4️⃣ Run Backend

```
uvicorn app.main:app --reload
```

Backend will run on:

```
http://localhost:8000
```

---

### 5️⃣ Run Frontend

```
cd ../frontend
python -m http.server 5500
```

Open in browser:

```
http://localhost:5500
```

---

## 🔗 API Configuration

In `frontend/app.js`:

```
const API = 'http://localhost:8000';
```

Update this if your backend runs on a different host/port.

---

## ⚠️ Important Notes

* Do NOT commit `.env` (contains sensitive data)
* Ensure MySQL is running and database is created
* Backend must be running before using frontend

---

## 📌 Future Improvements

* Payment gateway integration
* Seat selection UI
* Email notifications
* Admin panel
* Deployment (Docker / Cloud)

---

## 👨‍💻 Author

Aditya Prashanth, Ronan Madan, Nikita Mukta

---

## 📄 License

This project is for educational purposes.
