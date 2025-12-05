"""
Application Configuration
Contains company information and other application settings.
"""

# Company Information
COMPANY_INFO = {
    "name": "Mike Randall",
    "address_line1": "2 Powder Horn Dr",
    "address_line2": "Simsbury, CT 06070",
    "email": "me@mrandall.me",
    "phone": "860-335-8673"
}

# Application Settings
APP_SETTINGS = {
    "app_title": "MRandall.me Department of Billing Management 🏢",
    "invoice_due_days": 14,
    "invoice_payment_terms": "ACH or check preferred. Please include invoice number with payment."
}

# Invoice Settings
INVOICE_SETTINGS = {
    "default_hourly_rate": 150.0,
    "currency": "USD",
    "tax_rate": 0.0  # Set to 0 for no tax, or e.g., 0.0875 for 8.75%
}
