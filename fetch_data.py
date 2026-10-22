import requests
from typing import Any, Optional


def fetch_data(url: str, timeout: int = 10) -> Optional[Any]:
    """Fetch JSON data from the given URL.

    Makes a GET request to the provided URL and returns the parsed JSON
    response body. Returns None if the request fails for any reason.

    Args:
        url: The URL to fetch data from.
        timeout: Request timeout in seconds.

    Returns:
        The parsed JSON response, or None on failure.
    """
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        return None
    except requests.exceptions.ConnectionError:
        return None
    except requests.exceptions.HTTPError:
        return None
    except requests.exceptions.RequestException:
        return None
    except ValueError:
        return None
