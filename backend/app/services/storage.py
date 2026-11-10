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


# ─────────────────────────────────────────────────────────────────────────────
# Durable copy (Supabase Storage)
#
# Files are written to UPLOAD_DIR, which a redeploy wipes unless it sits on a persistent volume, while their records stay in the
# database ("Fichier introuvable"). Every employee file is therefore also kept in a private Supabase Storage bucket under the same
# relative path; the disk is a cache that is refilled from the bucket when a file is missing. Every call degrades quietly to
# "disk only" when Storage is unreachable, so an upload never fails because of it.
# ─────────────────────────────────────────────────────────────────────────────

_bucket_ready = False


def _durable_bucket():
    """The storage bucket proxy (created private on first use), or None when durable storage is off / unavailable."""
    global _bucket_ready
    if not settings.DURABLE_STORAGE:
        return None
    try:
        from app.database import get_supabase
        storage = get_supabase().storage
        if not _bucket_ready:
            try:
                storage.get_bucket(settings.DURABLE_STORAGE_BUCKET)
            except Exception:
                try:
                    storage.create_bucket(settings.DURABLE_STORAGE_BUCKET, options={"public": False})
                except Exception as e:  # lost a creation race with another worker: fine, anything else is not
                    if "exist" not in str(e).lower() and "duplicate" not in str(e).lower():
                        raise
            _bucket_ready = True
        return storage.from_(settings.DURABLE_STORAGE_BUCKET)
    except Exception as e:
        logger.warning(f"Durable file storage unavailable (files stay on disk only): {e}")
        return None


def durable_put(rel_path: str, data: bytes, content_type: str = "application/octet-stream") -> bool:
    bucket = _durable_bucket()
    if not bucket or resolve_upload(rel_path) is None:
        return False
    try:
        bucket.upload(rel_path, data, {"content-type": content_type or "application/octet-stream", "upsert": "true"})
        return True
    except Exception as e:
        logger.warning(f"Durable copy of '{rel_path}' failed: {e}")
        return False


def durable_get(rel_path: str) -> Optional[bytes]:
    bucket = _durable_bucket()
    if not bucket or resolve_upload(rel_path) is None:
        return None
    try:
        return bucket.download(rel_path)
    except Exception:
        return None  # not there (or Storage unreachable)


def durable_delete(rel_path: str) -> None:
    bucket = _durable_bucket()
    if not bucket or resolve_upload(rel_path) is None:
        return
    try:
        bucket.remove([rel_path])
    except Exception as e:
        logger.warning(f"Durable delete of '{rel_path}' failed: {e}")


def durable_names(folder: str) -> Optional[set]:
    """File names stored under a folder of the bucket (one call), or None when that cannot be known."""
    bucket = _durable_bucket()
    if not bucket:
        return None
    try:
        return {o.get("name") for o in (bucket.list(folder, {"limit": 1000}) or []) if o.get("name")}
    except Exception:
        return None


def ensure_local(rel_path: str) -> Optional[str]:
    """Absolute path of the file on disk; if the disk lost it, it is restored from the durable copy. None when it exists nowhere."""
    full = resolve_upload(rel_path)
    if not full:
        return None
    if os.path.isfile(full):
        return full
    data = durable_get(rel_path)
    if data is None:
        return None
    try:
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:
            f.write(data)
        return full
    except OSError as e:
        logger.warning(f"Could not restore '{rel_path}' on disk: {e}")
        return None


def read_upload(rel_path: str) -> Optional[bytes]:
    """The file's bytes from the disk, else from the durable copy (the disk is refilled)."""
    path = ensure_local(rel_path)
    if not path:
        return None
    with open(path, "rb") as f:
        return f.read()


def availability(rel_paths: list) -> dict:
    """{rel_path: is the file retrievable (disk or durable copy)}. Asks Storage only for the folders that have something missing on disk."""
    out = {p: upload_exists(p) for p in rel_paths}
    for folder in {os.path.dirname(p) for p, ok in out.items() if not ok}:
        names = durable_names(folder)
        if names:
            for p in rel_paths:
                if not out[p] and os.path.dirname(p) == folder and os.path.basename(p) in names:
                    out[p] = True
    return out


def backfill_durable(rows: list) -> int:
    """Copy to the bucket the files that exist on disk but not yet in the bucket (files uploaded before durable storage existed)."""
    by_folder: dict = {}
    for r in rows:
        rel = r.get("file_path") or ""
        if rel and upload_exists(rel):
            by_folder.setdefault(os.path.dirname(rel), []).append(r)
    copied = 0
    for folder, items in by_folder.items():
        have = durable_names(folder)
        if have is None:  # Storage unreachable
            return copied
        for r in items:
            rel = r["file_path"]
            if os.path.basename(rel) in have:
                continue
            with open(resolve_upload(rel), "rb") as f:
                if durable_put(rel, f.read(), r.get("mime_type") or "application/octet-stream"):
                    copied += 1
    return copied


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
