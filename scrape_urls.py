"""Concurrent URL status checker."""

import asyncio
from typing import Dict, List, Optional

import aiohttp

DEFAULT_TIMEOUT = 10.0


async def fetch_status(
    session: aiohttp.ClientSession,
    url: str,
    timeout: float = DEFAULT_TIMEOUT,
) -> tuple[str, Optional[int]]:
    """Fetch a single URL and return its (url, status_code) pair.

    Args:
        session: The shared ``aiohttp.ClientSession``.
        url: The URL to fetch.
        timeout: Per-request timeout in seconds.

    Returns:
        A tuple of the URL and its status code. On failure the status code
        is ``None``.
    """
    try:
        async with session.get(url) as response:
            return url, response.status
    except asyncio.TimeoutError:
        return url, None
    except aiohttp.ClientError as exc:
        print(f"Request to {url} failed: {exc}")
        return url, None


async def scrape_urls(
    urls: List[str],
    timeout: float = DEFAULT_TIMEOUT,
) -> Dict[str, Optional[int]]:
    """Fetch all URLs concurrently and map each URL to its status code.

    Args:
        urls: The URLs to fetch.
        timeout: Per-request timeout in seconds.

    Returns:
        A dict mapping each URL to its HTTP status code. URLs that failed to
        fetch map to ``None``.
    """
    if not urls:
        return {}

    connector = aiohttp.TCPConnector(limit=100)
    async with aiohttp.ClientSession(
        connector=connector,
        timeout=aiohttp.ClientTimeout(total=timeout),
    ) as session:
        results = await asyncio.gather(
            *(fetch_status(session, url, timeout) for url in urls)
        )

    return dict(results)