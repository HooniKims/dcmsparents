from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Iterable

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = next(ROOT.glob("*.pdf"))
PAGES_DIR = ROOT / "assets" / "pages"
DATA_PATH = ROOT / "page-data.js"
SCALE = 1.8

SECTION_DEFS = [
    {
        "id": "violence",
        "tab": "Ⅰ 학교폭력",
        "numeral": "Ⅰ",
        "title": "학교폭력 예방교육",
        "description": "학교폭력의 개념, 가정에서의 예방 수칙, 피해·가해 징후, 관계회복 숙려제와 사안 처리 절차를 안내합니다.",
        "pages": [2, 3, 4],
    },
    {
        "id": "teacher-protection",
        "tab": "Ⅱ 교육활동",
        "numeral": "Ⅱ",
        "title": "교육활동 침해행위 예방교육",
        "description": "교육활동 보호 제도 변화, 침해 유형과 조치 기준, 학부모의 학교 참여와 소통 원칙을 정리했습니다.",
        "pages": [5, 6, 7, 8],
    },
    {
        "id": "pre-learning",
        "tab": "Ⅲ 선행학습",
        "numeral": "Ⅲ",
        "title": "선행학습 예방교육",
        "description": "선행학습 관련 자료와 Q&A, 학부모가 학교 교육과정을 신뢰하고 지원하는 방법을 담고 있습니다.",
        "pages": [9, 10],
    },
    {
        "id": "child-abuse",
        "tab": "Ⅳ 아동학대",
        "numeral": "Ⅳ",
        "title": "아동학대 예방교육",
        "description": "아동학대의 개념과 유형, 의심 징후, 신고와 조치 절차, 가정 내 예방 수칙을 확인할 수 있습니다.",
        "pages": [11, 12],
    },
    {
        "id": "digital-violence",
        "tab": "Ⅴ 디지털 성폭력",
        "numeral": "Ⅴ",
        "title": "디지털 성폭력 예방교육",
        "description": "디지털 성폭력의 유형, 양육자의 대화법, 피해 상황에서의 보호와 신고 절차를 다룹니다.",
        "pages": [13, 14, 15, 16],
    },
    {
        "id": "human-rights",
        "tab": "Ⅵ 인권교육",
        "numeral": "Ⅵ",
        "title": "인권교육",
        "description": "학생 인권의 기본 이해, 학생인권 상담 및 구제기관, 보호자를 위한 인권 자료를 정리했습니다.",
        "pages": [17, 18, 19],
    },
    {
        "id": "gambling",
        "tab": "Ⅶ 학생도박",
        "numeral": "Ⅶ",
        "title": "학생도박 예방교육",
        "description": "학생 도박 관련 법령과 현황, 가정에서의 예방 방법, 외부 학습 자료와 상담 자원을 모았습니다.",
        "pages": [20, 21],
    },
    {
        "id": "integrity",
        "tab": "Ⅷ 청렴교육",
        "numeral": "Ⅷ",
        "title": "청렴교육",
        "description": "청렴의 의미와 가정에서 실천할 수 있는 방법, 학교 현장의 부패 신고 채널을 소개합니다.",
        "pages": [22, 23],
    },
    {
        "id": "equality",
        "tab": "Ⅸ 양성평등",
        "numeral": "Ⅸ",
        "title": "양성평등교육",
        "description": "성차별과 고정관념을 점검하고, 가정 내에서 실천할 수 있는 양성평등 문화를 안내합니다.",
        "pages": [24, 25],
    },
    {
        "id": "smoking-drugs",
        "tab": "Ⅹ 흡연·마약",
        "numeral": "Ⅹ",
        "title": "흡연 및 마약 예방교육",
        "description": "청소년 흡연의 위해성과 부모의 역할, 마약 예방 자료와 참고 사이트를 함께 제공합니다.",
        "pages": [26, 27, 28],
    },
    {
        "id": "infection",
        "tab": "Ⅺ 감염병",
        "numeral": "Ⅺ",
        "title": "감염병 예방교육",
        "description": "학교에서 자주 발생하는 감염병의 증상, 등교중지 기준, 전파 예방 수칙을 정리했습니다.",
        "pages": [29],
    },
    {
        "id": "resources",
        "tab": "참고 자료",
        "numeral": "참고",
        "title": "학부모 법정 의무교육 동영상 강의 안내",
        "description": "분야별 외부 강의 링크와 QR 코드를 원본 문서 그대로 확인할 수 있도록 모았습니다.",
        "pages": [30, 31, 32, 33],
    },
]


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def normalize_text(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value.replace("\u00ad", "").strip())
    return cleaned


def format_link_label(label: str, uri: str) -> str:
    label = normalize_text(label)
    if not label:
        label = uri
    if label.startswith("http"):
        label = re.sub(r"^https?://", "", label).rstrip("/")
    if len(label) > 64:
        label = f"{label[:61]}..."
    return label


