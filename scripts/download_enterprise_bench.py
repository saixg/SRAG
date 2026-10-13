"""Download a manageable subset of EnterpriseRAG-Bench (MIT, onyx-dot-app).

all_documents.zip is 1.2 GB for ~500k documents, far more than a pilot needs.
GitHub release assets serve HTTP range requests, so this reads the zip's
central directory remotely, picks the members worth having (every document a
benchmark question expects, plus a bounded distractor sample per source), and
fetches only those — tens of megabytes instead of the whole archive.

    python scripts/download_enterprise_bench.py --sample-per-source 200

Writes data/enterprise_bench/{questions.jsonl,extra_questions.jsonl,
manifest.txt,documents/<source_type>/<dsid>__<slug>.txt}.
"""

from __future__ import annotations

import argparse
import io
import sys
import zipfile
from collections import OrderedDict
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from srag.datasets.enterprise_bench import (
    dsid_from_name,
    gold_doc_ids,
    load_questions,
    select_members,
    write_manifest,
)

RELEASE_API = "https://api.github.com/repos/onyx-dot-app/EnterpriseRAG-Bench/releases/latest"
DOCUMENTS_ASSET = "all_documents.zip"
QUESTION_ASSETS = ("questions.jsonl", "extra_questions.jsonl")
DEFAULT_ROOT = Path(__file__).parent.parent / "data" / "enterprise_bench"


class RangedRemoteFile(io.RawIOBase):
    """A seekable read-only view of a remote file, backed by range requests.

    zipfile only needs seek/read/tell, so this is enough to list and extract
    individual members without downloading the archive.
    """

    def __init__(self, client: httpx.Client, url: str, chunk_size: int = 1 << 22) -> None:
        self._client = client
        self._url = url
        self.chunk_size = chunk_size
        self._pos = 0
        self._chunks: OrderedDict[int, bytes] = OrderedDict()
        self.bytes_fetched = 0
        head = client.head(url, follow_redirects=True)
        head.raise_for_status()
        self._size = int(head.headers["content-length"])

    def seekable(self) -> bool:
        return True

    def readable(self) -> bool:
        return True

    def tell(self) -> int:
        return self._pos

    def seek(self, offset: int, whence: int = io.SEEK_SET) -> int:
        if whence == io.SEEK_SET:
            self._pos = offset
        elif whence == io.SEEK_CUR:
            self._pos += offset
        else:
            self._pos = self._size + offset
        return self._pos

    def read(self, size: int = -1) -> bytes:
        if size < 0:
            size = self._size - self._pos
        size = max(0, min(size, self._size - self._pos))
        out = bytearray()
        while size > 0:
            index = self._pos // self.chunk_size
            chunk = self._chunk(index)
            start = self._pos - index * self.chunk_size
            take = chunk[start : start + size]
            if not take:
                break
            out += take
            self._pos += len(take)
            size -= len(take)
        return bytes(out)

    def _chunk(self, index: int) -> bytes:
        cached = self._chunks.get(index)
        if cached is not None:
            self._chunks.move_to_end(index)
            return cached
        start = index * self.chunk_size
        end = min(start + self.chunk_size, self._size) - 1
        response = self._client.get(
            self._url, headers={"Range": f"bytes={start}-{end}"}, follow_redirects=True
        )
        response.raise_for_status()
        if response.status_code != 206:
            raise RuntimeError(
                f"{self._url} ignored the range request (got {response.status_code})"
            )
        data = response.content
        self.bytes_fetched += len(data)
        self._chunks[index] = data
        while len(self._chunks) > 64:
            self._chunks.popitem(last=False)
        return data


def _asset_urls(client: httpx.Client) -> dict[str, str]:
    release = client.get(RELEASE_API, follow_redirects=True)
    release.raise_for_status()
    payload = release.json()
    return {asset["name"]: asset["browser_download_url"] for asset in payload.get("assets", [])}


def _download(client: httpx.Client, url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with client.stream("GET", url, follow_redirects=True) as response:
        response.raise_for_status()
        with target.open("wb") as handle:
            for block in response.iter_bytes():
                handle.write(block)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument(
        "--sample-per-source",
        type=int,
        default=200,
        help="Distractor documents to keep per source type, on top of every gold document",
    )
    parser.add_argument(
        "--zip",
        type=Path,
        default=None,
        help="Use an already-downloaded all_documents.zip instead of range requests",
    )
    args = parser.parse_args()

    root: Path = args.root
    documents_dir = root / "documents"
    documents_dir.mkdir(parents=True, exist_ok=True)

    with httpx.Client(timeout=120.0) as client:
        assets = _asset_urls(client)
        for name in QUESTION_ASSETS:
            target = root / name
            if target.exists():
                print(f"have {name}")
                continue
            url = assets.get(name)
            if url is None:
                raise SystemExit(f"release has no asset {name}")
            print(f"downloading {name}")
            _download(client, url, target)

        questions = load_questions(*(root / name for name in QUESTION_ASSETS))
        gold = gold_doc_ids(questions)
        print(f"{len(questions)} questions reference {len(gold)} gold documents")

        if args.zip is not None:
            handle: io.IOBase = args.zip.open("rb")
            remote: RangedRemoteFile | None = None
        else:
            url = assets.get(DOCUMENTS_ASSET)
            if url is None:
                raise SystemExit(f"release has no asset {DOCUMENTS_ASSET}")
            remote = RangedRemoteFile(client, url)
            handle = remote
            print(f"reading {DOCUMENTS_ASSET} index over range requests")

        try:
            archive = zipfile.ZipFile(handle)
            members = select_members(archive.namelist(), gold, args.sample_per_source)
            if remote is not None:
                # The index is read front to back; members are small and scattered,
                # so a large chunk would fetch megabytes per 9 KB document.
                remote.chunk_size = 1 << 16
            print(f"extracting {len(members)} documents")
            written = 0
            for name in members:
                target = documents_dir / name
                if target.exists():
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read(name))
                written += 1
                if written % 250 == 0:
                    print(f"  {written} written")
        finally:
            handle.close()

    write_manifest(root / "manifest.txt", members)
    missing = sorted(gold - {dsid_from_name(name) or "" for name in members})
    print(f"documents under {documents_dir}")
    print(f"gold coverage: {len(gold) - len(missing)}/{len(gold)}")
    if missing:
        print(f"missing gold ids (first 10): {missing[:10]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
