import easyocr
import time

print("Testing EasyOCR initialization...")
start = time.time()
try:
    reader = easyocr.Reader(['en'])
    print(f"EasyOCR initialized successfully in {time.time() - start:.2f} seconds")
except Exception as e:
    print(f"EasyOCR initialization failed: {e}")
