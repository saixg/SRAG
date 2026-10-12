"""Split source text into overlapping chunks."""

from __future__ import annotations

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    RecursiveCharacterTextSplitter = None


class TextProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._splitter = None
        if RecursiveCharacterTextSplitter is not None:
            self._splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", " ", ""],
            )

    def chunk_text(self, text: str) -> list[str]:
        if not text.strip():
            return []
        if self._splitter is not None:
            return self._splitter.split_text(text)
        return _overlap_chunks(text, self.chunk_size, self.chunk_overlap)


def _overlap_chunks(text: str, chunk_size: int, overlap: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text]
    step = max(chunk_size - overlap, 1)
    chunks: list[str] = []
    start = 0
    while start < len(text):
        chunks.append(text[start : start + chunk_size])
        start += step
    return chunks
