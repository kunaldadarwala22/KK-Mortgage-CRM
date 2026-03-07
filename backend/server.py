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
import bcrypt
import jwt as pyjwt
from bson import ObjectId
import base64
import io
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Allowed email for access (whitelist)
DEFAULT_ADMIN_EMAIL = "kunalkapadia2212@gmail.com"
DEFAULT_ADMIN_PASSWORD = "Admin2468!!!"
DEFAULT_ADMIN_NAME = "Kunal Kapadia"

SECOND_USER_EMAIL = "kunal.dadarwala22@gmail.com"
SECOND_USER_PASSWORD = "Admin2468!!!"
SECOND_USER_NAME = "Kunal Dadarwala"

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
    # Additional applicants (joint applications)
    additional_applicants: Optional[List[Dict[str, Any]]] = None

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
    date_application_submitted: Optional[str] = None
    expected_completion_date: Optional[str] = None
    product_start_date: Optional[str] = None
    product_review_date: Optional[str] = None
    product_expiry_date: Optional[str] = None
    loan_amount: Optional[float] = None
    # New Mortgage Fields
    property_value: Optional[float] = None
    ltv: Optional[float] = None
    deposit_source: Optional[str] = None
    repayment_type: Optional[str] = None  # interest_only, repayment
    property_type: Optional[str] = None  # residential, buy_to_let
    case_reference: Optional[str] = None
    security_address: Optional[str] = None
    security_postcode: Optional[str] = None
    rate_fixed_for: Optional[int] = None  # years
    interest_rate_type: Optional[str] = None  # fixed, variable, discounted, tracker, capped
    initial_product_term: Optional[int] = None  # years
    # Insurance Fields
    insurance_cover_type: Optional[str] = None  # level_term, decreasing_term, increasing_term, whole_of_life
    insurance_reference: Optional[str] = None
    monthly_premium: Optional[float] = None
    guaranteed_or_reviewable: Optional[str] = None  # guaranteed, reviewable
    sum_assured: Optional[float] = None
    in_trust: Optional[bool] = None
    insurance_provider: Optional[str] = None
    # Commission
    proc_fee_type: Optional[str] = None
    proc_fee_value: Optional[float] = None
    commission_percentage: Optional[float] = None
    gross_commission: Optional[float] = None
    your_commission_share: Optional[float] = None
    proc_fee_total: Optional[float] = None
    commission_status: str = CommissionStatus.PENDING
    commission_paid_date: Optional[str] = None
    client_fee: Optional[float] = None
    client_fee_status: str = CommissionStatus.PENDING
    client_fee_paid_date: Optional[str] = None
    compliance_checklist: Optional[list] = None
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
    interest_rate_type: Optional[str] = None
    initial_product_term: Optional[int] = None
    lender_name: Optional[str] = None
    date_application_submitted: Optional[str] = None
    expected_completion_date: Optional[str] = None
    product_start_date: Optional[str] = None
    product_review_date: Optional[str] = None
    product_expiry_date: Optional[str] = None
    security_address: Optional[str] = None
    security_postcode: Optional[str] = None
    loan_amount: Optional[float] = None
    proc_fee_type: Optional[str] = None
    proc_fee_value: Optional[float] = None
    commission_percentage: Optional[float] = None
    gross_commission: Optional[float] = None
    your_commission_share: Optional[float] = None
    proc_fee_total: Optional[float] = None
    commission_status: str
    client_fee: Optional[float] = None
    client_fee_status: Optional[str] = None
    client_fee_paid_date: Optional[str] = None
    compliance_checklist: Optional[list] = None
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
    enrich_cases: bool = True,
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
    
    for client in clients:
        if client.get("advisor_id"):
            advisor = await db.users.find_one({"user_id": client["advisor_id"]}, {"_id": 0, "name": 1})
            client["advisor_name"] = advisor["name"] if advisor else None
        
        if enrich_cases:
            cases = await db.cases.find({"client_id": client["client_id"]}, {"_id": 0}).to_list(50)
            if cases:
                latest = max(cases, key=lambda c: c.get("created_at", ""))
                client["case_status"] = latest.get("status")
                client["commission_status"] = latest.get("commission_status")
                client["expected_completion_date"] = latest.get("expected_completion_date")
                client["case_property_value"] = latest.get("loan_amount")
                client["case_lender"] = latest.get("lender_name")
                client["case_loan_amount"] = latest.get("loan_amount")
                # Check expiry within 90 days
                for c in cases:
                    expiry = c.get("product_expiry_date")
                    if expiry:
                        try:
                            exp_date = datetime.strptime(expiry, "%Y-%m-%d")
                            days_until = (exp_date - datetime.now()).days
                            if 0 <= days_until <= 90:
                                client["expiring_soon"] = True
                                break
                        except:
                            pass
            # Recalculate LTV from client data
            if client.get("loan_amount") and client.get("property_price") and client["property_price"] > 0:
                client["ltv"] = round((client["loan_amount"] / client["property_price"]) * 100, 2)
    
    return {"clients": clients, "total": total}

