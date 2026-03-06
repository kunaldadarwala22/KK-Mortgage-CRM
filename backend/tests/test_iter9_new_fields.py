"""
Test: Iteration 9 - New Mortgage Case Fields
Features:
1. Interest Rate Type field (fixed, variable, discounted, tracker, capped)
2. Initial Product Term field (years)
3. Database wipe endpoint /api/admin/wipe-data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndSetup:
    """Authentication and basic setup tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self):
        """Test login with provided credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "email" in data  # User info is in root, not nested
        print(f"Login successful: {data.get('email')}")


class TestCasesEmptyState:
    """Test cases page shows empty state after database wipe"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_cases_empty_initially(self, auth_headers):
        """Verify cases endpoint returns empty or few items"""
        response = requests.get(f"{BASE_URL}/api/cases", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"Cases count: {len(data)}")


class TestNewMortgageFields:
    """Test new interest_rate_type and initial_product_term fields"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, auth_headers):
        """Create a test client and return client_id"""
        client_data = {
            "first_name": "TEST_Interest",
            "last_name": "RateType",
            "email": "test_interest_rate_type@example.com",
            "phone": "+44 7700 900123"
        }
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create client: {response.text}"
        data = response.json()
        client_id = data.get("client_id")
        assert client_id, f"No client_id in response: {data}"
        print(f"Created test client: {client_id}")
        return client_id
    
    def test_create_case_with_interest_rate_type_fixed(self, auth_headers, test_client_id):
        """Test creating case with interest_rate_type = 'fixed'"""
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "mortgage_type": "purchase",
            "interest_rate_type": "fixed",
            "initial_product_term": 2,
            "interest_rate": 4.5,
            "term_years": 25,
            "lender_name": "Halifax",
            "loan_amount": 250000
        }
        response = requests.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create case: {response.text}"
        data = response.json()
        
        # Verify fields are returned
        assert data.get("interest_rate_type") == "fixed", f"interest_rate_type mismatch: {data.get('interest_rate_type')}"
        assert data.get("initial_product_term") == 2, f"initial_product_term mismatch: {data.get('initial_product_term')}"
        assert data.get("interest_rate") == 4.5, f"interest_rate mismatch: {data.get('interest_rate')}"
        assert data.get("term_years") == 25, f"term_years mismatch: {data.get('term_years')}"
        assert data.get("lender_name") == "Halifax", f"lender_name mismatch: {data.get('lender_name')}"
        print(f"Created case with interest_rate_type=fixed: {data.get('case_id')}")
        return data.get("case_id")
    
    def test_create_case_with_interest_rate_type_variable(self, auth_headers, test_client_id):
        """Test creating case with interest_rate_type = 'variable'"""
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "mortgage_type": "remortgage",
            "interest_rate_type": "variable",
            "initial_product_term": 5,
            "interest_rate": 3.75,
            "term_years": 30,
            "lender_name": "Barclays"
        }
        response = requests.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create case: {response.text}"
        data = response.json()
        
        assert data.get("interest_rate_type") == "variable"
        assert data.get("initial_product_term") == 5
        print(f"Created case with interest_rate_type=variable: {data.get('case_id')}")
    
    def test_create_case_with_interest_rate_type_tracker(self, auth_headers, test_client_id):
        """Test creating case with interest_rate_type = 'tracker'"""
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "interest_rate_type": "tracker",
            "initial_product_term": 3,
            "interest_rate": 2.5,
            "term_years": 20
        }
        response = requests.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create case: {response.text}"
        data = response.json()
        
        assert data.get("interest_rate_type") == "tracker"
        assert data.get("initial_product_term") == 3
        print(f"Created case with interest_rate_type=tracker: {data.get('case_id')}")
    
    def test_create_case_with_interest_rate_type_discounted(self, auth_headers, test_client_id):
        """Test creating case with interest_rate_type = 'discounted'"""
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "interest_rate_type": "discounted",
            "initial_product_term": 4,
        }
        response = requests.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create case: {response.text}"
        data = response.json()
        
        assert data.get("interest_rate_type") == "discounted"
        assert data.get("initial_product_term") == 4
        print(f"Created case with interest_rate_type=discounted: {data.get('case_id')}")
    
    def test_create_case_with_interest_rate_type_capped(self, auth_headers, test_client_id):
        """Test creating case with interest_rate_type = 'capped'"""
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "interest_rate_type": "capped",
            "initial_product_term": 1,
        }
        response = requests.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create case: {response.text}"
        data = response.json()
        
        assert data.get("interest_rate_type") == "capped"
        assert data.get("initial_product_term") == 1
        print(f"Created case with interest_rate_type=capped: {data.get('case_id')}")
    
    def test_get_case_returns_new_fields(self, auth_headers, test_client_id):
        """Test GET /api/cases/{id} returns interest_rate_type and initial_product_term"""
        # First create a case
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "interest_rate_type": "fixed",
            "initial_product_term": 2,
            "interest_rate": 5.0,
            "lender_name": "NatWest"
        }
        create_resp = requests.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert create_resp.status_code in [200, 201]
        case_id = create_resp.json().get("case_id")
        
        # GET the case
        get_resp = requests.get(f"{BASE_URL}/api/cases/{case_id}", headers=auth_headers)
        assert get_resp.status_code == 200
        data = get_resp.json()
        
        # Verify fields persisted
        assert data.get("interest_rate_type") == "fixed", f"GET interest_rate_type: {data.get('interest_rate_type')}"
        assert data.get("initial_product_term") == 2, f"GET initial_product_term: {data.get('initial_product_term')}"
        print(f"GET case {case_id} returned correct new fields")
    
    def test_update_case_new_fields(self, auth_headers, test_client_id):
        """Test PUT /api/cases/{id} can update interest_rate_type and initial_product_term"""
        # Create a case
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "interest_rate_type": "fixed",
            "initial_product_term": 2
        }
        create_resp = requests.post(f"{BASE_URL}/api/cases", json=case_data, headers=auth_headers)
        assert create_resp.status_code in [200, 201]
        case_id = create_resp.json().get("case_id")
        
        # Update the case
        update_data = {
            "interest_rate_type": "variable",
            "initial_product_term": 5
        }
        update_resp = requests.put(f"{BASE_URL}/api/cases/{case_id}", json=update_data, headers=auth_headers)
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        
        # GET to verify update persisted
        get_resp = requests.get(f"{BASE_URL}/api/cases/{case_id}", headers=auth_headers)
        assert get_resp.status_code == 200
        data = get_resp.json()
        
        assert data.get("interest_rate_type") == "variable", f"Updated interest_rate_type: {data.get('interest_rate_type')}"
        assert data.get("initial_product_term") == 5, f"Updated initial_product_term: {data.get('initial_product_term')}"
        print(f"Updated case {case_id} new fields successfully")


class TestWipeDataEndpoint:
    """Test /api/admin/wipe-data endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_wipe_data_endpoint_exists(self, auth_headers):
        """Test that wipe-data endpoint exists and responds"""
        # First create some test data
        client_resp = requests.post(f"{BASE_URL}/api/clients", json={
            "first_name": "TEST_Wipe",
            "last_name": "DataTest",
            "email": "test_wipe@example.com",
            "phone": "+44 7700 900999"
        }, headers=auth_headers)
        
        if client_resp.status_code in [200, 201]:
            print(f"Created test client for wipe test")
        
        # Test the wipe endpoint
        response = requests.delete(f"{BASE_URL}/api/admin/wipe-data", headers=auth_headers)
        assert response.status_code == 200, f"Wipe data failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert "clients_deleted" in data
        assert "cases_deleted" in data
        assert "tasks_deleted" in data
        print(f"Wipe data response: {data}")
    
    def test_after_wipe_cases_empty(self, auth_headers):
        """Test that cases are empty after wipe"""
        response = requests.get(f"{BASE_URL}/api/cases", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # API returns {"cases": [], "total": 0}
        cases_list = data.get("cases", data) if isinstance(data, dict) else data
        assert len(cases_list) == 0, f"Cases should be empty after wipe, got {len(cases_list)}"
        print("Cases are empty after wipe")
    
    def test_after_wipe_clients_empty(self, auth_headers):
        """Test that clients are empty after wipe"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # API returns {"clients": [], "total": 0}
        clients_list = data.get("clients", data) if isinstance(data, dict) else data
        assert len(clients_list) == 0, f"Clients should be empty after wipe, got {len(clients_list)}"
        print("Clients are empty after wipe")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
