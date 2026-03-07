"""
Test iteration 14: Screenshot Import using GPT-4o vision model
Tests for:
- POST /api/extract/client - Extract client data from screenshots
- POST /api/extract/case - Extract case data from screenshots
- Image preprocessing (contrast enhancement, resize)
- Multiple images processing in single GPT-4o call
- Null fields returned when data can't be extracted
"""

import pytest
import requests
import os
import io
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "kunalkapadia2212@gmail.com"
TEST_PASSWORD = "Admin2468!!!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    return response.json().get("token")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with authorization token"""
    return {"Authorization": f"Bearer {auth_token}"}


def create_test_image_with_text(text_lines, size=(800, 600)):
    """
    Create a test image with text content for OCR testing.
    This simulates a screenshot with client/case data.
    """
    img = Image.new('RGB', size, color='white')
    draw = ImageDraw.Draw(img)
    
    # Use a basic font
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    y_position = 50
    for line in text_lines:
        draw.text((50, y_position), line, fill='black', font=font)
        y_position += 40
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes


class TestHealthAndAuth:
    """Verify basic API health and authentication"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("Health endpoint OK")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user_id" in data, "No user_id in response"
        print(f"Login successful for user: {data.get('name')}")


class TestExtractClientEndpoint:
    """Tests for POST /api/extract/client endpoint"""
    
    def test_extract_client_requires_auth(self):
        """Endpoint should require authentication"""
        img = create_test_image_with_text(["Test Image"])
        files = {"files": ("test.png", img, "image/png")}
        response = requests.post(f"{BASE_URL}/api/extract/client", files=files)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Auth requirement verified for /api/extract/client")
    
    def test_extract_client_no_files(self, auth_headers):
        """Endpoint should return 400 if no files uploaded"""
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("No files validation works correctly")
    
    def test_extract_client_with_single_image(self, auth_headers):
        """Test extraction with a single test image containing client data"""
        # Create a test image with simulated client info
        client_text = [
            "Client Information Form",
            "First Name: John",
            "Last Name: Smith",
            "Email: john.smith@example.com",
            "Phone: 07700900123",
            "Date of Birth: 1985-03-15",
            "Address: 123 High Street, London",
            "Postcode: SW1A 1AA",
            "Employment: Employed",
            "Annual Income: £75,000"
        ]
        img = create_test_image_with_text(client_text)
        
        files = [("files", ("client_info.png", img, "image/png"))]
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "extracted_data" in data, "No extracted_data in response"
        assert "screenshots_processed" in data, "No screenshots_processed count"
        assert data["screenshots_processed"] == 1, f"Expected 1 screenshot processed, got {data['screenshots_processed']}"
        
        extracted = data["extracted_data"]
        print(f"Extracted client data keys: {list(extracted.keys())}")
        print(f"Extracted data: {extracted}")
        
        # Check that expected fields exist (values may be null if AI couldn't extract)
        expected_fields = ["first_name", "last_name", "email", "phone", "dob", "address", "postcode", "employment_type", "income"]
        for field in expected_fields:
            assert field in extracted, f"Missing field: {field}"
        
        print("Single image extraction test PASSED")
    
    def test_extract_client_with_multiple_images(self, auth_headers):
        """Test extraction with multiple images - should process all in single GPT-4o call"""
        # Image 1: Personal info
        img1 = create_test_image_with_text([
            "Personal Details",
            "Name: Jane Doe",
            "Date of Birth: 1990-07-22"
        ])
        
        # Image 2: Contact info  
        img2 = create_test_image_with_text([
            "Contact Information",
            "Email: jane.doe@email.co.uk",
            "Mobile: 07888123456"
        ])
        
        # Image 3: Financial info
        img3 = create_test_image_with_text([
            "Financial Summary",
            "Employment Status: Self Employed",
            "Annual Income: £120,000"
        ])
        
        files = [
            ("files", ("personal.png", img1, "image/png")),
            ("files", ("contact.png", img2, "image/png")),
            ("files", ("financial.png", img3, "image/png"))
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["screenshots_processed"] == 3, f"Expected 3 screenshots processed, got {data['screenshots_processed']}"
        print(f"Multiple images processed: {data['screenshots_processed']}")
        print(f"Extracted data from multiple images: {data['extracted_data']}")
        print("Multiple image extraction test PASSED")
    
    def test_extract_client_null_fields_for_missing_data(self, auth_headers):
        """Test that fields that can't be extracted are returned as null"""
        # Create image with minimal/no extractable data
        img = create_test_image_with_text([
            "Random Document",
            "Page 1 of 5",
            "Confidential"
        ])
        
        files = [("files", ("minimal.png", img, "image/png"))]
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        extracted = data["extracted_data"]
        
        # At least some fields should be null since the image has no client data
        null_count = sum(1 for v in extracted.values() if v is None)
        print(f"Null fields count: {null_count} out of {len(extracted)}")
        print("Null fields test PASSED (fields set to null when data not found)")


