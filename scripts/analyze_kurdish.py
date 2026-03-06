#!/usr/bin/env python3
"""
Analyze Kurdish translation status from Excel file.
"""
import pandas as pd
from pathlib import Path

# Base path for the project
BASE_PATH = Path(__file__).parent.parent

def main():
    # Read Excel file
    excel_path = Path(__file__).parent / 'Mappe1.xlsx'
    df = pd.read_excel(excel_path)
    
    print(f"📊 Total entries in Excel: {len(df)}")
    
    results = []
    for idx, row in df.iterrows():
        filepath = row['file']
        line_num = int(row['line'])
        kurdish = str(row['Kurdisch_text']) if pd.notna(row['Kurdisch_text']) else ''
        arabic = str(row['arabic_text']) if pd.notna(row['arabic_text']) else ''
        
        try:
            with open(BASE_PATH / filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                if line_num <= len(lines):
                    actual_line = lines[line_num - 1]
                    has_ku = "'ku'" in actual_line or '"ku"' in actual_line
                    has_kurdish_text = kurdish.lower() in actual_line.lower() if kurdish else False
                    has_titleKu = 'titleKu' in actual_line or 'descriptionKu' in actual_line
                    has_Ku_field = 'Ku:' in actual_line or '_ku' in actual_line.lower()
                    
                    results.append({
                        'file': filepath,
                        'line': line_num,
                        'arabic': arabic[:40],
                        'kurdish': kurdish[:40],
                        'has_ku_check': has_ku,
                        'has_kurdish_text': has_kurdish_text,
                        'has_titleKu': has_titleKu,
                        'has_Ku_field': has_Ku_field,
                        'actual_line': actual_line.strip()[:100]
                    })
        except Exception as e:
            print(f"Error reading {filepath}:{line_num}: {e}")
    
    rdf = pd.DataFrame(results)
    
    # Calculate what's done and what needs work
    already_done = rdf['has_ku_check'] | rdf['has_kurdish_text'] | rdf['has_titleKu'] | rdf['has_Ku_field']
    
    print(f"\n✅ Already has Kurdish support: {already_done.sum()}")
    print(f"⚠️  Needs work: {(~already_done).sum()}")
    
    # Show what needs work, grouped by file
    needs_work = rdf[~already_done]
    if len(needs_work) > 0:
        print(f"\n=== Lines needing Kurdish translation ===")
        for filename in needs_work['file'].unique():
            file_rows = needs_work[needs_work['file'] == filename]
            print(f"\n📄 {filename} ({len(file_rows)} lines)")
            for _, row in file_rows.iterrows():
                print(f"  L{row['line']}: '{row['arabic']}' -> '{row['kurdish']}'")
                print(f"    Current: {row['actual_line'][:80]}...")

if __name__ == '__main__':
    main()
