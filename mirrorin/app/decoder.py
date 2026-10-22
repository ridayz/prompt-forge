"""H.264 decoding built on top of FFmpeg (through PyAV)."""

from __future__ import annotations

from typing import List, Optional

try:
    import av
except ImportError:  # pragma: no cover
    av = None


class DecoderError(Exception):
    pass


class H264Decoder:
    """Incrementally decode an H.264 Annex-B stream into RGB frames.

    Feed raw packet payloads (without the scrcpy frame header) with
    :meth:`decode`, and drain the pending frames with :meth:`flush`.
    """

    def __init__(self):
        if av is None:
            raise DecoderError("PyAV tidak terpasang. Jalankan: pip install av")
        try:
            self._codec = av.CodecContext.create("h264", "r")
        except Exception as exc:  # pragma: no cover
            raise DecoderError(f"gagal membuat decoder H.264: {exc}") from exc

        # Multi-threaded decoding keeps up with 1080p@60 on modest CPUs.
        try:
            self._codec.thread_type = "AUTO"
            self._codec.thread_count = 0
        except Exception:
            pass

        self.width = 0
        self.height = 0
        self._last_format = None

    # ------------------------------------------------------------------ api
    def decode(self, payload: bytes) -> List["av.VideoFrame"]:
        """Decode one encoded packet and return any completed frames."""
        if not payload:
            return []
        try:
            packet = av.Packet(payload)
            return list(self._codec.decode(packet))
        except Exception:
            # A single corrupt packet must not kill the stream.
            return []

    def flush(self) -> List["av.VideoFrame"]:
        try:
            return list(self._codec.decode(None))
        except Exception:
            return []

    def dimensions(self) -> Optional[tuple]:
        if self.width and self.height:
            return (self.width, self.height)
        return None
