"""Vector embedding generation.

This module provides the embedding provider interface and two implementations:

- LocalEmbedder: local sentence-transformers model (BGE-M3 baseline, 1024-dim).
  Both the sentence-transformers import and the model load are deferred to
  first use, so importing this module never pulls in torch and never
  triggers a model download. That matters beyond startup cost: an
  unimportable torch (a missing CUDA runtime, a DLL blocked by an OS
  application-control policy) would otherwise break every module that
  transitively imports this one, including unrelated tests.
- HashingEmbedder: deterministic hashed embeddings for tests and offline
  development. Not semantically aware, but stable across processes.
"""

import abc
import hashlib
import math
from functools import lru_cache
from typing import Any

_UNAVAILABLE = (
    "sentence-transformers could not be loaded; install it, or set "
    "EMBEDDER_PROVIDER=hashing for offline development"
)


def _import_sentence_transformer() -> Any | None:
    """Import SentenceTransformer, or return None if it is unusable.

    OSError is caught alongside ImportError because the package can be
    installed yet fail to load its native torch libraries.
    """
    try:
        from sentence_transformers import SentenceTransformer
    except (ImportError, OSError):
        return None
    return SentenceTransformer


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
            sentence_transformer = _import_sentence_transformer()
            if sentence_transformer is None:
                raise RuntimeError(_UNAVAILABLE)
            self._model = sentence_transformer(self.model_name, **self.kwargs)
        return self._model

    def embed_text(self, text: str) -> list[float]:
        vector: list[float] = self._load().encode(text, normalize_embeddings=True).tolist()
        return vector

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        embeddings = self._load().encode(texts, normalize_embeddings=True)
        vectors: list[list[float]] = embeddings.tolist()
        return vectors


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
    if _import_sentence_transformer() is None:
        if settings.is_production:
            raise RuntimeError("sentence-transformers is required when EMBEDDER_PROVIDER=local")
        logging.getLogger(__name__).warning("%s; using hashing embeddings", _UNAVAILABLE)
        return HashingEmbedder(dimension=settings.embedder_dimension)
    return LocalEmbedder(model_name=settings.embedder_model_name)


@lru_cache(maxsize=1)
def get_embedder() -> Embedder:
    return build_embedder()
