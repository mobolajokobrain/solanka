"""
Internal HTTP helper used by all SDK API classes.
Handles error mapping and response parsing.
"""
import httpx
from .exceptions import SolankaAPIError, SolankaNetworkError, SolankaNotFoundError


async def async_get(base_url: str, path: str, timeout: float = 10.0, **params) -> dict:
    url = f"{base_url}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, params=params or None)
            return _handle(response)
    except httpx.RequestError as e:
        raise SolankaNetworkError(str(e)) from e


async def async_post(base_url: str, path: str, body: dict, timeout: float = 10.0) -> dict:
    url = f"{base_url}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=body)
            return _handle(response)
    except httpx.RequestError as e:
        raise SolankaNetworkError(str(e)) from e


async def async_get_bytes(base_url: str, path: str, timeout: float = 10.0) -> bytes:
    url = f"{base_url}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            if response.status_code != 200:
                _handle(response)
            return response.content
    except httpx.RequestError as e:
        raise SolankaNetworkError(str(e)) from e


def sync_get(base_url: str, path: str, timeout: float = 10.0, **params) -> dict:
    url = f"{base_url}{path}"
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(url, params=params or None)
            return _handle(response)
    except httpx.RequestError as e:
        raise SolankaNetworkError(str(e)) from e


def sync_post(base_url: str, path: str, body: dict, timeout: float = 10.0) -> dict:
    url = f"{base_url}{path}"
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, json=body)
            return _handle(response)
    except httpx.RequestError as e:
        raise SolankaNetworkError(str(e)) from e


def sync_get_bytes(base_url: str, path: str, timeout: float = 10.0) -> bytes:
    url = f"{base_url}{path}"
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(url)
            if response.status_code != 200:
                _handle(response)
            return response.content
    except httpx.RequestError as e:
        raise SolankaNetworkError(str(e)) from e


def _handle(response: httpx.Response) -> dict:
    if response.status_code == 404:
        detail = _extract_detail(response)
        raise SolankaNotFoundError(404, detail)
    if response.status_code >= 400:
        detail = _extract_detail(response)
        raise SolankaAPIError(response.status_code, detail)
    return response.json()


def _extract_detail(response: httpx.Response) -> str:
    try:
        return response.json().get("detail", response.text)
    except Exception:
        return response.text
