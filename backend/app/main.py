from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
import pymysql
import pymysql.cursors
from jose import jwt, JWTError
from passlib.hash import bcrypt
from datetime import datetime, timedelta, timezone
import hashlib
import uuid
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROLE MAPPING
CUSTOMER_ROLE = 2
ORGANIZER_ROLE = 3

# ================= CONFIG =================

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": False,
}

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGO = "HS256"
JWT_EXP = timedelta(hours=24)

# ================= PASSWORD WORKING ===================

def hash_password(password: str):
    sha = hashlib.sha256(password.encode()).hexdigest()
    return bcrypt.hash(sha)

def verify_password(password: str, hashed: str):
    sha = hashlib.sha256(password.encode()).hexdigest()
    return bcrypt.verify(sha, hashed)

# ================= DB HELPER FUNCTIONS =================

def get_conn():
    try:
        return pymysql.connect(**DB_CONFIG)
    except pymysql.MySQLError:
        raise HTTPException(status_code=500, detail="DB connection failed")

def execute(query, params=None, fetchone=False, fetchall=False, commit=False):
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            if commit:
                conn.commit()

            if fetchone:
                return cursor.fetchone()
            if fetchall:
                return cursor.fetchall()

            return cursor.lastrowid

    except pymysql.MySQLError as e:
        conn.rollback()
        if e.args and e.args[0] == 1644:
            raise HTTPException(status_code=400, detail=str(e.args[1]))
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        conn.close()

def call_proc(name, args):
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            cursor.callproc(name, args)
            conn.commit()
            return cursor.fetchall()
    except pymysql.MySQLError as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Procedure error: {str(e)}")
    finally:
        conn.close()

def handle_db_error(err):
    if err.args[0] == 1644:
        raise HTTPException(status_code=400, detail=str(err.args[1]))
    print(f"Database Error: {err}")
    raise HTTPException(status_code=500, detail="Database error")

# ================= AUTH =================


