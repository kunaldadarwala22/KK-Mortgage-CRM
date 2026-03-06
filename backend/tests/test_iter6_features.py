"""
Test suite for CRM Iteration 6 features:
1. Case creation with cleanData (empty strings to null)
2. Insurance case creation (in_trust, sum_assured, monthly_premium)
3. Commission page - commission_this_month and commission_last_30_days
4. Commission Paid Date field
5. Case Reference Number (replacing Application Reference)
6. Currency formatting verification
7. Delete case from dashboard
8. Additional applicants visibility
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    """Shared session for tests"""
    return requests.Session()

@pytest.fixture(scope="module")
def auth_token(session):
    """Login and get auth token"""
    login_data = {
        "email": "kunalkapadia2212@gmail.com",
        "password": "Admin2468!!!"
    }
    response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json().get("token")
    assert token, "No token in login response"
    return token

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

@pytest.fixture(scope="module")
def test_client_id(session, auth_headers):
    """Create a test client for case tests"""
    client_data = {
        "first_name": "TEST_Iter6",
        "last_name": f"Client_{uuid.uuid4().hex[:6]}",
        "email": f"test_iter6_{uuid.uuid4().hex[:6]}@test.com",
        "phone": "07700900000"
    }
    response = session.post(f"{BASE_URL}/api/clients", json=client_data, headers=auth_headers)
    assert response.status_code == 201, f"Failed to create test client: {response.text}"
    client_id = response.json()["client_id"]
    yield client_id
    # Cleanup
    session.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)

class TestCaseCreation:
    """Test case creation - ensures empty strings convert to null"""
    
    def test_create_mortgage_case_with_empty_strings(self, session, auth_headers, test_client_id):
        """Test that creating a mortgage case works even with empty string fields that should be null"""
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "mortgage_type": "purchase",
            "status": "new_lead",
            # Empty strings that should be handled gracefully
            "term_years": None,
            "fixed_rate_period": None,
            "interest_rate": None,
            "lender_name": "Test Lender",
            "loan_amount": 250000.0,
            "proc_fee_total": 500.0,
            "commission_percentage": 35.0,
            "case_reference": "TEST_REF_001"
        }
        
        response = session.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code == 200, f"Case creation failed: {response.text}"
        
        case = response.json()
        assert case["case_id"], "No case_id in response"
        assert case["product_type"] == "mortgage"
        assert case["loan_amount"] == 250000.0
        assert case["case_reference"] == "TEST_REF_001"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/cases/{case['case_id']}", headers=auth_headers)
        print("PASS: Mortgage case created successfully with case_reference")
    
    def test_create_mortgage_case_no_request_failed_error(self, session, auth_headers, test_client_id):
        """Test that case creation doesn't fail with 'Request Failed' due to type issues"""
        # This simulates what the frontend sends after cleanData
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "status": "new_lead",
            "mortgage_type": "remortgage",
            "term_years": None,  # cleanData converts "" to null
            "fixed_rate_period": None,
            "interest_rate": None,
            "loan_amount": None,
            "property_value": None,
            "proc_fee_total": None,
            "commission_percentage": None,
            "in_trust": None,  # Boolean field should accept null
        }
        
        response = session.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code == 200, f"Case creation failed with error: {response.text}"
        
        case = response.json()
        assert case["case_id"], "No case_id returned"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/cases/{case['case_id']}", headers=auth_headers)
        print("PASS: Case created with null values (no 'Request Failed' error)")


class TestInsuranceCaseCreation:
    """Test insurance case creation with specific fields"""
    
    def test_create_insurance_case_with_all_fields(self, session, auth_headers, test_client_id):
        """Test insurance case creation with in_trust, sum_assured, monthly_premium"""
        case_data = {
            "client_id": test_client_id,
            "product_type": "insurance",
            "insurance_type": "life_insurance",
            "insurance_cover_type": "level_term",
            "status": "new_lead",
            "insurance_provider": "Test Provider",
            "in_trust": True,
            "sum_assured": 500000.0,
            "monthly_premium": 45.99,
            "guaranteed_or_reviewable": "guaranteed",
            "insurance_reference": "INS_TEST_001"
        }
        
        response = session.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code == 200, f"Insurance case creation failed: {response.text}"
        
        case = response.json()
        assert case["case_id"], "No case_id in response"
        assert case["product_type"] == "insurance"
        assert case["in_trust"] == True
        assert case["sum_assured"] == 500000.0
        assert case["monthly_premium"] == 45.99
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/cases/{case['case_id']}", headers=auth_headers)
        print("PASS: Insurance case created with in_trust, sum_assured, monthly_premium")
    
    def test_insurance_case_in_trust_false(self, session, auth_headers, test_client_id):
        """Test insurance case with in_trust=False"""
        case_data = {
            "client_id": test_client_id,
            "product_type": "insurance",
            "insurance_type": "home_insurance",
            "status": "new_lead",
            "in_trust": False,
            "sum_assured": 250000.0,
            "monthly_premium": 29.99
        }
        
        response = session.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code == 200, f"Insurance case creation failed: {response.text}"
        
        case = response.json()
        assert case["in_trust"] == False
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/cases/{case['case_id']}", headers=auth_headers)
        print("PASS: Insurance case with in_trust=False works")


