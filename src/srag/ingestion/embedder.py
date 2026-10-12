"""Vector embedding generation.

This module provides the embedding provider interface and two implementations:

- LocalEmbedder: local sentence-transformers model (BGE-M3 baseline, 1024-dim).
  The model is loaded lazily on first use so importing this module (or
  starting the application) never triggers a model download.
- HashingEmbedder: deterministic hashed embeddings for tests and offline
  development. Not semantically aware, but stable across processes.
"""

import abc
import hashlib
import math
from functools import lru_cache
from typing import Any

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None


class Embedder(abc.ABC):
    """Abstract interface for embedding generation."""

    @abc.abstractmethod
    def embed_text(self, text: str) -> list[float]:
        """Embed a single string."""

    @abc.abstractmethod
    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of strings."""


class LocalEmbedder(Embedder):
    """Local embedding provider using sentence-transformers.

    By default uses BAAI/bge-m3 which produces 1024-dimensional embeddings,
    matching the EvidenceUnitModel schema.
    """

    def __init__(self, model_name: str = "BAAI/bge-m3", **kwargs: Any) -> None:
        self.model_name = model_name
        self.kwargs = kwargs
        self._model: Any | None = None

    def _load(self) -> Any:
        """Load the model lazily on first use."""
        if self._model is None:
            if SentenceTransformer is None:
                raise RuntimeError(
                    "sentence-transformers is not installed; install it or "
                    "set EMBEDDER_PROVIDER=hashing for offline development"
                )
            self._model = SentenceTransformer(self.model_name, **self.kwargs)
        return self._model

    def embed_text(self, text: str) -> list[float]:
        return self._load().encode(text, normalize_embeddings=True).tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        embeddings = self._load().encode(texts, normalize_embeddings=True)
        return embeddings.tolist()


class HashingEmbedder(Embedder):
    """Deterministic hashing embedder for tests and offline development.

    Maps each whitespace token to a fixed index and sign via SHA-256, then
    L2-normalizes. Texts that share more tokens have higher cosine similarity.
    Fully deterministic, so vectors stored by one process remain comparable
    in later queries.
    """

    def __init__(self, dimension: int = 1024) -> None:
        self.dimension = dimension

    def _embed_one(self, text: str) -> list[float]:
        vec = [0.0] * self.dimension
        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimension
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vec[index] += sign
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec

    def embed_text(self, text: str) -> list[float]:
        return self._embed_one(text)

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(text) for text in texts]


def build_embedder() -> Embedder:
    """Single embedder used for both ingestion and retrieval."""
    import logging

    from srag.settings import EmbedderProvider, get_settings

    settings = get_settings()
    if settings.embedder_provider == EmbedderProvider.HASHING:
        if settings.is_production:
            raise RuntimeError("EMBEDDER_PROVIDER=hashing is not allowed in production")
        return HashingEmbedder(dimension=settings.embedder_dimension)
    if SentenceTransformer is None:
        if settings.is_production:
            raise RuntimeError("sentence-transformers is required when EMBEDDER_PROVIDER=local")
        logging.getLogger(__name__).warning(
            "sentence-transformers is not installed; using hashing embeddings"
        )
        return HashingEmbedder(dimension=settings.embedder_dimension)
    return LocalEmbedder(model_name=settings.embedder_model_name)


@lru_cache(maxsize=1)
def get_embedder() -> Embedder:
    return build_embedder()
