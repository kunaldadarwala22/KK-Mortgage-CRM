from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Query
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt as pyjwt
from bson import ObjectId
import base64
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Allowed email for access (whitelist)
ALLOWED_EMAILS = ["kunalkapadia2212@gmail.com", "test@kkmortgage.com"]

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'kk-mortgage-solutions-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="KK Mortgage Solutions CRM API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRole:
    ADMIN = "admin"
    ADVISOR = "advisor"
    ADMIN_STAFF = "admin_staff"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = UserRole.ADVISOR

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    picture: Optional[str] = None
    created_at: datetime

class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    dob: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    current_address: Optional[str] = None
    postcode: Optional[str] = None
    security_property_address: Optional[str] = None
    # Financial Snapshot
    income: Optional[float] = None
    employment_type: Optional[str] = None
    deposit: Optional[float] = None
    credit_issues: bool = False
    credit_issues_notes: Optional[str] = None
    existing_mortgage_balance: Optional[float] = None
    property_price: Optional[float] = None
    loan_amount: Optional[float] = None
    # Lead Source
    lead_source: Optional[str] = None
    referral_partner_name: Optional[str] = None
    # Compliance
    fact_find_complete: bool = False
    vulnerable_customer: bool = False
    advice_type: Optional[str] = None
    gdpr_consent_date: Optional[str] = None
    # Assignment
    advisor_id: Optional[str] = None

class ClientResponse(BaseModel):
    client_id: str
    first_name: str
    last_name: str
    dob: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    current_address: Optional[str] = None
    postcode: Optional[str] = None
    security_property_address: Optional[str] = None
    income: Optional[float] = None
    employment_type: Optional[str] = None
    deposit: Optional[float] = None
    credit_issues: bool = False
    credit_issues_notes: Optional[str] = None
    existing_mortgage_balance: Optional[float] = None
    property_price: Optional[float] = None
    loan_amount: Optional[float] = None
    ltv: Optional[float] = None
    lead_source: Optional[str] = None
    referral_partner_name: Optional[str] = None
    fact_find_complete: bool = False
    vulnerable_customer: bool = False
    advice_type: Optional[str] = None
    gdpr_consent_date: Optional[str] = None
    advisor_id: Optional[str] = None
    advisor_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CaseStatus:
    NEW_LEAD = "new_lead"
    FACT_FIND_COMPLETE = "fact_find_complete"
    APPLICATION_SUBMITTED = "application_submitted"
    VALUATION_BOOKED = "valuation_booked"
    OFFER_ISSUED = "offer_issued"
    COMPLETED = "completed"
    LOST_CASE = "lost_case"

class ProductType:
    MORTGAGE = "mortgage"
    INSURANCE = "insurance"

class MortgageType:
    PURCHASE = "purchase"
    REMORTGAGE = "remortgage"
    REMORTGAGE_ADDITIONAL = "remortgage_additional_borrowing"
    PRODUCT_TRANSFER = "product_transfer"

class InsuranceType:
    LIFE = "life_insurance"
    HOME = "home_insurance"
    BUILDINGS = "buildings_insurance"

class CommissionStatus:
    PENDING = "pending"
    SUBMITTED = "submitted_to_lender"
    PAID = "paid"
    CLAWED_BACK = "clawed_back"

class CaseCreate(BaseModel):
    client_id: str
    product_type: str
    mortgage_type: Optional[str] = None
    insurance_type: Optional[str] = None
    status: str = CaseStatus.NEW_LEAD
    # Mortgage Fields
    term_years: Optional[int] = None
    fixed_rate_period: Optional[int] = None
    interest_rate: Optional[float] = None
    lender_name: Optional[str] = None
    application_reference: Optional[str] = None
    date_application_submitted: Optional[str] = None
    expected_completion_date: Optional[str] = None
    product_start_date: Optional[str] = None
    product_review_date: Optional[str] = None
    product_expiry_date: Optional[str] = None
    loan_amount: Optional[float] = None
    # Commission
    proc_fee_type: Optional[str] = None  # "percentage" or "fixed"
    proc_fee_value: Optional[float] = None
    commission_percentage: Optional[float] = None
    gross_commission: Optional[float] = None
    your_commission_share: Optional[float] = None
    proc_fee_total: Optional[float] = None
    commission_status: str = CommissionStatus.PENDING
    # Assignment
    advisor_id: Optional[str] = None
    notes: Optional[str] = None

class CaseResponse(BaseModel):
    case_id: str
    client_id: str
    client_name: Optional[str] = None
    product_type: str
    mortgage_type: Optional[str] = None
    insurance_type: Optional[str] = None
    status: str
    term_years: Optional[int] = None
    fixed_rate_period: Optional[int] = None
    interest_rate: Optional[float] = None
    lender_name: Optional[str] = None
    application_reference: Optional[str] = None
    date_application_submitted: Optional[str] = None
    expected_completion_date: Optional[str] = None
    product_start_date: Optional[str] = None
    product_review_date: Optional[str] = None
    product_expiry_date: Optional[str] = None
    loan_amount: Optional[float] = None
    proc_fee_type: Optional[str] = None
    proc_fee_value: Optional[float] = None
    commission_percentage: Optional[float] = None
    gross_commission: Optional[float] = None
    your_commission_share: Optional[float] = None
    proc_fee_total: Optional[float] = None
    commission_status: str
    advisor_id: Optional[str] = None
    advisor_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: str
    client_id: Optional[str] = None
    case_id: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: str = "medium"
    task_type: Optional[str] = None

class TaskResponse(BaseModel):
    task_id: str
    title: str
    description: Optional[str] = None
    due_date: str
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    case_id: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    priority: str
    task_type: Optional[str] = None
    completed: bool = False
    completed_at: Optional[datetime] = None
    created_at: datetime

class DocumentCreate(BaseModel):
    client_id: str
    document_type: str
    file_name: str
    file_data: str  # Base64 encoded
    notes: Optional[str] = None

class DocumentResponse(BaseModel):
    document_id: str
    client_id: str
    document_type: str
    file_name: str
    notes: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_at: datetime

class AuditLogCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: str
    changes: Optional[Dict[str, Any]] = None
    user_id: str

# ==================== HELPER FUNCTIONS ====================

def generate_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Dict[str, Any]:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request) -> Dict[str, Any]:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    
    # Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        # Check if it's a session token
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
        # Try JWT token
        try:
            payload = decode_jwt_token(token)
            user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
            if user:
                return user
        except:
            pass
    
    raise HTTPException(status_code=401, detail="Not authenticated")