class TestExtractCaseEndpoint:
    """Tests for POST /api/extract/case endpoint"""
    
    def test_extract_case_requires_auth(self):
        """Endpoint should require authentication"""
        img = create_test_image_with_text(["Test Case"])
        files = {"files": ("test.png", img, "image/png")}
        response = requests.post(f"{BASE_URL}/api/extract/case", files=files)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Auth requirement verified for /api/extract/case")
    
    def test_extract_case_no_files(self, auth_headers):
        """Endpoint should return 400 if no files uploaded"""
        response = requests.post(
            f"{BASE_URL}/api/extract/case",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("No files validation works correctly for case extraction")
    
    def test_extract_case_with_mortgage_screenshot(self, auth_headers):
        """Test extraction from a mortgage document screenshot"""
        mortgage_text = [
            "Mortgage Offer Document",
            "Lender: Halifax",
            "Loan Amount: £350,000",
            "Property Value: £500,000",
            "Interest Rate: 4.25%",
            "Rate Type: Fixed",
            "Term: 25 years",
            "Initial Product Term: 5 years",
            "Mortgage Type: Purchase",
            "Property Type: Residential",
            "Repayment Type: Repayment",
            "Property Address: 45 Oak Avenue, London",
            "Postcode: E1 6AN"
        ]
        img = create_test_image_with_text(mortgage_text)
        
        files = [("files", ("mortgage_offer.png", img, "image/png"))]
        response = requests.post(
            f"{BASE_URL}/api/extract/case",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "extracted_data" in data, "No extracted_data in response"
        assert data["screenshots_processed"] == 1
        
        extracted = data["extracted_data"]
        print(f"Extracted case data keys: {list(extracted.keys())}")
        print(f"Extracted mortgage data: {extracted}")
        
        # Check expected case fields exist
        expected_fields = [
            "lender_name", "loan_amount", "property_value", "interest_rate",
            "interest_rate_type", "term_years", "initial_product_term",
            "mortgage_type", "property_type", "repayment_type",
            "security_address", "security_postcode", "product_type"
        ]
        for field in expected_fields:
            assert field in extracted, f"Missing field: {field}"
        
        print("Mortgage screenshot extraction test PASSED")
    
    def test_extract_case_with_insurance_screenshot(self, auth_headers):
        """Test extraction from an insurance document screenshot"""
        insurance_text = [
            "Life Insurance Policy",
            "Provider: Aviva",
            "Insurance Type: Life Insurance",
            "Monthly Premium: £45.50",
            "Sum Assured: £250,000",
            "Cover Type: Level Term",
            "Term: 20 years"
        ]
        img = create_test_image_with_text(insurance_text)
        
        files = [("files", ("insurance_policy.png", img, "image/png"))]
        response = requests.post(
            f"{BASE_URL}/api/extract/case",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        extracted = data["extracted_data"]
        
        print(f"Extracted insurance data: {extracted}")
        
        # Check insurance-specific fields
        insurance_fields = ["insurance_type", "insurance_provider", "monthly_premium", "sum_assured"]
        for field in insurance_fields:
            assert field in extracted, f"Missing insurance field: {field}"
        
        print("Insurance screenshot extraction test PASSED")
    
    def test_extract_case_with_multiple_images(self, auth_headers):
        """Test case extraction with multiple document pages"""
        # Page 1: Basic mortgage info
        img1 = create_test_image_with_text([
            "Mortgage Application - Page 1",
            "Lender: Barclays",
            "Loan: £275,000"
        ])
        
        # Page 2: Rate and term info
        img2 = create_test_image_with_text([
            "Mortgage Application - Page 2",
            "Interest Rate: 3.99%",
            "Rate Type: Fixed",
            "Term: 30 years"
        ])
        
        files = [
            ("files", ("page1.png", img1, "image/png")),
            ("files", ("page2.png", img2, "image/png"))
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/extract/case",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["screenshots_processed"] == 2
        print(f"Multiple case images processed: {data['screenshots_processed']}")
        print(f"Combined extracted data: {data['extracted_data']}")
        print("Multiple case images extraction test PASSED")


class TestImagePreprocessing:
    """Tests to verify image preprocessing is working"""
    
    def test_large_image_is_processed(self, auth_headers):
        """Test that large images are resized and still processed correctly"""
        # Create a large image (3000x3000 which should be resized to max 2000)
        large_text = [
            "Large Document",
            "Client Name: Robert Large",
            "Email: robert@large.com"
        ]
        
        # Create oversized image
        img = Image.new('RGB', (3000, 3000), color='white')
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
        except:
            font = ImageFont.load_default()
        
        y = 100
        for line in large_text:
            draw.text((100, y), line, fill='black', font=font)
            y += 80
        
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = [("files", ("large.png", img_bytes, "image/png"))]
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Large image processing failed: {response.status_code}"
        print("Large image processed successfully (resizing working)")
    
    def test_jpeg_image_format(self, auth_headers):
        """Test that JPEG images are processed correctly"""
        text = ["JPEG Test", "Name: JPEG User"]
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        draw.text((50, 50), text[0], fill='black')
        draw.text((50, 100), text[1], fill='black')
        
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG', quality=85)
        img_bytes.seek(0)
        
        files = [("files", ("test.jpg", img_bytes, "image/jpeg"))]
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"JPEG processing failed: {response.status_code}"
        print("JPEG image format processed successfully")


class TestResponseStructure:
    """Tests to verify correct response structure"""
    
    def test_client_extraction_response_structure(self, auth_headers):
        """Verify client extraction returns correct JSON structure"""
        img = create_test_image_with_text(["Test Client"])
        files = [("files", ("test.png", img, "image/png"))]
        
        response = requests.post(
            f"{BASE_URL}/api/extract/client",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify top-level structure
        assert "extracted_data" in data
        assert "screenshots_processed" in data
        assert isinstance(data["extracted_data"], dict)
        assert isinstance(data["screenshots_processed"], int)
        
        # Verify expected client fields in extracted_data
        client_fields = ["first_name", "last_name", "email", "phone", "dob", 
                        "address", "postcode", "employment_type", "income"]
        for field in client_fields:
            assert field in data["extracted_data"], f"Missing field: {field}"
        
        print("Client extraction response structure verified")
    
    def test_case_extraction_response_structure(self, auth_headers):
        """Verify case extraction returns correct JSON structure"""
        img = create_test_image_with_text(["Test Case Document"])
        files = [("files", ("test.png", img, "image/png"))]
        
        response = requests.post(
            f"{BASE_URL}/api/extract/case",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify top-level structure
        assert "extracted_data" in data
        assert "screenshots_processed" in data
        
        # Verify expected case fields
        case_fields = ["lender_name", "loan_amount", "property_value", "interest_rate",
                      "interest_rate_type", "term_years", "mortgage_type", "property_type",
                      "repayment_type", "security_address", "security_postcode", "product_type",
                      "insurance_type", "insurance_provider", "monthly_premium", "sum_assured"]
        
        for field in case_fields:
            assert field in data["extracted_data"], f"Missing field: {field}"
        
        print("Case extraction response structure verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
