from pymongo import MongoClient
from pymongo.database import Database
from typing import Optional
import os

class MongoDB:
    client: Optional[MongoClient] = None
    database: Optional[Database] = None

mongodb = MongoDB()

def connect_to_mongo():
    """Create database connection"""
    mongodb.client = MongoClient("mongodb://localhost:27017/")
    mongodb.database = mongodb.client.billing_app
    
def close_mongo_connection():
    """Close database connection"""
    if mongodb.client:
        mongodb.client.close()

def get_database() -> Database:
    """Get database instance"""
    if mongodb.database is None:
        connect_to_mongo()
    return mongodb.database