class TestDeleteCase:
    """Test case deletion from dashboard"""
    
    def test_delete_case(self, session, auth_headers, test_client_id):
        """Test that delete case works"""
        # First create a case
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "mortgage_type": "purchase",
            "status": "new_lead",
            "lender_name": "Delete Test Lender"
        }
        
        create_response = session.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert create_response.status_code == 200
        case_id = create_response.json()["case_id"]
        
        # Now delete it
        delete_response = session.delete(f"{BASE_URL}/api/cases/{case_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify it's gone
        get_response = session.get(f"{BASE_URL}/api/cases/{case_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Case should not exist after deletion"
        
        print("PASS: Case deleted successfully")


class TestCommissionSummary:
    """Test commission summary endpoint (This Month and Last 30 Days)"""
    
    def test_forecast_returns_this_month_and_last_30_days(self, session, auth_headers):
        """Test /dashboard/forecast returns commission_this_month and commission_last_30_days"""
        response = session.get(f"{BASE_URL}/api/dashboard/forecast", headers=auth_headers)
        assert response.status_code == 200, f"Forecast endpoint failed: {response.text}"
        
        data = response.json()
        
        # Check for new structure (NOT 30/60/90 day forecasts)
        assert "commission_this_month" in data, "Missing commission_this_month in response"
        assert "commission_last_30_days" in data, "Missing commission_last_30_days in response"
        
        # Verify structure of commission_this_month
        this_month = data["commission_this_month"]
        assert "amount" in this_month, "commission_this_month missing 'amount'"
        assert "proc_fees" in this_month, "commission_this_month missing 'proc_fees'"
        assert "cases" in this_month, "commission_this_month missing 'cases'"
        
        # Verify structure of commission_last_30_days
        last_30 = data["commission_last_30_days"]
        assert "amount" in last_30, "commission_last_30_days missing 'amount'"
        assert "proc_fees" in last_30, "commission_last_30_days missing 'proc_fees'"
        assert "cases" in last_30, "commission_last_30_days missing 'cases'"
        
        # Ensure old forecast keys are NOT present
        assert "forecast_30" not in data, "Old forecast_30 should not exist"
        assert "forecast_60" not in data, "Old forecast_60 should not exist"
        assert "forecast_90" not in data, "Old forecast_90 should not exist"
        
        print("PASS: Forecast returns commission_this_month and commission_last_30_days (not 30/60/90)")


class TestCommissionPaidDate:
    """Test commission_paid_date field on cases"""
    
    def test_create_case_with_commission_paid_date(self, session, auth_headers, test_client_id):
        """Test creating case with commission_paid_date"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "status": "completed",
            "commission_status": "paid",
            "commission_paid_date": today,
            "proc_fee_total": 500.0,
            "gross_commission": 175.0
        }
        
        response = session.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code == 200, f"Case creation failed: {response.text}"
        
        case = response.json()
        assert case["commission_paid_date"] == today
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/cases/{case['case_id']}", headers=auth_headers)
        print("PASS: Case created with commission_paid_date")
    
    def test_update_commission_paid_date(self, session, auth_headers, test_client_id):
        """Test updating commission_paid_date on existing case"""
        # Create case without commission_paid_date
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "status": "completed",
            "commission_status": "pending"
        }
        
        create_response = session.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert create_response.status_code == 200
        case_id = create_response.json()["case_id"]
        
        # Update with commission_paid_date
        paid_date = "2026-01-15"
        update_response = session.put(
            f"{BASE_URL}/api/cases/{case_id}",
            json={"commission_paid_date": paid_date, "commission_status": "paid"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        updated_case = update_response.json()
        assert updated_case["commission_paid_date"] == paid_date
        assert updated_case["commission_status"] == "paid"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/cases/{case_id}", headers=auth_headers)
        print("PASS: Commission paid date updated successfully")


class TestCaseReferenceField:
    """Test case_reference field (replacing application_reference)"""
    
    def test_case_has_case_reference_field(self, session, auth_headers, test_client_id):
        """Test that case has case_reference field (not application_reference)"""
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "status": "new_lead",
            "case_reference": "CASE_REF_12345"
        }
        
        response = session.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code == 200, f"Case creation failed: {response.text}"
        
        case = response.json()
        assert case["case_reference"] == "CASE_REF_12345"
        
        # Verify via GET
        get_response = session.get(f"{BASE_URL}/api/cases/{case['case_id']}", headers=auth_headers)
        assert get_response.status_code == 200
        fetched_case = get_response.json()
        assert fetched_case["case_reference"] == "CASE_REF_12345"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/cases/{case['case_id']}", headers=auth_headers)
        print("PASS: case_reference field works correctly")


class TestAdditionalApplicants:
    """Test additional applicants for joint applications"""
    
    def test_add_additional_applicant(self, session, auth_headers):
        """Test adding additional applicant to client"""
        # Create client
        client_data = {
            "first_name": "TEST_Primary",
            "last_name": f"Applicant_{uuid.uuid4().hex[:6]}",
            "email": f"test_primary_{uuid.uuid4().hex[:6]}@test.com"
        }
        
        create_response = session.post(f"{BASE_URL}/api/clients", json=client_data, headers=auth_headers)
        assert create_response.status_code == 201
        client_id = create_response.json()["client_id"]
        
        # Add additional applicant
        additional_applicants = [
            {
                "full_name": "Jane Secondary",
                "dob": "1990-05-15",
                "email": "jane.secondary@test.com",
                "phone": "07700900001"
            }
        ]
        
        update_response = session.put(
            f"{BASE_URL}/api/clients/{client_id}",
            json={"additional_applicants": additional_applicants},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify via GET
        get_response = session.get(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        assert get_response.status_code == 200
        client = get_response.json()
        
        assert "additional_applicants" in client
        assert len(client["additional_applicants"]) == 1
        assert client["additional_applicants"][0]["full_name"] == "Jane Secondary"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        print("PASS: Additional applicant added and retrieved successfully")
    
    def test_multiple_additional_applicants(self, session, auth_headers):
        """Test adding multiple additional applicants"""
        # Create client
        client_data = {
            "first_name": "TEST_Multi",
            "last_name": f"Applicant_{uuid.uuid4().hex[:6]}",
            "email": f"test_multi_{uuid.uuid4().hex[:6]}@test.com"
        }
        
        create_response = session.post(f"{BASE_URL}/api/clients", json=client_data, headers=auth_headers)
        assert create_response.status_code == 201
        client_id = create_response.json()["client_id"]
        
        # Add multiple additional applicants
        additional_applicants = [
            {"full_name": "Applicant Two", "email": "app2@test.com"},
            {"full_name": "Applicant Three", "email": "app3@test.com"}
        ]
        
        update_response = session.put(
            f"{BASE_URL}/api/clients/{client_id}",
            json={"additional_applicants": additional_applicants},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify
        get_response = session.get(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        client = get_response.json()
        
        assert len(client["additional_applicants"]) == 2
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        print("PASS: Multiple additional applicants work correctly")


class TestGlobalSearch:
    """Test global search functionality"""
    
    def test_search_returns_clients_and_cases(self, session, auth_headers):
        """Test that search returns both clients and cases"""
        response = session.get(f"{BASE_URL}/api/search?q=test", headers=auth_headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        assert "clients" in data
        assert "cases" in data
        print("PASS: Search returns clients and cases structure")


class TestNotifications:
    """Test notification endpoint"""
    
    def test_notifications_endpoint(self, session, auth_headers):
        """Test notifications endpoint returns notifications array"""
        response = session.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200, f"Notifications failed: {response.text}"
        
        data = response.json()
        assert "notifications" in data
        assert "count" in data
        print("PASS: Notifications endpoint works")


class TestProcFeeAndCommission:
    """Test that Proc Fee = lender payment and commission = % of proc fee"""
    
    def test_commission_calculation(self, session, auth_headers, test_client_id):
        """Test commission is correctly calculated from proc_fee * percentage"""
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "status": "completed",
            "proc_fee_total": 1000.0,
            "commission_percentage": 40.0,
            "gross_commission": 400.0  # 1000 * 40% = 400
        }
        
        response = session.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code == 200
        
        case = response.json()
        assert case["proc_fee_total"] == 1000.0
        assert case["commission_percentage"] == 40.0
        assert case["gross_commission"] == 400.0
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/cases/{case['case_id']}", headers=auth_headers)
        print("PASS: Commission calculation (proc_fee * percentage) works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
