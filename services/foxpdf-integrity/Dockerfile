FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa tesseract-ocr-jpn fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY engine.py server.py layout.py ./
ENV PYTHONUNBUFFERED=1 TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata
CMD ["sh", "-c", "exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000} --no-access-log"]
