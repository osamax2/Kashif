#!/usr/bin/env python3
"""
Extract Arabic sentences from all mobile TSX files and save to CSV.

Scans all .tsx files under app/ and components/ directories,
finds Arabic text (Unicode range U+0600-U+06FF) on each line,
and writes the results to a CSV file.
"""

import os
import re
import csv
import glob

# Project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Directories containing mobile TSX files
MOBILE_DIRS = [
    os.path.join(PROJECT_ROOT, "app"),
    os.path.join(PROJECT_ROOT, "components"),
]

# Output CSV file
OUTPUT_CSV = os.path.join(PROJECT_ROOT, "scripts", "arabic_sentences.csv")

# Regex to match Arabic text sequences (Arabic Unicode block + common punctuation/spaces between)
# Matches any continuous run of Arabic characters, spaces, digits, and Arabic punctuation
ARABIC_PATTERN = re.compile(r'[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s\d\u060C\u061B\u061F\u0640\u200C\u200D\u200E\u200F!?.,:;٪٫٬]*[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]')

# Also match single Arabic words
SINGLE_ARABIC_WORD = re.compile(r'[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+')


def find_tsx_files():
    """Find all .tsx files in mobile directories."""
    files = []
    for directory in MOBILE_DIRS:
        for root, dirs, filenames in os.walk(directory):
            for filename in filenames:
                if filename.endswith(".tsx"):
                    files.append(os.path.join(root, filename))
    return sorted(files)


def extract_arabic_from_line(line):
    """Extract all Arabic text segments from a line."""
    # First try to find multi-word Arabic phrases
    matches = ARABIC_PATTERN.findall(line)
    
    if not matches:
        # Fall back to single Arabic words
        matches = SINGLE_ARABIC_WORD.findall(line)
    
    # Clean up: strip whitespace from each match
    cleaned = []
    for m in matches:
        m = m.strip()
        if m and len(m) >= 1:
            cleaned.append(m)
    
    return cleaned


def make_relative(filepath):
    """Convert absolute path to project-relative path."""
    return os.path.relpath(filepath, PROJECT_ROOT)


def main():
    tsx_files = find_tsx_files()
    print(f"Found {len(tsx_files)} TSX files to scan")

    rows = []
    total_arabic = 0

    for filepath in tsx_files:
        rel_path = make_relative(filepath)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except Exception as e:
            print(f"  ERROR reading {rel_path}: {e}")
            continue

        file_count = 0
        for line_num, line in enumerate(lines, start=1):
            arabic_texts = extract_arabic_from_line(line)
            for text in arabic_texts:
                rows.append({
                    "file": rel_path,
                    "line": line_num,
                    "arabic_text": text,
                    "full_line": line.strip(),
                })
                file_count += 1

        if file_count > 0:
            print(f"  {rel_path}: {file_count} Arabic texts found")
            total_arabic += file_count

    # Write CSV
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["file", "line", "arabic_text", "full_line"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone! {total_arabic} Arabic texts extracted from {len(tsx_files)} files")
    print(f"CSV saved to: {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
