from urllib.parse import quote

import requests

from .config import settings


def download_object(bucket: str, storage_key: str) -> bytes:
    encoded_key = quote(storage_key, safe="/")
    url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{encoded_key}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }

    response = requests.get(url, headers=headers, timeout=180)
    response.raise_for_status()
    return response.content