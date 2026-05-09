from app.schemas.wilddata_schema import WildChatRecord
from fastapi import APIRouter, Query
from app.crud import crud_wilddata


data_router = APIRouter(prefix="/data", tags=["data"])

@data_router.get("/", response_model=list[WildChatRecord])
def get_wildchat_data(limit: int = Query(10, ge=1), offset: int = Query(0, ge=0)):
    """
    Get paginated wilddata from parquet file.
    - limit: number of records to return (default: 10)
    - offset: number of records to skip (default: 0)
    """
    data = crud_wilddata.read_parquet_paginated(limit=limit, offset=offset)
    return data