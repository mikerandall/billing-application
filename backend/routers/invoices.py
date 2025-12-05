from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from typing import List
from bson import ObjectId
from datetime import datetime, date
import json
import os
import subprocess
from pathlib import Path

from database import get_database
from models import Invoice, InvoiceCreate
from config import COMPANY_INFO, APP_SETTINGS

router = APIRouter(prefix="/invoices", tags=["invoices"])

@router.get("/config")
async def get_invoice_config():
    """Get current invoice configuration"""
    return {
        "company_info": COMPANY_INFO,
        "app_settings": APP_SETTINGS
    }

@router.post("/test")
async def test_invoice_creation():
    """Test endpoint to debug invoice creation"""
    return {"message": "Test endpoint working"}

@router.post("/debug", status_code=status.HTTP_201_CREATED)
async def debug_invoice_creation(invoice_data: InvoiceCreate):
    """Debug version of invoice creation"""
    try:
        # Basic validation
        if not ObjectId.is_valid(invoice_data.project_id):
            raise HTTPException(status_code=400, detail="Invalid project ID")
        
        return {
            "message": "Debug successful",
            "received_data": {
                "project_id": invoice_data.project_id,
                "hour_entry_ids": invoice_data.hour_entry_ids,
                "invoice_date": str(invoice_data.invoice_date),
                "due_days": invoice_data.due_days
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")

@router.get("/", response_model=List[Invoice])
async def list_invoices(client_id: str = None, project_id: str = None):
    """Get all invoices, optionally filtered by client or project"""
    db = get_database()
    
    query = {}
    if client_id:
        if not ObjectId.is_valid(client_id):
            raise HTTPException(status_code=400, detail="Invalid client ID")
        query["client_id"] = ObjectId(client_id)
    
    if project_id:
        if not ObjectId.is_valid(project_id):
            raise HTTPException(status_code=400, detail="Invalid project ID")
        query["project_id"] = ObjectId(project_id)
    
    invoices = []
    for invoice_doc in db.invoices.find(query).sort("invoice_date", -1):
        invoices.append(Invoice(**invoice_doc))
    
    return invoices

@router.get("/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    """Get a specific invoice by ID"""
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    db = get_database()
    invoice_doc = db.invoices.find_one({"_id": ObjectId(invoice_id)})
    
    if not invoice_doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return Invoice(**invoice_doc)

@router.post("/", response_model=Invoice, status_code=status.HTTP_201_CREATED)
async def create_invoice(invoice_data: InvoiceCreate):
    """Create a new invoice and generate PDF"""
    try:
        if not ObjectId.is_valid(invoice_data.project_id):
            raise HTTPException(status_code=400, detail="Invalid project ID")
        
        db = get_database()
        
        # Get project and client data
        project = db.projects.find_one({"_id": ObjectId(invoice_data.project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        client = db.clients.find_one({"_id": project["client_id"]})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Get hour entries
        hour_entry_ids = [ObjectId(hid) for hid in invoice_data.hour_entry_ids]
        hour_entries = list(db.hours.find({
            "_id": {"$in": hour_entry_ids},
            "project_id": ObjectId(invoice_data.project_id),
            "is_invoiced": False
        }))
        
        if len(hour_entries) != len(invoice_data.hour_entry_ids):
            raise HTTPException(
                status_code=400, 
                detail="Some hour entries not found or already invoiced"
            )
        
        # Calculate totals
        total_hours = sum(entry["hours"] for entry in hour_entries)
        hourly_rate = project.get("hourly_rate", 0.0)
        total_amount = total_hours * hourly_rate
        
        # Generate invoice number
        invoice_date = invoice_data.invoice_date or date.today()
        invoice_count = db.invoices.count_documents({}) + 1
        invoice_number = f"INV-{invoice_date.strftime('%Y')}-{invoice_count:03d}"
        
        # Calculate due date and convert to datetime for MongoDB
        from datetime import timedelta
        due_date = invoice_date + timedelta(days=invoice_data.due_days)
        
        # Convert dates to datetime objects for MongoDB compatibility
        invoice_datetime = datetime.combine(invoice_date, datetime.min.time())
        due_datetime = datetime.combine(due_date, datetime.min.time())
        
        # Create invoice document
        invoice_dict = {
            "client_id": project["client_id"],
            "project_id": ObjectId(invoice_data.project_id),
            "invoice_number": invoice_number,
            "invoice_date": invoice_datetime,
            "due_date": due_datetime,
            "hour_entries": hour_entry_ids,
            "total_hours": total_hours,
            "hourly_rate": hourly_rate,
            "total_amount": total_amount,
            "created_at": datetime.utcnow()
        }
        
        # Generate PDF
        try:
            pdf_filename = await generate_invoice_pdf(
                client, project, hour_entries, invoice_dict, hourly_rate
            )
            invoice_dict["pdf_filename"] = pdf_filename
        except Exception as e:
            # If PDF generation fails, continue without PDF but log the error
            print(f"PDF generation failed: {str(e)}")
            invoice_dict["pdf_filename"] = None
        
        # Insert invoice
        result = db.invoices.insert_one(invoice_dict)
        
        # Mark hour entries as invoiced
        db.hours.update_many(
            {"_id": {"$in": hour_entry_ids}},
            {
                "$set": {
                    "is_invoiced": True,
                    "invoice_id": result.inserted_id
                }
            }
        )
        
        # Update project's last invoice date
        db.projects.update_one(
            {"_id": ObjectId(invoice_data.project_id)},
            {"$set": {"last_invoice_date": invoice_datetime}}
        )
        
        # Return created invoice
        created_invoice = db.invoices.find_one({"_id": result.inserted_id})
        return Invoice(**created_invoice)
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Catch all other exceptions and return detailed error
        raise HTTPException(
            status_code=500, 
            detail=f"Invoice creation failed: {str(e)}"
        )

async def generate_invoice_pdf(client, project, hour_entries, invoice_dict, hourly_rate):
    """Generate PDF using the existing invoice.py script"""
    
    # Prepare data for invoice.py
    invoice_data = {
        "client": {
            "name": client["name"],
            "address": client.get("address", ""),
            "url": client.get("url", "")
        },
        "contact": {},
        "project": {
            "name": project["name"],
            "url": project.get("url", "")
        },
        "hours": []
    }
    
    # Add primary contact if available
    if client.get("contacts") and len(client["contacts"]) > 0:
        primary_contact = client["contacts"][0]
        invoice_data["contact"] = {
            "name": primary_contact.get("name", ""),
            "email": primary_contact.get("email", ""),
            "phone": primary_contact.get("phone", "")
        }
    
    # Add hour entries with descriptions
    for entry in hour_entries:
        invoice_data["hours"].append({
            "date": entry["date"].isoformat(),
            "hours": entry["hours"],
            "description": entry.get("description", "")
        })
    
    # Create temp JSON file
    temp_dir = Path("/tmp")
    temp_json = temp_dir / f"invoice_data_{invoice_dict['invoice_number']}.json"
    
    with open(temp_json, "w") as f:
        json.dump(invoice_data, f, indent=2, default=str)
    
    # Ensure invoices directory exists
    invoices_dir = Path("/Users/mrandall/Sites/billing-application/invoices")
    invoices_dir.mkdir(exist_ok=True)
    
    # Generate PDF filename
    pdf_filename = f"{invoice_dict['invoice_number']}-{client['name'].replace(' ', '_')}.pdf"
    pdf_path = invoices_dir / pdf_filename
    
    # Call invoice.py script
    script_path = Path("/Users/mrandall/Sites/billing-application/invoice.py")
    
    cmd = [
        "python3", str(script_path),
        str(temp_json),
        "--output", str(pdf_path),
        "--rate", str(hourly_rate),
        "--invoice-number", invoice_dict["invoice_number"],
        "--invoice-date", invoice_dict["invoice_date"].isoformat(),
        "--due-days", str(APP_SETTINGS["invoice_due_days"]),
        "--issuer", COMPANY_INFO["name"],
        "--issuer-email", COMPANY_INFO["email"],
        "--issuer-phone", COMPANY_INFO["phone"],
        "--issuer-addr1", COMPANY_INFO["address_line1"],
        "--issuer-addr2", COMPANY_INFO["address_line2"]
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Clean up temp file
        temp_json.unlink()
        
        return pdf_filename
        
    except subprocess.CalledProcessError as e:
        # Clean up temp file
        if temp_json.exists():
            temp_json.unlink()
        raise Exception(f"PDF generation failed: {e.stderr}")

@router.post("/{invoice_id}/regenerate-pdf")
async def regenerate_invoice_pdf(invoice_id: str):
    """Regenerate PDF for an existing invoice"""
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    db = get_database()
    invoice = db.invoices.find_one({"_id": ObjectId(invoice_id)})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get related data
    project = db.projects.find_one({"_id": invoice["project_id"]})
    client = db.clients.find_one({"_id": invoice["client_id"]})
    hour_entries = list(db.hours.find({"_id": {"$in": invoice["hour_entries"]}}))
    
    try:
        # Generate PDF
        pdf_filename = await generate_invoice_pdf(
            client, project, hour_entries, invoice, invoice["hourly_rate"]
        )
        
        # Update invoice with PDF filename
        db.invoices.update_one(
            {"_id": ObjectId(invoice_id)},
            {"$set": {"pdf_filename": pdf_filename}}
        )
        
        return {
            "message": "PDF regenerated successfully",
            "pdf_filename": pdf_filename
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {str(e)}"
        )

@router.get("/{invoice_id}/download")
async def download_invoice(invoice_id: str):
    """Download invoice PDF file"""
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    db = get_database()
    invoice = db.invoices.find_one({"_id": ObjectId(invoice_id)})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if not invoice.get("pdf_filename"):
        raise HTTPException(status_code=404, detail="PDF not found")
    
    pdf_path = Path("/Users/mrandall/Sites/billing-application/invoices") / invoice["pdf_filename"]
    
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        path=str(pdf_path),
        filename=invoice["pdf_filename"],
        media_type="application/pdf"
    )
