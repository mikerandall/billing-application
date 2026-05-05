from fastapi import APIRouter, HTTPException, status
from typing import List
from bson import ObjectId
from datetime import datetime, date

from database import get_database
from models import HourEntry, HourEntryCreate, HourEntryUpdate

router = APIRouter(prefix="/hours", tags=["hours"])

@router.get("/", response_model=List[HourEntry])
async def list_hours(project_id: str = None, uninvoiced_only: bool = False):
    """Get hour entries, optionally filtered by project or invoiced status"""
    db = get_database()
    
    query = {}
    if project_id:
        if not ObjectId.is_valid(project_id):
            raise HTTPException(status_code=400, detail="Invalid project ID")
        query["project_id"] = ObjectId(project_id)
    
    if uninvoiced_only:
        query["is_invoiced"] = False
    
    hours = []
    for hour_doc in db.hours.find(query).sort("date", -1):
        hours.append(HourEntry(**hour_doc))
    
    return hours

@router.get("/{hour_id}", response_model=HourEntry)
async def get_hour_entry(hour_id: str):
    """Get a specific hour entry by ID"""
    if not ObjectId.is_valid(hour_id):
        raise HTTPException(status_code=400, detail="Invalid hour entry ID")
    
    db = get_database()
    hour_doc = db.hours.find_one({"_id": ObjectId(hour_id)})
    
    if not hour_doc:
        raise HTTPException(status_code=404, detail="Hour entry not found")
    
    return HourEntry(**hour_doc)

@router.post("/", response_model=HourEntry, status_code=status.HTTP_201_CREATED)
async def create_hour_entry(hour_entry: HourEntryCreate):
    """Create a new hour entry"""
    if not ObjectId.is_valid(hour_entry.project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    db = get_database()
    
    # Verify project exists
    project = db.projects.find_one({"_id": ObjectId(hour_entry.project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    hour_dict = hour_entry.model_dump()
    hour_dict["project_id"] = ObjectId(hour_entry.project_id)
    # Convert date to datetime for MongoDB compatibility
    if isinstance(hour_dict["date"], date):
        hour_dict["date"] = datetime.combine(hour_dict["date"], datetime.min.time())
    hour_dict["created_at"] = datetime.utcnow()
    hour_dict["is_invoiced"] = False  # Ensure new hours are marked as uninvoiced
    
    result = db.hours.insert_one(hour_dict)
    
    created_hour = db.hours.find_one({"_id": result.inserted_id})
    return HourEntry(**created_hour)

@router.put("/{hour_id}", response_model=HourEntry)
async def update_hour_entry(hour_id: str, hour_update: HourEntryUpdate):
    """Update an hour entry (including marking uninvoiced to bill again)."""
    if not ObjectId.is_valid(hour_id):
        raise HTTPException(status_code=400, detail="Invalid hour entry ID")
    
    db = get_database()
    
    existing_hour = db.hours.find_one({"_id": ObjectId(hour_id)})
    if not existing_hour:
        raise HTTPException(status_code=404, detail="Hour entry not found")
    
    update_data = hour_update.model_dump()
    is_invoiced = update_data.pop("is_invoiced")
    if hour_update.project_id:
        update_data["project_id"] = ObjectId(hour_update.project_id)
    if "date" in update_data and isinstance(update_data["date"], date):
        update_data["date"] = datetime.combine(update_data["date"], datetime.min.time())
    
    update_data["is_invoiced"] = is_invoiced
    if not is_invoiced:
        update_data["invoice_id"] = None
    
    db.hours.update_one(
        {"_id": ObjectId(hour_id)},
        {"$set": update_data},
    )
    
    updated_hour = db.hours.find_one({"_id": ObjectId(hour_id)})
    return HourEntry(**updated_hour)

@router.delete("/{hour_id}")
async def delete_hour_entry(hour_id: str):
    """Delete a hour entry"""
    if not ObjectId.is_valid(hour_id):
        raise HTTPException(status_code=400, detail="Invalid hour entry ID")
    
    db = get_database()
    
    # Check if hour entry exists and is not invoiced
    existing_hour = db.hours.find_one({"_id": ObjectId(hour_id)})
    if not existing_hour:
        raise HTTPException(status_code=404, detail="Hour entry not found")
    
    if existing_hour.get("is_invoiced", False):
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete invoiced hour entry"
        )
    
    result = db.hours.delete_one({"_id": ObjectId(hour_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hour entry not found")
    
    return {"message": "Hour entry deleted successfully"}

# Test endpoints for invoice functionality
@router.post("/test/mark-invoiced/{project_id}")
async def test_mark_hours_invoiced(project_id: str):
    """TEST ONLY: Mark all hours for a project as invoiced"""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    db = get_database()
    
    # Update all uninvoiced hours for this project
    result = db.hours.update_many(
        {
            "project_id": ObjectId(project_id),
            "is_invoiced": {"$ne": True}
        },
        {
            "$set": {
                "is_invoiced": True,
                "invoice_id": ObjectId()  # Fake invoice ID for testing
            }
        }
    )
    
    return {
        "message": f"Marked {result.modified_count} hours as invoiced for testing",
        "modified_count": result.modified_count
    }

@router.post("/test/mark-uninvoiced/{project_id}")
async def test_mark_hours_uninvoiced(project_id: str):
    """TEST ONLY: Mark all hours for a project as uninvoiced"""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    db = get_database()
    
    # Update all invoiced hours for this project
    result = db.hours.update_many(
        {
            "project_id": ObjectId(project_id),
            "is_invoiced": True
        },
        {
            "$set": {
                "is_invoiced": False,
                "invoice_id": None
            }
        }
    )
    
    return {
        "message": f"Marked {result.modified_count} hours as uninvoiced for testing",
        "modified_count": result.modified_count
    }
