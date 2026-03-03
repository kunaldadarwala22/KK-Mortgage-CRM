"""
KK Mortgage Solutions CRM - Backend API Tests
Tests for all major endpoints including auth, clients, cases, tasks, dashboard, and export
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mortgage-crm-preview.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Test credentials
TEST_EMAIL = "test@kkmortgage.com"
TEST_PASSWORD = "Test1234!"


class TestHealthCheck:
    """Health check and basic API connectivity tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"PASS: Health check passed - status: {data['status']}")

    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASS: API root accessible - message: {data['message']}")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user_id" in data
        assert data["email"] == TEST_EMAIL
        print(f"PASS: Login successful - user_id: {data['user_id']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@email.com",
            "password": "wrongpassword"
        })
        # Should return 401 or 403 for invalid credentials
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Invalid login correctly rejected with status {response.status_code}")
    
    def test_get_current_user(self):
        """Test getting current user info after login"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token")
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"PASS: Current user info retrieved - name: {data.get('name')}")


class TestDashboard:
    """Dashboard API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("token")
    
    def test_dashboard_stats(self, auth_token):
        """Test dashboard statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields exist
        expected_fields = ["total_clients", "total_cases", "total_pipeline_value", 
                          "total_commission", "conversion_rate", "status_counts"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"PASS: Dashboard stats - clients: {data['total_clients']}, cases: {data['total_cases']}")
    
    def test_dashboard_revenue(self, auth_token):
        """Test dashboard revenue analytics endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/revenue", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "monthly_revenue" in data or "by_lender" in data or "by_lead_source" in data
        print(f"PASS: Dashboard revenue data retrieved")
    
    def test_dashboard_forecast(self, auth_token):
        """Test dashboard forecast endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/forecast", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "next_30_days" in data
        assert "next_60_days" in data
        assert "next_90_days" in data
        print(f"PASS: Dashboard forecast - 30 days amount: {data['next_30_days'].get('amount', 0)}")


class TestClients:
    """Clients CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("token")
    
    def test_get_clients_list(self, auth_token):
        """Test getting list of clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "clients" in data
        assert "total" in data
        print(f"PASS: Clients list - total: {data['total']}")
    
    def test_create_client(self, auth_token):
        """Test creating a new client"""
        client_data = {
            "first_name": "TEST_John",
            "last_name": "TEST_Doe",
            "email": f"test_{int(time.time())}@example.com",
            "phone": "07700 900123",
            "postcode": "SW1A 1AA",
            "income": 50000,
            "loan_amount": 200000,
            "property_price": 250000,
            "lead_source": "online"
        }
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "client_id" in data
        assert data["first_name"] == "TEST_John"
        print(f"PASS: Client created - client_id: {data['client_id']}")
        
        # Cleanup - delete test client
        cleanup = requests.delete(f"{BASE_URL}/api/clients/{data['client_id']}", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        print(f"Cleanup result: {cleanup.status_code}")
    
    def test_client_search(self, auth_token):
        """Test client search functionality"""
        response = requests.get(f"{BASE_URL}/api/clients?search=test", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "clients" in data
        print(f"PASS: Client search returned {len(data['clients'])} results")


class TestCases:
    """Cases CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("token")
    
    def test_get_cases_list(self, auth_token):
        """Test getting list of cases"""
        response = requests.get(f"{BASE_URL}/api/cases", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
        assert "total" in data
        print(f"PASS: Cases list - total: {data['total']}")
    
    def test_get_cases_by_status(self, auth_token):
        """Test filtering cases by status"""
        response = requests.get(f"{BASE_URL}/api/cases?status=new_lead", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
        print(f"PASS: Cases filtered by status - count: {len(data['cases'])}")


class TestTasks:
    """Tasks CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("token")
    
    def test_get_tasks_list(self, auth_token):
        """Test getting list of tasks"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert "total" in data
        print(f"PASS: Tasks list - total: {data['total']}")
    
    def test_create_task(self, auth_token):
        """Test creating a new task"""
        task_data = {
            "title": "TEST_Follow up call",
            "description": "Test task created by automated testing",
            "due_date": "2026-02-01",
            "priority": "medium"
        }
        response = requests.post(f"{BASE_URL}/api/tasks", json=task_data, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "task_id" in data
        assert data["title"] == "TEST_Follow up call"
        print(f"PASS: Task created - task_id: {data['task_id']}")
        
        # Cleanup - delete test task
        cleanup = requests.delete(f"{BASE_URL}/api/tasks/{data['task_id']}", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        print(f"Cleanup result: {cleanup.status_code}")


class TestExport:
    """Export functionality tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("token")
    
    def test_export_clients_excel(self, auth_token):
        """Test exporting clients to Excel"""
        response = requests.get(f"{BASE_URL}/api/export/clients", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        # Verify it's an Excel file
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'application/vnd.openxmlformats' in content_type
        
        # Check file size (should be non-empty)
        assert len(response.content) > 0
        print(f"PASS: Export clients returned {len(response.content)} bytes")
    
    def test_export_all_data_excel(self, auth_token):
        """Test exporting all data to Excel"""
        response = requests.get(f"{BASE_URL}/api/export/excel", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        # Verify it's an Excel file  
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'application/vnd.openxmlformats' in content_type
        print(f"PASS: Export all data returned {len(response.content)} bytes")


class TestDocuments:
    """Documents API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("token")
    
    def test_get_documents_list(self, auth_token):
        """Test getting list of documents"""
        response = requests.get(f"{BASE_URL}/api/documents", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        # Documents endpoint returns a list directly
        assert isinstance(response.json(), list)
        print(f"PASS: Documents list retrieved - count: {len(response.json())}")


class TestUsers:
    """Users API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("token")
    
    def test_get_users_list(self, auth_token):
        """Test getting list of users"""
        response = requests.get(f"{BASE_URL}/api/users", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Users list retrieved - count: {len(data)}")


class TestLeadAnalytics:
    """Lead analytics tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("token")
    
    def test_lead_analytics(self, auth_token):
        """Test lead analytics endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/lead-analytics", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "by_lead_source" in data
        print(f"PASS: Lead analytics retrieved")
    
    def test_retention_data(self, auth_token):
        """Test retention data endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/retention", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "expiring_this_month" in data or "expiring_by_month" in data
        print(f"PASS: Retention data retrieved")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
