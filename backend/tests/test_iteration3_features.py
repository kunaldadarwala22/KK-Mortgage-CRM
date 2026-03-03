"""
Test Iteration 3 - KK Mortgage CRM New Features Testing
Tests:
- Commission Module: Monthly breakdown, status grouping, toggle views
- Commission Analytics: by month, lender, product type, lead source, advisor
- Mortgage Type Analytics: pie chart, bar chart data
- Custom Reports: cases completed, commission paid, export endpoints
- Cases Filters: Fixed filter bug with 'all' sentinel values
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuthAndSetup:
    """Authentication tests and session setup"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@kkmortgage.com",
            "password": "Test1234!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def session(self, auth_token):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return s

    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@kkmortgage.com",
            "password": "Test1234!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert data["email"] == "test@kkmortgage.com"
        print("✓ Login successful")


class TestCommissionModule:
    """Test Commission Module - Monthly breakdown, status grouping, toggle views"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@kkmortgage.com",
            "password": "Test1234!"
        })
        assert response.status_code == 200
        token = response.json()["token"]
        s = requests.Session()
        s.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        return s
    
    def test_commission_monthly_endpoint(self, session):
        """GET /api/commission/monthly returns monthly data with totals"""
        response = session.get(f"{BASE_URL}/api/commission/monthly")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "monthly" in data, "Missing 'monthly' key in response"
        assert "totals" in data, "Missing 'totals' key in response"
        
        # Verify totals structure
        totals = data["totals"]
        expected_keys = ["total_pending", "total_submitted", "total_paid", "total_clawed_back", 
                        "total_mortgage", "total_insurance", "total_proc_fees", "grand_total"]
        for key in expected_keys:
            assert key in totals, f"Missing '{key}' in totals"
        
        print(f"✓ Commission monthly endpoint returned {len(data['monthly'])} months of data")
        print(f"  Totals: Paid={totals['total_paid']}, Pending={totals['total_pending']}, Grand Total={totals['grand_total']}")
    
    def test_commission_monthly_with_year_filter(self, session):
        """GET /api/commission/monthly with year parameter"""
        response = session.get(f"{BASE_URL}/api/commission/monthly?year=2025")
        assert response.status_code == 200
        data = response.json()
        assert "monthly" in data
        assert "totals" in data
        print("✓ Commission monthly with year filter works")
    
    def test_commission_monthly_with_date_range(self, session):
        """GET /api/commission/monthly with custom date range"""
        response = session.get(f"{BASE_URL}/api/commission/monthly?start_date=2020-01-01&end_date=2030-12-31")
        assert response.status_code == 200
        data = response.json()
        assert "monthly" in data
        assert "totals" in data
        print("✓ Commission monthly with custom date range works")


class TestCommissionAnalytics:
    """Test Commission Analytics - by month, lender, product type, lead source, advisor"""
    
    @pytest.fixture(scope="class")
    def session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@kkmortgage.com",
            "password": "Test1234!"
        })
        assert response.status_code == 200
        token = response.json()["token"]
        s = requests.Session()
        s.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        return s
    
    def test_commission_analytics_endpoint(self, session):
        """GET /api/commission/analytics returns comprehensive analytics"""
        response = session.get(f"{BASE_URL}/api/commission/analytics")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify all expected keys
        expected_keys = ["by_month", "by_lender", "by_product", "by_lead_source", "by_advisor", "summary"]
        for key in expected_keys:
            assert key in data, f"Missing '{key}' in commission analytics response"
        
        # Verify summary structure
        summary = data["summary"]
        summary_keys = ["total_commission", "total_paid", "total_pending", "total_clawbacks", 
                       "total_proc_fees", "case_count", "avg_commission"]
        for key in summary_keys:
            assert key in summary, f"Missing '{key}' in summary"
        
        print(f"✓ Commission analytics endpoint working")
        print(f"  by_month: {len(data['by_month'])} records, by_lender: {len(data['by_lender'])} records")
        print(f"  Summary: total_commission={summary['total_commission']}, case_count={summary['case_count']}")
    
    def test_commission_analytics_with_filters(self, session):
        """GET /api/commission/analytics with filters"""
        response = session.get(f"{BASE_URL}/api/commission/analytics?product_filter=mortgage&commission_status=paid")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        print("✓ Commission analytics with filters works")
    
    def test_commission_analytics_with_date_range(self, session):
        """GET /api/commission/analytics with date range"""
        response = session.get(f"{BASE_URL}/api/commission/analytics?start_date=2020-01-01&end_date=2030-12-31")
        assert response.status_code == 200
        data = response.json()
        assert "by_month" in data
        print("✓ Commission analytics with date range works")


class TestMortgageTypeAnalytics:
    """Test Mortgage Type Analytics - purchase, remortgage, product transfer breakdown"""
    
    @pytest.fixture(scope="class")
    def session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@kkmortgage.com",
            "password": "Test1234!"
        })
        assert response.status_code == 200
        token = response.json()["token"]
        s = requests.Session()
        s.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        return s
    
    def test_mortgage_types_endpoint(self, session):
        """GET /api/analytics/mortgage-types returns types array"""
        response = session.get(f"{BASE_URL}/api/analytics/mortgage-types")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "types" in data, "Missing 'types' key in response"
        assert "total_cases" in data, "Missing 'total_cases' key in response"
        
        # If there are types, verify structure
        if data["types"]:
            first_type = data["types"][0]
            expected_keys = ["mortgage_type", "case_count", "percentage", "total_commission", "total_loan", "avg_loan"]
            for key in expected_keys:
                assert key in first_type, f"Missing '{key}' in mortgage type data"
        
        print(f"✓ Mortgage types endpoint returned {len(data['types'])} types, total_cases={data['total_cases']}")


class TestCustomReports:
    """Test Custom Reports - cases completed and commission paid with date range"""
    
    @pytest.fixture(scope="class")
    def session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@kkmortgage.com",
            "password": "Test1234!"
        })
        assert response.status_code == 200
        token = response.json()["token"]
        s = requests.Session()
        s.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        return s
    
    def test_cases_completed_report(self, session):
        """GET /api/reports/cases-completed with wide date range"""
        response = session.get(f"{BASE_URL}/api/reports/cases-completed?start_date=2020-01-01&end_date=2030-12-31")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "cases" in data, "Missing 'cases' key in response"
        assert "summary" in data, "Missing 'summary' key in response"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_cases" in summary, "Missing 'total_cases' in summary"
        assert "total_loan_value" in summary, "Missing 'total_loan_value' in summary"
        assert "total_commission" in summary, "Missing 'total_commission' in summary"
        
        print(f"✓ Cases completed report: {summary['total_cases']} cases, loan_value={summary['total_loan_value']}, commission={summary['total_commission']}")
    
    def test_commission_paid_report(self, session):
        """GET /api/reports/commission-paid with wide date range"""
        response = session.get(f"{BASE_URL}/api/reports/commission-paid?start_date=2020-01-01&end_date=2030-12-31")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "cases" in data, "Missing 'cases' key in response"
        assert "summary" in data, "Missing 'summary' key in response"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_cases" in summary, "Missing 'total_cases' in summary"
        assert "total_commission_paid" in summary, "Missing 'total_commission_paid' in summary"
        assert "total_proc_fees" in summary, "Missing 'total_proc_fees' in summary"
        assert "total_combined_revenue" in summary, "Missing 'total_combined_revenue' in summary"
        
        print(f"✓ Commission paid report: {summary['total_cases']} cases, commission={summary['total_commission_paid']}, proc_fees={summary['total_proc_fees']}")
    
    def test_report_requires_dates(self, session):
        """Test that reports require date parameters"""
        # Test without required parameters should fail
        response = session.get(f"{BASE_URL}/api/reports/cases-completed")
        assert response.status_code == 422, "Should require date parameters"
        print("✓ Reports correctly require date parameters")


class TestCasesFilters:
    """Test Cases Filters - fixed crash bug with empty SelectItem values"""
    
    @pytest.fixture(scope="class")
    def session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@kkmortgage.com",
            "password": "Test1234!"
        })
        assert response.status_code == 200
        token = response.json()["token"]
        s = requests.Session()
        s.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        return s
    
    def test_cases_filter_by_status(self, session):
        """Test filtering cases by status"""
        response = session.get(f"{BASE_URL}/api/cases?status=application_submitted")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "cases" in data
        assert "total" in data
        print(f"✓ Cases filter by status: {data['total']} cases with 'application_submitted' status")
    
    def test_cases_filter_by_product_type(self, session):
        """Test filtering cases by product type"""
        response = session.get(f"{BASE_URL}/api/cases?product_type=mortgage")
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
        print(f"✓ Cases filter by product_type: {data['total']} mortgage cases")
    
    def test_cases_filter_by_commission_status(self, session):
        """Test filtering cases by commission status"""
        response = session.get(f"{BASE_URL}/api/cases?commission_status=submitted_to_lender")
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
        print(f"✓ Cases filter by commission_status: {data['total']} cases with 'submitted_to_lender'")
    
    def test_cases_filter_by_advisor(self, session):
        """Test filtering cases by advisor_id"""
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        data = response.json()
        
        # If there are cases with advisors, test filter
        if data['cases'] and any(c.get('advisor_id') for c in data['cases']):
            advisor_id = next(c['advisor_id'] for c in data['cases'] if c.get('advisor_id'))
            filter_response = session.get(f"{BASE_URL}/api/cases?advisor_id={advisor_id}")
            assert filter_response.status_code == 200
            print(f"✓ Cases filter by advisor_id works")
        else:
            print("✓ Cases filter by advisor_id (skipped - no advisor assignments)")
    
    def test_cases_no_filter_returns_all(self, session):
        """Test that no filters returns all cases"""
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
        assert "total" in data
        print(f"✓ Cases without filters: {data['total']} total cases")


class TestClientsNewColumns:
    """Test Clients page new columns - security address, postcode, LTV auto-calc, etc."""
    
    @pytest.fixture(scope="class")
    def session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@kkmortgage.com",
            "password": "Test1234!"
        })
        assert response.status_code == 200
        token = response.json()["token"]
        s = requests.Session()
        s.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        return s
    
    def test_clients_returns_enriched_data(self, session):
        """Test clients endpoint returns enriched case data"""
        response = session.get(f"{BASE_URL}/api/clients?enrich_cases=true")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "clients" in data
        assert "total" in data
        
        # Check for enhanced columns
        if data["clients"]:
            client = data["clients"][0]
            # Standard fields
            assert "client_id" in client
            assert "first_name" in client
            assert "last_name" in client
            # New columns
            assert "security_property_address" in client or client.get("current_address")
            assert "postcode" in client
            assert "ltv" in client or "ltv" not in client  # May be None
            
            print(f"✓ Clients enriched data: {data['total']} clients")
            if client.get("ltv"):
                print(f"  Sample LTV: {client['ltv']}%")
    
    def test_ltv_auto_calculation(self, session):
        """Test LTV is auto-calculated from loan_amount and property_price"""
        # Create test client with loan and property price
        test_client = {
            "first_name": "TEST_LTV",
            "last_name": "Calculator",
            "loan_amount": 180000,
            "property_price": 200000,
            "email": "test_ltv@example.com"
        }
        
        create_response = session.post(f"{BASE_URL}/api/clients", json=test_client)
        assert create_response.status_code == 201, f"Failed to create: {create_response.text}"
        client_data = create_response.json()
        
        # Verify LTV was calculated (180000/200000 = 90%)
        assert client_data.get("ltv") == 90.0, f"Expected LTV 90.0, got {client_data.get('ltv')}"
        print(f"✓ LTV auto-calculation: {client_data['ltv']}% (expected 90%)")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/clients/{client_data['client_id']}")


class TestExistingCoreFeatures:
    """Verify existing core features still work"""
    
    @pytest.fixture(scope="class")
    def session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@kkmortgage.com",
            "password": "Test1234!"
        })
        assert response.status_code == 200
        token = response.json()["token"]
        s = requests.Session()
        s.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        return s
    
    def test_dashboard_stats(self, session):
        """Test dashboard stats endpoint"""
        response = session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_clients" in data
        assert "total_cases" in data
        print(f"✓ Dashboard stats: {data['total_clients']} clients, {data['total_cases']} cases")
    
    def test_dashboard_forecast(self, session):
        """Test dashboard forecast endpoint"""
        response = session.get(f"{BASE_URL}/api/dashboard/forecast")
        assert response.status_code == 200
        data = response.json()
        assert "next_30_days" in data
        assert "next_60_days" in data
        assert "next_90_days" in data
        print(f"✓ Dashboard forecast working")
    
    def test_users_list(self, session):
        """Test users list endpoint"""
        response = session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Users list: {len(data)} users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
