def is_palindrome(s: str) -> bool:
    """Return True if s is a palindrome, ignoring case and non-alphanumeric chars."""
    cleaned = [c.lower() for c in s if c.isalnum()]
    return cleaned == cleaned[::-1]
