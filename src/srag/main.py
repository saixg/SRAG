"""Application entrypoint — run with `python -m srag` or `uvicorn srag.main:app`."""

from srag.app import create_app

app = create_app()

if __name__ == "__main__":
    import uvicorn

    from srag.settings import get_settings

    settings = get_settings()
    uvicorn.run(
        "srag.main:app",
        host=settings.server_host,
        port=settings.server_port,
        reload=settings.app_debug,
    )
