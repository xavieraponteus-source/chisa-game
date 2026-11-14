FROM python:3.12-slim-bookworm
COPY --from=oven/bun:1.4.2 /usr/local/bin/bun /usr/local/bin/bun
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa tesseract-ocr-jpn fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY services/foxpdf-integrity/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY services/foxpdf-integrity/engine.py services/foxpdf-integrity/server.py ./integrity/
COPY services/foxpdf-web/server.js ./web/server.js
COPY services/foxpdf-web/start.sh ./start.sh
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata PYTHONUNBUFFERED=1
RUN useradd --create-home foxpdf
USER foxpdf
CMD ["bash","/app/start.sh"]
