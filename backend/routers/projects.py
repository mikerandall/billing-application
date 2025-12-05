from fastapi import APIRouter, HTTPException, status
from typing import List
from bson import ObjectId
from datetime import datetime, date

from database import get_database
from models import Project, ProjectCreate, ProjectUpdate, PyObjectId

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/", response_model=List[Project])
async def list_projects(client_id: str = None, active_only: bool = False):
    """Get all projects, optionally filtered by client or active status"""
    db = get_database()
    
    query = {}
    if client_id:
        if not ObjectId.is_valid(client_id):
            raise HTTPException(status_code=400, detail="Invalid client ID")
        query["client_id"] = ObjectId(client_id)
    
    if active_only:
        query["is_active"] = True
    
    projects = []
    for project_doc in db.projects.find(query):
        projects.append(Project(**project_doc))
    
    return projects

@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a specific project by ID"""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    db = get_database()
    project_doc = db.projects.find_one({"_id": ObjectId(project_id)})
    
    if not project_doc:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return Project(**project_doc)

@router.post("/", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate):
    """Create a new project"""
    if not ObjectId.is_valid(project.client_id):
        raise HTTPException(status_code=400, detail="Invalid client ID")
    
    db = get_database()
    
    # Verify client exists
    client = db.clients.find_one({"_id": ObjectId(project.client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    project_dict = project.model_dump()
    project_dict["client_id"] = ObjectId(project.client_id)
    # Convert date to datetime for MongoDB compatibility
    if isinstance(project_dict["start_date"], date):
        project_dict["start_date"] = datetime.combine(project_dict["start_date"], datetime.min.time())
    project_dict["created_at"] = datetime.utcnow()
    project_dict["updated_at"] = datetime.utcnow()
    
    result = db.projects.insert_one(project_dict)
    
    created_project = db.projects.find_one({"_id": result.inserted_id})
    return Project(**created_project)

@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: ProjectUpdate):
    """Update a project"""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    db = get_database()
    
    # Check if project exists
    existing_project = db.projects.find_one({"_id": ObjectId(project_id)})
    if not existing_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Prepare update data
    update_data = {k: v for k, v in project_update.model_dump().items() if v is not None}
    # Convert date to datetime for MongoDB compatibility
    if "start_date" in update_data and isinstance(update_data["start_date"], date):
        update_data["start_date"] = datetime.combine(update_data["start_date"], datetime.min.time())
    update_data["updated_at"] = datetime.utcnow()
    
    # Update project
    db.projects.update_one(
        {"_id": ObjectId(project_id)}, 
        {"$set": update_data}
    )
    
    # Return updated project
    updated_project = db.projects.find_one({"_id": ObjectId(project_id)})
    return Project(**updated_project)

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    db = get_database()
    
    # Check if project has hour entries
    hour_count = db.hours.count_documents({"project_id": ObjectId(project_id)})
    if hour_count > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete project with existing hour entries"
        )
    
    result = db.projects.delete_one({"_id": ObjectId(project_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}

@router.get("/{project_id}/hours-summary")
async def get_project_hours_summary(project_id: str):
    """Get hours summary for a project"""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    db = get_database()
    
    # Get project to check last invoice date
    project = db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Calculate total hours and uninvoiced hours
    pipeline = [
        {"$match": {"project_id": ObjectId(project_id)}},
        {"$group": {
            "_id": None,
            "total_hours": {"$sum": "$hours"},
            "uninvoiced_hours": {
                "$sum": {"$cond": [{"$ne": ["$is_invoiced", True]}, "$hours", 0]}
            }
        }}
    ]
    
    result = list(db.hours.aggregate(pipeline))
    
    if not result:
        return {
            "project_id": project_id,
            "total_hours": 0,
            "uninvoiced_hours": 0,
            "last_invoice_date": project.get("last_invoice_date")
        }
    
    return {
        "project_id": project_id,
        "total_hours": result[0]["total_hours"],
        "uninvoiced_hours": result[0]["uninvoiced_hours"],
        "last_invoice_date": project.get("last_invoice_date")
    }
