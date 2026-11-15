import os, hmac, json, threading
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response
from engine import EngineError, inspect_pdf, edit_run, redact_image_copy, MAX_BYTES
from layout import edit_paragraph
from operations import search_pdf, replace_text, move_text, compare_pdfs

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
lock = threading.Lock()

@app.get("/health")
def health():
    return {"ok":True,"engine":"FoxPDF Integrity","version":"1.3","stateless":True}

def authorize(token):
    expected = os.environ.get("FOXPDF_API_TOKEN", "")
    if not expected or not hmac.compare_digest(token or "", expected):
        raise HTTPException(401, "Unauthorized")

def uploaded(file):
    try:
        data = file.file.read(MAX_BYTES + 1)
    finally:
        file.file.close()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "PDF must be smaller than 20 MB")
    return data

@app.post("/inspect")
def inspect(file: UploadFile = File(...), x_foxpdf_internal_token: str = Header(default="")):
    authorize(x_foxpdf_internal_token)
    if not lock.acquire(blocking=False): raise HTTPException(429, "Engine is busy; retry shortly")
    try:
        return inspect_pdf(uploaded(file))
    except EngineError as exc:
        raise HTTPException(422, str(exc))
    finally:
        lock.release()

@app.post("/process")
def process(file: UploadFile = File(...), operation: str = Form(...), params: str = Form("{}"),
            x_foxpdf_internal_token: str = Header(default="")):
    authorize(x_foxpdf_internal_token)
    if not lock.acquire(blocking=False): raise HTTPException(429, "Engine is busy; retry shortly")
    try:
        try: options = json.loads(params)
        except ValueError: raise EngineError("Invalid operation parameters")
        if not isinstance(options, dict): raise EngineError("Invalid operation parameters")
        data = uploaded(file)
        if operation == "edit_run": output, report = edit_run(data, options)
        elif operation == "edit_paragraph": output, report = edit_paragraph(data, options)
        elif operation == "replace_text": output, report = replace_text(data, options)
        elif operation == "move_text": output, report = move_text(data, options)
        elif operation == "redact_image_copy": output, report = redact_image_copy(data, options)
        else: raise EngineError("Unsupported operation")
        return Response(output, media_type="application/pdf", headers={
            "Content-Disposition":'attachment; filename="FoxPDF-verified-copy.pdf"',
            "X-FoxPDF-Details":json.dumps(report, ensure_ascii=True, separators=(",", ":")),
            "Cache-Control":"no-store"})
    except EngineError as exc:
        raise HTTPException(422, str(exc))
    except Exception:
        raise HTTPException(422, "The engine could not safely complete this operation")
    finally:
        lock.release()

@app.post("/search")
def search(file: UploadFile = File(...), params: str = Form("{}"),
           x_foxpdf_internal_token: str = Header(default="")):
    authorize(x_foxpdf_internal_token)
    if not lock.acquire(blocking=False): raise HTTPException(429, "Engine is busy; retry shortly")
    try:
        options=json.loads(params)
        if not isinstance(options,dict): raise EngineError("Invalid search parameters")
        return search_pdf(uploaded(file),options)
    except (EngineError,ValueError) as exc: raise HTTPException(422,str(exc))
    finally: lock.release()

@app.post("/compare")
def compare(file: UploadFile = File(...), other: UploadFile = File(...),
            x_foxpdf_internal_token: str = Header(default="")):
    authorize(x_foxpdf_internal_token)
    if not lock.acquire(blocking=False): raise HTTPException(429,"Engine is busy; retry shortly")
    try:
        first,second=uploaded(file),uploaded(other)
        if len(first)+len(second)>MAX_BYTES: raise HTTPException(413,"The two PDFs together must be smaller than 20 MB")
        return compare_pdfs(first,second)
    except EngineError as exc: raise HTTPException(422,str(exc))
    finally: lock.release()
