# -*- coding: utf-8 -*-
"""
Helper script to extract text from desktop DOCX planning files.
Uses only python standard library modules (zipfile and xml.etree).
Run using: python extract_docs.py
"""

import os
import glob
import zipfile
import xml.etree.ElementTree as ET

def extract_text_from_docx(docx_path):
    """Extracts text from a .docx file by reading word/document.xml inside the zip package."""
    try:
        with zipfile.ZipFile(docx_path) as docx:
            # Word document XML namespace
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # Namespace map
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            text_runs = []
            for elem in root.iter():
                # Check for text elements
                if elem.tag.endswith('t'):
                    if elem.text:
                        text_runs.append(elem.text)
                # Check for paragraph breaks or tab breaks
                elif elem.tag.endswith('p') or elem.tag.endswith('br') or elem.tag.endswith('cr'):
                    text_runs.append('\n')
                elif elem.tag.endswith('tab'):
                    text_runs.append('\t')
                    
            # Join and return text
            full_text = "".join(text_runs)
            # Normalize excessive newlines
            while '\n\n\n' in full_text:
                full_text = full_text.replace('\n\n\n', '\n\n')
            return full_text.strip()
    except Exception as e:
        return f"Error extracting text from {docx_path}: {str(e)}"

def main():
    desktop_dir = os.path.expanduser("~/Desktop")
    if not os.path.exists(desktop_dir):
        # Fallback to standard Windows paths if expanduser fails
        desktop_dir = "c:/Users/Lenovo/OneDrive/Desktop"
        
    print(f"Scanning desktop for planning files in: {desktop_dir}")
    
    # Define document patterns
    patterns = {
        "ML_Dataset_Planning_Document_EV.txt": [
            "ML_Dataset_Planning_Document_Updated.docx",
            "ML_Dataset_Planning_Document_Churn*.docx",
            "*ML_Dataset_Planning_Document*.docx"
        ],
        "Frontend_UI_UX_Planning_Document_EV.txt": [
            "Professional_Frontend_UI_UX_Planning_Document.docx",
            "Frontend_UI_UX_Planning_Document_Churn*.docx",
            "*Frontend_UI_UX_Planning_Document*.docx"
        ]
    }
    
    for out_name, search_patterns in patterns.items():
        matched_file = None
        for pattern in search_patterns:
            matches = glob.glob(os.path.join(desktop_dir, pattern))
            if matches:
                # Get the largest/most relevant file
                matched_file = sorted(matches, key=os.path.getsize, reverse=True)[0]
                break
                
        if matched_file:
            print(f"Found planning file: {matched_file}")
            print(f"Extracting text to {out_name}...")
            text = extract_text_from_docx(matched_file)
            
            # Save in backend directory
            out_path = os.path.join(os.path.dirname(__file__), out_name)
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"Saved extracted text to: {out_path}")
        else:
            print(f"Could not find any file matching patterns: {search_patterns}")

if __name__ == "__main__":
    main()
