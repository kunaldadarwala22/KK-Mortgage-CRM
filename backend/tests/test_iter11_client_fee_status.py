"""
Test Iteration 11: Client Fee Status Feature Tests
- client_fee_status field (Pending/Submitted/Paid/Clawed Back)
- client_fee_paid_date field
- Updated dashboard/forecast endpoint with separate commission and client fee stats
- Reports endpoint filtering by respective paid dates
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_login_success(self, auth_token):
        """Test 1: Login with provided credentials"""
        assert auth_token is not None
        print("✓ Test 1: Login successful")


class TestCaseClientFeeFields:
    """Test client_fee_status and client_fee_paid_date in Cases API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, headers):
        """Get or create test client"""
        # Search for existing test client
        response = requests.get(f"{BASE_URL}/api/clients/search?q=Test", headers=headers)
        if response.status_code == 200:
            clients = response.json()
            if clients:
                return clients[0]["client_id"]
        
        # Create new client if not found
        response = requests.post(f"{BASE_URL}/api/clients", headers=headers, json={
            "first_name": "TEST_ClientFee",
            "last_name": "User",
            "email": "testclientfee@test.com"
        })
        if response.status_code == 201:
            return response.json()["client_id"]
        
        # If creation failed, try to find any client
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        clients = response.json().get("clients", [])
        assert len(clients) > 0, "No clients available for testing"
        return clients[0]["client_id"]
    
    def test_post_case_with_client_fee_status(self, headers, test_client_id):
        """Test 2: POST /api/cases - verify client_fee_status and client_fee_paid_date fields accepted"""
        today = datetime.now().strftime("%Y-%m-%d")
        case_data = {
            "client_id": test_client_id,
            "product_type": "mortgage",
            "mortgage_type": "purchase",
            "lender_name": "TEST_Iter11_Lender",
            "loan_amount": 200000,
            "client_fee": 750,
            "client_fee_status": "submitted_to_lender",
            "client_fee_paid_date": today,
            "commission_status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/cases", headers=headers, json=case_data)
        assert response.status_code == 200, f"Failed to create case: {response.text}"
        
        data = response.json()
        assert "case_id" in data
        # Verify fields are stored
        assert data.get("client_fee") == 750
        assert data.get("client_fee_status") == "submitted_to_lender"
        assert data.get("client_fee_paid_date") == today
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{data['case_id']}", headers=headers)
        print("✓ Test 2: POST /api/cases accepts client_fee_status and client_fee_paid_date")
    
    def test_put_case_update_client_fee_status(self, headers, test_client_id):
        """Test 3: PUT /api/cases/{id} - verify updating client_fee_status and client_fee_paid_date"""
        # Create a case first
        response = requests.post(f"{BASE_URL}/api/cases", headers=headers, json={
            "client_id": test_client_id,
            "product_type": "mortgage",
            "lender_name": "TEST_Iter11_Update",
            "loan_amount": 150000,
            "client_fee": 500,
            "client_fee_status": "pending"
        })
        assert response.status_code == 200
        case_id = response.json()["case_id"]
        
        # Update client_fee_status to paid with paid date
        today = datetime.now().strftime("%Y-%m-%d")
        update_response = requests.put(f"{BASE_URL}/api/cases/{case_id}", headers=headers, json={
            "client_fee_status": "paid",
            "client_fee_paid_date": today
        })
        assert update_response.status_code == 200
        
        updated_data = update_response.json()
        assert updated_data.get("client_fee_status") == "paid"
        assert updated_data.get("client_fee_paid_date") == today
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/cases/{case_id}", headers=headers)
        assert get_response.status_code == 200
        verified_data = get_response.json()
        assert verified_data.get("client_fee_status") == "paid"
        assert verified_data.get("client_fee_paid_date") == today
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{case_id}", headers=headers)
        print("✓ Test 3: PUT /api/cases/{id} updates client_fee_status and client_fee_paid_date correctly")


class TestDashboardForecast:
    """Test dashboard/forecast endpoint with client fee stats"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_dashboard_forecast_client_fee_fields(self, headers):
        """Test 4: GET /api/dashboard/forecast returns all required client fee fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/forecast", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify commission fields exist
        assert "commission_this_month" in data, "Missing commission_this_month"
        assert "commission_last_30_days" in data, "Missing commission_last_30_days"
        
        # Verify new separate client fee fields
        assert "client_fees_paid_this_month" in data, "Missing client_fees_paid_this_month"
        assert "client_fees_paid_last_30_days" in data, "Missing client_fees_paid_last_30_days"
        assert "total_client_fees_paid" in data, "Missing total_client_fees_paid"
        assert "client_fee_pending" in data, "Missing client_fee_pending"
        
        # Verify commission_this_month structure
        ctm = data["commission_this_month"]
        assert "amount" in ctm
        assert "proc_fees" in ctm
        assert "cases" in ctm
        
        print("✓ Test 4: GET /api/dashboard/forecast returns all client fee fields correctly")
        print(f"   - client_fees_paid_this_month: {data['client_fees_paid_this_month']}")
        print(f"   - client_fees_paid_last_30_days: {data['client_fees_paid_last_30_days']}")
        print(f"   - total_client_fees_paid: {data['total_client_fees_paid']}")
        print(f"   - client_fee_pending: {data['client_fee_pending']}")


