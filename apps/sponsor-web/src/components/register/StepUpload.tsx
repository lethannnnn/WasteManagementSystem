import { useState, useRef } from 'react'
import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import { supabase } from '../../lib/supabase'
import type { RegisterData } from '../../types'

// Point pdfjs at its bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface Props {
  onNext: (extracted: Partial<RegisterData>) => void
}

function parseOcrText(text: string): Partial<RegisterData> {
  console.log('[OCR raw]\n', text)
  const result: Partial<RegisterData> = {}

  // Company name — label may be on a separate line from the value
  const companyMatch =
    text.match(/(?:company name|nama syarikat)[^\n]*\n+[^:\n]*:?\s*([A-Za-z0-9][\w\s.,&()'/-]{2,70})/i) ??
    text.match(/(?:company name|nama syarikat)\s*[:\-]\s*([A-Za-z0-9][\w\s.,&()'/-]{2,70})/i)
  if (companyMatch) result.companyName = companyMatch[1].trim()

  // Registration number — 6–12 digits + optional dash + letters (e.g. 1234567-A)
  const regMatch = text.match(/\b(\d{6,12}[\s\-–]?[A-Z]{0,3})\b/)
  if (regMatch) result.businessRegistration = regMatch[1].replace(/\s/g, '')

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/)
  if (emailMatch) result.email = emailMatch[0]

  // Malaysian phone (+60 or 0 prefix)
  const phoneMatch = text.match(/(?:\+?60|0)[1-9][\d\s-]{7,11}/)
  if (phoneMatch) result.phone = phoneMatch[0].replace(/[\s-]/g, '')

  return result
}

/** Render the first page of a PDF to an ImageData blob for Tesseract */
async function pdfToImageBlob(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)

  const scale = 2 // higher = better OCR accuracy
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width  = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
}

export default function StepUpload({ onNext }: Props) {
  const [file, setFile]             = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress]     = useState(0)
  const [error, setError]           = useState('')
  const inputRef                    = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowed.includes(f.type)) { setError('Please upload a JPG, PNG, or PDF file.'); return }
    if (f.size > 10 * 1024 * 1024) { setError('File must be under 10MB.'); return }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setError('')
  }

  const handleProcess = async () => {
    if (!file) return
    console.log('[OCR] handleProcess called, file:', file.name, file.type)
    setProcessing(true)
    setProgress(0)
    setError('')

    try {
      // Upload document to Supabase storage (anon allowed on sponsor-docs bucket)
      const ext  = file.name.split('.').pop() ?? 'pdf'
      const path = `inquiries/${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('sponsor-docs')
        .upload(path, file, { upsert: false })
      if (uploadErr) console.warn('[upload]', uploadErr.message)

      // For PDFs: render first page to image, then OCR the image
      const ocrSource = file.type === 'application/pdf'
        ? await pdfToImageBlob(file)
        : file

      const { data: { text } } = await Tesseract.recognize(ocrSource, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })

      const extracted = parseOcrText(text)
      onNext({ docUrl: uploadErr ? file.name : path, ...extracted })
    } catch (e: any) {
      console.log('[OCR error]', e)
      setError('OCR failed: ' + (e.message ?? 'unknown error') + '. You can fill in details manually.')
      onNext({ docUrl: '' })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="sp-step-card">
      <h2>Upload Business Registration Document</h2>
      <p className="sp-step-desc">
        Upload your SSM certificate or official business registration document.
        We'll automatically extract your company details for you to verify.
      </p>

      <div
        className={`sp-upload-zone${file ? ' has-file' : ''}`}
        onClick={() => !processing && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        <input
          ref={inputRef}
          type="file"
          id="doc-upload"
          name="doc-upload"
          accept=".jpg,.jpeg,.png,.pdf"
          hidden
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="sp-upload-selected">
            <svg className="sp-upload-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="sp-upload-filename">{file.name}</span>
            <span className="sp-upload-change">Click to change</span>
          </div>
        ) : (
          <div className="sp-upload-prompt">
            <svg className="sp-upload-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            <span>Drag & drop or click to upload</span>
            <span className="sp-upload-hint">JPG, PNG, or PDF — max 10MB</span>
          </div>
        )}
      </div>

      {previewUrl && file && (
        <div className="sp-doc-preview">
          <div className="sp-doc-preview-label">Document Preview</div>
          {file.type === 'application/pdf' ? (
            <iframe src={previewUrl} className="sp-doc-preview-frame" title="Document preview" />
          ) : (
            <img src={previewUrl} alt="Document preview" className="sp-doc-preview-img" />
          )}
        </div>
      )}

      {error && <div className="sp-form-error">{error}</div>}

      {processing && (
        <div className="sp-ocr-progress">
          <div className="sp-progress-bar">
            <div className="sp-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>Extracting text… {progress}%</span>
        </div>
      )}

      <div className="sp-step-actions">
        <button
          className="sp-btn-primary"
          disabled={!file || processing}
          onClick={handleProcess}
        >
          {processing ? 'Processing…' : 'Extract & Continue'}
        </button>
      </div>
    </div>
  )
}
