#!/usr/bin/env python3
"""
PPT 파일의 슬라이드 수를 계산하는 스크립트

사용법:
    python get_slide_count.py <ppt_file_path>
"""

import sys
from pptx import Presentation


def get_slide_count(ppt_path):
    """PPT 파일의 슬라이드 수를 반환합니다."""
    try:
        prs = Presentation(ppt_path)
        return len(prs.slides)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("Usage: python get_slide_count.py <ppt_file_path>", file=sys.stderr)
        sys.exit(1)
    
    ppt_path = sys.argv[1]
    slide_count = get_slide_count(ppt_path)
    print(slide_count)


if __name__ == "__main__":
    main()
