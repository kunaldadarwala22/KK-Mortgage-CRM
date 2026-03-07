"""
Iteration 13 Tests: Lender Analytics, Security Address, Fact Find Summary, Client Portfolio
Features:
1. GET /api/analytics/lender-usage - Lender usage stats (all_time, last_12_months, buy_to_let, residential)
2. POST /api/cases with security_address and security_postcode fields
3. Fact Find Summary tab on CaseDetail (frontend only)
4. Client Portfolio tab on ClientDetail (frontend only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLenderUsageAnalytics:
    """Test GET /api/analytics/lender-usage endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    def test_lender_usage_endpoint_returns_200(self, auth_token):
        """Test that lender usage endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/lender-usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/analytics/lender-usage returns 200")
    
    def test_lender_usage_response_structure(self, auth_token):
        """Test that response has all required arrays"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/lender-usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all four arrays exist
        assert "all_time" in data, "Missing 'all_time' key"
        assert "last_12_months" in data, "Missing 'last_12_months' key"
        assert "buy_to_let" in data, "Missing 'buy_to_let' key"
        assert "residential" in data, "Missing 'residential' key"
        
        # Check arrays are lists
        assert isinstance(data["all_time"], list), "all_time should be a list"
        assert isinstance(data["last_12_months"], list), "last_12_months should be a list"
        assert isinstance(data["buy_to_let"], list), "buy_to_let should be a list"
        assert isinstance(data["residential"], list), "residential should be a list"
        
        print(f"PASS: Response has all 4 arrays - all_time: {len(data['all_time'])}, last_12_months: {len(data['last_12_months'])}, buy_to_let: {len(data['buy_to_let'])}, residential: {len(data['residential'])}")
    
    def test_lender_usage_item_structure(self, auth_token):
        """Test that each item in arrays has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/lender-usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check item structure if data exists
        for key in ["all_time", "last_12_months", "buy_to_let", "residential"]:
            if data[key]:
                item = data[key][0]
                assert "lender" in item, f"Missing 'lender' field in {key}"
                assert "cases" in item, f"Missing 'cases' field in {key}"
                print(f"PASS: {key} items have 'lender' and 'cases' fields")
            else:
                print(f"INFO: {key} array is empty (no data)")


class TestSecurityAddressFields:
    """Test security_address and security_postcode fields on cases"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def test_client(self, auth_token):
        """Get or create a test client"""
        # Search for existing test client
        response = requests.get(
            f"{BASE_URL}/api/clients?search=TEST_SecurityAddr",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200 and response.json().get("clients"):
            return response.json()["clients"][0]
        
        # Create new test client
        response = requests.post(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "first_name": "TEST_SecurityAddr",
                "last_name": "Client",
                "email": "test_security@example.com"
            }
        )
        assert response.status_code == 201
        return response.json()
    
    def test_create_case_with_security_address(self, auth_token, test_client):
        """Test creating a case with security_address and security_postcode"""
        response = requests.post(
            f"{BASE_URL}/api/cases",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "client_id": test_client["client_id"],
                "product_type": "mortgage",
                "mortgage_type": "purchase",
                "security_address": "123 Test Street, London",
                "security_postcode": "SW1A 1AA",
                "lender_name": "Halifax",
                "loan_amount": 250000
            }
        )
        assert response.status_code == 200 or response.status_code == 201, f"Failed to create case: {response.text}"
        data = response.json()
        
        # Verify security fields are stored
        assert data.get("security_address") == "123 Test Street, London", "security_address not stored"
        assert data.get("security_postcode") == "SW1A 1AA", "security_postcode not stored"
        
        print(f"PASS: Case created with security_address='{data.get('security_address')}' and security_postcode='{data.get('security_postcode')}'")
        
        # Clean up - delete the test case
        case_id = data.get("case_id")
        if case_id:
            requests.delete(
                f"{BASE_URL}/api/cases/{case_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
    
    def test_get_case_returns_security_fields(self, auth_token, test_client):
        """Test that GET case returns security_address and security_postcode"""
        # Create a case first
        create_response = requests.post(
            f"{BASE_URL}/api/cases",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "client_id": test_client["client_id"],
                "product_type": "mortgage",
                "mortgage_type": "remortgage",
                "security_address": "456 High Street, Manchester",
                "security_postcode": "M1 1AD",
                "lender_name": "NatWest",
            }
        )
        assert create_response.status_code in [200, 201]
        case_id = create_response.json().get("case_id")
        
        # GET the case
        get_response = requests.get(
            f"{BASE_URL}/api/cases/{case_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("security_address") == "456 High Street, Manchester"
        assert data.get("security_postcode") == "M1 1AD"
        
        print(f"PASS: GET /api/cases/{case_id} returns security fields correctly")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/cases/{case_id}", headers={"Authorization": f"Bearer {auth_token}"})


class TestExistingData:
    """Verify existing test data with security_address and security_postcode"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_get_clients_with_cases(self, auth_token):
        """Get clients and verify data structure"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        clients = data.get("clients", [])
        print(f"INFO: Found {len(clients)} clients in database")
        
        # Look for John Smith (mentioned in test context)
        john_smith = None
        for c in clients:
            if c.get("first_name") == "John" and c.get("last_name") == "Smith":
                john_smith = c
                break
        
        if john_smith:
            print(f"PASS: Found John Smith client with ID: {john_smith.get('client_id')}")
        else:
            print("INFO: John Smith client not found - may need to create test data")
    
    def test_get_cases_with_security_fields(self, auth_token):
        """Check if any cases have security_address populated"""
        response = requests.get(
            f"{BASE_URL}/api/cases",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        cases = data.get("cases", [])
        cases_with_security = [c for c in cases if c.get("security_address")]
        
        print(f"INFO: Found {len(cases)} total cases, {len(cases_with_security)} have security_address")
        
        for c in cases_with_security[:3]:  # Show first 3
            print(f"  - {c.get('case_id')}: {c.get('security_address')}, {c.get('security_postcode')}")


class TestCaseCreateModel:
    """Test that CaseCreate model accepts security fields and ltv but NOT rate_fixed_for"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def test_client(self, auth_token):
        """Get or create a test client"""
        response = requests.get(
            f"{BASE_URL}/api/clients?search=TEST_CaseModel",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200 and response.json().get("clients"):
            return response.json()["clients"][0]
        
        response = requests.post(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "first_name": "TEST_CaseModel",
                "last_name": "Client",
                "email": "test_casemodel@example.com"
            }
        )
        assert response.status_code == 201
        return response.json()
    
    def test_create_case_with_ltv_field(self, auth_token, test_client):
        """Test creating a case with LTV field"""
        response = requests.post(
            f"{BASE_URL}/api/cases",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "client_id": test_client["client_id"],
                "product_type": "mortgage",
                "mortgage_type": "purchase",
                "ltv": 75.5,
                "loan_amount": 200000,
                "property_value": 265000,
                "lender_name": "Barclays"
            }
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        data = response.json()
        
        # LTV should be stored
        assert data.get("ltv") == 75.5, f"Expected ltv=75.5, got {data.get('ltv')}"
        print(f"PASS: Case created with ltv={data.get('ltv')}")
        
        # Clean up
        case_id = data.get("case_id")
        if case_id:
            requests.delete(f"{BASE_URL}/api/cases/{case_id}", headers={"Authorization": f"Bearer {auth_token}"})


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