async def create_audit_log(action: str, entity_type: str, entity_id: str, user_id: str, changes: Dict = None):
    log = {
        "log_id": generate_id("log_"),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "user_id": user_id,
        "changes": changes,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log)

def calculate_ltv(loan_amount: float, property_price: float) -> float:
    if property_price and property_price > 0:
        return round((loan_amount / property_price) * 100, 2)
    return 0

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user: UserCreate):
    # Check if email is allowed
    if user.email.lower() not in [e.lower() for e in ALLOWED_EMAILS]:
        raise HTTPException(status_code=403, detail="Access denied. Your email is not authorized to use this system.")
    
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = generate_id("user_")
    hashed = hash_password(user.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "password": hashed,
        "role": user.role,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user.email, user.role)
    
    return {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "token": token
    }

@api_router.post("/auth/login")
async def login(user: UserLogin, response: Response):
    # Check if email is allowed
    if user.email.lower() not in [e.lower() for e in ALLOWED_EMAILS]:
        raise HTTPException(status_code=403, detail="Access denied. Your email is not authorized to use this system.")
    
    db_user = await db.users.find_one({"email": user.email}, {"_id": 0})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(db_user["user_id"], db_user["email"], db_user["role"])
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "session_id": generate_id("sess_"),
        "user_id": db_user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": db_user["user_id"],
        "email": db_user["email"],
        "name": db_user["name"],
        "role": db_user["role"],
        "picture": db_user.get("picture"),
        "token": token
    }

@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process Emergent OAuth session_id and create local session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = resp.json()
        except Exception as e:
            logger.error(f"Error fetching session data: {e}")
            raise HTTPException(status_code=401, detail="Failed to verify session")
    
    # Check if user exists
    email = data.get("email")
    
    # Check if email is allowed
    if email.lower() not in [e.lower() for e in ALLOWED_EMAILS]:
        raise HTTPException(status_code=403, detail="Access denied. Your email is not authorized to use this system.")
    
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user data
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name"), "picture": data.get("picture")}}
        )
    else:
        # Create new user
        user_id = generate_id("user_")
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name"),
            "picture": data.get("picture"),
            "role": UserRole.ADVISOR,  # Default role for OAuth users
            "password": None,  # OAuth users don't have password
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = data.get("session_token") or f"session_{uuid.uuid4().hex}"
    session_doc = {
        "session_id": generate_id("sess_"),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    return user

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", UserRole.ADVISOR),
        "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out successfully"}

# ==================== USER ROUTES ====================

@api_router.get("/users")
async def get_users(request: Request):
    await get_current_user(request)
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    await get_current_user(request)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, request: Request):
    current_user = await get_current_user(request)
    body = await request.json()
    
    if current_user["role"] != UserRole.ADMIN and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in body.items() if k not in ["user_id", "password", "email"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    await create_audit_log("update", "user", user_id, current_user["user_id"], update_data)
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    return user

# ==================== CLIENT ROUTES ====================

@api_router.post("/clients", status_code=201)
async def create_client(client: ClientCreate, request: Request):
    current_user = await get_current_user(request)
    
    client_id = generate_id("client_")
    ltv = None
    if client.loan_amount and client.property_price:
        ltv = calculate_ltv(client.loan_amount, client.property_price)
    
    client_doc = {
        "client_id": client_id,
        **client.model_dump(),
        "ltv": ltv,
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clients.insert_one(client_doc)
    await create_audit_log("create", "client", client_id, current_user["user_id"])
    
    # Create retention reminder tasks if needed
    # This will be handled in a separate function
    
    result = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    return result

@api_router.get("/clients")
async def get_clients(
    request: Request,
    search: Optional[str] = None,
    advisor_id: Optional[str] = None,
    lead_source: Optional[str] = None,
    postcode: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    await get_current_user(request)
    
    query = {}
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    if advisor_id:
        query["advisor_id"] = advisor_id
    if lead_source:
        query["lead_source"] = lead_source
    if postcode:
        query["postcode"] = {"$regex": postcode, "$options": "i"}
    
    clients = await db.clients.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.clients.count_documents(query)
    
    # Enrich with advisor names
    for client in clients:
        if client.get("advisor_id"):
            advisor = await db.users.find_one({"user_id": client["advisor_id"]}, {"_id": 0, "name": 1})
            client["advisor_name"] = advisor["name"] if advisor else None
    
    return {"clients": clients, "total": total}

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, request: Request):
    await get_current_user(request)
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client.get("advisor_id"):
        advisor = await db.users.find_one({"user_id": client["advisor_id"]}, {"_id": 0, "name": 1})
        client["advisor_name"] = advisor["name"] if advisor else None
    
    return client

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, request: Request):
    current_user = await get_current_user(request)
    body = await request.json()
    
    update_data = {k: v for k, v in body.items() if k != "client_id"}
    
    # Recalculate LTV if needed
    if "loan_amount" in update_data or "property_price" in update_data:
        existing = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
        loan = update_data.get("loan_amount", existing.get("loan_amount"))
        price = update_data.get("property_price", existing.get("property_price"))
        if loan and price:
            update_data["ltv"] = calculate_ltv(loan, price)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.clients.update_one({"client_id": client_id}, {"$set": update_data})
    await create_audit_log("update", "client", client_id, current_user["user_id"], update_data)
    
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    return client

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, request: Request):
    current_user = await get_current_user(request)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete clients")
    
    await db.clients.delete_one({"client_id": client_id})
    await db.cases.delete_many({"client_id": client_id})
    await db.documents.delete_many({"client_id": client_id})
    await db.tasks.delete_many({"client_id": client_id})
    
    await create_audit_log("delete", "client", client_id, current_user["user_id"])
    
    return {"message": "Client deleted successfully"}

# ==================== CASE ROUTES ====================

