FROM python:3.11-slim

WORKDIR /app

# System deps:
#  - libsndfile1, espeak-ng: audio/TTS
#  - ocrmypdf + tesseract, ghostscript, qpdf, pngquant, unpaper: OCR pipeline
#  - tesseract-ocr-eng: English language data (add more -<lang> packs if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    espeak-ng \
    ocrmypdf \
    tesseract-ocr \
    tesseract-ocr-eng \
    ghostscript \
    qpdf \
    pngquant \
    unpaper \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