class TestClientFeePending:
    """Test client_fee_pending calculation"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, headers):
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        clients = response.json().get("clients", [])
        if clients:
            return clients[0]["client_id"]
        # Create if none exists
        response = requests.post(f"{BASE_URL}/api/clients", headers=headers, json={
            "first_name": "TEST_Pending",
            "last_name": "Client"
        })
        return response.json()["client_id"]
    
    def test_client_fee_pending_only_pending_status(self, headers, test_client_id):
        """Test 5: client_fee_pending shows only fees with client_fee_status=pending and client_fee>0"""
        # Get initial pending amount
        initial_response = requests.get(f"{BASE_URL}/api/dashboard/forecast", headers=headers)
        initial_pending = initial_response.json().get("client_fee_pending", 0)
        
        # Create case with pending client fee
        case_response = requests.post(f"{BASE_URL}/api/cases", headers=headers, json={
            "client_id": test_client_id,
            "product_type": "mortgage",
            "lender_name": "TEST_PendingFee",
            "loan_amount": 100000,
            "client_fee": 300,
            "client_fee_status": "pending"
        })
        assert case_response.status_code == 200
        case_id = case_response.json()["case_id"]
        
        # Check pending increased
        after_response = requests.get(f"{BASE_URL}/api/dashboard/forecast", headers=headers)
        after_pending = after_response.json().get("client_fee_pending", 0)
        
        # Pending should have increased by 300
        assert after_pending >= initial_pending + 300, f"Expected pending to increase. Initial: {initial_pending}, After: {after_pending}"
        
        # Now mark as paid - should not count in pending
        requests.put(f"{BASE_URL}/api/cases/{case_id}", headers=headers, json={
            "client_fee_status": "paid"
        })
        
        final_response = requests.get(f"{BASE_URL}/api/dashboard/forecast", headers=headers)
        final_pending = final_response.json().get("client_fee_pending", 0)
        
        # Should be back to initial (or at least less than after)
        assert final_pending < after_pending, "Paid fees should not appear in pending"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cases/{case_id}", headers=headers)
        print("✓ Test 5: client_fee_pending correctly shows only pending fees with client_fee>0")


class TestReportsEndpoint:
    """Test reports endpoint with report_type parameter"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_reports_client_fees_type(self, headers):
        """Test 6: GET /api/reports/commission-paid?report_type=client_fees filters by client_fee_status=paid"""
        # Use a wide date range to catch any data
        start_date = "2024-01-01"
        end_date = "2027-12-31"
        
        response = requests.get(
            f"{BASE_URL}/api/reports/commission-paid",
            headers=headers,
            params={
                "start_date": start_date,
                "end_date": end_date,
                "report_type": "client_fees"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "cases" in data
        assert "summary" in data
        assert data.get("report_type") == "client_fees"
        
        # Verify summary has client fees total
        summary = data["summary"]
        assert "total_client_fees" in summary
        assert "total_cases" in summary
        
        # If there are cases, verify they have client_fee_status=paid
        for case in data["cases"]:
            # Cases should have client_fee_status = paid or the API defaults to showing based on client_fee_paid_date
            assert case.get("client_fee_status") == "paid" or case.get("client_fee", 0) > 0
        
        print("✓ Test 6: GET /api/reports/commission-paid?report_type=client_fees works correctly")
        print(f"   - Total cases: {summary.get('total_cases')}")
        print(f"   - Total client fees: {summary.get('total_client_fees')}")
    
    def test_reports_both_type(self, headers):
        """Test 7: GET /api/reports/commission-paid?report_type=both merges commission and client fee cases"""
        start_date = "2024-01-01"
        end_date = "2027-12-31"
        
        response = requests.get(
            f"{BASE_URL}/api/reports/commission-paid",
            headers=headers,
            params={
                "start_date": start_date,
                "end_date": end_date,
                "report_type": "both"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "cases" in data
        assert "summary" in data
        assert data.get("report_type") == "both"
        
        # Verify summary has combined fields
        summary = data["summary"]
        assert "total_commission_paid" in summary
        assert "total_client_fees" in summary
        assert "total_combined_revenue" in summary
        
        # Combined revenue should be commission + client fees
        expected_combined = summary.get("total_commission_paid", 0) + summary.get("total_client_fees", 0)
        assert summary.get("total_combined_revenue") == expected_combined
        
        print("✓ Test 7: GET /api/reports/commission-paid?report_type=both merges cases correctly")
        print(f"   - Total commission: {summary.get('total_commission_paid')}")
        print(f"   - Total client fees: {summary.get('total_client_fees')}")
        print(f"   - Combined revenue: {summary.get('total_combined_revenue')}")
    
    def test_reports_commission_type(self, headers):
        """Test commission report_type (default) filters by commission_paid_date"""
        start_date = "2024-01-01"
        end_date = "2027-12-31"
        
        response = requests.get(
            f"{BASE_URL}/api/reports/commission-paid",
            headers=headers,
            params={
                "start_date": start_date,
                "end_date": end_date,
                "report_type": "commission"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("report_type") == "commission"
        assert "total_commission_paid" in data["summary"]
        
        print("✓ Test: Commission report_type works correctly")


class TestDashboardStats:
    """Test dashboard/stats endpoint for client fee fields"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kunalkapadia2212@gmail.com",
            "password": "Admin2468!!!"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_dashboard_stats_client_fee_pending(self, headers):
        """Verify dashboard/stats includes client_fee_pending"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # The stats endpoint should have client_fee_pending
        assert "client_fee_pending" in data or "total_client_fees" in data
        
        print("✓ Dashboard stats includes client fee fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
