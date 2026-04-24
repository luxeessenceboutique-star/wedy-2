import fitz
import sys

def test_extract(path):
    doc = fitz.open(path)
    text = "\n".join(page.get_text() for page in doc)
    print("--- RAW TEXT START ---")
    print(text[:1500])
    print("--- RAW TEXT END ---")

if __name__ == "__main__":
    test_extract(r"c:\Users\HP\Desktop\platform-RH\backend\uploads\cvs\397cee9a73614d5e8cdc28cb7115143f_mohamed-abounaim-cv.pdf")