def create_token(user_id, role_id):
    payload = {
        "user_id": user_id,
        "role_id": role_id,
        "exp": datetime.now(timezone.utc) + JWT_EXP
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")

        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload

    except (ValueError, JWTError):
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_organizer(user=Depends(get_current_user)):
    if user.get("role_id") != ORGANIZER_ROLE:
        raise HTTPException(status_code=403, detail="Organizer access only")
    return user

@app.post("/auth/register")
def register(data: dict):
    required = ["name", "email", "phone", "password", "role_id"]
    if not all(k in data for k in required):
        raise HTTPException(status_code=400, detail="Missing fields")

    password_hash = hash_password(data["password"])

    try:
        user_id = execute(
            "INSERT INTO users (name, email, phone, password_hash) VALUES (%s,%s,%s,%s)",
            (data["name"], data["email"], data["phone"], password_hash),
            commit=True
        )

        execute(
            "INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s)",
            (user_id, data["role_id"]),
            commit=True
        )

        return {"message": "Account created"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login")
def login(data: dict):
    if "email" not in data or "password" not in data:
        raise HTTPException(status_code=400, detail="Missing credentials")

    user = execute(
        """SELECT u.*, ur.role_id 
           FROM users u 
           JOIN user_roles ur ON u.user_id = ur.user_id 
           WHERE u.email=%s""",
        (data["email"],),
        fetchone=True
    )

    if not user or not verify_password(data["password"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "token": create_token(user["user_id"], user["role_id"]),
        "role_id": user["role_id"]
    }

# ================= EVENTS =================

@app.get("/events")
def list_events(
        category: str = None,
        sort_by: str = "date",  # Options: price, date, title
        order: str = "ASC"  # Options: ASC, DESC
):

    query = """
            SELECT e.*, MIN(s.price) as min_price, MIN(s.show_date) as earliest_show
            FROM events e
                     LEFT JOIN shows s ON e.event_id = s.event_id
            WHERE 1 = 1
            AND (s.status in ('SCHEDULED', 'ONGOING') OR s.show_id IS NULL)\
            """
    params = []

    # 1. Filtering by Category
    if category:
        query += " AND e.event_type = %s"
        params.append(category)

    query += " GROUP BY e.event_id"

    # 2. Sorting Logic
    sort_map = {
        "price": "min_price",
        "date": "earliest_show",
        "title": "e.title"
    }
    sort_column = sort_map.get(sort_by, "earliest_show")

    # Ensure order is safe to prevent SQL injection
    direction = "DESC" if order.upper() == "DESC" else "ASC"
    query += f" ORDER BY {sort_column} {direction}"

    return execute(query, params, fetchall=True)

@app.get("/shows/{show_id}/availability")
def show_availability(show_id: int):
    return call_proc("get_show_availability", [show_id])

@app.get("/events/search")
def search_events(q: str):
    return execute("SELECT * FROM events WHERE title LIKE %s", (f"%{q}%",), fetchall=True)

@app.get("/events/{event_id}")
def get_event(event_id: int):
    event = execute(
        "SELECT * FROM events WHERE event_id=%s",
        (event_id,), fetchone=True
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@app.get("/events/{event_id}/shows")
def get_shows(event_id: int):
    return execute("""
        SELECT 
            show_id,
            event_id,
            venue_id,
            show_date,
            TIME_FORMAT(start_time, '%%H:%%i:%%s') AS start_time,
            TIME_FORMAT(end_time, '%%H:%%i:%%s') AS end_time,
            CONCAT(show_date, 'T', TIME_FORMAT(start_time, '%%H:%%i:%%s')) AS start_datetime,
            CONCAT(show_date, 'T', TIME_FORMAT(end_time, '%%H:%%i:%%s')) AS end_datetime,
            price,
            total_capacity,
            tickets_sold,
            status
        FROM shows
        WHERE event_id=%s
        AND status in ('SCHEDULED', 'ONGOING')
    """, (event_id,), fetchall=True)

@app.get("/venues")
def get_venues():
    return execute(
        "SELECT venue_id, name, city FROM venues",
        fetchall=True
    )

# ================= BOOKINGS & PAYMENT TIMER =================

@app.post("/bookings")
def create_booking(data: dict, user=Depends(get_current_user)):
    if "show_id" not in data or "ticket_count" not in data:
        raise HTTPException(status_code=400, detail="Invalid input")

    show = execute(
        "SELECT status FROM shows WHERE show_id=%s",
        (data["show_id"],), fetchone=True
    )

    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    if show["status"] != "SCHEDULED":
        raise HTTPException(status_code=400, detail="BOOKING allowed only for scheduled shows")

    call_proc("create_booking", [
        user["user_id"],
        data["show_id"],
        data["ticket_count"]
    ])

    res = execute(
        """SELECT booking_id 
           FROM bookings 
           WHERE user_id=%s 
           ORDER BY booking_time DESC 
           LIMIT 1""",
        (user["user_id"],),
        fetchone=True
    )

    if not res:
        raise HTTPException(status_code=500, detail="Booking creation failed")

    expiry = datetime.now(timezone.utc) + timedelta(minutes=5)

    return {
        "booking_id": res["booking_id"],
        "expires_at": expiry.isoformat()
    }

@app.post("/bookings/{booking_id}/cancel")
def cancel_booking_api(booking_id: int, user=Depends(get_current_user)):
    booking = execute(
        "SELECT user_id FROM bookings WHERE booking_id=%s",
        (booking_id,), fetchone=True
    )

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your booking")

    call_proc("cancel_booking", [booking_id])
    return {"message": "booking cancelled"}

@app.post("/payments/initiate")
def initiate_payment(data: dict):
    required = ["booking_id", "method"]
    if not all(k in data for k in required):
        raise HTTPException(status_code=400, detail="Invalid payload")

    transaction_ref = f"TXN_{uuid.uuid4().hex[:12].upper()}"

    existing = execute(
        """SELECT payment_id, payment_status 
           FROM payments 
           WHERE booking_id=%s 
           ORDER BY payment_id DESC LIMIT 1""",
        (data["booking_id"],),
        fetchone=True
    )

    # If already successful → block
    if existing and existing["payment_status"] == "SUCCESSFUL":
        raise HTTPException(status_code=400, detail="Already paid")

    # If pending → reuse instead of inserting again
    if existing and existing["payment_status"] == "PENDING":
        return {
            "payment_id": existing["payment_id"],
            "message": "already pending"
        }

    # Fresh insert
    payment_id = execute(
        """INSERT INTO payments (booking_id, payment_method, payment_status, transaction_ref)
           VALUES (%s,%s,%s,%s)""",
        (data["booking_id"], data["method"], "PENDING", transaction_ref),
        commit=True
    )

    return {"payment_id": payment_id, "transaction_ref": transaction_ref, "message": "initiated"}

@app.post("/payments/webhook")
def process_payment(data: dict):
    required = ["booking_id", "status", "method", "transaction_ref"]
    if not all(k in data for k in required):
        raise HTTPException(status_code=400, detail="Invalid payload")

    payment = execute(
        "SELECT payment_id, payment_status FROM payments WHERE transaction_ref=%s",
        (data["transaction_ref"],),
        fetchone=True
    )

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Idempotency
    if payment["payment_status"] == "SUCCESSFUL":
        return {"message": "already processed"}

    if data["status"] == "SUCCESS":
        # Only update payment
        execute(
            """UPDATE payments 
               SET payment_status='SUCCESSFUL' 
               WHERE transaction_ref=%s""",
            (data["transaction_ref"],),
            commit=True
        )

        # Let procedure handle EVERYTHING
        try:
            call_proc("confirm_booking", [data["booking_id"]])
        except Exception as e:
            # Ignore "already confirmed" type errors
            if "Invalid booking state" not in str(e):
                raise

    return {"message": "ok"}

@app.get("/bookings/{booking_id}")
def get_booking(booking_id: int):
    booking = execute(
        """SELECT b.*, e.title as event_title, s.show_date, s.start_time, (b.total_amount / b.ticket_count) AS price 
           FROM bookings b 
           JOIN shows s ON b.show_id = s.show_id 
           JOIN events e ON s.event_id = e.event_id 
           WHERE b.booking_id=%s""",
        (booking_id,), fetchone=True
    )

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return booking



# ================= USER PROFILE (CUSTOMER) =================

@app.get("/users/me/bookings")
def user_bookings(user=Depends(get_current_user)):
    return execute(
        """SELECT 
              b.*, 
              e.title, 
              s.show_date,
              TIME_FORMAT(s.start_time, '%%H:%%i:%%s') AS start_time,
              CONCAT(s.show_date, 'T', TIME_FORMAT(s.start_time, '%%H:%%i:%%s')) AS start_datetime,
              s.price 
           FROM bookings b
           JOIN shows s ON b.show_id = s.show_id
           JOIN events e ON s.event_id = e.event_id
           WHERE b.user_id=%s AND b.is_visible_to_user = 1""",
        (user["user_id"],), fetchall=True
    )

@app.delete("/users/me/bookings/{booking_id}")
def hide_booking(booking_id: int, user=Depends(get_current_user)):
    # We call the procedure we defined in the SQL updates
    call_proc("hide_booking_from_user", [booking_id, user["user_id"]])

    return {"message": "Ticket hidden from your view"}

@app.get("/users/me")
def profile(user=Depends(get_current_user)):
    return execute("SELECT * FROM users WHERE user_id=%s", (user["user_id"],), fetchone=True)

@app.post("/events/{event_id}/wishlist")
def add_wishlist(event_id: int, user=Depends(get_current_user)):
    exists = execute(
        "SELECT 1 FROM wishlist WHERE user_id=%s AND event_id=%s",
        (user["user_id"], event_id),
        fetchone=True
    )

    if not exists:
        execute(
            "INSERT INTO wishlist (user_id, event_id) VALUES (%s,%s)",
            (user["user_id"], event_id),
            commit=True
        )

    return {"message": "added"}

@app.get("/users/me/wishlist")
def get_wishlist(user=Depends(get_current_user)):
    return execute(
        """SELECT e.* FROM wishlist w
           JOIN events e ON w.event_id = e.event_id
           WHERE w.user_id=%s""",
        (user["user_id"],),
        fetchall=True
    )

# ================= ORGANIZER DASHBOARD =================

@app.get("/organizer/events")
def organizer_events(org=Depends(get_current_organizer)):
    # Only events hosted by this organizer [cite: 63, 75]
    return execute("SELECT * FROM events WHERE organizer_id=%s", (org["user_id"],), fetchall=True)

@app.get("/organizer/analytics")
def organizer_analytics(org=Depends(get_current_organizer)):
    return call_proc("get_organizer_event_summary", [org["user_id"]])

@app.get("/organizer/shows/{show_id}/stats")
def show_stats(show_id: int, org=Depends(get_current_organizer)):
    return call_proc("get_show_stats", [show_id])

@app.post("/organizer/events")
def create_event(data: dict, org=Depends(get_current_organizer)):
    execute(
        """INSERT INTO events 
        (title, description, event_type, language, duration, organizer_id) 
        VALUES (%s,%s,%s,%s,%s,%s)""",
        (
            data["title"],
            data.get("description"),
            data["event_type"],
            data.get("language"),
            data.get("duration"),
            org["user_id"]
        ),
        commit=True
    )
    return {"message": "event created"}

@app.post("/organizer/shows")
def create_show_api(data: dict, org=Depends(get_current_organizer)):
    try:
        start_dt = datetime.fromisoformat(f"{data['show_date']}T{data['start_time']}")
        end_dt   = datetime.fromisoformat(f"{data['show_date']}T{data['end_time']}")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date/time format")

    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    # Step 2: Create show
    call_proc("create_show", [
        data["event_id"],
        data["venue_id"],
        data["show_date"],
        data["start_time"],
        data["end_time"],
        data["capacity"],
        data["price"]
    ])

    return {"message": "show created"}

@app.delete("/organizer/events/{event_id}")
def delete_event(event_id: int, org=Depends(get_current_organizer)):
    call_proc("delete_event_by_organizer", [
        event_id,
        org["user_id"]
    ])
    return {"message": "event deleted"}

@app.put("/organizer/shows/{show_id}/capacity")
def update_capacity_api(show_id: int, data: dict, org=Depends(get_current_organizer)):
    if "capacity" not in data:
        raise HTTPException(status_code=400, detail="Missing capacity")

    call_proc("update_capacity", [show_id, data["capacity"]])
    return {"message": "capacity updated"}

@app.get("/")
def root():
    return {"status": "running"}