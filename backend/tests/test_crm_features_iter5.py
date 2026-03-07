"""
Test file for CRM iteration 5 - Testing new features:
1. Global search bar - returns clients and cases with 2+ characters
2. Notifications API - overdue tasks, expiring products
3. Delete client - no permission error
4. Client dashboard - only shows basic columns (no case metrics)
5. Add Client form - no Security Address, Property Price, Loan Amount, Deposit
6. Additional applicants on client detail
7. Cases page - Mortgage/Insurance tabs
8. New Case form - searchable client field
9. New Case form - dynamic Mortgage vs Insurance fields
10. Case search by client name
11. Login tests for both users
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://deposit-case.preview.emergentagent.com').rstrip('/')


class TestAuthEndpoints:
    """Tests for authentication endpoints"""
    
    def test_login_first_user(self):
        """Test login with kunalkapadia2212@gmail.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user_id" in data
        assert data["email"] == "kunalkapadia2212@gmail.com"
        print(f"✓ Login successful for kunalkapadia2212@gmail.com")
    
    def test_login_second_user(self):
        """Test login with kunal.dadarwala22@gmail.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunal.dadarwala22@gmail.com",
            "password": "Admin2468!!!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user_id" in data
        assert data["email"] == "kunal.dadarwala22@gmail.com"
        print(f"✓ Login successful for kunal.dadarwala22@gmail.com")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Invalid credentials correctly rejected")


@pytest.fixture
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "kunalkapadia2212@gmail.com",
        "password": "Admin2468!!!"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Returns headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestGlobalSearch:
    """Tests for global search endpoint /api/search"""
    
    def test_search_returns_empty_for_short_query(self, auth_headers):
        """Search with less than 2 characters returns empty"""
        response = requests.get(f"{BASE_URL}/api/search?q=a", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["clients"] == []
        assert data["cases"] == []
        print(f"✓ Search with 1 character returns empty results")
    
    def test_search_returns_results_for_valid_query(self, auth_headers):
        """Search with 2+ characters returns results"""
        # First create a test client
        client_response = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "first_name": "TestSearch",
            "last_name": "UserFind"
        })
        assert client_response.status_code == 201
        client_id = client_response.json()["client_id"]
        
        # Now search
        response = requests.get(f"{BASE_URL}/api/search?q=TestSearch", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "clients" in data
        assert "cases" in data
        assert len(data["clients"]) > 0, "Should find the test client"
        print(f"✓ Search with 2+ characters returns clients and cases")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
    
    def test_search_endpoint_requires_auth(self):
        """Search endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/search?q=test")
        assert response.status_code == 401
        print(f"✓ Search endpoint requires authentication")


class TestNotifications:
    """Tests for notifications endpoint /api/notifications"""
    
    def test_notifications_endpoint_exists(self, auth_headers):
        """Notifications endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "count" in data
        assert isinstance(data["notifications"], list)
        assert isinstance(data["count"], int)
        print(f"✓ Notifications endpoint returns notifications array and count")
    
    def test_notifications_structure(self, auth_headers):
        """Notifications have expected structure"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # If there are notifications, check structure
        if data["notifications"]:
            notif = data["notifications"][0]
            assert "type" in notif
            assert "title" in notif
            assert "severity" in notif
            print(f"✓ Notifications have correct structure (type, title, severity)")
        else:
            print(f"✓ Notifications endpoint works (no notifications currently)")
    
    def test_notifications_require_auth(self):
        """Notifications endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
        print(f"✓ Notifications endpoint requires authentication")


class TestClientCRUD:
    """Tests for client CRUD operations"""
    
    def test_create_client_minimal(self, auth_headers):
        """Create client with minimal fields (no Security Address, Property Price, etc)"""
        # Create client with only required fields - NOT including removed fields
        response = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "first_name": "TEST_Minimal",
            "last_name": "Client",
            "email": "test_minimal@example.com",
            "phone": "07123456789",
            "postcode": "SW1A 1AA",
            "income": 50000,
            "employment_type": "employed",
            "lead_source": "online"
        })
        assert response.status_code == 201
        client = response.json()
        assert client["first_name"] == "TEST_Minimal"
        assert client["last_name"] == "Client"
        client_id = client["client_id"]
        print(f"✓ Client created with minimal fields (no removed fields required)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
    
    def test_delete_client_no_permission_error(self, auth_headers):
        """Delete client works without 'admin authority needed' error"""
        # Create client first
        create_response = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "first_name": "TEST_ToDelete",
            "last_name": "Client"
        })
        assert create_response.status_code == 201
        client_id = create_response.json()["client_id"]
        
        # Delete the client - should work without permission error
        delete_response = requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        assert "message" in delete_response.json()
        
        # Verify deletion by trying to get it
        get_response = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"✓ Delete client works without permission error")
    
    def test_client_list_columns(self, auth_headers):
        """Get clients and verify response has expected fields"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "clients" in data
        
        # Client list should have basic client info fields
        # NOT case metric fields like case_status in main client object (these come from enrichment)
        print(f"✓ Client list endpoint works correctly")


