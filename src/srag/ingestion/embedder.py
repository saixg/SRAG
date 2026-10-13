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
import logging
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


def _import_torch() -> Any | None:
    try:
        import torch
    except (ImportError, OSError):
        return None
    return torch


def cuda_unavailable_reason(torch: Any | None) -> str:
    """Why CUDA cannot be used, specifically enough to act on."""
    if torch is None:
        return "torch could not be imported"
    if torch.version.cuda is None:
        return (
            f"the installed torch build is CPU-only ({torch.__version__}); "
            "install a CUDA build from https://download.pytorch.org/whl to use the GPU"
        )
    return (
        f"torch {torch.__version__} reports no usable CUDA device "
        "(no GPU visible, or the driver is older than the CUDA runtime)"
    )


def resolve_device(requested: str) -> str:
    """Pick the device the model will actually run on.

    `auto` prefers the GPU and silently falls back to CPU, which is what an
    unattended deployment needs. An explicit `cuda` instead fails loudly: a
    caller who asked for the GPU wants to know it is missing rather than
    discover it from throughput hours later.
    """
    torch = _import_torch()
    available = torch is not None and torch.cuda.is_available()
    if requested == "cuda":
        if not available:
            raise RuntimeError(f"EMBEDDER_DEVICE=cuda but {cuda_unavailable_reason(torch)}")
        return "cuda"
    if requested == "cpu":
        return "cpu"
    return "cuda" if available else "cpu"


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

    def __init__(
        self,
        model_name: str = "BAAI/bge-m3",
        device: str = "auto",
        batch_size: int = 16,
        **kwargs: Any,
    ) -> None:
        self.model_name = model_name
        self.requested_device = device
        self.batch_size = batch_size
        self.kwargs = kwargs
        self.device: str | None = None
        self._model: Any | None = None

    def _load(self) -> Any:
        """Load the model lazily on first use, onto the resolved device."""
        if self._model is None:
            sentence_transformer = _import_sentence_transformer()
            if sentence_transformer is None:
                raise RuntimeError(_UNAVAILABLE)
            self.device = resolve_device(self.requested_device)
            model = sentence_transformer(self.model_name, device=self.device, **self.kwargs)
            if self.device == "cuda":
                # fp32 weights are 2.3GB, which leaves a 4GB card no room for
                # activations; half precision costs ~1e-3 of cosine similarity.
                model = model.half()
            logging.getLogger(__name__).info(
                "embedder loaded", extra={"model": self.model_name, "device": self.device}
            )
            self._model = model
        return self._model

    def embed_text(self, text: str) -> list[float]:
        vector: list[float] = self._load().encode(text, normalize_embeddings=True).tolist()
        return vector

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        embeddings = self._load().encode(
            texts, normalize_embeddings=True, batch_size=self.batch_size
        )
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
    return LocalEmbedder(
        model_name=settings.embedder_model_name,
        device=settings.embedder_device.value,
        batch_size=settings.embedder_batch_size,
    )


@lru_cache(maxsize=1)
def get_embedder() -> Embedder:
    return build_embedder()
