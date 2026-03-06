"""
Test iteration 10: Client Fee feature testing
- POST /api/cases with client_fee field
- GET /api/dashboard/forecast - client_fees in commission_this_month and commission_last_30_days
- GET /api/dashboard/stats - total_client_fees
- GET /api/commission/analytics - summary.total_client_fees
- GET /api/reports/commission-paid with report_type=client_fees and report_type=both
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Login and get auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "kunalkapadia2212@gmail.com",
        "password": "Admin2468!!!"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }

@pytest.fixture(scope="module")
def test_client(headers):
    """Create a test client for case creation"""
    client_data = {
        "first_name": "TEST_ClientFee",
        "last_name": "TestUser",
        "email": "test_clientfee@test.com",
        "phone": "07700900123"
    }
    response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=headers)
    if response.status_code != 201:
        # Client might already exist, search for it
        search_response = requests.get(f"{BASE_URL}/api/clients/search?q=TEST_ClientFee", headers=headers)
        if search_response.status_code == 200 and search_response.json():
            return search_response.json()[0]
    assert response.status_code in [200, 201], f"Failed to create client: {response.text}"
    return response.json()


class TestLogin:
    """Test 1: Login verification"""
    
    def test_login_success(self):
        """Login with kunalkapadia2212@gmail.com / Admin2468!!!"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["email"] == "kunalkapadia2212@gmail.com"
        print("PASS: Login successful")


class TestCaseClientFee:
    """Test 2: POST /api/cases - verify client_fee field is stored and returned"""
    
    def test_create_case_with_client_fee(self, headers, test_client):
        """Create a case with client_fee and verify it's stored and returned"""
        today = datetime.now().strftime("%Y-%m-%d")
        case_data = {
            "client_id": test_client["client_id"],
            "product_type": "mortgage",
            "mortgage_type": "purchase",
            "lender_name": "TEST_Lender",
            "loan_amount": 250000,
            "interest_rate": 4.5,
            "term_years": 25,
            "proc_fee_total": 1500,
            "commission_percentage": 35,
            "client_fee": 750.00,
            "commission_status": "paid",
            "expected_completion_date": today,
            "commission_paid_date": today
        }
        response = requests.post(f"{BASE_URL}/api/cases", json=case_data, headers=headers)
        assert response.status_code in [200, 201], f"Failed to create case: {response.text}"
        data = response.json()
        
        # Verify client_fee is returned
        assert "client_fee" in data, "client_fee field not in response"
        assert data["client_fee"] == 750.00, f"Expected client_fee 750.00, got {data.get('client_fee')}"
        assert data["proc_fee_total"] == 1500, f"Expected proc_fee_total 1500, got {data.get('proc_fee_total')}"
        assert data["commission_percentage"] == 35, f"Expected commission_percentage 35, got {data.get('commission_percentage')}"
        
        # Verify via GET
        case_id = data["case_id"]
        get_response = requests.get(f"{BASE_URL}/api/cases/{case_id}", headers=headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["client_fee"] == 750.00, "client_fee not persisted correctly"
        
        print(f"PASS: Case created with client_fee=750.00, case_id={case_id}")
        return case_id


class TestDashboardForecast:
    """Test 3: GET /api/dashboard/forecast - verify client_fees stats"""
    
    def test_forecast_returns_client_fees(self, headers):
        """Verify total_client_fees, commission_this_month.client_fees, commission_last_30_days.client_fees"""
        response = requests.get(f"{BASE_URL}/api/dashboard/forecast", headers=headers)
        assert response.status_code == 200, f"Forecast API failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "total_client_fees" in data, "total_client_fees not in forecast response"
        assert "commission_this_month" in data, "commission_this_month not in forecast response"
        assert "commission_last_30_days" in data, "commission_last_30_days not in forecast response"
        
        # Verify client_fees in sub-objects
        assert "client_fees" in data["commission_this_month"], "client_fees not in commission_this_month"
        assert "client_fees" in data["commission_last_30_days"], "client_fees not in commission_last_30_days"
        
        print(f"PASS: Forecast returns client_fees - total: {data['total_client_fees']}, this_month: {data['commission_this_month']['client_fees']}, last_30: {data['commission_last_30_days']['client_fees']}")


class TestDashboardStats:
    """Test 4: GET /api/dashboard/stats - verify total_client_fees"""
    
    def test_stats_returns_total_client_fees(self, headers):
        """Verify total_client_fees is returned in dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200, f"Stats API failed: {response.text}"
        data = response.json()
        
        assert "total_client_fees" in data, "total_client_fees not in stats response"
        print(f"PASS: Dashboard stats returns total_client_fees: {data['total_client_fees']}")


class TestCommissionAnalytics:
    """Test 5: GET /api/commission/analytics - verify summary.total_client_fees"""
    
    def test_analytics_returns_total_client_fees(self, headers):
        """Verify summary.total_client_fees is returned in commission analytics"""
        response = requests.get(f"{BASE_URL}/api/commission/analytics", headers=headers)
        assert response.status_code == 200, f"Commission analytics failed: {response.text}"
        data = response.json()
        
        assert "summary" in data, "summary not in commission analytics response"
        assert "total_client_fees" in data["summary"], "total_client_fees not in summary"
        print(f"PASS: Commission analytics returns total_client_fees: {data['summary']['total_client_fees']}")


class TestReportsClientFees:
    """Test 6-7: GET /api/reports/commission-paid with report_type param"""
    
    def test_report_client_fees_type(self, headers):
        """report_type=client_fees should return total_client_fees in summary"""
        today = datetime.now()
        start_date = (today - timedelta(days=365)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/commission-paid?start_date={start_date}&end_date={end_date}&report_type=client_fees",
            headers=headers
        )
        assert response.status_code == 200, f"Reports API failed: {response.text}"
        data = response.json()
        
        assert "summary" in data, "summary not in report response"
        assert "total_client_fees" in data["summary"], "total_client_fees not in summary"
        print(f"PASS: Report type=client_fees returns total_client_fees: {data['summary']['total_client_fees']}")
    
    def test_report_both_type(self, headers):
        """report_type=both should return total_combined_revenue in summary"""
        today = datetime.now()
        start_date = (today - timedelta(days=365)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/commission-paid?start_date={start_date}&end_date={end_date}&report_type=both",
            headers=headers
        )
        assert response.status_code == 200, f"Reports API failed: {response.text}"
        data = response.json()
        
        assert "summary" in data, "summary not in report response"
        assert "total_combined_revenue" in data["summary"], "total_combined_revenue not in summary"
        assert "total_client_fees" in data["summary"], "total_client_fees not in summary"
        assert "total_commission_paid" in data["summary"], "total_commission_paid not in summary"
        print(f"PASS: Report type=both returns combined revenue: {data['summary']['total_combined_revenue']}, client_fees: {data['summary']['total_client_fees']}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, headers):
        """Delete TEST_ prefixed data"""
        # Get all cases
        response = requests.get(f"{BASE_URL}/api/cases", headers=headers)
        if response.status_code == 200:
            cases = response.json().get("cases", [])
            for case in cases:
                if case.get("lender_name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/cases/{case['case_id']}", headers=headers)
        
        # Get all clients
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        if response.status_code == 200:
            clients = response.json().get("clients", [])
            for client in clients:
                if client.get("first_name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/clients/{client['client_id']}", headers=headers)
        
        print("PASS: Test data cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
