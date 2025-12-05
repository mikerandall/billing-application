from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema

class Contact(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""

class Client(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    address: Optional[str] = ""
    url: Optional[str] = ""
    contacts: List[Contact] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Project(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    client_id: PyObjectId
    name: str
    billing_codes: List[str] = []
    start_date: date
    is_active: bool = True
    hourly_rate: Optional[float] = 0.0
    last_invoice_date: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class HourEntry(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    project_id: PyObjectId
    date: date
    hours: float
    description: Optional[str] = ""
    is_invoiced: bool = False
    invoice_id: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Invoice(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    client_id: PyObjectId
    project_id: PyObjectId
    invoice_number: str
    invoice_date: date
    due_date: date
    hour_entries: List[PyObjectId] = []
    total_hours: float
    hourly_rate: float
    total_amount: float
    pdf_filename: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Request/Response models
class ClientCreate(BaseModel):
    name: str
    address: Optional[str] = ""
    url: Optional[str] = ""
    contacts: List[Contact] = []

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    url: Optional[str] = None
    contacts: Optional[List[Contact]] = None

class ProjectCreate(BaseModel):
    client_id: str
    name: str
    billing_codes: List[str] = []
    start_date: date
    is_active: bool = True
    hourly_rate: Optional[float] = 0.0

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    billing_codes: Optional[List[str]] = None
    start_date: Optional[date] = None
    is_active: Optional[bool] = None
    hourly_rate: Optional[float] = None

class HourEntryCreate(BaseModel):
    project_id: str
    date: date
    hours: float
    description: Optional[str] = ""

class InvoiceCreate(BaseModel):
    project_id: str
    hour_entry_ids: List[str]
    invoice_date: Optional[date] = None
    due_days: int = 14
