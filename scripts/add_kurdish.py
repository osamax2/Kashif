#!/usr/bin/env python3
"""
Add Kurdish translations to TSX files based on Excel data.
Reads Mappe1.xlsx and adds Kurdish text where missing.
"""
import pandas as pd
import re
import os
from pathlib import Path
from collections import defaultdict

# Base path for the project
BASE_PATH = Path(__file__).parent.parent

def read_file(filepath):
    """Read file and return lines."""
    full_path = BASE_PATH / filepath
    with open(full_path, 'r', encoding='utf-8') as f:
        return f.readlines()

def write_file(filepath, lines):
    """Write lines back to file."""
    full_path = BASE_PATH / filepath
    with open(full_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

def add_kurdish_to_includes(line, arabic_text, kurdish_text):
    """
    Transform: name.includes("Arabic")
    To: name.includes("Arabic") || name.includes("Kurdish")
    """
    # Check if Kurdish is already in the line
    if kurdish_text.lower() in line.lower():
        return line, False
    
    # Pattern: name.includes("Arabic")
    pattern = rf'(name\.includes\(["\']){re.escape(arabic_text)}(["\'])\)'
    
    if re.search(pattern, line):
        # Add Kurdish include after the Arabic one
        replacement = rf'\1{arabic_text}\2) || name.includes("{kurdish_text}")'
        new_line = re.sub(pattern, replacement, line, count=1)
        return new_line, True
    
    return line, False

def add_kurdish_to_ternary(line, arabic_text, kurdish_text):
    """
    Transform: language === 'ar' ? 'Arabic' : 'English'
    To: language === 'ar' ? 'Arabic' : language === 'ku' ? 'Kurdish' : 'English'
    """
    # Check if Kurdish branch already exists
    if "'ku'" in line or '"ku"' in line:
        return line, False
    
    # Pattern: Look for 'ar' ? 'Arabic text' : 'English'
    # This is a simplified pattern - real implementation needs more care
    pattern = rf"('ar'\s*\?\s*['\"`]){re.escape(arabic_text)}(['\"`]\s*:\s*)(['\"`])([^'\"`]+)\3"
    
    match = re.search(pattern, line)
    if match:
        # Insert Kurdish between Arabic and English
        new_line = re.sub(
            pattern,
            rf"\1{arabic_text}\2language === 'ku' ? \3{kurdish_text}\3 : \3\4\3",
            line
        )
        return new_line, True
    
    return line, False

def add_kurdish_to_template_literal(line, arabic_text, kurdish_text):
    """
    Transform template literals with Arabic text.
    This is complex and may need manual review.
    """
    # For now, just flag these for manual review
    if '`' in line and arabic_text in line and 'language' not in line:
        return line, False  # Needs manual review
    
    return line, False

def process_file(filepath, entries):
    """Process a single file with all its translation entries."""
    print(f"\n📄 Processing {filepath}")
    
    try:
        lines = read_file(filepath)
    except FileNotFoundError:
        print(f"  ❌ File not found: {filepath}")
        return 0, 0
    
    changes = 0
    skipped = 0
    
    # Group entries by line number
    by_line = defaultdict(list)
    for entry in entries:
        by_line[entry['line']].append(entry)
    
    for line_num, line_entries in by_line.items():
        idx = line_num - 1  # 0-indexed
        if idx < 0 or idx >= len(lines):
            print(f"  ⚠️ Line {line_num} out of range")
            skipped += len(line_entries)
            continue
        
        original_line = lines[idx]
        current_line = original_line
        
        for entry in line_entries:
            arabic = entry['arabic_text']
            kurdish = entry['Kurdisch_text']
            
            if pd.isna(arabic) or pd.isna(kurdish):
                skipped += 1
                continue
            
            arabic = str(arabic).strip()
            kurdish = str(kurdish).strip()
            
            if not arabic or not kurdish:
                skipped += 1
                continue
            
            # Try different transformation patterns
            new_line, changed = add_kurdish_to_includes(current_line, arabic, kurdish)
            if changed:
                current_line = new_line
                changes += 1
                print(f"  ✅ Line {line_num}: Added includes for '{kurdish}'")
                continue
            
            new_line, changed = add_kurdish_to_ternary(current_line, arabic, kurdish)
            if changed:
                current_line = new_line
                changes += 1
                print(f"  ✅ Line {line_num}: Added ternary for '{kurdish}'")
                continue
            
            # Check if already present
            if kurdish.lower() in current_line.lower():
                skipped += 1
                continue
            
            # Check if Arabic text is in the line
            if arabic not in current_line:
                skipped += 1
                continue
            
            # Flag for manual review
            print(f"  ⚠️ Line {line_num}: Manual review needed for '{arabic}' -> '{kurdish}'")
            skipped += 1
        
        if current_line != original_line:
            lines[idx] = current_line
    
    if changes > 0:
        write_file(filepath, lines)
        print(f"  💾 Saved {changes} changes to {filepath}")
    
    return changes, skipped

def main():
    """Main entry point."""
    # Read Excel file
    excel_path = Path(__file__).parent / 'Mappe1.xlsx'
    df = pd.read_excel(excel_path)
    
    print(f"📊 Loaded {len(df)} translation entries from Excel")
    
    # Group by file
    by_file = df.groupby('file')
    
    total_changes = 0
    total_skipped = 0
    
    for filepath, group in by_file:
        entries = group.to_dict('records')
        changes, skipped = process_file(filepath, entries)
        total_changes += changes
        total_skipped += skipped
    
    print(f"\n{'='*50}")
    print(f"✅ Total changes: {total_changes}")
    print(f"⏭️ Skipped: {total_skipped}")
    print(f"{'='*50}")

if __name__ == '__main__':
    main()
