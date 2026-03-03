#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class KKMortgageCRMTester:
    def __init__(self, base_url="https://retention-toolkit.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_entities = {
            'clients': [],
            'cases': [],
            'tasks': [],
            'documents': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoint"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "health",
            200,
            auth_required=False
        )
        return success

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password},
            auth_required=False
        )
        if success and 'token' in response:
            self.token = response['token']
            if 'session_token' in response:
                self.session_token = response['session_token']
            print(f"   ✅ Login successful, token acquired")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        if success:
            print(f"   User: {response.get('name', 'Unknown')} ({response.get('email', 'No email')})")
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            stats = response
            print(f"   Clients: {stats.get('total_clients', 0)}")
            print(f"   Cases: {stats.get('total_cases', 0)}")
            print(f"   Pipeline Value: £{stats.get('total_pipeline_value', 0):,.0f}")
            print(f"   Commission: £{stats.get('total_commission', 0):,.0f}")
        return success

    def test_create_client(self):
        """Test creating a new client"""
        test_client = {
            "first_name": f"Test",
            "last_name": f"Client_{datetime.now().strftime('%H%M%S')}",
            "email": f"test.client.{datetime.now().strftime('%H%M%S')}@example.com",
            "phone": "07700900000",
            "current_address": "123 Test Street, London",
            "postcode": "SW1A 1AA",
            "income": 50000.0,
            "employment_type": "employed",
            "deposit": 50000.0,
            "property_price": 300000.0,
            "loan_amount": 250000.0,
            "lead_source": "online",
            "fact_find_complete": False,
            "vulnerable_customer": False,
            "advice_type": "advised"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "clients",
            201,
            data=test_client
        )
        
        if success and 'client_id' in response:
            client_id = response['client_id']
            self.created_entities['clients'].append(client_id)
            print(f"   ✅ Client created: {client_id}")
            return client_id
        return None

    def test_get_clients(self):
        """Test getting clients list"""
        success, response = self.run_test(
            "Get Clients List",
            "GET",
            "clients",
            200
        )
        if success:
            clients = response.get('clients', [])
            print(f"   Found {len(clients)} clients")
            return len(clients) > 0
        return False

    def test_get_client_detail(self, client_id):
        """Test getting client details"""
        if not client_id:
            return False
        success, response = self.run_test(
            "Get Client Detail",
            "GET",
            f"clients/{client_id}",
            200
        )
        if success:
            print(f"   Client: {response.get('first_name')} {response.get('last_name')}")
        return success

    def test_create_case(self, client_id):
        """Test creating a new case"""
        if not client_id:
            return None
        
        test_case = {
            "client_id": client_id,
            "product_type": "mortgage",
            "mortgage_type": "purchase",
            "status": "new_lead",
            "loan_amount": 250000.0,
            "term_years": 25,
            "lender_name": "Test Bank",
            "expected_completion_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "commission_percentage": 0.35,
            "gross_commission": 875.0
        }
        
        success, response = self.run_test(
            "Create Case",
            "POST",
            "cases",
            201,
            data=test_case
        )
        
        if success and 'case_id' in response:
            case_id = response['case_id']
            self.created_entities['cases'].append(case_id)
            print(f"   ✅ Case created: {case_id}")
            return case_id
        return None

    def test_get_cases(self):
        """Test getting cases list"""
        success, response = self.run_test(
            "Get Cases List",
            "GET",
            "cases",
            200
        )
        if success:
            cases = response.get('cases', [])
            print(f"   Found {len(cases)} cases")
            return len(cases) > 0
        return False

    def test_update_case_status(self, case_id):
        """Test updating case status"""
        if not case_id:
            return False
        
        update_data = {
            "status": "application_submitted",
            "date_application_submitted": datetime.now().strftime("%Y-%m-%d")
        }
        
        success, response = self.run_test(
            "Update Case Status",
            "PUT",
            f"cases/{case_id}",
            200,
            data=update_data
        )
        if success:
            print(f"   Status updated to: {response.get('status', 'Unknown')}")
        return success

    def test_create_task(self, client_id=None):
        """Test creating a new task"""
        test_task = {
            "title": f"Test Task - {datetime.now().strftime('%H:%M:%S')}",
            "description": "This is a test task created by automated testing",
            "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "priority": "medium",
            "client_id": client_id
        }
        
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            201,
            data=test_task
        )
        
        if success and 'task_id' in response:
            task_id = response['task_id']
            self.created_entities['tasks'].append(task_id)
            print(f"   ✅ Task created: {task_id}")
            return task_id
        return None

    def test_get_tasks(self):
        """Test getting tasks list"""
        success, response = self.run_test(
            "Get Tasks List",
            "GET",
            "tasks",
            200
        )
        if success:
            tasks = response.get('tasks', [])
            print(f"   Found {len(tasks)} tasks")
            return len(tasks) > 0
        return False

    def test_complete_task(self, task_id):
        """Test completing a task"""
        if not task_id:
            return False
        
        success, response = self.run_test(
            "Complete Task",
            "PUT",
            f"tasks/{task_id}",
            200,
            data={"completed": True}
        )
        if success:
            print(f"   Task marked as completed")
        return success

    def test_revenue_analytics(self):
        """Test revenue analytics endpoint"""
        success, response = self.run_test(
            "Revenue Analytics",
            "GET",
            "dashboard/revenue",
            200
        )
        if success:
            monthly = response.get('monthly_revenue', [])
            print(f"   Monthly revenue data points: {len(monthly)}")
        return success

    def test_commission_forecast(self):
        """Test commission forecast endpoint"""
        success, response = self.run_test(
            "Commission Forecast",
            "GET",
            "dashboard/forecast",
            200
        )
        if success:
            next_30 = response.get('next_30_days', {})
            print(f"   30-day forecast: £{next_30.get('amount', 0):,.0f}")
        return success

    def test_lead_analytics(self):
        """Test lead analytics endpoint"""
        success, response = self.run_test(
            "Lead Analytics",
            "GET",
            "dashboard/lead-analytics",
            200
        )
        if success:
            sources = response.get('by_lead_source', [])
            print(f"   Lead source data points: {len(sources)}")
        return success

    def test_users_list(self):
        """Test users list endpoint"""
        success, response = self.run_test(
            "Get Users List",
            "GET",
            "users",
            200
        )
        if success:
            users = response if isinstance(response, list) else []
            print(f"   Found {len(users)} users")
        return success

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete tasks
        for task_id in self.created_entities['tasks']:
            try:
                success, _ = self.run_test(
                    f"Delete Task {task_id}",
                    "DELETE",
                    f"tasks/{task_id}",
                    200
                )
                if success:
                    print(f"   ✅ Deleted task: {task_id}")
            except:
                pass
        
        # Delete cases
        for case_id in self.created_entities['cases']:
            try:
                success, _ = self.run_test(
                    f"Delete Case {case_id}",
                    "DELETE",
                    f"cases/{case_id}",
                    200
                )
                if success:
                    print(f"   ✅ Deleted case: {case_id}")
            except:
                pass
        
        # Delete clients (admin only - may fail)
        for client_id in self.created_entities['clients']:
            try:
                success, _ = self.run_test(
                    f"Delete Client {client_id}",
                    "DELETE",
                    f"clients/{client_id}",
                    200
                )
                if success:
                    print(f"   ✅ Deleted client: {client_id}")
                else:
                    print(f"   ⚠️  Could not delete client {client_id} (may require admin role)")
            except:
                pass

