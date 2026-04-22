#!/usr/bin/env python3
"""Convert existing release credits from strings to lists using regex."""

import re
from pathlib import Path

RELEASES_DIR = Path("/Users/oysterai/oysterdale-site/releases")

def convert_credits_in_file(filepath):
    """Convert credits section from strings to lists."""
    print(f"\nProcessing: {filepath.name}")
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Find credits section
    credits_match = re.search(r'(^credits:\n)(.*?)(?=\n\w+:|\n---|\Z)', content, re.MULTILINE | re.DOTALL)
    if not credits_match:
        print("  No credits section found")
        return False
    
    credits_section = credits_match.group(2)
    
    # Check if already converted (contains list items)
    if re.search(r'^\s+- ', credits_section, re.MULTILINE):
        print("  Already in list format")
        return False
    
    # Convert each credit line from "key: value" to "key:\n  - value"
    new_credits = []
    for line in credits_section.strip().split('\n'):
        line = line.rstrip()
        if not line or line.startswith('#'):
            new_credits.append(line)
            continue
        
        match = re.match(r'^(\s+)(\w+):\s*(.+)$', line)
        if match:
            indent, key, value = match.groups()
            new_credits.append(f"{indent}{key}:")
            new_credits.append(f"{indent}  - {value}")
            print(f"  {key}: '{value}' → list")
        else:
            new_credits.append(line)
    
    new_credits_text = '\n'.join(new_credits) + '\n'
    
    # Replace in content
    new_content = content[:credits_match.start(2)] + new_credits_text + content[credits_match.end():]
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"  ✓ Updated")
    return True

def main():
    md_files = sorted(RELEASES_DIR.glob("*.md"))
    print(f"Found {len(md_files)} release files")
    
    updated = 0
    for filepath in md_files:
        if convert_credits_in_file(filepath):
            updated += 1
    
    print(f"\n{'='*50}")
    print(f"Updated {updated} files")
    
    if updated > 0:
        print("\nReady to commit and push!")

if __name__ == "__main__":
    main()
