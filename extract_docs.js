const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function extractDocxText(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    let offset = 0;
    
    while (offset < buffer.length - 30) {
      // Look for local file header signature: PK\x03\x04 (0x50 0x4b 0x03 0x04)
      if (buffer[offset] === 0x50 && buffer[offset+1] === 0x4B && buffer[offset+2] === 0x03 && buffer[offset+3] === 0x04) {
        const compMethod = buffer.readUInt16LE(offset + 8);
        const compSize = buffer.readUInt32LE(offset + 18);
        const fileNameLen = buffer.readUInt16LE(offset + 26);
        const extraFieldLen = buffer.readUInt16LE(offset + 28);
        
        const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLen);
        const dataOffset = offset + 30 + fileNameLen + extraFieldLen;
        
        if (fileName === 'word/document.xml') {
          const compData = buffer.slice(dataOffset, dataOffset + compSize);
          let xmlText;
          if (compMethod === 8) {
            xmlText = zlib.inflateRawSync(compData).toString('utf8');
          } else if (compMethod === 0) {
            xmlText = compData.toString('utf8');
          } else {
            return `Unsupported compression method: ${compMethod}`;
          }
          
          // Simple regex-based XML parser to strip tags and recover formatting
          const textWithParagraphs = xmlText
            .replace(/<\/w:p>/g, '\n')
            .replace(/<w:tab\/>/g, '\t')
            .replace(/<w:br\/>/g, '\n')
            .replace(/<[^>]+>/g, '');
            
          return textWithParagraphs.replace(/\n\n\n+/g, '\n\n').trim();
        }
        offset += 30 + fileNameLen + extraFieldLen + compSize;
      } else {
        offset++;
      }
    }
    return "Could not find word/document.xml in DOCX zip container.";
  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
}

function main() {
  const currentDir = __dirname;
  console.log(`Scanning workspace root for planning files in: ${currentDir}`);
  
  const files = {
    "ML_Dataset_Planning_Document_EV.docx": "ML_Dataset_Planning_Document_EV.txt",
    "Frontend_UI_UX_Planning_Document_EV.docx": "Frontend_UI_UX_Planning_Document_EV.txt"
  };
  
  for (const [docName, txtName] of Object.entries(files)) {
    const docPath = path.join(currentDir, docName);
    const txtPath = path.join(currentDir, txtName);
    
    if (fs.existsSync(docPath)) {
      console.log(`Found: ${docName} (${fs.statSync(docPath).size} bytes)`);
      console.log(`Extracting text to ${txtName}...`);
      const text = extractDocxText(docPath);
      fs.writeFileSync(txtPath, text, 'utf8');
      console.log(`Saved: ${txtName}`);
    } else {
      console.log(`Missing: ${docName} in workspace root.`);
    }
  }
}

main();
