#!/usr/bin/env python3
"""
Add Kurdish translations to TSX files based on Excel data.
This script handles multiple patterns:
1. Ternary: language === 'ar' ? 'Arabic' : 'English' 
   -> language === 'ar' ? 'Arabic' : language === 'ku' ? 'Kurdish' : 'English'
2. Template literals with language checks
3. Data objects with titleAr/titleEn -> add titleKu
"""
import pandas as pd
import re
from pathlib import Path
from collections import defaultdict

BASE_PATH = Path(__file__).parent.parent

def read_file(filepath):
    """Read file and return lines."""
    full_path = BASE_PATH / filepath
    with open(full_path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filepath, content):
    """Write content to file."""
    full_path = BASE_PATH / filepath
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

def add_ku_to_ternary(content, arabic, kurdish):
    """
    Find: language === 'ar' ? 'Arabic text' : 'English'
    Replace with: language === 'ar' ? 'Arabic text' : language === 'ku' ? 'Kurdish text' : 'English'
    """
    # Skip if Kurdish already exists for this text
    if f"'ku' ? '{kurdish}'" in content or f"'ku' ? \"{kurdish}\"" in content:
        return content, 0
    
    changes = 0
    
    # Pattern 1: Single quotes
    # language === 'ar' ? 'Arabic' : 'English'
    pattern1 = rf"(language\s*===\s*'ar'\s*\?\s*')((?:[^'\\]|\\.)*)('\s*:\s*')((?:[^'\\]|\\.)*)'(?!\s*:)"
    
    def replace_match1(m):
        nonlocal changes
        ar_prefix, ar_text, colon, en_text = m.groups()
        if arabic in ar_text:
            changes += 1
            return f"{ar_prefix}{ar_text}{colon}language === 'ku' ? '{kurdish}' : '{en_text}'"
        return m.group(0)
    
    content = re.sub(pattern1, replace_match1, content)
    
    # Pattern 2: Double quotes
    pattern2 = rf'(language\s*===\s*["\']ar["\']\s*\?\s*")((?:[^"\\]|\\.)*)(["]\s*:\s*")((?:[^"\\]|\\.)*)\"(?!\s*:)'
    
    def replace_match2(m):
        nonlocal changes
        ar_prefix, ar_text, colon, en_text = m.groups()
        if arabic in ar_text:
            changes += 1
            return f'{ar_prefix}{ar_text}{colon}language === \'ku\' ? "{kurdish}" : "{en_text}"'
        return m.group(0)
    
    content = re.sub(pattern2, replace_match2, content)
    
    return content, changes

def add_ku_to_includes(content, arabic, kurdish):
    """
    Find: name.includes("Arabic")
    Add: || name.includes("Kurdish")
    """
    # Skip if Kurdish already in includes
    if f'includes("{kurdish}")' in content or f"includes('{kurdish}')" in content:
        return content, 0
    
    changes = 0
    
    # Pattern: name.includes("Arabic") at end of condition (before closing paren or return)
    pattern = rf'(name\.includes\(["\']){re.escape(arabic)}(["\'])\)(\s*(?:\)\s*return|\|\||&&|$))'
    
    def replace_match(m):
        nonlocal changes
        prefix, quote, suffix = m.groups()
        changes += 1
        return f'{prefix}{arabic}{quote}) || name.includes("{kurdish}"){suffix}'
    
    content = re.sub(pattern, replace_match, content)
    
    return content, changes

def add_titleKu(content, arabic, kurdish):
    """
    Find: titleAr: "Arabic",
          titleEn: "English",
    After titleEn, add: titleKu: "Kurdish",
    """
    # Check if this is a data structure with titleAr
    if 'titleAr' not in content:
        return content, 0
    
    # Skip if titleKu already exists near this Arabic text
    if 'titleKu' in content:
        # Check if Kurdish text is already there
        if kurdish in content:
            return content, 0
    
    changes = 0
    
    # Pattern: titleAr: "Arabic",\n        titleEn: "English",
    # We'll add titleKu after titleEn
    pattern = rf'(titleAr:\s*["\']){re.escape(arabic)}(["\'],\s*\n\s*titleEn:\s*["\'][^"\']*["\'],)'
    
    def replace_match(m):
        nonlocal changes
        prefix, suffix = m.groups()
        changes += 1
        # Insert titleKu after titleEn line
        return f'{prefix}{arabic}{suffix}\n        titleKu: "{kurdish}",'
    
    content = re.sub(pattern, replace_match, content)
    
    return content, changes

def add_descriptionKu(content, arabic, kurdish):
    """
    Find: descriptionAr: "Arabic",
          descriptionEn: "English",
    After descriptionEn, add: descriptionKu: "Kurdish",
    """
    if 'descriptionAr' not in content:
        return content, 0
    
    if 'descriptionKu' in content and kurdish in content:
        return content, 0
    
    changes = 0
    
    # Pattern for descriptionAr/En
    pattern = rf'(descriptionAr:\s*["\']){re.escape(arabic)}(["\'],\s*\n\s*descriptionEn:\s*["\'][^"\']*["\'],)'
    
    def replace_match(m):
        nonlocal changes
        prefix, suffix = m.groups()
        changes += 1
        return f'{prefix}{arabic}{suffix}\n        descriptionKu: "{kurdish}",'
    
    content = re.sub(pattern, replace_match, content)
    
    return content, changes

def process_file(filepath, entries):
    """Process a single file with all its translation entries."""
    print(f"\n📄 Processing {filepath}")
    
    try:
        content = read_file(filepath)
    except FileNotFoundError:
        print(f"  ❌ File not found: {filepath}")
        return 0, 0
    
    original_content = content
    total_changes = 0
    skipped = 0
    
    for entry in entries:
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
        
        # Skip if this exact Kurdish translation is already present
        if kurdish in content:
            skipped += 1
            continue
        
        # Try different transformation patterns
        content, changes = add_ku_to_ternary(content, arabic, kurdish)
        if changes > 0:
            total_changes += changes
            print(f"  ✅ Ternary: '{arabic[:20]}...' -> '{kurdish[:20]}...'")
            continue
        
        content, changes = add_ku_to_includes(content, arabic, kurdish)
        if changes > 0:
            total_changes += changes
            print(f"  ✅ Includes: '{arabic[:20]}...' -> '{kurdish[:20]}...'")
            continue
        
        content, changes = add_titleKu(content, arabic, kurdish)
        if changes > 0:
            total_changes += changes
            print(f"  ✅ TitleKu: '{arabic[:20]}...' -> '{kurdish[:20]}...'")
            continue
        
        content, changes = add_descriptionKu(content, arabic, kurdish)
        if changes > 0:
            total_changes += changes
            print(f"  ✅ DescriptionKu: '{arabic[:20]}...' -> '{kurdish[:20]}...'")
            continue
        
        # Check if Arabic exists in file
        if arabic not in content:
            skipped += 1
            continue
        
        # Flag for manual review
        print(f"  ⚠️ Manual: '{arabic[:30]}...' -> '{kurdish[:30]}...'")
        skipped += 1
    
    if content != original_content:
        write_file(filepath, content)
        print(f"  💾 Saved {total_changes} changes to {filepath}")
    
    return total_changes, skipped

def main():
    """Main entry point."""
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
    print(f"⏭️ Skipped/Manual: {total_skipped}")
    print(f"{'='*50}")

if __name__ == '__main__':
    main()
