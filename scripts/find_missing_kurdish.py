#!/usr/bin/env python3
"""
Find entries where Arabic text exists but Kurdish translation is missing.
"""
import pandas as pd
from pathlib import Path

BASE_PATH = Path(__file__).parent.parent

def main():
    excel_path = Path(__file__).parent / 'Mappe1.xlsx'
    df = pd.read_excel(excel_path)
    
    needs_work = []
    
    for idx, row in df.iterrows():
        filepath = row['file']
        arabic = str(row['arabic_text']) if pd.notna(row['arabic_text']) else ''
        kurdish = str(row['Kurdisch_text']) if pd.notna(row['Kurdisch_text']) else ''
        
        if not arabic.strip() or not kurdish.strip():
            continue
        
        try:
            content = open(BASE_PATH / filepath, 'r', encoding='utf-8').read()
            # Check if Arabic exists but Kurdish does not
            if arabic in content and kurdish not in content:
                needs_work.append({
                    'file': filepath,
                    'arabic': arabic,
                    'kurdish': kurdish
                })
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
    
    print(f"Total entries needing work: {len(needs_work)}")
    print(f"\nGrouped by file:")
    
    # Group by file
    from collections import defaultdict
    by_file = defaultdict(list)
    for item in needs_work:
        by_file[item['file']].append(item)
    
    for filepath, items in by_file.items():
        print(f"\n📄 {filepath} ({len(items)} entries)")
        for item in items[:5]:  # Show first 5 per file
            print(f"  '{item['arabic'][:40]}' -> '{item['kurdish'][:40]}'")
        if len(items) > 5:
            print(f"  ... and {len(items) - 5} more")

if __name__ == '__main__':
    main()
