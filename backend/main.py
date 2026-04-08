import os
import sqlite3
import jwt
import bcrypt
import datetime
import random
import smtplib
import json
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from processor import processor

load_dotenv()

app = FastAPI(title="Virtual Try-On API")
SECRET_KEY = "try-and-buy-secret-key-for-fyp"

SMTP_EMAIL    = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_SERVER   = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "465"))
GROQ_API_KEY    = os.getenv("GROQ_API_KEY")
ADMIN_USERNAME  = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD  = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_SECRET    = "admin-tryandbuy-secret-key"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB ──────────────────────────────────────────────────────────────────────
DB_FILE = "tryandbuy.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT, email TEXT UNIQUE, password_hash TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  person_image_base64 TEXT,
                  cloth_image_base64 TEXT,
                  result_image_base64 TEXT,
                  stats_json TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    c.execute('''CREATE TABLE IF NOT EXISTS pending_verifications
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT,
                  email TEXT UNIQUE,
                  password_hash TEXT,
                  code TEXT,
                  expires_at TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS products
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  description TEXT DEFAULT '',
                  price REAL NOT NULL,
                  category TEXT DEFAULT 'clothing',
                  image_base64 TEXT,
                  created_by INTEGER,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    c.execute('''CREATE TABLE IF NOT EXISTS cart
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  product_id INTEGER NOT NULL,
                  quantity INTEGER DEFAULT 1,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    c.execute('''CREATE TABLE IF NOT EXISTS orders
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  items_json TEXT NOT NULL,
                  total_price REAL NOT NULL,
                  status TEXT DEFAULT 'pending',
                  payment_last4 TEXT,
                  shipping_name TEXT,
                  shipping_address TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

def migrate_db():
    conn = get_db()
    c = conn.cursor()
    c.execute("PRAGMA table_info(history)")
    columns = [row['name'] for row in c.fetchall()]
    if 'person_image_base64' not in columns:
        c.execute("ALTER TABLE history ADD COLUMN person_image_base64 TEXT")
        conn.commit()
    if 'stats_json' not in columns:
        c.execute("ALTER TABLE history ADD COLUMN stats_json TEXT")
        conn.commit()
    conn.close()

init_db()
migrate_db()

# ── Auth ─────────────────────────────────────────────────────────────────────
def create_token(user_id: int):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get("user_id")
    except:
        return None

def create_admin_token():
    payload = {
        "is_admin": True,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    return jwt.encode(payload, ADMIN_SECRET, algorithm="HS256")

def verify_admin(authorization: Optional[str] = Header(None)) -> bool:
    if not authorization or not authorization.startswith("Bearer "):
        return False
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, ADMIN_SECRET, algorithms=["HS256"])
        return payload.get("is_admin") is True
    except:
        return False

# ── Email ────────────────────────────────────────────────────────────────────
def send_verification_email(to_email: str, name: str, code: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your TryAndBuy Verification Code"
    msg["From"]    = SMTP_EMAIL
    msg["To"]      = to_email

    spaced_code = "  ".join(list(code))

    html = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#08080f;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#0f0f1e;border-radius:24px;
              border:1px solid rgba(217,70,239,0.25);overflow:hidden;">
    <div style="background:linear-gradient(135deg,#c084fc,#d946ef,#f472b6);
                padding:32px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:28px;font-weight:900;letter-spacing:-0.5px;">
        TryAndBuy
      </h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;
                text-transform:uppercase;letter-spacing:2px;">
        Virtual Try-On · AI Powered
      </p>
    </div>
    <div style="padding:40px 36px;">
      <p style="color:rgba(255,255,255,0.85);font-size:17px;margin:0 0 8px;">
        Hi <strong>{name}</strong>,
      </p>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 32px;line-height:1.6;">
        Use the code below to verify your account. It expires in <strong style="color:#d946ef;">15 minutes</strong>.
      </p>
      <div style="background:rgba(217,70,239,0.08);border:1px solid rgba(217,70,239,0.3);
                  border-radius:16px;padding:28px;text-align:center;margin-bottom:32px;">
        <span style="font-size:42px;font-weight:900;letter-spacing:14px;
                     color:#d946ef;font-family:monospace;">
          {spaced_code}
        </span>
      </div>
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;line-height:1.6;">
        If you didn't request this, you can safely ignore this email.<br>
        This code will expire automatically.
      </p>
    </div>
    <div style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);
                text-align:center;">
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">
        TryAndBuy · AI-Powered Virtual Fashion Try-On · FYP Project
      </p>
    </div>
  </div>
</body>
</html>"""

    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

# ── Pydantic models ───────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class VerifyEmailRequest(BaseModel):
    email: str
    code: str

class ResendCodeRequest(BaseModel):
    email: str

class OccasionRequest(BaseModel):
    occasion: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class CartAddRequest(BaseModel):
    product_id: int
    quantity: int = 1

class PlaceOrderRequest(BaseModel):
    payment_last4: str
    shipping_name: str
    shipping_address: str

# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/signup")
async def signup(req: SignupRequest):
    conn = get_db()
    c = conn.cursor()
    # Block if already a verified user
    c.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if c.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    code    = "".join(random.choices("0123456789", k=6))
    expires = (datetime.datetime.utcnow() + datetime.timedelta(minutes=15)).isoformat()
    hashed  = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()

    c.execute(
        "INSERT OR REPLACE INTO pending_verifications (name, email, password_hash, code, expires_at) VALUES (?,?,?,?,?)",
        (req.name, req.email, hashed, code, expires)
    )
    conn.commit()
    conn.close()

    try:
        send_verification_email(req.email, req.name, code)
    except Exception as e:
        print(f"[Email error] {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email. Check SMTP settings.")

    return {"message": "Verification code sent to your email", "email": req.email}


@app.post("/verify-email")
async def verify_email(req: VerifyEmailRequest):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM pending_verifications WHERE email = ?", (req.email,))
    pending = c.fetchone()

    if not pending:
        conn.close()
        raise HTTPException(status_code=400, detail="No pending verification found. Please sign up again.")

    expires_at = datetime.datetime.fromisoformat(pending["expires_at"])
    if datetime.datetime.utcnow() > expires_at:
        c.execute("DELETE FROM pending_verifications WHERE email = ?", (req.email,))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=400, detail="Code expired. Please sign up again.")

    if pending["code"] != req.code:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid code. Please check and try again.")

    # Create verified user
    c.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?,?,?)",
        (pending["name"], pending["email"], pending["password_hash"])
    )
    user_id = c.lastrowid
    c.execute("DELETE FROM pending_verifications WHERE email = ?", (req.email,))
    conn.commit()
    conn.close()

    return {"token": create_token(user_id), "name": pending["name"]}


@app.post("/resend-code")
async def resend_code(req: ResendCodeRequest):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM pending_verifications WHERE email = ?", (req.email,))
    pending = c.fetchone()
    if not pending:
        conn.close()
        raise HTTPException(status_code=400, detail="No pending verification found.")

    code    = "".join(random.choices("0123456789", k=6))
    expires = (datetime.datetime.utcnow() + datetime.timedelta(minutes=15)).isoformat()
    c.execute(
        "UPDATE pending_verifications SET code=?, expires_at=? WHERE email=?",
        (code, expires, req.email)
    )
    conn.commit()
    conn.close()

    try:
        send_verification_email(req.email, pending["name"], code)
    except Exception as e:
        print(f"[Email error] {e}")
        raise HTTPException(status_code=500, detail="Failed to resend email.")

    return {"message": "New code sent"}


@app.post("/login")
async def login(req: LoginRequest):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, password_hash FROM users WHERE email = ?", (req.email,))
    user = c.fetchone()
    conn.close()

    if not user or not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    return {"token": create_token(user["id"]), "name": user["name"]}


@app.post("/try-on")
async def try_on(
    person_image: UploadFile = File(...),
    cloth_image:  UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    try:
        user_id     = get_current_user(authorization)
        person_bytes = await person_image.read()
        cloth_bytes  = await cloth_image.read()

        result_bytes, stats = processor.process_try_on(person_bytes, cloth_bytes)
        if not result_bytes:
            raise HTTPException(status_code=400, detail="Processing failed")

        if user_id:
            conn = get_db()
            c = conn.cursor()
            c.execute(
                "INSERT INTO history (user_id, person_image_base64, cloth_image_base64, result_image_base64, stats_json) VALUES (?,?,?,?,?)",
                (user_id,
                 base64.b64encode(person_bytes).decode(),
                 base64.b64encode(cloth_bytes).decode(),
                 base64.b64encode(result_bytes).decode(),
                 json.dumps(stats))
            )
            conn.commit()
            conn.close()

        return Response(
            content=result_bytes,
            media_type="image/jpeg",
            headers={"X-Stats": base64.b64encode(json.dumps(stats).encode()).decode()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history")
async def get_history(authorization: Optional[str] = Header(None)):
    user_id = get_current_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, person_image_base64, cloth_image_base64, result_image_base64, stats_json, created_at "
        "FROM history WHERE user_id=? ORDER BY created_at DESC",
        (user_id,)
    )
    rows = c.fetchall()
    conn.close()

    history = []
    for r in rows:
        history.append({
            "id":           r["id"],
            "person_image": f"data:image/jpeg;base64,{r['person_image_base64']}" if r["person_image_base64"] else None,
            "cloth_image":  f"data:image/jpeg;base64,{r['cloth_image_base64']}",
            "result_image": f"data:image/jpeg;base64,{r['result_image_base64']}",
            "stats":        json.loads(r["stats_json"]) if r["stats_json"] else None,
            "created_at":   r["created_at"],
        })
    return {"history": history}


@app.delete("/history/{item_id}")
async def delete_history(item_id: int, authorization: Optional[str] = Header(None)):
    user_id = get_current_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM history WHERE id=? AND user_id=?", (item_id, user_id))
    if c.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")
    conn.commit()
    conn.close()
    return {"message": "Item deleted"}


@app.get("/proxy-image")
async def proxy_image(url: str):
    import requests
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        return Response(content=r.content, media_type=r.headers.get("content-type", "image/jpeg"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/occasion-suggest")
async def occasion_suggest(req: OccasionRequest):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    import requests as req_lib

    prompt = f"""You are an expert fashion stylist AI. The user is attending: "{req.occasion}"

Return ONLY a JSON object (no markdown, no explanation) with exactly these fields:
{{
  "occasion_type": "one of: formal, casual, semi-formal, business, party, sport, outdoor, other",
  "formality": "one of: low, medium, high",
  "season": "one of: spring, summer, autumn, winter, all-season",
  "recommended_colors": ["3 to 5 color names that suit this occasion"],
  "outfit_suggestions": [
    {{"name": "short outfit name", "items": ["top item", "bottom item", "footwear"], "why": "one sentence reason"}},
    {{"name": "short outfit name", "items": ["top item", "bottom item", "footwear"], "why": "one sentence reason"}},
    {{"name": "short outfit name", "items": ["top item", "bottom item", "footwear"], "why": "one sentence reason"}}
  ],
  "avoid": ["2 to 3 things to avoid wearing for this occasion"]
}}"""

    try:
        response = req_lib.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "max_tokens": 700,
                "temperature": 0.7
            },
            timeout=20
        )
        if not response.ok:
            raise HTTPException(status_code=500, detail=f"Groq API error: {response.text}")

        data = response.json()
        result = json.loads(data["choices"][0]["message"]["content"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Occasion suggest failed: {str(e)}")


# ── Admin ────────────────────────────────────────────────────────────────────

@app.post("/admin/login")
async def admin_login(req: AdminLoginRequest):
    if req.username != ADMIN_USERNAME or req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return {"token": create_admin_token()}


@app.get("/admin/verify")
async def admin_verify(authorization: Optional[str] = Header(None)):
    if not verify_admin(authorization):
        raise HTTPException(status_code=401, detail="Not authorized")
    return {"is_admin": True}


@app.get("/admin/orders")
async def admin_get_all_orders(authorization: Optional[str] = Header(None)):
    if not verify_admin(authorization):
        raise HTTPException(status_code=401, detail="Not authorized")
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT o.id, o.user_id, u.name as user_name, u.email,
               o.items_json, o.total_price, o.status,
               o.payment_last4, o.shipping_name, o.shipping_address, o.created_at
        FROM orders o JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
    """)
    rows = c.fetchall()
    conn.close()
    return {"orders": [
        {
            "id": r["id"], "user_name": r["user_name"], "email": r["email"],
            "items": json.loads(r["items_json"]), "total_price": r["total_price"],
            "status": r["status"], "payment_last4": r["payment_last4"],
            "shipping_name": r["shipping_name"], "shipping_address": r["shipping_address"],
            "created_at": r["created_at"],
        } for r in rows
    ]}


# ── Products ─────────────────────────────────────────────────────────────────

@app.get("/products")
async def get_products():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, description, price, category, image_base64, created_by, created_at FROM products ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return {"products": [
        {
            "id": r["id"],
            "name": r["name"],
            "description": r["description"],
            "price": r["price"],
            "category": r["category"],
            "image": f"data:image/jpeg;base64,{r['image_base64']}" if r["image_base64"] else None,
            "created_by": r["created_by"],
            "created_at": r["created_at"],
        } for r in rows
    ]}


@app.post("/products")
async def add_product(
    name: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    category: str = Form("clothing"),
    image: Optional[UploadFile] = File(None),
    authorization: Optional[str] = Header(None)
):
    if not verify_admin(authorization):
        raise HTTPException(status_code=403, detail="Admin access required")
    image_b64 = None
    if image:
        image_bytes = await image.read()
        image_b64 = base64.b64encode(image_bytes).decode()
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO products (name, description, price, category, image_base64) VALUES (?,?,?,?,?)",
        (name, description, price, category, image_b64)
    )
    product_id = c.lastrowid
    conn.commit()
    conn.close()
    return {"id": product_id, "message": "Product added"}


@app.delete("/products/{product_id}")
async def delete_product(product_id: int, authorization: Optional[str] = Header(None)):
    if not verify_admin(authorization):
        raise HTTPException(status_code=403, detail="Admin access required")
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM products WHERE id=?", (product_id,))
    if c.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")
    conn.commit()
    conn.close()
    return {"message": "Product deleted"}


# ── Cart ──────────────────────────────────────────────────────────────────────

@app.get("/cart")
async def get_cart(authorization: Optional[str] = Header(None)):
    user_id = get_current_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT c.id, c.quantity, c.product_id,
               p.name, p.price, p.category, p.image_base64
        FROM cart c JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    """, (user_id,))
    rows = c.fetchall()
    conn.close()
    return {"cart": [
        {
            "id": r["id"],
            "product_id": r["product_id"],
            "name": r["name"],
            "price": r["price"],
            "category": r["category"],
            "quantity": r["quantity"],
            "image": f"data:image/jpeg;base64,{r['image_base64']}" if r["image_base64"] else None,
        } for r in rows
    ]}


@app.post("/cart")
async def add_to_cart(req: CartAddRequest, authorization: Optional[str] = Header(None)):
    user_id = get_current_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, quantity FROM cart WHERE user_id=? AND product_id=?", (user_id, req.product_id))
    existing = c.fetchone()
    if existing:
        c.execute("UPDATE cart SET quantity=? WHERE id=?", (existing["quantity"] + req.quantity, existing["id"]))
    else:
        c.execute("INSERT INTO cart (user_id, product_id, quantity) VALUES (?,?,?)", (user_id, req.product_id, req.quantity))
    conn.commit()
    conn.close()
    return {"message": "Added to cart"}


@app.delete("/cart/{cart_id}")
async def remove_from_cart(cart_id: int, authorization: Optional[str] = Header(None)):
    user_id = get_current_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM cart WHERE id=? AND user_id=?", (cart_id, user_id))
    conn.commit()
    conn.close()
    return {"message": "Removed"}


# ── Orders ────────────────────────────────────────────────────────────────────

@app.post("/orders")
async def place_order(req: PlaceOrderRequest, authorization: Optional[str] = Header(None)):
    user_id = get_current_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT c.quantity, p.name, p.price, p.id as product_id
        FROM cart c JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    """, (user_id,))
    cart_items = c.fetchall()
    if not cart_items:
        conn.close()
        raise HTTPException(status_code=400, detail="Cart is empty")
    items_list = [{"product_id": r["product_id"], "name": r["name"], "price": r["price"], "quantity": r["quantity"]} for r in cart_items]
    total = sum(r["price"] * r["quantity"] for r in cart_items)
    c.execute(
        "INSERT INTO orders (user_id, items_json, total_price, status, payment_last4, shipping_name, shipping_address) VALUES (?,?,?,?,?,?,?)",
        (user_id, json.dumps(items_list), total, "paid", req.payment_last4, req.shipping_name, req.shipping_address)
    )
    c.execute("DELETE FROM cart WHERE user_id=?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "Order placed", "total": total}


@app.get("/orders")
async def get_orders(authorization: Optional[str] = Header(None)):
    user_id = get_current_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, items_json, total_price, status, payment_last4, shipping_name, shipping_address, created_at FROM orders WHERE user_id=? ORDER BY created_at DESC",
        (user_id,)
    )
    rows = c.fetchall()
    conn.close()
    return {"orders": [
        {
            "id": r["id"],
            "items": json.loads(r["items_json"]),
            "total_price": r["total_price"],
            "status": r["status"],
            "payment_last4": r["payment_last4"],
            "shipping_name": r["shipping_name"],
            "shipping_address": r["shipping_address"],
            "created_at": r["created_at"],
        } for r in rows
    ]}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
