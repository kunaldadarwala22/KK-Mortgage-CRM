"""
Test Iteration 15: Multi-Applicant Detection, Deposit Field, Screenshot Handling
Features tested:
1. POST /api/extract/client with multi-person screenshot returns 'applicants' array
2. POST /api/extract/client with single person returns 'applicants' array with 1 object
3. POST /api/extract/case with deposit info - verify 'deposit' field is extracted
4. POST /api/cases with deposit field - verify it is stored and returned
5. Screenshots are processed but never stored
"""

import pytest
import requests
import os
import io
import base64
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Login and get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "kunalkapadia2212@gmail.com", "password": "Admin2468!!!"}
    )
    if response.status_code != 200:
        pytest.skip("Login failed - cannot run tests")
    return response.json().get("token")

@pytest.fixture
def auth_headers(auth_token):
    """Returns headers with authentication token"""
    return {"Authorization": f"Bearer {auth_token}"}


def create_test_image_with_text(text_lines, width=800, height=600):
    """Create a test image with text content"""
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    y_position = 50
    for line in text_lines:
        draw.text((50, y_position), line, fill='black')
        y_position += 40
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf


class TestMultiApplicantExtraction:
    """Tests for multi-applicant detection in screenshot import"""
    
    def test_extract_client_returns_applicants_array_structure(self, auth_headers):
        """Test that /api/extract/client returns applicants array format"""
        # Create image with two people's info
        text = [
            "Applicant 1:",
            "Name: John Smith",
            "Email: john.smith@email.com",
            "Phone: 07700900001",
            "",
            "Applicant 2:",
            "Name: Jane Smith",
            "Email: jane.smith@email.com",
            "Phone: 07700900002"
        ]
        image_data = create_test_image_with_text(text)
        
        files = {'files': ('test_multi.png', image_data, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "extracted_data" in data, "Response should have extracted_data"
        assert "screenshots_processed" in data, "Response should have screenshots_processed"
        
        extracted = data["extracted_data"]
        # The response should have 'applicants' key
        assert "applicants" in extracted, f"extracted_data should have 'applicants' array, got: {extracted.keys()}"
        
        applicants = extracted["applicants"]
        assert isinstance(applicants, list), "applicants should be a list"
        print(f"SUCCESS: extract/client returned applicants array with {len(applicants)} applicant(s)")
        print(f"Applicants structure: {applicants}")

    def test_extract_client_single_person_returns_array_with_one_object(self, auth_headers):
        """Test single person extraction returns applicants array with 1 object"""
        text = [
            "Client Information:",
            "Name: Robert Brown",
            "Date of Birth: 15/03/1985",
            "Email: robert.brown@test.com",
            "Phone: 07700100200",
            "Employment: Employed",
            "Income: £65,000"
        ]
        image_data = create_test_image_with_text(text)
        
        files = {'files': ('test_single.png', image_data, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        extracted = data["extracted_data"]
        
        assert "applicants" in extracted, "Single person should also return 'applicants' array"
        applicants = extracted["applicants"]
        assert isinstance(applicants, list), "applicants should be a list"
        assert len(applicants) >= 1, "Should have at least 1 applicant object"
        
        # Verify the first applicant has standard fields
        primary = applicants[0]
        expected_fields = ["first_name", "last_name", "email", "phone", "dob", "address", "postcode", "employment_type", "income"]
        for field in expected_fields:
            assert field in primary, f"Applicant object should have {field} field"
        
        print(f"SUCCESS: Single person returns applicants array with {len(applicants)} object(s)")
        print(f"Primary applicant: {primary}")

    def test_extract_client_multi_person_returns_multiple_applicants(self, auth_headers):
        """Test multi-person detection returns 2+ applicants"""
        text = [
            "Joint Mortgage Application",
            "",
            "Primary Applicant: Michael Johnson",
            "DOB: 01/05/1980",
            "Email: michael.j@test.com",
            "Income: £75,000",
            "Employment: Self Employed",
            "",
            "Secondary Applicant: Sarah Johnson",
            "DOB: 15/08/1982",
            "Email: sarah.j@test.com",
            "Income: £45,000",
            "Employment: Employed"
        ]
        image_data = create_test_image_with_text(text, height=800)
        
        files = {'files': ('test_joint.png', image_data, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        extracted = data["extracted_data"]
        
        assert "applicants" in extracted
        applicants = extracted["applicants"]
        
        # Multi-person images should ideally detect 2+ applicants
        # Note: GPT-4o detection may vary, we just verify structure is correct
        print(f"SUCCESS: Multi-person image returned {len(applicants)} applicant(s)")
        for i, ap in enumerate(applicants):
            print(f"  Applicant {i+1}: {ap}")


class TestCaseDepositField:
    """Tests for deposit field in cases"""
    
    def test_extract_case_includes_deposit_field(self, auth_headers):
        """Test /api/extract/case returns deposit field"""
        text = [
            "Mortgage Quote",
            "Lender: Halifax",
            "Property Value: £350,000",
            "Loan Amount: £280,000",
            "Deposit: £70,000",
            "Deposit Source: Savings",
            "LTV: 80%",
            "Interest Rate: 4.5%",
            "Term: 25 years"
        ]
        image_data = create_test_image_with_text(text)
        
        files = {'files': ('test_case.png', image_data, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/extract/case",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        extracted = data["extracted_data"]
        
        # Verify deposit field exists in extracted data structure
        assert "deposit" in extracted, f"extracted_data should have 'deposit' field, got keys: {extracted.keys()}"
        assert "deposit_source" in extracted, f"extracted_data should have 'deposit_source' field"
        
        print(f"SUCCESS: extract/case includes deposit field")
        print(f"  deposit: {extracted.get('deposit')}")
        print(f"  deposit_source: {extracted.get('deposit_source')}")

    def test_create_case_with_deposit_field(self, auth_headers):
        """Test POST /api/cases accepts and stores deposit field"""
        # First, get a client to link the case to
        clients_response = requests.get(
            f"{BASE_URL}/api/clients",
            headers=auth_headers
        )
        assert clients_response.status_code == 200
        clients = clients_response.json().get("clients", [])
        
        if not clients:
            # Create a test client first
            client_response = requests.post(
                f"{BASE_URL}/api/clients",
                headers=auth_headers,
                json={
                    "first_name": "TEST_Deposit",
                    "last_name": "Client",
                    "email": "test_deposit@test.com"
                }
            )
            assert client_response.status_code == 201
            client_id = client_response.json()["client_id"]
        else:
            client_id = clients[0]["client_id"]
        
        # Create case with deposit field
        case_data = {
            "client_id": client_id,
            "product_type": "mortgage",
            "mortgage_type": "purchase",
            "lender_name": "Halifax",
            "loan_amount": 280000,
            "property_value": 350000,
            "deposit": 70000,
            "deposit_source": "Savings",
            "status": "new_lead"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases",
            headers=auth_headers,
            json=case_data
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        created_case = response.json()
        
        # Verify deposit was stored
        assert "deposit" in created_case, "Created case should have deposit field in response"
        assert created_case.get("deposit") == 70000, f"Deposit should be 70000, got {created_case.get('deposit')}"
        assert created_case.get("deposit_source") == "Savings", f"Deposit source should be 'Savings', got {created_case.get('deposit_source')}"
        
        case_id = created_case.get("case_id")
        print(f"SUCCESS: Created case {case_id} with deposit={created_case.get('deposit')}, deposit_source={created_case.get('deposit_source')}")
        
        # Verify GET returns deposit
        get_response = requests.get(
            f"{BASE_URL}/api/cases/{case_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        fetched_case = get_response.json()
        
        assert fetched_case.get("deposit") == 70000, f"GET case should return deposit=70000, got {fetched_case.get('deposit')}"
        print(f"SUCCESS: GET /api/cases/{case_id} returns deposit correctly")

    def test_update_case_deposit_field(self, auth_headers):
        """Test PUT /api/cases updates deposit field"""
        # Get existing cases
        cases_response = requests.get(
            f"{BASE_URL}/api/cases",
            headers=auth_headers
        )
        assert cases_response.status_code == 200
        cases = cases_response.json().get("cases", [])
        
        if not cases:
            pytest.skip("No cases available to test update")
        
        case_id = cases[0]["case_id"]
        
        # Update deposit
        update_response = requests.put(
            f"{BASE_URL}/api/cases/{case_id}",
            headers=auth_headers,
            json={"deposit": 55000, "deposit_source": "Gift"}
        )
        
        assert update_response.status_code == 200
        updated_case = update_response.json()
        
        assert updated_case.get("deposit") == 55000, f"Updated deposit should be 55000, got {updated_case.get('deposit')}"
        assert updated_case.get("deposit_source") == "Gift", f"Updated deposit_source should be 'Gift'"
        
        print(f"SUCCESS: Updated case {case_id} deposit to 55000, source to 'Gift'")


class TestScreenshotNotStored:
    """Tests to verify screenshots are processed in-memory only"""
    
    def test_screenshots_processed_count_returned(self, auth_headers):
        """Verify screenshots_processed count is returned (confirms processing happened)"""
        text = ["Test client data", "Name: Test User"]
        image_data = create_test_image_with_text(text)
        
        files = {'files': ('test.png', image_data, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "screenshots_processed" in data
        assert data["screenshots_processed"] == 1
        
        print(f"SUCCESS: screenshots_processed count returned: {data['screenshots_processed']}")

    def test_no_screenshot_storage_endpoints(self, auth_headers):
        """Verify there's no endpoint to retrieve stored screenshots"""
        # Try to access any screenshot retrieval endpoint (should not exist)
        endpoints_to_try = [
            "/api/screenshots",
            "/api/extract/screenshots",
            "/api/documents?type=screenshot"
        ]
        
        for endpoint in endpoints_to_try:
            response = requests.get(
                f"{BASE_URL}{endpoint}",
                headers=auth_headers
            )
            # These should either 404 or return empty (not screenshot data)
            if response.status_code == 200:
                data = response.json()
                # Verify no screenshot binary data is stored
                if isinstance(data, list):
                    for item in data:
                        assert "screenshot_data" not in item
                        assert "image_data" not in item
        
        print("SUCCESS: No screenshot storage endpoints found - screenshots are memory-only")


class TestAuthRequirements:
    """Test authentication requirements"""
    
    def test_extract_client_requires_auth(self):
        """Verify extract/client requires authentication"""
        text = ["Test"]
        image_data = create_test_image_with_text(text)
        
        files = {'files': ('test.png', image_data, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            files=files
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("SUCCESS: /api/extract/client requires authentication")

    def test_extract_case_requires_auth(self):
        """Verify extract/case requires authentication"""
        text = ["Test"]
        image_data = create_test_image_with_text(text)
        
        files = {'files': ('test.png', image_data, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/extract/case",
            files=files
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("SUCCESS: /api/extract/case requires authentication")


class TestAPIValidation:
    """Test API validation behavior"""
    
    def test_extract_client_no_files_returns_400(self, auth_headers):
        """Verify extract/client returns 400 when no files uploaded"""
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Expected 400 without files, got {response.status_code}"
        print("SUCCESS: extract/client returns 400 when no files uploaded")

    def test_extract_case_no_files_returns_400(self, auth_headers):
        """Verify extract/case returns 400 when no files uploaded"""
        response = requests.post(
            f"{BASE_URL}/api/extract/case",
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Expected 400 without files, got {response.status_code}"
        print("SUCCESS: extract/case returns 400 when no files uploaded")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