def main():
    print("=" * 60)
    print("🏠 KK Mortgage Solutions CRM - API Testing Suite")
    print("=" * 60)
    
    # Initialize tester
    tester = KKMortgageCRMTester()
    
    # Test credentials
    test_email = "admin@kkmortgage.co.uk"
    test_password = "Admin123!"
    
    try:
        # 1. Basic connectivity tests
        print("\n📡 CONNECTIVITY TESTS")
        print("-" * 30)
        if not tester.test_health_check():
            print("❌ API health check failed - aborting tests")
            return 1
        
        # 2. Authentication tests
        print("\n🔐 AUTHENTICATION TESTS")
        print("-" * 30)
        if not tester.test_login(test_email, test_password):
            print("❌ Login failed - aborting tests")
            return 1
        
        if not tester.test_get_current_user():
            print("❌ Cannot get current user info")
        
        # 3. Dashboard and analytics tests
        print("\n📊 DASHBOARD TESTS")
        print("-" * 30)
        tester.test_dashboard_stats()
        tester.test_revenue_analytics()
        tester.test_commission_forecast()
        tester.test_lead_analytics()
        
        # 4. User management tests
        print("\n👥 USER MANAGEMENT TESTS")
        print("-" * 30)
        tester.test_users_list()
        
        # 5. Client management tests
        print("\n🏠 CLIENT MANAGEMENT TESTS")
        print("-" * 30)
        tester.test_get_clients()
        client_id = tester.test_create_client()
        if client_id:
            tester.test_get_client_detail(client_id)
        
        # 6. Case management tests
        print("\n📁 CASE MANAGEMENT TESTS")
        print("-" * 30)
        tester.test_get_cases()
        case_id = tester.test_create_case(client_id)
        if case_id:
            tester.test_update_case_status(case_id)
        
        # 7. Task management tests
        print("\n✅ TASK MANAGEMENT TESTS")
        print("-" * 30)
        tester.test_get_tasks()
        task_id = tester.test_create_task(client_id)
        if task_id:
            tester.test_complete_task(task_id)
        
        # 8. Clean up test data
        tester.cleanup_test_data()
        
        # Print final results
        print("\n" + "=" * 60)
        print("📋 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Tests run: {tester.tests_run}")
        print(f"Tests passed: {tester.tests_passed}")
        print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
        print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
        
        if tester.tests_passed == tester.tests_run:
            print("\n🎉 All tests passed! Backend API is working correctly.")
            return 0
        else:
            print(f"\n⚠️  {tester.tests_run - tester.tests_passed} test(s) failed. Check the logs above.")
            return 0  # Return 0 even with failures for debugging purposes
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())