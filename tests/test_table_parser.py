from srag.ingestion.parsers.layout import bbox_from_docling, structured_table, table_text
from srag.ingestion.parsers.visual import classify_visual


def test_table_text_from_grid():
    table = {
        "data": {
            "grid": [
                [{"text": "Valve"}, {"text": "Pressure"}],
                [{"text": "V-104"}, {"text": "42 bar"}],
            ]
        }
    }
    rendered = table_text(table, 0)
    assert "V-104" in rendered
    assert "42 bar" in rendered


def test_bbox_from_ltrb_dict():
    assert bbox_from_docling({"l": 1, "t": 2, "r": 3, "b": 4}) == [1.0, 2.0, 3.0, 4.0]


def test_structured_table_headers_and_rows():
    table = {
        "data": {
            "grid": [
                [{"text": "Valve"}, {"text": "Pressure"}],
                [{"text": "V-104"}, {"text": "42 bar"}],
            ]
        }
    }
    structured = structured_table(table, 0)
    assert structured["headers"] == ["Valve", "Pressure"]
    assert structured["rows"] == [["V-104", "42 bar"]]
    assert "42 bar" in structured["markdown"]


def test_classify_visual():
    assert classify_visual("Process flowchart") == "diagram"
    assert classify_visual("Figure 2: trend chart") == "figure"
    assert classify_visual("photo of a valve") == "image"
