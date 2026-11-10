"""
File storage service — Local filesystem + MinIO/S3.
All file reads/writes go through this service.
"""
import os
import uuid
from pathlib import Path
from typing import Optional

from loguru import logger
from app.config import settings
from supabase import create_client, Client

def _get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


# ─────────────────────────────────────────────────────────────────────────────
# Local Storage
# ─────────────────────────────────────────────────────────────────────────────

def save_local(file_bytes: bytes, filename: str, subfolder: str = "") -> str:
    """Save file locally and return the relative path."""
    upload_dir = Path(settings.UPLOAD_DIR) / subfolder
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = upload_dir / unique_name
    file_path.write_bytes(file_bytes)

    return str(file_path)


def resolve_upload(rel_path: str) -> Optional[str]:
    """Absolute path of a file stored under UPLOAD_DIR, or None when the path would leave that folder (`..`, absolute paths)."""
    base = os.path.realpath(settings.UPLOAD_DIR)
    full = os.path.realpath(os.path.join(base, rel_path or ""))
    return full if full == base or full.startswith(base + os.sep) else None


def upload_exists(rel_path: str) -> bool:
    full = resolve_upload(rel_path)
    return bool(full and os.path.isfile(full))


def read_local(file_path: str) -> bytes:
    return Path(file_path).read_bytes()


# ─────────────────────────────────────────────────────────────────────────────
# MinIO Storage
# ─────────────────────────────────────────────────────────────────────────────

def _get_minio_client():
    try:
        from minio import Minio
        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        return client
    except Exception as e:
        logger.warning(f"MinIO client init failed: {e}")
        return None


def _ensure_bucket(client) -> None:
    bucket = settings.MINIO_BUCKET_NAME
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


def upload_to_minio(file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> Optional[str]:
    """Upload file to MinIO and return the object URL."""
    try:
        from io import BytesIO
        client = _get_minio_client()
        if not client:
            return None

        _ensure_bucket(client)
        object_name = f"{uuid.uuid4().hex}/{filename}"

        client.put_object(
            settings.MINIO_BUCKET_NAME,
            object_name,
            BytesIO(file_bytes),
            length=len(file_bytes),
            content_type=content_type,
        )
        return f"http://{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET_NAME}/{object_name}"
    except Exception as e:
        logger.error(f"MinIO upload failed: {e}")
        return None


def download_from_minio(object_url: str) -> Optional[bytes]:
    """Download file from MinIO by URL."""
    try:
        # Extract object name from URL
        parts = object_url.split(f"/{settings.MINIO_BUCKET_NAME}/", 1)
        if len(parts) < 2:
            return None
        object_name = parts[1]

        client = _get_minio_client()
        if not client:
            return None

        response = client.get_object(settings.MINIO_BUCKET_NAME, object_name)
        return response.read()
    except Exception as e:
        logger.error(f"MinIO download failed: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Unified storage (tries MinIO, falls back to local)
# ─────────────────────────────────────────────────────────────────────────────

def upload_to_supabase(file_bytes: bytes, filename: str, bucket: str = "cvs", content_type: str = "application/octet-stream") -> Optional[str]:
    """Upload file to Supabase Storage and return the public URL."""
    try:
        sb = _get_supabase()
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        
        # Upload
        sb.storage.from_(bucket).upload(
            path=unique_name,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        
        # Get Public URL
        res = sb.storage.from_(bucket).get_public_url(unique_name)
        return res
    except Exception as e:
        logger.error(f"Supabase upload failed: {e}")
        return None

def store_file(file_bytes: bytes, filename: str, subfolder: str = "cvs", content_type: str = "application/octet-stream") -> str:
    """Store file — tries Supabase first, falls back to local."""
    # We use subfolder as bucket name for Supabase if it matches one of our buckets
    bucket = "cvs" if subfolder == "cvs" else "generated-docs"
    
    url = upload_to_supabase(file_bytes, filename, bucket, content_type)
    if url:
        return url
        
    # Fallback to local
    return save_local(file_bytes, filename, subfolder)


def retrieve_file(file_url: str) -> bytes:
    """Retrieve file — from MinIO URL or local path."""
    if file_url.startswith("http"):
        data = download_from_minio(file_url)
        if data:
            return data
        # Try HTTP GET as last resort
        import httpx
        response = httpx.get(file_url)
        response.raise_for_status()
        return response.content
    else:
        return read_local(file_url)
