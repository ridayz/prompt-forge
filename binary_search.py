"""Binary search implementation on a sorted array."""

from __future__ import annotations

from typing import Sequence


def binary_search(arr: Sequence[int], target: int) -> int:
    """Find the index of *target* in a sorted sequence using binary search.

    Args:
        arr: A sequence of integers sorted in ascending order.
        target: The integer value to search for.

    Returns:
        The zero-based index of *target* if found, otherwise -1.

    Raises:
        TypeError: If *arr* is not a sequence or *target* is not an int.
        ValueError: If *arr* is not sorted in ascending order.

    Complexity:
        Time:  O(log n) where n is the length of *arr*.
        Space: O(1) auxiliary space (iterative approach).
    """
    if not isinstance(arr, (list, tuple)):
        raise TypeError(f"arr must be a list or tuple, got {type(arr).__name__}")
    if not isinstance(target, int) or isinstance(target, bool):
        raise TypeError(f"target must be an int, got {type(target).__name__}")
    if any(arr[i] > arr[i + 1] for i in range(len(arr) - 1)):
        raise ValueError("arr must be sorted in ascending order")

    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1


# --- Test cases -------------------------------------------------------------

# 1. Target found in the middle of a multi-element array
assert binary_search([1, 3, 5, 7, 9, 11], 7) == 3

# 2. Single-element array: hit and miss
assert binary_search([42], 42) == 0
assert binary_search([42], 0) == -1

# 3. Empty array and target not present
assert binary_search([], 5) == -1
assert binary_search([2, 4, 6, 8], 5) == -1

print("All tests passed.")
