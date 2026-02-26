from urllib.parse import quote

import requests

from .config import settings


def create_signed_upload_url(bucket: str, storage_key: str) -> dict:
    encoded_key = quote(storage_key, safe="/")
    endpoint = f"{settings.supabase_url}/storage/v1/object/upload/sign/{bucket}/{encoded_key}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
        "Content-Type": "application/json",
    }

    response = requests.post(endpoint, json={"upsert": True}, headers=headers, timeout=20)
    response.raise_for_status()
    payload = response.json()

    raw_url = payload.get("signedURL") or payload.get("signedUrl") or payload.get("url")
    token = payload.get("token")
    if not raw_url:
        raise RuntimeError(f"Unexpected storage signed upload response: {payload}")

    if raw_url.startswith("http"):
        signed_upload_url = raw_url
    else:
        if not raw_url.startswith("/"):
            raw_url = f"/{raw_url}"
        # Some Supabase responses return /object/upload/sign/... (without /storage/v1).
        if not raw_url.startswith("/storage/v1/"):
            raw_url = f"/storage/v1{raw_url}"
        signed_upload_url = f"{settings.supabase_url}{raw_url}"

    if token and "token=" not in signed_upload_url:
        sep = "&" if "?" in signed_upload_url else "?"
        signed_upload_url = f"{signed_upload_url}{sep}token={token}"

    return {
        "signed_upload_url": signed_upload_url,
        "signed_upload_token": token,
    }
