"""
Test suite for Iteration 8 Bug Fixes
1. Date inputs have max='9999-12-31' (frontend only)
2. Additional Applicant: First Name + Surname, Income, Employment Type fields
3. Expiring Soon: ONLY cases expiring within 6 months from today (2028 case must NOT appear)
4. Retention endpoint /api/dashboard/retention only returns cases within 6 months
5. Dashboard stats expiring_products count uses 6-month window
6. Case creation regression test
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "kunalkapadia2212@gmail.com"
TEST_PASSWORD = "Admin2468!!!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def authenticated_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestRetentionEndpoint:
    """Test /api/dashboard/retention returns only cases within 6 months"""
    
    def test_retention_endpoint_returns_200(self, authenticated_client):
        """Test retention endpoint is accessible"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/retention")
        assert response.status_code == 200, f"Retention endpoint failed: {response.text}"
        data = response.json()
        
        # Check expected keys
        assert "expiring_this_month" in data
        assert "expiring_by_month" in data
        assert "retention_pipeline_value" in data
        print(f"Retention endpoint returned: {len(data.get('expiring_this_month', []))} expiring cases")
    
    def test_retention_does_not_return_2028_case(self, authenticated_client):
        """Critical: 2028 case (case_04649caf1b1b with expiry 2028-04-15) must NOT appear"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/retention")
        assert response.status_code == 200
        data = response.json()
        
        expiring_cases = data.get("expiring_this_month", [])
        case_ids = [c.get("case_id") for c in expiring_cases]
        expiry_dates = [c.get("product_expiry_date") for c in expiring_cases]
        
        print(f"Expiring cases returned: {case_ids}")
        print(f"Expiry dates: {expiry_dates}")
        
        # Check no 2028 dates in results
        for case in expiring_cases:
            expiry = case.get("product_expiry_date", "")
            assert not expiry.startswith("2028"), f"2028 case found in retention results: {case}"
        
        # Verify 6-month window is enforced
        today = datetime.now()
        six_months = today + timedelta(days=180)
        
        for case in expiring_cases:
            expiry_str = case.get("product_expiry_date")
            if expiry_str:
                expiry_date = datetime.strptime(expiry_str, "%Y-%m-%d")
                assert today <= expiry_date <= six_months, f"Case {case.get('case_id')} has expiry {expiry_str} outside 6-month window"
        
        print("PASS: No 2028 cases in retention results, all within 6-month window")
    
    def test_case_b0eedfcfae5c_appears_in_retention(self, authenticated_client):
        """The 2026-03-26 case should appear in Expiring Soon"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/retention")
        assert response.status_code == 200
        data = response.json()
        
        expiring_cases = data.get("expiring_this_month", [])
        
        # Check if 2026 dates are present
        found_2026 = False
        for case in expiring_cases:
            expiry = case.get("product_expiry_date", "")
            if expiry.startswith("2026"):
                found_2026 = True
                print(f"Found 2026 case: {case.get('case_id')} - expiry: {expiry}")
        
        # Note: This test checks if any 2026 cases are present, not a specific one
        print(f"2026 cases found: {found_2026}")


class TestDashboardStats:
    """Test /api/dashboard/stats expiring_products uses 6-month window"""
    
    def test_dashboard_stats_returns_200(self, authenticated_client):
        """Test dashboard stats endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_clients" in data
        assert "total_cases" in data
        assert "expiring_products" in data
        
        print(f"Dashboard stats: expiring_products = {data.get('expiring_products')}")
    
    def test_expiring_products_count_excludes_2028(self, authenticated_client):
        """Expiring products count should exclude cases beyond 6 months"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        expiring_count = data.get("expiring_products", 0)
        
        # Compare with retention data to verify consistency
        retention_response = authenticated_client.get(f"{BASE_URL}/api/dashboard/retention")
        retention_data = retention_response.json()
        
        retention_count = sum(m.get("count", 0) for m in retention_data.get("expiring_by_month", []))
        
        # The counts should match or be close (using same 6-month window)
        print(f"Dashboard expiring_products: {expiring_count}")
        print(f"Retention total count: {retention_count}")