@api_router.post("/cases")
async def create_case(case: CaseCreate, request: Request):
    current_user = await get_current_user(request)
    
    case_id = generate_id("case_")
    
    case_doc = {
        "case_id": case_id,
        **case.model_dump(),
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.cases.insert_one(case_doc)
    await create_audit_log("create", "case", case_id, current_user["user_id"])
    
    # Create auto tasks based on status
    await create_case_tasks(case_id, case.status, current_user["user_id"])
    
    result = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    return result

@api_router.get("/cases")
async def get_cases(
    request: Request,
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    product_type: Optional[str] = None,
    advisor_id: Optional[str] = None,
    lender_name: Optional[str] = None,
    commission_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    await get_current_user(request)
    
    query = {}
    if client_id:
        query["client_id"] = client_id
    if status:
        query["status"] = status
    if product_type:
        query["product_type"] = product_type
    if advisor_id:
        query["advisor_id"] = advisor_id
    if lender_name:
        query["lender_name"] = {"$regex": lender_name, "$options": "i"}
    if commission_status:
        query["commission_status"] = commission_status
    
    cases = await db.cases.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.cases.count_documents(query)
    
    # Enrich with client and advisor names
    for case in cases:
        client = await db.clients.find_one({"client_id": case["client_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        case["client_name"] = f"{client['first_name']} {client['last_name']}" if client else None
        
        if case.get("advisor_id"):
            advisor = await db.users.find_one({"user_id": case["advisor_id"]}, {"_id": 0, "name": 1})
            case["advisor_name"] = advisor["name"] if advisor else None
    
    return {"cases": cases, "total": total}

@api_router.get("/cases/{case_id}")
async def get_case(case_id: str, request: Request):
    await get_current_user(request)
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    client = await db.clients.find_one({"client_id": case["client_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
    case["client_name"] = f"{client['first_name']} {client['last_name']}" if client else None
    
    if case.get("advisor_id"):
        advisor = await db.users.find_one({"user_id": case["advisor_id"]}, {"_id": 0, "name": 1})
        case["advisor_name"] = advisor["name"] if advisor else None
    
    return case

@api_router.put("/cases/{case_id}")
async def update_case(case_id: str, request: Request):
    current_user = await get_current_user(request)
    body = await request.json()
    
    old_case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not old_case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    update_data = {k: v for k, v in body.items() if k != "case_id"}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.cases.update_one({"case_id": case_id}, {"$set": update_data})
    await create_audit_log("update", "case", case_id, current_user["user_id"], update_data)
    
    # Create tasks on status change
    if "status" in update_data and update_data["status"] != old_case["status"]:
        await create_case_tasks(case_id, update_data["status"], current_user["user_id"])
    
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    return case

@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str, request: Request):
    current_user = await get_current_user(request)
    
    await db.cases.delete_one({"case_id": case_id})
    await db.tasks.delete_many({"case_id": case_id})
    
    await create_audit_log("delete", "case", case_id, current_user["user_id"])
    
    return {"message": "Case deleted successfully"}

async def create_case_tasks(case_id: str, status: str, user_id: str):
    """Create automatic tasks based on case status changes"""
    task_templates = {
        CaseStatus.APPLICATION_SUBMITTED: {"title": "Follow up on application", "days": 3},
        CaseStatus.OFFER_ISSUED: {"title": "Review offer with client", "days": 2},
        CaseStatus.COMPLETED: {"title": "Completion follow-up and review", "days": 1}
    }
    
    if status in task_templates:
        template = task_templates[status]
        task_id = generate_id("task_")
        due_date = (datetime.now(timezone.utc) + timedelta(days=template["days"])).strftime("%Y-%m-%d")
        
        task_doc = {
            "task_id": task_id,
            "title": template["title"],
            "description": f"Auto-generated task for status: {status}",
            "due_date": due_date,
            "case_id": case_id,
            "assigned_to": user_id,
            "priority": "medium",
            "task_type": "auto",
            "completed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.tasks.insert_one(task_doc)

# ==================== TASK ROUTES ====================

@api_router.post("/tasks", status_code=201)
async def create_task(task: TaskCreate, request: Request):
    current_user = await get_current_user(request)
    
    task_id = generate_id("task_")
    
    task_doc = {
        "task_id": task_id,
        **task.model_dump(),
        "completed": False,
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tasks.insert_one(task_doc)
    await create_audit_log("create", "task", task_id, current_user["user_id"])
    
    result = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    return result

@api_router.get("/tasks")
async def get_tasks(
    request: Request,
    assigned_to: Optional[str] = None,
    client_id: Optional[str] = None,
    case_id: Optional[str] = None,
    completed: Optional[bool] = None,
    due_date: Optional[str] = None,
    overdue: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
):
    await get_current_user(request)
    
    query = {}
    if assigned_to:
        query["assigned_to"] = assigned_to
    if client_id:
        query["client_id"] = client_id
    if case_id:
        query["case_id"] = case_id
    if completed is not None:
        query["completed"] = completed
    if due_date:
        query["due_date"] = due_date
    if overdue:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        query["due_date"] = {"$lt": today}
        query["completed"] = False
    
    tasks = await db.tasks.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.tasks.count_documents(query)
    
    # Enrich with names
    for task in tasks:
        if task.get("client_id"):
            client = await db.clients.find_one({"client_id": task["client_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
            task["client_name"] = f"{client['first_name']} {client['last_name']}" if client else None
        if task.get("assigned_to"):
            user = await db.users.find_one({"user_id": task["assigned_to"]}, {"_id": 0, "name": 1})
            task["assigned_to_name"] = user["name"] if user else None
    
    return {"tasks": tasks, "total": total}

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, request: Request):
    current_user = await get_current_user(request)
    body = await request.json()
    
    update_data = {k: v for k, v in body.items() if k != "task_id"}
    
    if "completed" in update_data and update_data["completed"]:
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tasks.update_one({"task_id": task_id}, {"$set": update_data})
    await create_audit_log("update", "task", task_id, current_user["user_id"], update_data)
    
    task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    return task

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request):
    current_user = await get_current_user(request)
    
    await db.tasks.delete_one({"task_id": task_id})
    await create_audit_log("delete", "task", task_id, current_user["user_id"])
    
    return {"message": "Task deleted successfully"}

# ==================== DOCUMENT ROUTES ====================

@api_router.post("/documents")
async def create_document(doc: DocumentCreate, request: Request):
    current_user = await get_current_user(request)
    
    doc_id = generate_id("doc_")
    
    doc_record = {
        "document_id": doc_id,
        "client_id": doc.client_id,
        "document_type": doc.document_type,
        "file_name": doc.file_name,
        "file_data": doc.file_data,
        "notes": doc.notes,
        "uploaded_by": current_user["user_id"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.documents.insert_one(doc_record)
    await create_audit_log("create", "document", doc_id, current_user["user_id"])
    
    return {
        "document_id": doc_id,
        "client_id": doc.client_id,
        "document_type": doc.document_type,
        "file_name": doc.file_name,
        "uploaded_at": doc_record["uploaded_at"]
    }

@api_router.get("/documents")
async def get_documents(
    request: Request,
    client_id: Optional[str] = None,
    document_type: Optional[str] = None
):
    await get_current_user(request)
    
    query = {}
    if client_id:
        query["client_id"] = client_id
    if document_type:
        query["document_type"] = document_type
    
    documents = await db.documents.find(query, {"_id": 0, "file_data": 0}).to_list(1000)
    return documents

@api_router.get("/documents/{document_id}")
async def get_document(document_id: str, request: Request):
    await get_current_user(request)
    doc = await db.documents.find_one({"document_id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, request: Request):
    current_user = await get_current_user(request)
    
    await db.documents.delete_one({"document_id": document_id})
    await create_audit_log("delete", "document", document_id, current_user["user_id"])
    
    return {"message": "Document deleted successfully"}

# ==================== DASHBOARD & ANALYTICS ROUTES ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    await get_current_user(request)
    
    # Pipeline stats
    total_clients = await db.clients.count_documents({})
    total_cases = await db.cases.count_documents({})
    
    # Pipeline value
    pipeline = await db.cases.aggregate([
        {"$match": {"status": {"$ne": CaseStatus.LOST_CASE}}},
        {"$group": {"_id": None, "total_loan": {"$sum": "$loan_amount"}}}
    ]).to_list(1)
    total_pipeline_value = pipeline[0]["total_loan"] if pipeline else 0
    
    # Commission stats
    commission_agg = await db.cases.aggregate([
        {"$match": {"commission_status": CommissionStatus.PAID}},
        {"$group": {
            "_id": None,
            "total_gross": {"$sum": "$gross_commission"},
            "total_proc": {"$sum": "$proc_fee_total"},
            "total_share": {"$sum": "$your_commission_share"}
        }}
    ]).to_list(1)
    
    commission_stats = commission_agg[0] if commission_agg else {"total_gross": 0, "total_proc": 0, "total_share": 0}
    
    # Cases by status
    status_counts = await db.cases.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    # Completed vs Lost
    completed = await db.cases.count_documents({"status": CaseStatus.COMPLETED})
    lost = await db.cases.count_documents({"status": CaseStatus.LOST_CASE})
    
    # Conversion rate
    conversion_rate = round((completed / total_cases * 100), 2) if total_cases > 0 else 0
    
    # Average loan size
    avg_loan = await db.cases.aggregate([
        {"$match": {"loan_amount": {"$gt": 0}}},
        {"$group": {"_id": None, "avg": {"$avg": "$loan_amount"}}}
    ]).to_list(1)
    avg_loan_size = round(avg_loan[0]["avg"], 2) if avg_loan else 0
    
    # Expiring products (next 90 days)
    ninety_days = (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    expiring_count = await db.cases.count_documents({
        "product_expiry_date": {"$gte": today, "$lte": ninety_days},
        "status": CaseStatus.COMPLETED
    })
    
    # Tasks due today
    tasks_today = await db.tasks.count_documents({
        "due_date": today,
        "completed": False
    })
    
    # Overdue tasks
    overdue_tasks = await db.tasks.count_documents({
        "due_date": {"$lt": today},
        "completed": False
    })
    
    # Mortgage vs Insurance split
    mortgage_comm = await db.cases.aggregate([
        {"$match": {"product_type": ProductType.MORTGAGE, "commission_status": CommissionStatus.PAID}},
        {"$group": {"_id": None, "total": {"$sum": "$gross_commission"}}}
    ]).to_list(1)
    
    insurance_comm = await db.cases.aggregate([
        {"$match": {"product_type": ProductType.INSURANCE, "commission_status": CommissionStatus.PAID}},
        {"$group": {"_id": None, "total": {"$sum": "$gross_commission"}}}
    ]).to_list(1)
    
    return {
        "total_clients": total_clients,
        "total_cases": total_cases,
        "total_pipeline_value": total_pipeline_value,
        "total_commission": commission_stats.get("total_gross", 0),
        "total_proc_fees": commission_stats.get("total_proc", 0),
        "your_commission_share": commission_stats.get("total_share", 0),
        "status_counts": {item["_id"]: item["count"] for item in status_counts},
        "completed_cases": completed,
        "lost_cases": lost,
        "conversion_rate": conversion_rate,
        "avg_loan_size": avg_loan_size,
        "expiring_products": expiring_count,
        "tasks_due_today": tasks_today,
        "overdue_tasks": overdue_tasks,
        "mortgage_commission": mortgage_comm[0]["total"] if mortgage_comm else 0,
        "insurance_commission": insurance_comm[0]["total"] if insurance_comm else 0
    }

@api_router.get("/dashboard/revenue")
async def get_revenue_analytics(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    await get_current_user(request)
    
    # Monthly revenue
    monthly_revenue = await db.cases.aggregate([
        {"$match": {"commission_status": CommissionStatus.PAID}},
        {"$addFields": {
            "month": {"$substr": ["$date_application_submitted", 0, 7]}
        }},
        {"$group": {
            "_id": "$month",
            "total": {"$sum": "$gross_commission"},
            "proc_fees": {"$sum": "$proc_fee_total"}
        }},
        {"$sort": {"_id": 1}},
        {"$limit": 12}
    ]).to_list(12)
    
    # Revenue by lender
    by_lender = await db.cases.aggregate([
        {"$match": {"commission_status": CommissionStatus.PAID, "lender_name": {"$ne": None}}},
        {"$group": {
            "_id": "$lender_name",
            "total": {"$sum": "$gross_commission"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"total": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    # Revenue by lead source
    by_source = await db.cases.aggregate([
        {"$lookup": {
            "from": "clients",
            "localField": "client_id",
            "foreignField": "client_id",
            "as": "client"
        }},
        {"$unwind": "$client"},
        {"$match": {"commission_status": CommissionStatus.PAID}},
        {"$group": {
            "_id": "$client.lead_source",
            "total": {"$sum": "$gross_commission"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"total": -1}}
    ]).to_list(10)
    
    # Revenue by product type
    by_product = await db.cases.aggregate([
        {"$match": {"commission_status": CommissionStatus.PAID}},
        {"$group": {
            "_id": "$product_type",
            "total": {"$sum": "$gross_commission"},
            "count": {"$sum": 1}
        }}
    ]).to_list(10)
    
    return {
        "monthly_revenue": monthly_revenue,
        "by_lender": by_lender,
        "by_lead_source": by_source,
        "by_product_type": by_product
    }

@api_router.get("/dashboard/forecast")
async def get_commission_forecast(request: Request):
    await get_current_user(request)
    
    today = datetime.now(timezone.utc)
    
    # 30, 60, 90 day forecasts
    forecasts = {}
    for days in [30, 60, 90]:
        future_date = (today + timedelta(days=days)).strftime("%Y-%m-%d")
        today_str = today.strftime("%Y-%m-%d")
        
        result = await db.cases.aggregate([
            {"$match": {
                "expected_completion_date": {"$gte": today_str, "$lte": future_date},
                "commission_status": {"$in": [CommissionStatus.PENDING, CommissionStatus.SUBMITTED]}
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$gross_commission"},
                "count": {"$sum": 1}
            }}
        ]).to_list(1)
        
        forecasts[f"next_{days}_days"] = {
            "amount": result[0]["total"] if result else 0,
            "cases": result[0]["count"] if result else 0
        }
    
    return forecasts

@api_router.get("/dashboard/retention")
async def get_retention_data(request: Request):
    await get_current_user(request)
    
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")
    
    # Products expiring this month
    month_end = (today.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    month_end_str = month_end.strftime("%Y-%m-%d")
    
    expiring_this_month = await db.cases.find({
        "product_expiry_date": {"$gte": today_str, "$lte": month_end_str},
        "status": CaseStatus.COMPLETED
    }, {"_id": 0}).to_list(100)
    
    # Enrich with client names
    for case in expiring_this_month:
        client = await db.clients.find_one({"client_id": case["client_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        case["client_name"] = f"{client['first_name']} {client['last_name']}" if client else None
    
    # Expiring by month (next 12 months)
    expiring_by_month = await db.cases.aggregate([
        {"$match": {
            "product_expiry_date": {"$gte": today_str},
            "status": CaseStatus.COMPLETED
        }},
        {"$addFields": {
            "expiry_month": {"$substr": ["$product_expiry_date", 0, 7]}
        }},
        {"$group": {
            "_id": "$expiry_month",
            "count": {"$sum": 1},
            "value": {"$sum": "$loan_amount"}
        }},
        {"$sort": {"_id": 1}},
        {"$limit": 12}
    ]).to_list(12)
    
    # Total retention pipeline value
    retention_value = await db.cases.aggregate([
        {"$match": {
            "product_expiry_date": {"$gte": today_str},
            "status": CaseStatus.COMPLETED
        }},
        {"$group": {"_id": None, "total": {"$sum": "$loan_amount"}}}
    ]).to_list(1)
    
    return {
        "expiring_this_month": expiring_this_month,
        "expiring_by_month": expiring_by_month,
        "retention_pipeline_value": retention_value[0]["total"] if retention_value else 0
    }

@api_router.get("/dashboard/lead-analytics")
async def get_lead_analytics(request: Request):
    await get_current_user(request)
    
    # Conversion rate by source
    source_stats = await db.cases.aggregate([
        {"$lookup": {
            "from": "clients",
            "localField": "client_id",
            "foreignField": "client_id",
            "as": "client"
        }},
        {"$unwind": "$client"},
        {"$group": {
            "_id": "$client.lead_source",
            "total": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", CaseStatus.COMPLETED]}, 1, 0]}},
            "avg_loan": {"$avg": "$loan_amount"},
            "total_commission": {"$sum": {"$cond": [{"$eq": ["$commission_status", CommissionStatus.PAID]}, "$gross_commission", 0]}}
        }}
    ]).to_list(100)
    
    for stat in source_stats:
        stat["conversion_rate"] = round((stat["completed"] / stat["total"] * 100), 2) if stat["total"] > 0 else 0
    
    # Revenue by referral partner
    referral_stats = await db.cases.aggregate([
        {"$lookup": {
            "from": "clients",
            "localField": "client_id",
            "foreignField": "client_id",
            "as": "client"
        }},
        {"$unwind": "$client"},
        {"$match": {"client.lead_source": "referral", "client.referral_partner_name": {"$ne": None}}},
        {"$group": {
            "_id": "$client.referral_partner_name",
            "count": {"$sum": 1},
            "total_commission": {"$sum": {"$cond": [{"$eq": ["$commission_status", CommissionStatus.PAID]}, "$gross_commission", 0]}}
        }},
        {"$sort": {"total_commission": -1}}
    ]).to_list(20)
    
    return {
        "by_lead_source": source_stats,
        "by_referral_partner": referral_stats
    }

# ==================== AUDIT LOG ROUTES ====================

@api_router.get("/audit-logs")
async def get_audit_logs(
    request: Request,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    current_user = await get_current_user(request)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can view audit logs")
    
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with user names
    for log in logs:
        user = await db.users.find_one({"user_id": log["user_id"]}, {"_id": 0, "name": 1})
        log["user_name"] = user["name"] if user else None
    
    return logs

# ==================== UTILITY ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "KK Mortgage Solutions CRM API", "version": "1.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== EXPORT ROUTES ====================

@api_router.get("/export/excel")
async def export_all_data(request: Request):
    """Export all CRM data to Excel file"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
    
    current_user = await get_current_user(request)
    
    # Create workbook
    wb = Workbook()
    
    # Style definitions
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="DC2626", end_color="DC2626", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # ===== CLIENTS SHEET =====
    ws_clients = wb.active
    ws_clients.title = "Clients"
    
    client_headers = [
        "Client ID", "First Name", "Last Name", "Email", "Phone", "DOB",
        "Address", "Postcode", "Income", "Employment Type", "Deposit",
        "Property Price", "Loan Amount", "LTV %", "Credit Issues",
        "Lead Source", "Referral Partner", "Fact Find Complete",
        "Vulnerable Customer", "Advice Type", "GDPR Consent Date",
        "Created At"
    ]
    ws_clients.append(client_headers)
    
    # Style headers
    for col, header in enumerate(client_headers, 1):
        cell = ws_clients.cell(row=1, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    # Fetch and add client data
    clients = await db.clients.find({}, {"_id": 0}).to_list(10000)
    for client in clients:
        row = [
            client.get("client_id", ""),
            client.get("first_name", ""),
            client.get("last_name", ""),
            client.get("email", ""),
            client.get("phone", ""),
            client.get("dob", ""),
            client.get("current_address", ""),
            client.get("postcode", ""),
            client.get("income", ""),
            client.get("employment_type", ""),
            client.get("deposit", ""),
            client.get("property_price", ""),
            client.get("loan_amount", ""),
            client.get("ltv", ""),
            "Yes" if client.get("credit_issues") else "No",
            client.get("lead_source", ""),
            client.get("referral_partner_name", ""),
            "Yes" if client.get("fact_find_complete") else "No",
            "Yes" if client.get("vulnerable_customer") else "No",
            client.get("advice_type", ""),
            client.get("gdpr_consent_date", ""),
            client.get("created_at", "")
        ]
        ws_clients.append(row)
    
    # Auto-adjust column widths for clients
    for col in ws_clients.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws_clients.column_dimensions[column].width = min(max_length + 2, 50)
    
    # ===== CASES SHEET =====
    ws_cases = wb.create_sheet("Cases")
    
    case_headers = [
        "Case ID", "Client ID", "Product Type", "Mortgage Type", "Insurance Type",
        "Status", "Lender Name", "Loan Amount", "Term (Years)", "Interest Rate",
        "Application Reference", "Application Date", "Expected Completion",
        "Product Start Date", "Product Review Date", "Product Expiry Date",
        "Proc Fee Type", "Proc Fee Value", "Commission %", "Gross Commission",
        "Your Share", "Proc Fee Total", "Commission Status", "Created At"
    ]
    ws_cases.append(case_headers)
    
    for col, header in enumerate(case_headers, 1):
        cell = ws_cases.cell(row=1, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    cases = await db.cases.find({}, {"_id": 0}).to_list(10000)
    for case in cases:
        row = [
            case.get("case_id", ""),
            case.get("client_id", ""),
            case.get("product_type", ""),
            case.get("mortgage_type", ""),
            case.get("insurance_type", ""),
            case.get("status", ""),
            case.get("lender_name", ""),
            case.get("loan_amount", ""),
            case.get("term_years", ""),
            case.get("interest_rate", ""),
            case.get("application_reference", ""),
            case.get("date_application_submitted", ""),
            case.get("expected_completion_date", ""),
            case.get("product_start_date", ""),
            case.get("product_review_date", ""),
            case.get("product_expiry_date", ""),
            case.get("proc_fee_type", ""),
            case.get("proc_fee_value", ""),
            case.get("commission_percentage", ""),
            case.get("gross_commission", ""),
            case.get("your_commission_share", ""),
            case.get("proc_fee_total", ""),
            case.get("commission_status", ""),
            case.get("created_at", "")
        ]
        ws_cases.append(row)
    
    for col in ws_cases.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws_cases.column_dimensions[column].width = min(max_length + 2, 50)
    
    # ===== TASKS SHEET =====
    ws_tasks = wb.create_sheet("Tasks")
    
    task_headers = [
        "Task ID", "Title", "Description", "Due Date", "Priority",
        "Client ID", "Case ID", "Assigned To", "Completed", "Completed At", "Created At"
    ]
    ws_tasks.append(task_headers)
    
    for col, header in enumerate(task_headers, 1):
        cell = ws_tasks.cell(row=1, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(10000)
    for task in tasks:
        row = [
            task.get("task_id", ""),
            task.get("title", ""),
            task.get("description", ""),
            task.get("due_date", ""),
            task.get("priority", ""),
            task.get("client_id", ""),
            task.get("case_id", ""),
            task.get("assigned_to", ""),
            "Yes" if task.get("completed") else "No",
            task.get("completed_at", ""),
            task.get("created_at", "")
        ]
        ws_tasks.append(row)
    
    for col in ws_tasks.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws_tasks.column_dimensions[column].width = min(max_length + 2, 50)
    
    # ===== DOCUMENTS SHEET =====
    ws_docs = wb.create_sheet("Documents")
    
    doc_headers = ["Document ID", "Client ID", "Document Type", "File Name", "Notes", "Uploaded By", "Uploaded At"]
    ws_docs.append(doc_headers)
    
    for col, header in enumerate(doc_headers, 1):
        cell = ws_docs.cell(row=1, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    documents = await db.documents.find({}, {"_id": 0, "file_data": 0}).to_list(10000)
    for doc in documents:
        row = [
            doc.get("document_id", ""),
            doc.get("client_id", ""),
            doc.get("document_type", ""),
            doc.get("file_name", ""),
            doc.get("notes", ""),
            doc.get("uploaded_by", ""),
            doc.get("uploaded_at", "")
        ]
        ws_docs.append(row)
    
    for col in ws_docs.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws_docs.column_dimensions[column].width = min(max_length + 2, 50)
    
    # ===== USERS SHEET =====
    ws_users = wb.create_sheet("Users")
    
    user_headers = ["User ID", "Name", "Email", "Role", "Created At"]
    ws_users.append(user_headers)
    
    for col, header in enumerate(user_headers, 1):
        cell = ws_users.cell(row=1, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(10000)
    for user in users:
        row = [
            user.get("user_id", ""),
            user.get("name", ""),
            user.get("email", ""),
            user.get("role", ""),
            user.get("created_at", "")
        ]
        ws_users.append(row)
    
    for col in ws_users.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws_users.column_dimensions[column].width = min(max_length + 2, 50)
    
    # Create audit log
    await create_audit_log("export", "all_data", "excel", current_user["user_id"])
    
    # Save to bytes
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    # Generate filename with timestamp
    filename = f"KK_Mortgage_CRM_Export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/export/clients")
async def export_clients_data(request: Request):
    """Export all clients data to a professionally formatted Excel file"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Border, Side, Alignment, NamedStyle
    from openpyxl.utils import get_column_letter
    
    current_user = await get_current_user(request)
    
    # Create workbook
    wb = Workbook()
    
    # Style definitions
    title_font = Font(bold=True, size=18, color="FFFFFF")
    subtitle_font = Font(bold=True, size=12, color="666666")
    header_font = Font(bold=True, size=11, color="FFFFFF")
    data_font = Font(size=10)
    currency_font = Font(size=10, color="228B22")
    
    # Colors - KK Mortgage Solutions branding
    primary_fill = PatternFill(start_color="DC2626", end_color="DC2626", fill_type="solid")  # Red
    secondary_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")  # Dark slate
    header_fill = PatternFill(start_color="374151", end_color="374151", fill_type="solid")  # Gray
    alt_row_fill = PatternFill(start_color="F9FAFB", end_color="F9FAFB", fill_type="solid")  # Light gray
    
    thin_border = Border(
        left=Side(style='thin', color='E5E7EB'),
        right=Side(style='thin', color='E5E7EB'),
        top=Side(style='thin', color='E5E7EB'),
        bottom=Side(style='thin', color='E5E7EB')
    )
    
    # Fetch all clients with their cases
    clients = await db.clients.find({}, {"_id": 0}).to_list(10000)
    
    # Enrich with advisor names and case counts
    for client in clients:
        if client.get("advisor_id"):
            advisor = await db.users.find_one({"user_id": client["advisor_id"]}, {"_id": 0, "name": 1})
            client["advisor_name"] = advisor["name"] if advisor else ""
        else:
            client["advisor_name"] = ""
        
        # Count cases for this client
        case_count = await db.cases.count_documents({"client_id": client["client_id"]})
        client["case_count"] = case_count
        
        # Get total loan value
        pipeline = await db.cases.aggregate([
            {"$match": {"client_id": client["client_id"]}},
            {"$group": {"_id": None, "total": {"$sum": "$loan_amount"}, "commission": {"$sum": "$gross_commission"}}}
        ]).to_list(1)
        client["total_loan_value"] = pipeline[0]["total"] if pipeline else 0
        client["total_commission"] = pipeline[0]["commission"] if pipeline else 0
    
    # ===== SHEET 1: CLIENT SUMMARY =====
    ws_summary = wb.active
    ws_summary.title = "Client Summary"
    
    # Title row
    ws_summary.merge_cells('A1:L1')
    title_cell = ws_summary['A1']
    title_cell.value = "KK MORTGAGE SOLUTIONS - CLIENT DATABASE"
    title_cell.font = title_font
    title_cell.fill = primary_fill
    title_cell.alignment = Alignment(horizontal='center', vertical='center')
    ws_summary.row_dimensions[1].height = 40
    
    # Subtitle row
    ws_summary.merge_cells('A2:L2')
    subtitle_cell = ws_summary['A2']
    subtitle_cell.value = f"Generated on {datetime.now(timezone.utc).strftime('%d %B %Y at %H:%M')} | Total Clients: {len(clients)}"
    subtitle_cell.font = subtitle_font
    subtitle_cell.alignment = Alignment(horizontal='center', vertical='center')
    ws_summary.row_dimensions[2].height = 25
    
    # Empty row
    ws_summary.row_dimensions[3].height = 10
    
    # Headers for summary
    summary_headers = [
        "Client Name", "Email", "Phone", "Postcode", "Income", 
        "Loan Amount", "LTV %", "Lead Source", "Advisor", 
        "Cases", "Total Value", "Commission"
    ]
    
    for col, header in enumerate(summary_headers, 1):
        cell = ws_summary.cell(row=4, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    ws_summary.row_dimensions[4].height = 30
    
    # Data rows
    row_num = 5
    for idx, client in enumerate(clients):
        # Alternate row colors
        fill = alt_row_fill if idx % 2 == 0 else None
        
        row_data = [
            f"{client.get('first_name', '')} {client.get('last_name', '')}",
            client.get('email', ''),
            client.get('phone', ''),
            client.get('postcode', ''),
            client.get('income', ''),
            client.get('loan_amount', ''),
            f"{client.get('ltv', '')}%" if client.get('ltv') else '',
            (client.get('lead_source', '') or '').replace('_', ' ').title(),
            client.get('advisor_name', ''),
            client.get('case_count', 0),
            client.get('total_loan_value', 0),
            client.get('total_commission', 0)
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws_summary.cell(row=row_num, column=col, value=value)
            cell.font = data_font
            cell.border = thin_border
            cell.alignment = Alignment(vertical='center')
            if fill:
                cell.fill = fill
            
            # Format currency columns
            if col in [5, 6, 11, 12] and isinstance(value, (int, float)) and value:
                cell.number_format = '£#,##0'
                cell.font = currency_font
        
        row_num += 1
    
    # Auto-fit columns
    column_widths = [25, 30, 15, 12, 12, 15, 8, 15, 20, 8, 15, 12]
    for col, width in enumerate(column_widths, 1):
        ws_summary.column_dimensions[get_column_letter(col)].width = width
    
    # ===== SHEET 2: FULL CLIENT DETAILS =====
    ws_details = wb.create_sheet("Client Details")
    
    # Title
    ws_details.merge_cells('A1:V1')
    title_cell = ws_details['A1']
    title_cell.value = "COMPLETE CLIENT INFORMATION"
    title_cell.font = title_font
    title_cell.fill = secondary_fill
    title_cell.alignment = Alignment(horizontal='center', vertical='center')
    ws_details.row_dimensions[1].height = 35
    
    # Headers
    detail_headers = [
        "ID", "First Name", "Last Name", "DOB", "Email", "Phone",
        "Address", "Postcode", "Security Property",
        "Income", "Employment", "Deposit", "Property Price", "Loan Amount", "LTV %",
        "Credit Issues", "Credit Notes", "Lead Source", "Referral Partner",
        "Fact Find", "Vulnerable", "Advice Type", "GDPR Date", "Advisor", "Created"
    ]
    
    for col, header in enumerate(detail_headers, 1):
        cell = ws_details.cell(row=2, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    ws_details.row_dimensions[2].height = 35
    
    # Data rows
    row_num = 3
    for idx, client in enumerate(clients):
        fill = alt_row_fill if idx % 2 == 0 else None
        
        row_data = [
            client.get('client_id', ''),
            client.get('first_name', ''),
            client.get('last_name', ''),
            client.get('dob', ''),
            client.get('email', ''),
            client.get('phone', ''),
            client.get('current_address', ''),
            client.get('postcode', ''),
            client.get('security_property_address', ''),
            client.get('income', ''),
            (client.get('employment_type', '') or '').replace('_', ' ').title(),
            client.get('deposit', ''),
            client.get('property_price', ''),
            client.get('loan_amount', ''),
            client.get('ltv', ''),
            'Yes' if client.get('credit_issues') else 'No',
            client.get('credit_issues_notes', ''),
            (client.get('lead_source', '') or '').replace('_', ' ').title(),
            client.get('referral_partner_name', ''),
            'Yes' if client.get('fact_find_complete') else 'No',
            'Yes' if client.get('vulnerable_customer') else 'No',
            (client.get('advice_type', '') or '').replace('_', ' ').title(),
            client.get('gdpr_consent_date', ''),
            client.get('advisor_name', ''),
            str(client.get('created_at', ''))[:10] if client.get('created_at') else ''
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws_details.cell(row=row_num, column=col, value=value)
            cell.font = data_font
            cell.border = thin_border
            cell.alignment = Alignment(vertical='center', wrap_text=True)
            if fill:
                cell.fill = fill
            
            # Format currency columns
            if col in [10, 12, 13, 14] and isinstance(value, (int, float)) and value:
                cell.number_format = '£#,##0'
                cell.font = currency_font
        
        row_num += 1
    
    # Column widths for details
    detail_widths = [15, 12, 12, 12, 25, 15, 30, 10, 30, 12, 15, 12, 12, 12, 8, 10, 25, 12, 20, 10, 10, 12, 12, 15, 12]
    for col, width in enumerate(detail_widths, 1):
        if col <= len(detail_widths):
            ws_details.column_dimensions[get_column_letter(col)].width = width
    
    # ===== SHEET 3: FINANCIAL SUMMARY =====
    ws_financial = wb.create_sheet("Financial Summary")
    
    # Title
    ws_financial.merge_cells('A1:H1')
    title_cell = ws_financial['A1']
    title_cell.value = "CLIENT FINANCIAL OVERVIEW"
    title_cell.font = title_font
    title_cell.fill = primary_fill
    title_cell.alignment = Alignment(horizontal='center', vertical='center')
    ws_financial.row_dimensions[1].height = 35
    
    # Headers
    financial_headers = [
        "Client Name", "Income", "Employment", "Property Price", 
        "Loan Amount", "Deposit", "LTV %", "Credit Issues"
    ]
    
    for col, header in enumerate(financial_headers, 1):
        cell = ws_financial.cell(row=2, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', vertical='center')
    ws_financial.row_dimensions[2].height = 25
    
    # Data rows - only clients with financial info
    row_num = 3
    for idx, client in enumerate(clients):
        if not client.get('income') and not client.get('loan_amount'):
            continue
            
        fill = alt_row_fill if idx % 2 == 0 else None
        
        row_data = [
            f"{client.get('first_name', '')} {client.get('last_name', '')}",
            client.get('income', ''),
            (client.get('employment_type', '') or '').replace('_', ' ').title(),
            client.get('property_price', ''),
            client.get('loan_amount', ''),
            client.get('deposit', ''),
            f"{client.get('ltv', '')}%" if client.get('ltv') else '',
            'Yes' if client.get('credit_issues') else 'No'
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws_financial.cell(row=row_num, column=col, value=value)
            cell.font = data_font
            cell.border = thin_border
            cell.alignment = Alignment(vertical='center')
            if fill:
                cell.fill = fill
            
            if col in [2, 4, 5, 6] and isinstance(value, (int, float)) and value:
                cell.number_format = '£#,##0'
                cell.font = currency_font
        
        row_num += 1
    
    # Add totals row
    total_income = sum(c.get('income', 0) or 0 for c in clients)
    total_property = sum(c.get('property_price', 0) or 0 for c in clients)
    total_loan = sum(c.get('loan_amount', 0) or 0 for c in clients)
    total_deposit = sum(c.get('deposit', 0) or 0 for c in clients)
    
    ws_financial.cell(row=row_num + 1, column=1, value="TOTALS").font = Font(bold=True)
    ws_financial.cell(row=row_num + 1, column=2, value=total_income).number_format = '£#,##0'
    ws_financial.cell(row=row_num + 1, column=4, value=total_property).number_format = '£#,##0'
    ws_financial.cell(row=row_num + 1, column=5, value=total_loan).number_format = '£#,##0'
    ws_financial.cell(row=row_num + 1, column=6, value=total_deposit).number_format = '£#,##0'
    
    for col in range(1, 9):
        ws_financial.cell(row=row_num + 1, column=col).font = Font(bold=True)
        ws_financial.cell(row=row_num + 1, column=col).fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    
    # Column widths
    financial_widths = [25, 15, 15, 15, 15, 15, 10, 12]
    for col, width in enumerate(financial_widths, 1):
        ws_financial.column_dimensions[get_column_letter(col)].width = width
    
    # ===== SHEET 4: LEAD SOURCE ANALYSIS =====
    ws_leads = wb.create_sheet("Lead Sources")
    
    # Title
    ws_leads.merge_cells('A1:F1')
    title_cell = ws_leads['A1']
    title_cell.value = "LEAD SOURCE ANALYSIS"
    title_cell.font = title_font
    title_cell.fill = secondary_fill
    title_cell.alignment = Alignment(horizontal='center', vertical='center')
    ws_leads.row_dimensions[1].height = 35
    
    # Aggregate by lead source
    lead_stats = {}
    for client in clients:
        source = client.get('lead_source', 'unknown') or 'unknown'
        if source not in lead_stats:
            lead_stats[source] = {'count': 0, 'total_loan': 0, 'total_income': 0}
        lead_stats[source]['count'] += 1
        lead_stats[source]['total_loan'] += client.get('loan_amount', 0) or 0
        lead_stats[source]['total_income'] += client.get('income', 0) or 0
    
    # Headers
    lead_headers = ["Lead Source", "Client Count", "Total Loan Value", "Avg Loan Value", "Total Income", "Avg Income"]
    for col, header in enumerate(lead_headers, 1):
        cell = ws_leads.cell(row=2, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    # Data
    row_num = 3
    for source, stats in sorted(lead_stats.items(), key=lambda x: x[1]['count'], reverse=True):
        avg_loan = stats['total_loan'] / stats['count'] if stats['count'] > 0 else 0
        avg_income = stats['total_income'] / stats['count'] if stats['count'] > 0 else 0
        
        row_data = [
            source.replace('_', ' ').title(),
            stats['count'],
            stats['total_loan'],
            avg_loan,
            stats['total_income'],
            avg_income
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws_leads.cell(row=row_num, column=col, value=value)
            cell.font = data_font
            cell.border = thin_border
            if col in [3, 4, 5, 6] and isinstance(value, (int, float)):
                cell.number_format = '£#,##0'
        
        row_num += 1
    
    # Column widths
    for col, width in enumerate([20, 15, 18, 15, 18, 15], 1):
        ws_leads.column_dimensions[get_column_letter(col)].width = width
    
    # Create audit log
    await create_audit_log("export", "clients_data", "excel", current_user["user_id"])
    
    # Save to bytes
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    # Generate filename with timestamp
    filename = f"KK_Mortgage_Clients_Export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