@api_router.get("/clients/search")
async def search_clients(request: Request, q: str = ""):
    """Search clients by name for case creation"""
    await get_current_user(request)
    
    if not q or len(q) < 1:
        clients = await db.clients.find({}, {"_id": 0, "client_id": 1, "first_name": 1, "last_name": 1, "email": 1, "phone": 1}).limit(20).to_list(20)
        return clients
    
    query = {"$or": [
        {"first_name": {"$regex": q, "$options": "i"}},
        {"last_name": {"$regex": q, "$options": "i"}},
        {"email": {"$regex": q, "$options": "i"}},
    ]}
    clients = await db.clients.find(query, {"_id": 0, "client_id": 1, "first_name": 1, "last_name": 1, "email": 1, "phone": 1}).limit(20).to_list(20)
    return clients

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
    search: Optional[str] = None,
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
    
    # Search by client name
    if search:
        matching_clients = await db.clients.find({
            "$or": [
                {"first_name": {"$regex": search, "$options": "i"}},
                {"last_name": {"$regex": search, "$options": "i"}},
            ]
        }, {"client_id": 1, "_id": 0}).to_list(500)
        matching_ids = [c["client_id"] for c in matching_clients]
        query["client_id"] = {"$in": matching_ids} if matching_ids else "__no_match__"
    
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
    """Create automatic tasks only when case status is set to review"""
    review_statuses = ["review_due", "for_review"]
    
    if status.lower() in review_statuses:
        task_id = generate_id("task_")
        due_date = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
        
        case = await db.cases.find_one({"case_id": case_id}, {"_id": 0, "client_id": 1})
        client_id = case.get("client_id") if case else None
        
        task_doc = {
            "task_id": task_id,
            "title": f"Review case - {case_id}",
            "description": "Auto-generated: Case marked for review",
            "due_date": due_date,
            "case_id": case_id,
            "client_id": client_id,
            "assigned_to": user_id,
            "priority": "high",
            "task_type": "auto_review",
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
            "total_share": {"$sum": "$your_commission_share"},
            "total_client_fees": {"$sum": {"$ifNull": ["$client_fee", 0]}}
        }}
    ]).to_list(1)
    
    commission_stats = commission_agg[0] if commission_agg else {"total_gross": 0, "total_proc": 0, "total_share": 0, "total_client_fees": 0}
    
    # Client fee pending total
    cf_pending_agg = await db.cases.aggregate([
        {"$match": {"client_fee_status": CommissionStatus.PENDING, "client_fee": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$client_fee", 0]}}}}
    ]).to_list(1)
    
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
    
    # Expiring products (next 6 months)
    six_months = (datetime.now(timezone.utc) + timedelta(days=180)).strftime("%Y-%m-%d")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    expiring_count = await db.cases.count_documents({
        "product_expiry_date": {"$gte": today, "$lte": six_months},
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
        "insurance_commission": insurance_comm[0]["total"] if insurance_comm else 0,
        "total_client_fees": commission_stats.get("total_client_fees", 0),
        "client_fee_pending": cf_pending_agg[0]["total"] if cf_pending_agg else 0
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
async def get_commission_summary(request: Request):
    """Commission & Client Fee stats: This Month, Last 30 Days, Totals, Pending"""
    await get_current_user(request)
    
    today = datetime.now(timezone.utc)
    month_start = today.replace(day=1).strftime("%Y-%m-%d")
    month_end = today.strftime("%Y-%m-%d")
    thirty_days_ago = (today - timedelta(days=30)).strftime("%Y-%m-%d")
    
    # --- Commission Paid This Month (by commission_paid_date) ---
    comm_this_month = await db.cases.aggregate([
        {"$match": {
            "commission_status": CommissionStatus.PAID,
            "$or": [
                {"commission_paid_date": {"$gte": month_start, "$lte": month_end}},
                {"commission_paid_date": {"$in": [None, ""]}, "expected_completion_date": {"$gte": month_start, "$lte": month_end}}
            ]
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": {"$ifNull": ["$gross_commission", 0]}},
            "proc_fees": {"$sum": {"$ifNull": ["$proc_fee_total", 0]}},
            "count": {"$sum": 1}
        }}
    ]).to_list(1)
    
    # --- Commission Paid Last 30 Days (by commission_paid_date) ---
    comm_last_30 = await db.cases.aggregate([
        {"$match": {
            "commission_status": CommissionStatus.PAID,
            "$or": [
                {"commission_paid_date": {"$gte": thirty_days_ago, "$lte": month_end}},
                {"commission_paid_date": {"$in": [None, ""]}, "expected_completion_date": {"$gte": thirty_days_ago, "$lte": month_end}}
            ]
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": {"$ifNull": ["$gross_commission", 0]}},
            "proc_fees": {"$sum": {"$ifNull": ["$proc_fee_total", 0]}},
            "count": {"$sum": 1}
        }}
    ]).to_list(1)
    
    # --- Client Fees Paid This Month (by client_fee_paid_date) ---
    cf_this_month = await db.cases.aggregate([
        {"$match": {
            "client_fee_status": CommissionStatus.PAID,
            "$or": [
                {"client_fee_paid_date": {"$gte": month_start, "$lte": month_end}},
                {"client_fee_paid_date": {"$in": [None, ""]}, "expected_completion_date": {"$gte": month_start, "$lte": month_end}}
            ]
        }},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$client_fee", 0]}}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    # --- Client Fees Paid Last 30 Days (by client_fee_paid_date) ---
    cf_last_30 = await db.cases.aggregate([
        {"$match": {
            "client_fee_status": CommissionStatus.PAID,
            "$or": [
                {"client_fee_paid_date": {"$gte": thirty_days_ago, "$lte": month_end}},
                {"client_fee_paid_date": {"$in": [None, ""]}, "expected_completion_date": {"$gte": thirty_days_ago, "$lte": month_end}}
            ]
        }},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$client_fee", 0]}}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    # --- Total Client Fees (paid only) ---
    total_cf_paid = await db.cases.aggregate([
        {"$match": {"client_fee_status": CommissionStatus.PAID}},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$client_fee", 0]}}}}
    ]).to_list(1)
    
    # --- Client Fee Pending ---
    cf_pending = await db.cases.aggregate([
        {"$match": {"client_fee_status": CommissionStatus.PENDING, "client_fee": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$client_fee", 0]}}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    return {
        "commission_this_month": {
            "amount": comm_this_month[0]["total"] if comm_this_month else 0,
            "proc_fees": comm_this_month[0]["proc_fees"] if comm_this_month else 0,
            "cases": comm_this_month[0]["count"] if comm_this_month else 0
        },
        "commission_last_30_days": {
            "amount": comm_last_30[0]["total"] if comm_last_30 else 0,
            "proc_fees": comm_last_30[0]["proc_fees"] if comm_last_30 else 0,
            "cases": comm_last_30[0]["count"] if comm_last_30 else 0
        },
        "client_fees_paid_this_month": cf_this_month[0]["total"] if cf_this_month else 0,
        "client_fees_paid_last_30_days": cf_last_30[0]["total"] if cf_last_30 else 0,
        "total_client_fees_paid": total_cf_paid[0]["total"] if total_cf_paid else 0,
        "client_fee_pending": cf_pending[0]["total"] if cf_pending else 0
    }

@api_router.get("/dashboard/retention")
async def get_retention_data(request: Request):
    await get_current_user(request)
    
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")
    
    # Products expiring within the next 6 months
    six_months_ahead = (today + timedelta(days=180)).strftime("%Y-%m-%d")
    
    expiring_this_month = await db.cases.find({
        "product_expiry_date": {"$gte": today_str, "$lte": six_months_ahead},
        "status": CaseStatus.COMPLETED
    }, {"_id": 0}).sort("product_expiry_date", 1).to_list(100)
    
    # Enrich with client names
    for case in expiring_this_month:
        client = await db.clients.find_one({"client_id": case["client_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        case["client_name"] = f"{client['first_name']} {client['last_name']}" if client else None
    
    # Expiring by month (next 6 months only)
    expiring_by_month = await db.cases.aggregate([
        {"$match": {
            "product_expiry_date": {"$gte": today_str, "$lte": six_months_ahead},
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
        {"$limit": 6}
    ]).to_list(6)
    
    # Total retention pipeline value (6 months only)
    retention_value = await db.cases.aggregate([
        {"$match": {
            "product_expiry_date": {"$gte": today_str, "$lte": six_months_ahead},
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

# ==================== GLOBAL SEARCH ====================

@api_router.get("/search")
async def global_search(request: Request, q: str = ""):
    """Search across clients and cases"""
    await get_current_user(request)
    
    if not q or len(q) < 2:
        return {"clients": [], "cases": []}
    
    # Search clients
    client_query = {"$or": [
        {"first_name": {"$regex": q, "$options": "i"}},
        {"last_name": {"$regex": q, "$options": "i"}},
        {"email": {"$regex": q, "$options": "i"}},
        {"phone": {"$regex": q, "$options": "i"}},
        {"postcode": {"$regex": q, "$options": "i"}},
    ]}
    clients = await db.clients.find(client_query, {"_id": 0, "client_id": 1, "first_name": 1, "last_name": 1, "email": 1, "phone": 1}).limit(10).to_list(10)
    
    # Search cases
    case_query = {"$or": [
        {"case_id": {"$regex": q, "$options": "i"}},
        {"lender_name": {"$regex": q, "$options": "i"}},
        {"case_reference": {"$regex": q, "$options": "i"}},
        {"case_reference": {"$regex": q, "$options": "i"}},
        {"insurance_reference": {"$regex": q, "$options": "i"}},
    ]}
    cases = await db.cases.find(case_query, {"_id": 0, "case_id": 1, "client_id": 1, "product_type": 1, "status": 1, "lender_name": 1}).limit(10).to_list(10)
    
    # Enrich cases with client names
    for case in cases:
        client = await db.clients.find_one({"client_id": case["client_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        case["client_name"] = f"{client['first_name']} {client['last_name']}" if client else "Unknown"
    
    return {"clients": clients, "cases": cases}

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(request: Request):
    """Get notifications: overdue tasks, expiring products, upcoming tasks"""
    await get_current_user(request)
    
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    week_ahead = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    month_ahead = (now + timedelta(days=30)).strftime("%Y-%m-%d")
    
    notifications = []
    
    # Overdue tasks
    overdue_tasks = await db.tasks.find({
        "completed": False,
        "due_date": {"$lt": today}
    }, {"_id": 0}).sort("due_date", 1).limit(10).to_list(10)
    
    for task in overdue_tasks:
        notifications.append({
            "type": "overdue_task",
            "title": f"Overdue: {task['title']}",
            "description": f"Due: {task.get('due_date', '')}",
            "link": f"/tasks",
            "severity": "high",
            "created_at": task.get("created_at", "")
        })
    
    # Tasks due this week
    upcoming_tasks = await db.tasks.find({
        "completed": False,
        "due_date": {"$gte": today, "$lte": week_ahead}
    }, {"_id": 0}).sort("due_date", 1).limit(10).to_list(10)
    
    for task in upcoming_tasks:
        notifications.append({
            "type": "upcoming_task",
            "title": f"Due soon: {task['title']}",
            "description": f"Due: {task.get('due_date', '')}",
            "link": f"/tasks",
            "severity": "medium",
            "created_at": task.get("created_at", "")
        })
    
    # Expiring products (cases with product_expiry_date coming up)
    expiring_cases = await db.cases.find({
        "product_expiry_date": {"$gte": today, "$lte": month_ahead},
        "status": {"$ne": "completed"}
    }, {"_id": 0, "case_id": 1, "client_id": 1, "product_type": 1, "product_expiry_date": 1, "lender_name": 1}).limit(10).to_list(10)
    
    for case in expiring_cases:
        client = await db.clients.find_one({"client_id": case["client_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        client_name = f"{client['first_name']} {client['last_name']}" if client else "Unknown"
        notifications.append({
            "type": "expiring_product",
            "title": f"Product expiring: {client_name}",
            "description": f"{case.get('lender_name', case.get('product_type', ''))} - Expires: {case.get('product_expiry_date', '')}",
            "link": f"/cases/{case['case_id']}",
            "severity": "high",
            "created_at": case.get("product_expiry_date", "")
        })
    
    return {"notifications": notifications, "count": len(notifications)}

# ==================== CLIENT SEARCH (for case creation) ====================

# (Moved to before /clients/{client_id} to avoid path conflicts)

# ==================== UTILITY ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "KK Mortgage Solutions CRM API", "version": "1.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== COMMISSION ANALYTICS ROUTES ====================

@api_router.get("/commission/monthly")
async def get_commission_monthly(
    request: Request,
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Monthly commission breakdown with status grouping, using commission_paid_date for paid cases"""
    await get_current_user(request)
    
    match_stage = {}
    if start_date and end_date:
        match_stage["$or"] = [
            {"commission_paid_date": {"$gte": start_date, "$lte": end_date}},
            {"commission_paid_date": {"$exists": False}, "expected_completion_date": {"$gte": start_date, "$lte": end_date}},
            {"commission_paid_date": None, "expected_completion_date": {"$gte": start_date, "$lte": end_date}},
        ]
    elif year:
        match_stage["$or"] = [
            {"commission_paid_date": {"$regex": f"^{year}"}},
            {"commission_paid_date": {"$exists": False}, "expected_completion_date": {"$regex": f"^{year}"}},
            {"commission_paid_date": None, "expected_completion_date": {"$regex": f"^{year}"}},
        ]
    
    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$addFields": {
            "effective_date": {"$cond": {
                "if": {"$and": [{"$ne": ["$commission_paid_date", None]}, {"$ne": ["$commission_paid_date", ""]}]},
                "then": "$commission_paid_date",
                "else": "$expected_completion_date"
            }},
        }},
        {"$addFields": {
            "month": {"$cond": {
                "if": {"$and": [{"$ne": ["$effective_date", None]}, {"$ne": ["$effective_date", ""]}]},
                "then": {"$substr": ["$effective_date", 0, 7]},
                "else": "unknown"
            }}
        }},
        {"$group": {
            "_id": {"month": "$month", "commission_status": "$commission_status", "product_type": "$product_type"},
            "total_commission": {"$sum": {"$ifNull": ["$gross_commission", 0]}},
            "total_proc_fees": {"$sum": {"$ifNull": ["$proc_fee_total", 0]}},
            "total_client_fees": {"$sum": {"$ifNull": ["$client_fee", 0]}},
            "case_count": {"$sum": 1}
        }},
        {"$sort": {"_id.month": 1}}
    ]
    
    results = await db.cases.aggregate(pipeline).to_list(500)
    
    months = {}
    for r in results:
        month = r["_id"]["month"]
        status = r["_id"]["commission_status"] or "pending"
        ptype = r["_id"]["product_type"] or "mortgage"
        
        if month not in months:
            months[month] = {
                "month": month,
                "pending": 0, "submitted": 0, "paid": 0, "clawed_back": 0,
                "mortgage_commission": 0, "insurance_commission": 0,
                "proc_fees": 0, "client_fees": 0, "total_commission": 0, "case_count": 0
            }
        
        commission = r["total_commission"]
        proc = r["total_proc_fees"]
        client_fees = r["total_client_fees"]
        
        status_key = {"pending": "pending", "submitted_to_lender": "submitted", "paid": "paid", "clawed_back": "clawed_back"}.get(status, "pending")
        months[month][status_key] += commission
        
        if ptype == "mortgage":
            months[month]["mortgage_commission"] += commission
        else:
            months[month]["insurance_commission"] += commission
        
        months[month]["proc_fees"] += proc
        months[month]["client_fees"] += client_fees
        months[month]["total_commission"] += commission
        months[month]["case_count"] += r["case_count"]
    
    monthly_data = sorted(months.values(), key=lambda x: x["month"])
    
    totals = {
        "total_pending": sum(m["pending"] for m in monthly_data),
        "total_submitted": sum(m["submitted"] for m in monthly_data),
        "total_paid": sum(m["paid"] for m in monthly_data),
        "total_clawed_back": sum(m["clawed_back"] for m in monthly_data),
        "total_mortgage": sum(m["mortgage_commission"] for m in monthly_data),
        "total_insurance": sum(m["insurance_commission"] for m in monthly_data),
        "total_proc_fees": sum(m["proc_fees"] for m in monthly_data),
        "total_client_fees": sum(m["client_fees"] for m in monthly_data),
        "grand_total": sum(m["total_commission"] for m in monthly_data),
    }
    
    return {"monthly": monthly_data, "totals": totals}

@api_router.get("/commission/analytics")
async def get_commission_analytics(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    product_filter: Optional[str] = None,
    commission_status: Optional[str] = None
):
    """Comprehensive commission analytics"""
    await get_current_user(request)
    
    match_stage = {}
    if start_date:
        match_stage.setdefault("expected_completion_date", {})["$gte"] = start_date
    if end_date:
        match_stage.setdefault("expected_completion_date", {})["$lte"] = end_date
    if product_filter and product_filter != "all":
        match_stage["product_type"] = product_filter
    if commission_status and commission_status != "all":
        match_stage["commission_status"] = commission_status
    
    base_match = [{"$match": match_stage}] if match_stage else [{"$match": {}}]
    
    # By month
    by_month = await db.cases.aggregate(base_match + [
        {"$addFields": {"month": {"$cond": {
            "if": {"$and": [{"$ne": ["$expected_completion_date", None]}, {"$ne": ["$expected_completion_date", ""]}]},
            "then": {"$substr": ["$expected_completion_date", 0, 7]},
            "else": "unknown"
        }}}},
        {"$group": {"_id": "$month", "total": {"$sum": {"$ifNull": ["$gross_commission", 0]}}, "proc_fees": {"$sum": {"$ifNull": ["$proc_fee_total", 0]}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}, {"$limit": 24}
    ]).to_list(24)
    
    # By lender
    by_lender = await db.cases.aggregate(base_match + [
        {"$match": {"lender_name": {"$ne": None}}},
        {"$group": {"_id": "$lender_name", "total": {"$sum": {"$ifNull": ["$gross_commission", 0]}}, "proc_fees": {"$sum": {"$ifNull": ["$proc_fee_total", 0]}}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}}, {"$limit": 15}
    ]).to_list(15)
    
    # By product type
    by_product = await db.cases.aggregate(base_match + [
        {"$group": {"_id": "$product_type", "total": {"$sum": {"$ifNull": ["$gross_commission", 0]}}, "proc_fees": {"$sum": {"$ifNull": ["$proc_fee_total", 0]}}, "count": {"$sum": 1}}}
    ]).to_list(10)
    
    # By lead source
    by_lead_source = await db.cases.aggregate(base_match + [
        {"$lookup": {"from": "clients", "localField": "client_id", "foreignField": "client_id", "as": "client"}},
        {"$unwind": "$client"},
        {"$group": {"_id": "$client.lead_source", "total": {"$sum": {"$ifNull": ["$gross_commission", 0]}}, "proc_fees": {"$sum": {"$ifNull": ["$proc_fee_total", 0]}}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}}
    ]).to_list(20)
    
    # By advisor
    by_advisor = await db.cases.aggregate(base_match + [
        {"$match": {"advisor_id": {"$ne": None}}},
        {"$lookup": {"from": "users", "localField": "advisor_id", "foreignField": "user_id", "as": "advisor"}},
        {"$unwind": "$advisor"},
        {"$group": {"_id": {"id": "$advisor_id", "name": "$advisor.name"}, "total": {"$sum": {"$ifNull": ["$gross_commission", 0]}}, "proc_fees": {"$sum": {"$ifNull": ["$proc_fee_total", 0]}}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}}
    ]).to_list(20)
    
    # Summary totals
    summary = await db.cases.aggregate(base_match + [
        {"$group": {
            "_id": None,
            "total_commission": {"$sum": {"$ifNull": ["$gross_commission", 0]}},
            "total_paid": {"$sum": {"$cond": [{"$eq": ["$commission_status", "paid"]}, {"$ifNull": ["$gross_commission", 0]}, 0]}},
            "total_pending": {"$sum": {"$cond": [{"$eq": ["$commission_status", "pending"]}, {"$ifNull": ["$gross_commission", 0]}, 0]}},
            "total_clawbacks": {"$sum": {"$cond": [{"$eq": ["$commission_status", "clawed_back"]}, {"$ifNull": ["$gross_commission", 0]}, 0]}},
            "total_proc_fees": {"$sum": {"$ifNull": ["$proc_fee_total", 0]}},
            "total_client_fees": {"$sum": {"$ifNull": ["$client_fee", 0]}},
            "case_count": {"$sum": 1},
            "avg_commission": {"$avg": {"$ifNull": ["$gross_commission", 0]}}
        }}
    ]).to_list(1)
    
    summary_data = summary[0] if summary else {
        "total_commission": 0, "total_paid": 0, "total_pending": 0,
        "total_clawbacks": 0, "total_proc_fees": 0, "case_count": 0, "avg_commission": 0
    }
    if "_id" in summary_data:
        del summary_data["_id"]
    
    return {
        "by_month": by_month,
        "by_lender": by_lender,
        "by_product": by_product,
        "by_lead_source": by_lead_source,
        "by_advisor": [{"name": r["_id"]["name"], "advisor_id": r["_id"]["id"], "total": r["total"], "proc_fees": r["proc_fees"], "count": r["count"]} for r in by_advisor],
        "summary": summary_data
    }

@api_router.get("/analytics/mortgage-types")
async def get_mortgage_type_analytics(request: Request):
    """Mortgage type breakdown analytics"""
    await get_current_user(request)
    
    pipeline = [
        {"$match": {"product_type": "mortgage", "mortgage_type": {"$ne": None}}},
        {"$group": {
            "_id": "$mortgage_type",
            "case_count": {"$sum": 1},
            "total_commission": {"$sum": {"$cond": [{"$eq": ["$commission_status", "paid"]}, {"$ifNull": ["$gross_commission", 0]}, 0]}},
            "total_loan": {"$sum": {"$ifNull": ["$loan_amount", 0]}},
            "avg_loan": {"$avg": {"$ifNull": ["$loan_amount", 0]}}
        }}
    ]
    
    results = await db.cases.aggregate(pipeline).to_list(10)
    total_cases = sum(r["case_count"] for r in results) or 1
    
    types = []
    for r in results:
        types.append({
            "mortgage_type": r["_id"],
            "case_count": r["case_count"],
            "percentage": round((r["case_count"] / total_cases) * 100, 1),
            "total_commission": r["total_commission"],
            "total_loan": r["total_loan"],
            "avg_loan": round(r["avg_loan"], 2) if r["avg_loan"] else 0
        })
    
    return {"types": types, "total_cases": total_cases}

# ==================== CUSTOM REPORTS ROUTES ====================

@api_router.get("/reports/cases-completed")
async def get_cases_completed_report(
    request: Request,
    start_date: str = Query(...),
    end_date: str = Query(...)
):
    """Cases completed within a date range"""
    await get_current_user(request)
    
    cases = await db.cases.find({
        "status": CaseStatus.COMPLETED,
        "expected_completion_date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(1000)
    
    for case in cases:
        client = await db.clients.find_one({"client_id": case["client_id"]}, {"_id": 0, "first_name": 1, "last_name": 1, "property_price": 1})
        case["client_name"] = f"{client['first_name']} {client['last_name']}" if client else "Unknown"
        case["property_value"] = client.get("property_price") if client else None
        if case.get("loan_amount") and case.get("property_value") and case["property_value"] > 0:
            case["ltv"] = round((case["loan_amount"] / case["property_value"]) * 100, 2)
        else:
            case["ltv"] = None
    
    total_loan = sum(c.get("loan_amount", 0) or 0 for c in cases)
    total_commission = sum(c.get("gross_commission", 0) or 0 for c in cases)
    
    return {
        "cases": cases,
        "summary": {
            "total_cases": len(cases),
            "total_loan_value": total_loan,
            "total_commission": total_commission
        }
    }

@api_router.get("/reports/commission-paid")
async def get_commission_paid_report(
    request: Request,
    start_date: str = Query(...),
    end_date: str = Query(...),
    report_type: str = Query(default="commission")
):
    """Reports filtered by paid dates. report_type: commission, client_fees, both"""
    await get_current_user(request)
    
    if report_type == "client_fees":
        # Filter by client_fee_paid_date for client fee reports
        cases = await db.cases.find({
            "client_fee_status": CommissionStatus.PAID,
            "$or": [
                {"client_fee_paid_date": {"$gte": start_date, "$lte": end_date}},
                {"client_fee_paid_date": {"$in": [None, ""]}, "expected_completion_date": {"$gte": start_date, "$lte": end_date}}
            ]
        }, {"_id": 0}).to_list(1000)
    elif report_type == "both":
        # Get cases where either commission or client fee was paid in range
        comm_cases = await db.cases.find({
            "commission_status": CommissionStatus.PAID,
            "$or": [
                {"commission_paid_date": {"$gte": start_date, "$lte": end_date}},
                {"commission_paid_date": {"$in": [None, ""]}, "expected_completion_date": {"$gte": start_date, "$lte": end_date}}
            ]
        }, {"_id": 0}).to_list(1000)
        cf_cases = await db.cases.find({
            "client_fee_status": CommissionStatus.PAID,
            "$or": [
                {"client_fee_paid_date": {"$gte": start_date, "$lte": end_date}},
                {"client_fee_paid_date": {"$in": [None, ""]}, "expected_completion_date": {"$gte": start_date, "$lte": end_date}}
            ]
        }, {"_id": 0}).to_list(1000)
        # Merge unique cases
        seen = set()
        cases = []
        for c in comm_cases + cf_cases:
            if c["case_id"] not in seen:
                seen.add(c["case_id"])
                cases.append(c)
    else:
        # Filter by commission_paid_date for commission reports
        cases = await db.cases.find({
            "commission_status": CommissionStatus.PAID,
            "$or": [
                {"commission_paid_date": {"$gte": start_date, "$lte": end_date}},
                {"commission_paid_date": {"$in": [None, ""]}, "expected_completion_date": {"$gte": start_date, "$lte": end_date}}
            ]
        }, {"_id": 0}).to_list(1000)
    
    for case in cases:
        client = await db.clients.find_one({"client_id": case["client_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        case["client_name"] = f"{client['first_name']} {client['last_name']}" if client else "Unknown"
    
    total_commission = sum(c.get("gross_commission", 0) or 0 for c in cases)
    total_proc_fees = sum(c.get("proc_fee_total", 0) or 0 for c in cases)
    total_client_fees = sum(c.get("client_fee", 0) or 0 for c in cases)
    
    return {
        "cases": cases,
        "report_type": report_type,
        "summary": {
            "total_cases": len(cases),
            "total_commission_paid": total_commission,
            "total_proc_fees": total_proc_fees,
            "total_client_fees": total_client_fees,
            "total_combined_revenue": total_commission + total_client_fees
        }
    }

@api_router.get("/reports/export")
async def export_report(
    request: Request,
    report_type: str = Query(...),
    start_date: str = Query(...),
    end_date: str = Query(...),
    format: str = Query(default="xlsx")
):
    """Export report to Excel or CSV"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
    from openpyxl.utils import get_column_letter
    import csv
    
    current_user = await get_current_user(request)
    
    if report_type == "cases_completed":
        data = await get_cases_completed_report(request, start_date, end_date)
        cases = data["cases"]
        summary = data["summary"]
        title = "Cases Completed Report"
        headers = ["Client Name", "Loan Amount", "Property Value", "LTV %", "Lender", "Product Type", "Mortgage Type", "Completion Date", "Commission"]
        
        def row_fn(c):
            return [
                c.get("client_name", ""), c.get("loan_amount", ""), c.get("property_value", ""),
                f"{c.get('ltv', '')}%" if c.get('ltv') else "", c.get("lender_name", ""),
                (c.get("product_type", "") or "").replace("_", " ").title(),
                (c.get("mortgage_type", "") or "").replace("_", " ").title(),
                c.get("expected_completion_date", ""), c.get("gross_commission", "")
            ]
    elif report_type == "commission_paid":
        data = await get_commission_paid_report(request, start_date, end_date, report_type="commission")
        cases = data["cases"]
        summary = data["summary"]
        title = "Commission Paid Report"
        headers = ["Client Name", "Loan Amount", "Lender", "Product Type", "Commission Amount", "Proc Fee", "Payment Date"]
        
        def row_fn(c):
            return [
                c.get("client_name", ""), c.get("loan_amount", ""), c.get("lender_name", ""),
                (c.get("product_type", "") or "").replace("_", " ").title(),
                c.get("gross_commission", ""), c.get("proc_fee_total", ""),
                c.get("expected_completion_date", "")
            ]
    elif report_type == "client_fees":
        data = await get_commission_paid_report(request, start_date, end_date, report_type="client_fees")
        cases = data["cases"]
        summary = data["summary"]
        title = "Client Fees Report"
        headers = ["Client Name", "Loan Amount", "Lender", "Product Type", "Client Fee", "Payment Date"]
        
        def row_fn(c):
            return [
                c.get("client_name", ""), c.get("loan_amount", ""), c.get("lender_name", ""),
                (c.get("product_type", "") or "").replace("_", " ").title(),
                c.get("client_fee", ""),
                c.get("expected_completion_date", "")
            ]
    else:  # commission_and_fees (both)
        data = await get_commission_paid_report(request, start_date, end_date, report_type="both")
        cases = data["cases"]
        summary = data["summary"]
        title = "Commission & Client Fees Report"
        headers = ["Client Name", "Loan Amount", "Lender", "Product Type", "Commission", "Client Fee", "Combined Total", "Payment Date"]
        
        def row_fn(c):
            comm = c.get("gross_commission", 0) or 0
            fee = c.get("client_fee", 0) or 0
            return [
                c.get("client_name", ""), c.get("loan_amount", ""), c.get("lender_name", ""),
                (c.get("product_type", "") or "").replace("_", " ").title(),
                comm, fee, comm + fee,
                c.get("expected_completion_date", "")
            ]
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        for c in cases:
            writer.writerow(row_fn(c))
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={title.replace(' ', '_')}_{start_date}_to_{end_date}.csv"}
        )
    
    # Excel format
    wb = Workbook()
    ws = wb.active
    ws.title = title
    
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="DC2626", end_color="DC2626", fill_type="solid")
    
    ws.merge_cells(f'A1:{get_column_letter(len(headers))}1')
    title_cell = ws['A1']
    title_cell.value = f"{title} ({start_date} to {end_date})"
    title_cell.font = Font(bold=True, size=14, color="FFFFFF")
    title_cell.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    title_cell.alignment = Alignment(horizontal='center')
    
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col, value=h)
        cell.font = header_font
        cell.fill = header_fill
    
    for idx, c in enumerate(cases):
        for col, val in enumerate(row_fn(c), 1):
            cell = ws.cell(row=3 + idx, column=col, value=val)
            if isinstance(val, (int, float)) and val:
                cell.number_format = '£#,##0'
    
    # Summary row
    sum_row = 3 + len(cases) + 1
    ws.cell(row=sum_row, column=1, value="TOTALS").font = Font(bold=True)
    for key, val in summary.items():
        if key != "total_cases":
            ws.cell(row=sum_row + list(summary.keys()).index(key), column=1, value=key.replace("_", " ").title()).font = Font(bold=True)
            ws.cell(row=sum_row + list(summary.keys()).index(key), column=2, value=val).number_format = '£#,##0' if isinstance(val, (int, float)) else ''
    
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 30)
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={title.replace(' ', '_')}_{start_date}_to_{end_date}.xlsx"}
    )

# ==================== EXPORT ROUTES ====================

@api_router.get("/export/excel")
async def export_all_data(request: Request):
    """Export all CRM data to a single Excel sheet - one row per case with client data"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
    from openpyxl.utils import get_column_letter
    
    current_user = await get_current_user(request)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "CRM Data"
    
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="DC2626", end_color="DC2626", fill_type="solid")
    alt_fill = PatternFill(start_color="F9FAFB", end_color="F9FAFB", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin', color='E5E7EB'),
        right=Side(style='thin', color='E5E7EB'),
        top=Side(style='thin', color='E5E7EB'),
        bottom=Side(style='thin', color='E5E7EB')
    )
    
    # Title row
    headers = [
        "Client Name", "Client Email", "Client Phone", "DOB", "Address", "Postcode",
        "Income", "Employment Type", "Lead Source",
        "Case Type", "Case Status", "Lender/Provider", "Mortgage Type", "Insurance Type",
        "Loan Amount", "Property Value", "Property Type", "Repayment Type",
        "Term (Years)", "Interest Rate", "Interest Rate Type", "Initial Product Term", "Rate Fixed For",
        "Monthly Premium", "Sum Assured", "Cover Type",
        "Case Reference", "Application Date", "Product Expiry Date",
        "Security Address", "Security Postcode",
        "Proc Fee Total", "Commission %", "Gross Commission", "Client Fee", "Commission Status", "Commission Paid Date",
        "Client Fee Status", "Client Fee Paid Date"
    ]
    
    ws.append(headers)
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    ws.row_dimensions[1].height = 30
    
    # Build client lookup
    clients = await db.clients.find({}, {"_id": 0}).to_list(10000)
    client_map = {c["client_id"]: c for c in clients}
    
    # Fetch all cases
    cases = await db.cases.find({}, {"_id": 0}).to_list(10000)
    
    row_num = 2
    for idx, case in enumerate(cases):
        client = client_map.get(case.get("client_id"), {})
        fill = alt_fill if idx % 2 == 0 else None
        
        row_data = [
            f"{client.get('first_name', '')} {client.get('last_name', '')}".strip(),
            client.get("email", ""),
            client.get("phone", ""),
            client.get("dob", ""),
            client.get("current_address", ""),
            client.get("postcode", ""),
            client.get("income", ""),
            (client.get("employment_type", "") or "").replace("_", " ").title(),
            (client.get("lead_source", "") or "").replace("_", " ").title(),
            (case.get("product_type", "") or "").replace("_", " ").title(),
            (case.get("status", "") or "").replace("_", " ").title(),
            case.get("lender_name", "") or case.get("insurance_provider", ""),
            (case.get("mortgage_type", "") or "").replace("_", " ").title(),
            (case.get("insurance_type", "") or "").replace("_", " ").title(),
            case.get("loan_amount", ""),
            case.get("property_value", ""),
            (case.get("property_type", "") or "").replace("_", " ").title(),
            (case.get("repayment_type", "") or "").replace("_", " ").title(),
            case.get("term_years", ""),
            case.get("interest_rate", ""),
            (case.get("interest_rate_type", "") or "").replace("_", " ").title(),
            case.get("initial_product_term", ""),
            case.get("rate_fixed_for", ""),
            case.get("monthly_premium", ""),
            case.get("sum_assured", ""),
            (case.get("insurance_cover_type", "") or "").replace("_", " ").title(),
            case.get("case_reference", "") or case.get("insurance_reference", ""),
            case.get("date_application_submitted", ""),
            case.get("product_expiry_date", ""),
            case.get("security_address", ""),
            case.get("security_postcode", ""),
            case.get("proc_fee_total", ""),
            case.get("commission_percentage", ""),
            case.get("gross_commission", ""),
            case.get("client_fee", ""),
            (case.get("commission_status", "") or "").replace("_", " ").title(),
            case.get("commission_paid_date", ""),
            (case.get("client_fee_status", "") or "").replace("_", " ").title(),
            case.get("client_fee_paid_date", ""),
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(vertical='center')
            if fill:
                cell.fill = fill
            if isinstance(value, (int, float)) and value and col in [7, 15, 16, 22, 23, 28, 30]:
                cell.number_format = '£#,##0'
        
        row_num += 1
    
    # Also add clients with no cases
    case_client_ids = set(c.get("client_id") for c in cases)
    for idx2, client in enumerate(clients):
        if client.get("client_id") not in case_client_ids:
            fill = alt_fill if (len(cases) + idx2) % 2 == 0 else None
            row_data = [
                f"{client.get('first_name', '')} {client.get('last_name', '')}".strip(),
                client.get("email", ""),
                client.get("phone", ""),
                client.get("dob", ""),
                client.get("current_address", ""),
                client.get("postcode", ""),
                client.get("income", ""),
                (client.get("employment_type", "") or "").replace("_", " ").title(),
                (client.get("lead_source", "") or "").replace("_", " ").title(),
            ] + [""] * 23
            
            for col, value in enumerate(row_data, 1):
                cell = ws.cell(row=row_num, column=col, value=value)
                cell.border = thin_border
                if fill:
                    cell.fill = fill
            row_num += 1
    
    # Auto-fit columns
    for col_cells in ws.columns:
        max_len = max((len(str(cell.value or "")) for cell in col_cells), default=10)
        ws.column_dimensions[col_cells[0].column_letter].width = min(max_len + 3, 35)
    
    await create_audit_log("export", "all_data", "excel", current_user["user_id"])
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
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


# Lender Usage Analytics
@api_router.get("/analytics/lender-usage")
async def get_lender_usage(request: Request):
    await get_current_user(request)
    
    twelve_months_ago = (datetime.now(timezone.utc) - timedelta(days=365)).strftime("%Y-%m-%d")
    
    # All time lender usage
    all_time = await db.cases.aggregate([
        {"$match": {"lender_name": {"$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$lender_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]).to_list(20)
    
    # Last 12 months
    last_12 = await db.cases.aggregate([
        {"$match": {"lender_name": {"$ne": None, "$ne": ""}, "created_at": {"$gte": twelve_months_ago}}},
        {"$group": {"_id": "$lender_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]).to_list(20)
    
    # Buy to let
    btl = await db.cases.aggregate([
        {"$match": {"lender_name": {"$ne": None, "$ne": ""}, "property_type": "buy_to_let"}},
        {"$group": {"_id": "$lender_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]).to_list(20)
    
    # Residential
    residential = await db.cases.aggregate([
        {"$match": {"lender_name": {"$ne": None, "$ne": ""}, "property_type": "residential"}},
        {"$group": {"_id": "$lender_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]).to_list(20)
    
    return {
        "all_time": [{"lender": r["_id"], "cases": r["count"]} for r in all_time],
        "last_12_months": [{"lender": r["_id"], "cases": r["count"]} for r in last_12],
        "buy_to_let": [{"lender": r["_id"], "cases": r["count"]} for r in btl],
        "residential": [{"lender": r["_id"], "cases": r["count"]} for r in residential],
    }

# Screenshot Import - AI extraction
from PIL import Image, ImageEnhance, ImageFilter
import io

@api_router.post("/extract/client")
async def extract_client_from_screenshots(request: Request):
    """Extract client info from uploaded screenshots using GPT-4o vision."""
    await get_current_user(request)
    form = await request.form()
    files = form.getlist("files")
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    image_contents = []
    for f in files:
        raw = await f.read()
        img = Image.open(io.BytesIO(raw))
        # Preprocessing: convert to RGB, enhance contrast, reduce noise
        img = img.convert("RGB")
        img = ImageEnhance.Contrast(img).enhance(1.4)
        img = img.filter(ImageFilter.MedianFilter(size=3))
        # Resize if too large
        if max(img.size) > 2000:
            img.thumbnail((2000, 2000), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        image_contents.append(ImageContent(image_base64=b64))

    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=f"extract_client_{uuid.uuid4().hex[:8]}",
        system_message="You are a data extraction assistant. Extract client information from screenshots and return ONLY valid JSON. If a field cannot be confidently identified, set it to null."
    ).with_model("openai", "gpt-4o")

    prompt = """Analyse ALL the uploaded screenshots together. Extract the following client information and return ONLY a JSON object with these exact keys:
{
  "first_name": null,
  "last_name": null,
  "email": null,
  "phone": null,
  "dob": null,
  "address": null,
  "postcode": null,
  "employment_type": null,
  "income": null
}
Rules:
- If the same field appears in multiple screenshots, use the most complete value.
- If a field cannot be confidently identified, set it to null.
- dob should be in YYYY-MM-DD format if found.
- income should be a number only (no currency symbols).
- employment_type should be one of: employed, self_employed, retired, unemployed, contractor
- Return ONLY the JSON object, no markdown or explanation."""

    msg = UserMessage(text=prompt, file_contents=image_contents)
    response = await chat.send_message(msg)

    try:
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        data = json.loads(clean)
    except json.JSONDecodeError:
        data = {}

    return {"extracted_data": data, "screenshots_processed": len(files)}

@api_router.post("/extract/case")
async def extract_case_from_screenshots(request: Request):
    """Extract case info from uploaded screenshots using GPT-4o vision."""
    await get_current_user(request)
    form = await request.form()
    files = form.getlist("files")
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    image_contents = []
    for f in files:
        raw = await f.read()
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")
        img = ImageEnhance.Contrast(img).enhance(1.4)
        img = img.filter(ImageFilter.MedianFilter(size=3))
        if max(img.size) > 2000:
            img.thumbnail((2000, 2000), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        image_contents.append(ImageContent(image_base64=b64))

    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=f"extract_case_{uuid.uuid4().hex[:8]}",
        system_message="You are a data extraction assistant for UK mortgage and insurance cases. Extract case information from screenshots and return ONLY valid JSON. If a field cannot be confidently identified, set it to null."
    ).with_model("openai", "gpt-4o")

    prompt = """Analyse ALL the uploaded screenshots together. Extract mortgage/insurance case information and return ONLY a JSON object with these exact keys:
{
  "lender_name": null,
  "loan_amount": null,
  "property_value": null,
  "interest_rate": null,
  "interest_rate_type": null,
  "term_years": null,
  "initial_product_term": null,
  "mortgage_type": null,
  "property_type": null,
  "repayment_type": null,
  "case_reference": null,
  "security_address": null,
  "security_postcode": null,
  "product_type": null,
  "ltv": null,
  "deposit_source": null,
  "insurance_type": null,
  "insurance_provider": null,
  "monthly_premium": null,
  "sum_assured": null
}
Rules:
- If the same field appears in multiple screenshots, use the most complete value.
- If a field cannot be confidently identified, set it to null.
- mortgage_type should be one of: purchase, remortgage, remortgage_additional_borrowing, product_transfer
- property_type should be one of: residential, buy_to_let
- repayment_type should be one of: repayment, interest_only
- interest_rate_type should be one of: fixed, variable, discounted, tracker, capped
- product_type should be "mortgage" or "insurance"
- insurance_type should be one of: life_insurance, home_insurance, buildings_insurance, critical_illness, income_protection
- Numeric fields (loan_amount, property_value, interest_rate, term_years, ltv, monthly_premium, sum_assured, initial_product_term) should be numbers only.
- Return ONLY the JSON object, no markdown or explanation."""

    msg = UserMessage(text=prompt, file_contents=image_contents)
    response = await chat.send_message(msg)

    try:
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        data = json.loads(clean)
    except json.JSONDecodeError:
        data = {}

    return {"extracted_data": data, "screenshots_processed": len(files)}




# Compliance Checklist Logic
COMPLIANCE_CHECKLISTS = {
    "purchase": [
        "Client Pack", "Sanction Search", "Evidence of Research", "ESIS",
        "Proof of ID", "Proof of Address", "Latest 3 Payslips (if employed)",
        "Latest 2 Years SA302 & Overview (if self-employed)",
        "Latest 3 Months Bank Statements", "Proc Fees", "FMA", "Suitability Letter"
    ],
    "remortgage": [
        "Client Pack", "Sanction Search", "Evidence of Research", "ESIS",
        "Proof of ID", "Proof of Address", "Latest 3 Payslips (if employed)",
        "Latest 2 Years SA302 & Overview (if self-employed)",
        "Latest 3 Months Bank Statements", "Proc Fees", "FMA", "Suitability Letter"
    ],
    "remortgage_additional_borrowing": [
        "Client Pack", "Sanction Search", "Evidence of Research", "ESIS",
        "Proof of ID", "Proof of Address", "Latest 3 Payslips (if employed)",
        "Latest 2 Years SA302 & Overview (if self-employed)",
        "Latest 3 Months Bank Statements", "Proc Fees", "FMA", "Suitability Letter"
    ],
    "product_transfer": [
        "Client Pack", "Sanction Search", "Evidence of Research", "ESIS",
        "Proof of ID", "Credit Search", "Mortgage Offer", "Suitability Letter"
    ],
    "life_insurance": [
        "Client Pack", "Sanction Search", "Client Budget Noted", "Evidence of Research",
        "Proof of ID (if premium over £75)", "Proof of Address (if premium over £75)",
        "Application Form", "Suitability Letter"
    ],
    "home_insurance": [
        "Client Pack", "Sanction Search", "Document Pack"
    ],
    "buildings_insurance": [
        "Client Pack", "Sanction Search", "Document Pack"
    ],
}

def get_compliance_checklist_for_case(case_doc):
    """Generate the correct checklist items based on case type."""
    product_type = case_doc.get("product_type", "")
    if product_type == "mortgage":
        mortgage_type = case_doc.get("mortgage_type", "purchase")
        items = COMPLIANCE_CHECKLISTS.get(mortgage_type, COMPLIANCE_CHECKLISTS["purchase"])
    else:
        insurance_type = case_doc.get("insurance_type", "life_insurance")
        items = COMPLIANCE_CHECKLISTS.get(insurance_type, COMPLIANCE_CHECKLISTS.get("life_insurance", []))
    return [{"item": item, "completed": False} for item in items]

@api_router.get("/cases/{case_id}/compliance")
async def get_compliance_checklist(case_id: str, request: Request):
    await get_current_user(request)
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    checklist = case.get("compliance_checklist")
    if not checklist:
        checklist = get_compliance_checklist_for_case(case)
        await db.cases.update_one({"case_id": case_id}, {"$set": {"compliance_checklist": checklist}})
    
    return {"case_id": case_id, "checklist": checklist}

@api_router.put("/cases/{case_id}/compliance")
async def update_compliance_checklist(case_id: str, request: Request):
    await get_current_user(request)
    body = await request.json()
    checklist = body.get("checklist", [])
    
    await db.cases.update_one({"case_id": case_id}, {"$set": {"compliance_checklist": checklist}})
    return {"case_id": case_id, "checklist": checklist}

# Admin: Wipe all data
@api_router.delete("/admin/wipe-data")
async def wipe_all_data(request: Request):
    current_user = await get_current_user(request)
    result = {
        "clients_deleted": (await db.clients.delete_many({})).deleted_count,
        "cases_deleted": (await db.cases.delete_many({})).deleted_count,
        "tasks_deleted": (await db.tasks.delete_many({})).deleted_count,
    }
    await create_audit_log("admin", "wipe_data", "all", current_user["user_id"])
    return {"message": "All data wiped successfully", **result}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def seed_default_user():
    """Seed default users if not already present, or fix missing passwords."""
    for email, name, password in [
        (DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_PASSWORD),
        (SECOND_USER_EMAIL, SECOND_USER_NAME, SECOND_USER_PASSWORD),
    ]:
        existing = await db.users.find_one({"email": email})
        if not existing:
            user_doc = {
                "user_id": generate_id("user_"),
                "email": email,
                "name": name,
                "password": hash_password(password),
                "role": UserRole.ADVISOR,
                "picture": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
            logger.info(f"Default user created: {email}")
        elif not existing.get("password"):
            await db.users.update_one({"email": email}, {"$set": {"password": hash_password(password)}})
            logger.info(f"Fixed missing password for: {email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