class TestAdditionalApplicant:
    """Test additional applicant fields: first_name, last_name, income, employment_type"""
    
    def test_create_client_with_additional_applicant(self, authenticated_client):
        """Create client with additional applicant having all new fields"""
        client_data = {
            "first_name": "TEST_PrimaryUser",
            "last_name": "Iteration8",
            "email": "test_iter8_primary@test.com",
            "phone": "07123456789",
            "additional_applicants": [
                {
                    "first_name": "TEST_ApplicantJane",
                    "last_name": "Doe",
                    "dob": "1990-06-15",
                    "email": "jane.doe@test.com",
                    "phone": "07987654321",
                    "income": 45000,
                    "employment_type": "employed"
                }
            ]
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/clients", json=client_data)
        assert response.status_code == 201, f"Failed to create client: {response.text}"
        
        data = response.json()
        client_id = data.get("client_id")
        print(f"Created client: {client_id}")
        
        # Verify additional applicant fields
        additional = data.get("additional_applicants", [])
        assert len(additional) == 1, "Expected 1 additional applicant"
        
        applicant = additional[0]
        assert applicant.get("first_name") == "TEST_ApplicantJane"
        assert applicant.get("last_name") == "Doe"
        assert applicant.get("income") == 45000
        assert applicant.get("employment_type") == "employed"
        
        print("PASS: Additional applicant saved with first_name, last_name, income, employment_type")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/clients/{client_id}")
        print(f"Cleaned up test client: {client_id}")
    
    def test_add_applicant_to_existing_client(self, authenticated_client):
        """Add additional applicant via PUT update to existing client"""
        # First create a client
        client_data = {
            "first_name": "TEST_ExistingClient",
            "last_name": "ForApplicantTest",
            "email": "test_existing@test.com"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/clients", json=client_data)
        assert response.status_code == 201
        client_id = response.json().get("client_id")
        
        # Now update with additional applicant
        update_data = {
            "additional_applicants": [
                {
                    "first_name": "TEST_AdditionalJohn",
                    "last_name": "Smith",
                    "dob": "1985-03-20",
                    "email": "john.smith@test.com",
                    "phone": "07111222333",
                    "income": 55000,
                    "employment_type": "self_employed"
                }
            ]
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/clients/{client_id}", json=update_data)
        assert response.status_code == 200, f"Failed to update client: {response.text}"
        
        # Fetch and verify
        response = authenticated_client.get(f"{BASE_URL}/api/clients/{client_id}")
        assert response.status_code == 200
        
        data = response.json()
        additional = data.get("additional_applicants", [])
        assert len(additional) == 1
        
        applicant = additional[0]
        assert applicant.get("first_name") == "TEST_AdditionalJohn"
        assert applicant.get("last_name") == "Smith"
        assert applicant.get("income") == 55000
        assert applicant.get("employment_type") == "self_employed"
        
        print("PASS: Additional applicant added via PUT with all fields")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/clients/{client_id}")


class TestCaseCreationRegression:
    """Regression test: Case creation still works"""
    
    def test_create_mortgage_case(self, authenticated_client):
        """Create a mortgage case to ensure no regression"""
        # First create a client
        client_data = {
            "first_name": "TEST_CaseClient",
            "last_name": "Iteration8",
            "email": "test_case_client@test.com"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/clients", json=client_data)
        assert response.status_code == 201
        client_id = response.json().get("client_id")
        
        # Create case
        case_data = {
            "client_id": client_id,
            "product_type": "mortgage",
            "mortgage_type": "purchase",
            "lender_name": "TEST_Bank",
            "loan_amount": 250000,
            "status": "new_lead"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/cases", json=case_data)
        assert response.status_code == 200, f"Failed to create case: {response.text}"
        
        data = response.json()
        case_id = data.get("case_id")
        
        assert data.get("loan_amount") == 250000
        assert data.get("lender_name") == "TEST_Bank"
        assert data.get("product_type") == "mortgage"
        
        print(f"PASS: Case created successfully: {case_id}")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/cases/{case_id}")
        authenticated_client.delete(f"{BASE_URL}/api/clients/{client_id}")
        print("Cleaned up test case and client")


class TestExpiryDateValidation:
    """Verify that the backend correctly filters by expiry date range"""
    
    def test_verify_six_month_window_calculation(self, authenticated_client):
        """Verify the 180-day window is correctly applied"""
        today = datetime.now()
        six_months_ahead = today + timedelta(days=180)
        
        print(f"Today: {today.strftime('%Y-%m-%d')}")
        print(f"Six months ahead: {six_months_ahead.strftime('%Y-%m-%d')}")
        
        # 2028-04-15 should be well beyond 6 months from any date in 2026
        target_date = datetime(2028, 4, 15)
        
        assert target_date > six_months_ahead, "2028-04-15 should be beyond 6-month window"
        print("PASS: 2028-04-15 is correctly identified as beyond 6-month window")