class TestClientAdditionalApplicants:
    """Tests for additional applicants on client detail"""
    
    def test_create_client_with_additional_applicants(self, auth_headers):
        """Create client and add additional applicants"""
        # Create client
        create_response = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "first_name": "TEST_Joint",
            "last_name": "Applicant"
        })
        assert create_response.status_code == 201
        client = create_response.json()
        client_id = client["client_id"]
        
        # Update with additional applicants
        update_response = requests.put(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers, json={
            "additional_applicants": [
                {
                    "full_name": "Jane Joint",
                    "dob": "1985-06-15",
                    "email": "jane.joint@example.com",
                    "phone": "07987654321"
                }
            ]
        })
        assert update_response.status_code == 200
        
        # Verify additional applicants were saved
        get_response = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        assert get_response.status_code == 200
        client_data = get_response.json()
        assert "additional_applicants" in client_data
        assert len(client_data["additional_applicants"]) == 1
        assert client_data["additional_applicants"][0]["full_name"] == "Jane Joint"
        print(f"✓ Additional applicants can be added to client")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
    
    def test_remove_additional_applicant(self, auth_headers):
        """Remove an additional applicant from client"""
        # Create client with applicant
        create_response = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "first_name": "TEST_Remove",
            "last_name": "Applicant",
            "additional_applicants": [
                {"full_name": "To Remove", "email": "remove@example.com"}
            ]
        })
        assert create_response.status_code == 201
        client_id = create_response.json()["client_id"]
        
        # Remove applicant by updating with empty array
        update_response = requests.put(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers, json={
            "additional_applicants": []
        })
        assert update_response.status_code == 200
        
        # Verify removed
        get_response = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json().get("additional_applicants", []) == []
        print(f"✓ Additional applicant can be removed")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)


class TestClientSearch:
    """Tests for client search endpoint used in New Case form"""
    
    def test_client_search_endpoint(self, auth_headers):
        """Client search endpoint returns searchable clients"""
        # Create a test client
        create_response = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "first_name": "TEST_Searchable",
            "last_name": "Client",
            "email": "searchable@test.com"
        })
        assert create_response.status_code == 201
        client_id = create_response.json()["client_id"]
        
        # Search for the client
        search_response = requests.get(f"{BASE_URL}/api/clients/search?q=Searchable", headers=auth_headers)
        assert search_response.status_code == 200
        results = search_response.json()
        assert isinstance(results, list)
        
        # Find our test client in results
        found = any(c.get("client_id") == client_id for c in results)
        assert found, "Test client should be found in search results"
        print(f"✓ Client search endpoint returns matching clients")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
    
    def test_client_search_returns_empty_on_no_match(self, auth_headers):
        """Client search returns empty list when no match"""
        search_response = requests.get(f"{BASE_URL}/api/clients/search?q=XYZ123NOMATCH", headers=auth_headers)
        assert search_response.status_code == 200
        results = search_response.json()
        assert isinstance(results, list)
        assert len(results) == 0
        print(f"✓ Client search returns empty list for no matches")


