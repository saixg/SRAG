"""Which device the local embedder runs on, and what happens when it cannot.

The model silently running on CPU is the failure this covers: a CPU-only
torch build makes BGE-M3 roughly an order of magnitude slower, and nothing in
the embedding interface reveals it. So device selection is explicit, an
unmet `cuda` request fails loudly, and `auto` falls back.
"""

from __future__ import annotations

from typing import Any

import pytest

from srag.ingestion.embedder import (
    HashingEmbedder,
    LocalEmbedder,
    cuda_unavailable_reason,
    resolve_device,
)


class _FakeCuda:
    def __init__(self, available: bool) -> None:
        self._available = available

    def is_available(self) -> bool:
        return self._available


class _FakeTorch:
    """Stands in for torch: the suite must not depend on a CUDA machine."""

    def __init__(self, available: bool, cuda_version: str | None, version: str) -> None:
        self.cuda = _FakeCuda(available)
        self.version = type("V", (), {"cuda": cuda_version})()
        self.__version__ = version


class _FakeModel:
    def __init__(self, name: str, device: str | None = None, **kwargs: Any) -> None:
        self.name = name
        self.device = device
        self.kwargs = kwargs
        self.halved = False
        self.encode_calls: list[dict[str, Any]] = []

    def half(self) -> _FakeModel:
        self.halved = True
        return self

    def encode(self, texts: Any, **kwargs: Any) -> Any:
        self.encode_calls.append({"texts": texts, **kwargs})
        import numpy as np

        if isinstance(texts, str):
            return np.zeros(1024, dtype="float32")
        return np.zeros((len(texts), 1024), dtype="float32")


@pytest.fixture
def fake_stack(monkeypatch):
    """Install a fake torch and SentenceTransformer, return the model registry."""
    created: list[_FakeModel] = []

    def install(
        available: bool, cuda_version: str | None = "12.8", version: str = "2.14.1"
    ) -> None:
        torch = _FakeTorch(available, cuda_version, version)
        monkeypatch.setattr("srag.ingestion.embedder._import_torch", lambda: torch)

        def factory(name: str, **kwargs: Any) -> _FakeModel:
            model = _FakeModel(name, **kwargs)
            created.append(model)
            return model

        monkeypatch.setattr(
            "srag.ingestion.embedder._import_sentence_transformer", lambda: factory
        )

    return install, created


def test_auto_prefers_cuda_when_it_is_usable(fake_stack):
    install, _ = fake_stack
    install(available=True)
    assert resolve_device("auto") == "cuda"


def test_auto_falls_back_to_cpu(fake_stack):
    install, _ = fake_stack
    install(available=False, cuda_version=None, version="2.14.1+cpu")
    assert resolve_device("auto") == "cpu"


def test_explicit_cpu_is_honored_even_with_a_gpu(fake_stack):
    install, _ = fake_stack
    install(available=True)
    assert resolve_device("cpu") == "cpu"


def test_explicit_cuda_fails_loudly_on_a_cpu_only_build(fake_stack):
    """The real root cause this guards: torch installed without CUDA support."""
    install, _ = fake_stack
    install(available=False, cuda_version=None, version="2.14.1+cpu")
    with pytest.raises(RuntimeError, match="CPU-only"):
        resolve_device("cuda")


def test_explicit_cuda_fails_loudly_when_no_device_is_visible(fake_stack):
    install, _ = fake_stack
    install(available=False, cuda_version="12.8")
    with pytest.raises(RuntimeError, match="no usable CUDA device"):
        resolve_device("cuda")


def test_reason_distinguishes_a_missing_torch(monkeypatch):
    assert "could not be imported" in cuda_unavailable_reason(None)


def test_model_is_placed_on_the_resolved_device_and_halved_on_gpu(fake_stack):
    install, created = fake_stack
    install(available=True)
    embedder = LocalEmbedder(device="auto")
    embedder.embed_text("hello")
    assert embedder.device == "cuda"
    assert created[0].device == "cuda"
    assert created[0].halved, "fp32 BGE-M3 does not leave a 4GB card room for activations"


def test_cpu_model_is_not_halved(fake_stack):
    install, created = fake_stack
    install(available=False, cuda_version=None, version="2.14.1+cpu")
    embedder = LocalEmbedder(device="auto")
    embedder.embed_text("hello")
    assert embedder.device == "cpu"
    assert not created[0].halved


def test_model_is_loaded_once_across_calls(fake_stack):
    """Reloading BGE-M3 per call would cost more than the embedding itself."""
    install, created = fake_stack
    install(available=False, cuda_version=None, version="2.14.1+cpu")
    embedder = LocalEmbedder(device="cpu")
    embedder.embed_text("one")
    embedder.embed_batch(["two", "three"])
    assert len(created) == 1


def test_batch_size_reaches_encode(fake_stack):
    install, created = fake_stack
    install(available=True)
    embedder = LocalEmbedder(device="cuda", batch_size=4)
    embedder.embed_batch(["a", "b", "c"])
    assert created[0].encode_calls[0]["batch_size"] == 4


def test_vectors_keep_the_1024_dimension_contract(fake_stack):
    """The pgvector column is Vector(1024); a device change must not alter it."""
    install, _ = fake_stack
    install(available=True)
    local = LocalEmbedder(device="auto")
    assert len(local.embed_text("x")) == 1024
    assert [len(vector) for vector in local.embed_batch(["x", "y"])] == [1024, 1024]
    assert len(HashingEmbedder(dimension=1024).embed_text("x")) == 1024


def test_missing_sentence_transformers_is_reported(monkeypatch):
    monkeypatch.setattr("srag.ingestion.embedder._import_sentence_transformer", lambda: None)
    with pytest.raises(RuntimeError, match="sentence-transformers"):
        LocalEmbedder(device="cpu").embed_text("x")
