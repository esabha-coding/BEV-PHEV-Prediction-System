# -*- coding: utf-8 -*-
"""
Helper script to extract text from local DOCX planning files in the workspace root.
Uses only python standard library modules (zipfile and xml.etree).
Run using: python extract_docs.py
"""

import os
import zipfile
import xml.etree.ElementTree as ET

def extract_text_from_docx(docx_path):
    """Extracts text from a .docx file by reading word/document.xml inside the zip package."""
    try:
        with zipfile.ZipFile(docx_path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # Namespace map
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            text_runs = []
            for elem in root.iter():
                if elem.tag.endswith('t'):
                    if elem.text:
                        text_runs.append(elem.text)
                elif elem.tag.endswith('p') or elem.tag.endswith('br') or elem.tag.endswith('cr'):
                    text_runs.append('\n')
                elif elem.tag.endswith('tab'):
                    text_runs.append('\t')
                    
            full_text = "".join(text_runs)
            while '\n\n\n' in full_text:
                full_text = full_text.replace('\n\n\n', '\n\n')
            return full_text.strip()
    except Exception as e:
        return f"Error extracting text from {docx_path}: {str(e)}"

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Scanning workspace root for planning files in: {current_dir}")
    
    files = {
        "ML_Dataset_Planning_Document_EV.docx": "ML_Dataset_Planning_Document_EV.txt",
        "Frontend_UI_UX_Planning_Document_EV.docx": "Frontend_UI_UX_Planning_Document_EV.txt"
    }
    
    for doc_name, txt_name in files.items():
        doc_path = os.path.join(current_dir, doc_name)
        txt_path = os.path.join(current_dir, txt_name)
        
        if os.path.exists(doc_path):
            print(f"Found: {doc_name} (size: {os.path.getsize(doc_path)} bytes)")
            print(f"Extracting text to {txt_name}...")
            text = extract_text_from_docx(doc_path)
            
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"Saved: {txt_name}")
        else:
            print(f"Missing: {doc_name} in workspace root. Please ensure it is present.")

if __name__ == "__main__":
    main()