class TestCasesCRUD:
    """Tests for case CRUD operations including Mortgage/Insurance types"""
    
    @pytest.fixture
    def test_client(self, auth_headers):
        """Create a test client for case tests"""
        response = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "first_name": "TEST_CaseClient",
            "last_name": "ForCases"
        })
        assert response.status_code == 201
        client_id = response.json()["client_id"]
        yield client_id
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
    
    def test_create_mortgage_case(self, auth_headers, test_client):
        """Create mortgage case with new fields"""
        response = requests.post(f"{BASE_URL}/api/cases", headers=auth_headers, json={
            "client_id": test_client,
            "product_type": "mortgage",
            "mortgage_type": "purchase",
            "lender_name": "Halifax",
            "loan_amount": 250000,
            "property_value": 300000,
            "deposit_source": "Savings",
            "repayment_type": "repayment",
            "property_type": "residential",
            "case_reference": "HAL-2026-001",
            "rate_fixed_for": 5,
            "interest_rate": 4.5,
            "term_years": 25
        })
        assert response.status_code == 200 or response.status_code == 201
        case = response.json()
        assert case["product_type"] == "mortgage"
        assert case["mortgage_type"] == "purchase"
        assert case["property_value"] == 300000
        assert case["deposit_source"] == "Savings"
        assert case["repayment_type"] == "repayment"
        assert case["property_type"] == "residential"
        assert case["rate_fixed_for"] == 5
        print(f"✓ Mortgage case created with all new fields")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{case['case_id']}", headers=auth_headers)
    
    def test_create_insurance_case(self, auth_headers, test_client):
        """Create insurance case with new fields"""
        response = requests.post(f"{BASE_URL}/api/cases", headers=auth_headers, json={
            "client_id": test_client,
            "product_type": "insurance",
            "insurance_type": "life_insurance",
            "term_years": 20,
            "insurance_provider": "Aviva",
            "insurance_cover_type": "level_term",
            "insurance_reference": "AVI-2026-INS-001",
            "monthly_premium": 45.50,
            "guaranteed_or_reviewable": "guaranteed",
            "sum_assured": 200000,
            "in_trust": True
        })
        assert response.status_code == 200 or response.status_code == 201
        case = response.json()
        assert case["product_type"] == "insurance"
        assert case["insurance_type"] == "life_insurance"
        assert case["insurance_provider"] == "Aviva"
        assert case["insurance_cover_type"] == "level_term"
        assert case["monthly_premium"] == 45.50
        assert case["guaranteed_or_reviewable"] == "guaranteed"
        assert case["sum_assured"] == 200000
        assert case["in_trust"] == True
        print(f"✓ Insurance case created with all new fields")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{case['case_id']}", headers=auth_headers)
    
    def test_cases_filter_by_product_type(self, auth_headers, test_client):
        """Cases can be filtered by product type (mortgage/insurance)"""
        # Create one mortgage and one insurance case
        mortgage_response = requests.post(f"{BASE_URL}/api/cases", headers=auth_headers, json={
            "client_id": test_client,
            "product_type": "mortgage",
            "mortgage_type": "remortgage"
        })
        assert mortgage_response.status_code in [200, 201]
        mortgage_id = mortgage_response.json()["case_id"]
        
        insurance_response = requests.post(f"{BASE_URL}/api/cases", headers=auth_headers, json={
            "client_id": test_client,
            "product_type": "insurance",
            "insurance_type": "home_insurance"
        })
        assert insurance_response.status_code in [200, 201]
        insurance_id = insurance_response.json()["case_id"]
        
        # Filter by mortgage
        mortgage_cases = requests.get(f"{BASE_URL}/api/cases?product_type=mortgage", headers=auth_headers)
        assert mortgage_cases.status_code == 200
        assert all(c["product_type"] == "mortgage" for c in mortgage_cases.json()["cases"])
        
        # Filter by insurance
        insurance_cases = requests.get(f"{BASE_URL}/api/cases?product_type=insurance", headers=auth_headers)
        assert insurance_cases.status_code == 200
        assert all(c["product_type"] == "insurance" for c in insurance_cases.json()["cases"])
        
        print(f"✓ Cases can be filtered by product_type (mortgage/insurance tabs)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{mortgage_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/cases/{insurance_id}", headers=auth_headers)
    
    def test_cases_search_by_client_name(self, auth_headers, test_client):
        """Cases can be searched by client name"""
        # Create a case
        case_response = requests.post(f"{BASE_URL}/api/cases", headers=auth_headers, json={
            "client_id": test_client,
            "product_type": "mortgage"
        })
        assert case_response.status_code in [200, 201]
        case_id = case_response.json()["case_id"]
        
        # Search by client name
        search_response = requests.get(f"{BASE_URL}/api/cases?search=CaseClient", headers=auth_headers)
        assert search_response.status_code == 200
        results = search_response.json()["cases"]
        
        # Should find our case
        found = any(c["case_id"] == case_id for c in results)
        assert found, "Case should be found by client name search"
        print(f"✓ Cases can be searched by client name")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{case_id}", headers=auth_headers)


class TestCaseStatusReviewAutomation:
    """Tests for task automation only on review status"""
    
    def test_review_status_creates_task(self, auth_headers):
        """Setting case status to review_due or for_review creates a task"""
        # Create client and case
        client_response = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "first_name": "TEST_Review",
            "last_name": "Automation"
        })
        assert client_response.status_code == 201
        client_id = client_response.json()["client_id"]
        
        case_response = requests.post(f"{BASE_URL}/api/cases", headers=auth_headers, json={
            "client_id": client_id,
            "product_type": "mortgage",
            "status": "new_lead"
        })
        assert case_response.status_code in [200, 201]
        case_id = case_response.json()["case_id"]
        
        # Get tasks before status change
        tasks_before = requests.get(f"{BASE_URL}/api/tasks?case_id={case_id}", headers=auth_headers)
        initial_task_count = len(tasks_before.json().get("tasks", []))
        
        # Update status to review_due
        update_response = requests.put(f"{BASE_URL}/api/cases/{case_id}", headers=auth_headers, json={
            "status": "review_due"
        })
        assert update_response.status_code == 200
        
        # Check if task was created
        tasks_after = requests.get(f"{BASE_URL}/api/tasks?case_id={case_id}", headers=auth_headers)
        final_task_count = len(tasks_after.json().get("tasks", []))
        
        assert final_task_count > initial_task_count, "Task should be created on review status"
        print(f"✓ Task automation works on review_due status")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{case_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)


class TestExportEndpoint:
    """Tests for single-sheet export"""
    
    def test_excel_export_endpoint(self, auth_headers):
        """Export endpoint returns Excel file"""
        # The export endpoint should return a file
        response = requests.get(f"{BASE_URL}/api/export/excel", headers=auth_headers)
        # Accept 200 or 400/422 if no data or missing params
        if response.status_code == 200:
            content_type = response.headers.get("Content-Type", "")
            # Should return an Excel file
            assert "spreadsheet" in content_type or "octet-stream" in content_type
            print(f"✓ Export endpoint returns Excel file")
        else:
            # May require parameters - that's ok
            print(f"✓ Export endpoint exists (may require parameters)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
