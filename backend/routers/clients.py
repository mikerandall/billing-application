from fastapi import APIRouter, HTTPException, status
from typing import List
from bson import ObjectId
from datetime import datetime

from database import get_database
from models import Client, ClientCreate, ClientUpdate, PyObjectId

router = APIRouter(prefix="/clients", tags=["clients"])

@router.get("/", response_model=List[Client])
async def list_clients():
    """Get all clients"""
    db = get_database()
    clients = []
    for client_doc in db.clients.find():
        clients.append(Client(**client_doc))
    return clients

@router.get("/{client_id}", response_model=Client)
async def get_client(client_id: str):
    """Get a specific client by ID"""
    if not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="Invalid client ID")
    
    db = get_database()
    client_doc = db.clients.find_one({"_id": ObjectId(client_id)})
    
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return Client(**client_doc)

@router.post("/", response_model=Client, status_code=status.HTTP_201_CREATED)
async def create_client(client: ClientCreate):
    """Create a new client"""
    db = get_database()
    
    client_dict = client.model_dump()
    client_dict["created_at"] = datetime.utcnow()
    client_dict["updated_at"] = datetime.utcnow()
    
    result = db.clients.insert_one(client_dict)
    
    created_client = db.clients.find_one({"_id": result.inserted_id})
    return Client(**created_client)

@router.put("/{client_id}", response_model=Client)
async def update_client(client_id: str, client_update: ClientUpdate):
    """Update a client"""
    if not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="Invalid client ID")
    
    db = get_database()
    
    # Check if client exists
    existing_client = db.clients.find_one({"_id": ObjectId(client_id)})
    if not existing_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Prepare update data
    update_data = {k: v for k, v in client_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update client
    db.clients.update_one(
        {"_id": ObjectId(client_id)}, 
        {"$set": update_data}
    )
    
    # Return updated client
    updated_client = db.clients.find_one({"_id": ObjectId(client_id)})
    return Client(**updated_client)

@router.delete("/{client_id}")
async def delete_client(client_id: str):
    """Delete a client"""
    if not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="Invalid client ID")
    
    db = get_database()
    
    # Check if client has projects
    project_count = db.projects.count_documents({"client_id": ObjectId(client_id)})
    if project_count > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete client with existing projects"
        )
    
    result = db.clients.delete_one({"_id": ObjectId(client_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {"message": "Client deleted successfully"}