def rect_union(rects: Iterable[fitz.Rect]) -> fitz.Rect:
    iterator = iter(rects)
    first = fitz.Rect(next(iterator))
    for rect in iterator:
        first |= rect
    return first


def rect_intersection_area(a: fitz.Rect, b: fitz.Rect) -> float:
    intersection = fitz.Rect(a)
    intersection &= b
    if intersection.is_empty:
        return 0.0
    return intersection.width * intersection.height


def group_link_rects(rects: list[fitz.Rect]) -> list[list[fitz.Rect]]:
    ordered = sorted(rects, key=lambda item: (round(item.y0, 2), round(item.x0, 2)))
    groups: list[list[fitz.Rect]] = []
    for rect in ordered:
        if not groups:
            groups.append([rect])
            continue
        previous = groups[-1][-1]
        vertical_gap = rect.y0 - previous.y1
        aligned = abs(rect.x0 - previous.x0) <= 18 or abs(rect.x1 - previous.x1) <= 18
        if vertical_gap <= 12 and aligned:
            groups[-1].append(rect)
        else:
            groups.append([rect])
    return groups


def extract_label(words: list[tuple], rect: fitz.Rect, uri: str) -> str:
    hit_words: list[tuple[float, str]] = []
    for word in words:
        word_rect = fitz.Rect(word[:4])
        if rect_intersection_area(word_rect, rect) > 0:
            hit_words.append((word_rect.y0 * 1000 + word_rect.x0, word[4]))
    if not hit_words:
        return format_link_label("", uri)
    ordered = " ".join(text for _, text in sorted(hit_words, key=lambda item: item[0]))
    return format_link_label(ordered, uri)


def build_page_entry(page_number: int, page: fitz.Page) -> dict:
    page_width = page.rect.width
    page_height = page.rect.height
    image_path = PAGES_DIR / f"page-{page_number:02d}.png"
    if not image_path.exists():
        pixmap = page.get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), alpha=False)
        image_path.parent.mkdir(parents=True, exist_ok=True)
        pixmap.save(image_path)

    words = page.get_text("words")
    raw_links: dict[str, list[fitz.Rect]] = {}
    for link in page.get_links():
        uri = link.get("uri")
        rect = link.get("from")
        if not uri or not rect:
            continue
        raw_links.setdefault(uri, []).append(fitz.Rect(rect))

    grouped_links = []
    for uri, rects in raw_links.items():
        for rect_group in group_link_rects(rects):
            union = rect_union(rect_group)
            if page_number >= 30:
                union.x1 = page_width - 12
                union.y0 = clamp(union.y0 - 6, 0, page_height)
                union.y1 = clamp(union.y1 + 6, 0, page_height)
            else:
                union.x0 = clamp(union.x0 - 3, 0, page_width)
                union.x1 = clamp(union.x1 + 3, 0, page_width)
                union.y0 = clamp(union.y0 - 3, 0, page_height)
                union.y1 = clamp(union.y1 + 3, 0, page_height)
            grouped_links.append(
                {
                    "uri": uri,
                    "label": extract_label(words, union, uri),
                    "x": round(union.x0 / page_width, 6),
                    "y": round(union.y0 / page_height, 6),
                    "w": round(union.width / page_width, 6),
                    "h": round(union.height / page_height, 6),
                }
            )

    return {
        "number": page_number,
        "image": image_path.relative_to(ROOT).as_posix(),
        "alt": f"2026년 학부모 법정 의무교육 안내 자료 {page_number}페이지",
        "links": sorted(grouped_links, key=lambda item: (item["y"], item["x"])),
    }


def section_links(pages: list[dict]) -> list[dict]:
    links: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for page in pages:
        for link in page["links"]:
            key = (link["uri"], link["label"])
            if key in seen:
                continue
            seen.add(key)
            links.append({"uri": link["uri"], "label": link["label"], "page": page["number"]})
    return links


def main() -> None:
    doc = fitz.open(PDF_PATH)
    page_entries = {number: build_page_entry(number, doc.load_page(number - 1)) for number in range(1, doc.page_count + 1)}

    sections = []
    for definition in SECTION_DEFS:
        pages = [page_entries[number] for number in definition["pages"]]
        sections.append(
            {
                **definition,
                "pageRange": f"{definition['pages'][0]}-{definition['pages'][-1]}",
                "pageCount": len(definition["pages"]),
                "links": section_links(pages),
                "pages": pages,
            }
        )

    site_data = {
        "title": "2026년 학부모 법정 의무교육 안내 자료",
        "school": "등촌중학교",
        "subtitle": "학부모 총회 웹 안내자료",
        "pdfPath": PDF_PATH.name,
        "cover": page_entries[1],
        "coverLinks": section_links([page_entries[1]]),
        "sections": sections,
    }

    DATA_PATH.write_text(
        "window.PARENT_GUIDE_DATA = " + json.dumps(site_data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
