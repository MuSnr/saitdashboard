import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Upload, Link, X, FileText, Image, Loader2, ExternalLink } from 'lucide-react'
import { uploadAssetDocument, getApiError } from '@/services/api'
import { toast } from 'sonner'

/**
 * DocumentLinkInput — accepts either a URL link OR a file upload (PDF/JPG/PNG).
 * Uploads to Cloudinary via /api/assets/upload-document and stores the returned URL.
 *
 * Props:
 *   value       {string}   - current document_link value
 *   onChange    {fn}       - called with new URL string when link changes or file uploaded
 *   label       {string}   - field label (default: "Invoice / Document Link")
 *   required    {boolean}  - shows red asterisk
 *   hint        {string}   - helper text below field
 */
export default function DocumentLinkInput({
  value = '',
  onChange,
  label = 'Invoice / Document Link',
  required = false,
  hint = '',
}) {
  const [uploading, setUploading] = useState(false)
  const [mode, setMode]           = useState('link') // 'link' | 'file'
  const fileRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadAssetDocument(fd)
      if (result.success && result.url) {
        onChange(result.url)
        toast.success('File uploaded successfully')
        setMode('link') // switch back to link mode showing the URL
      }
    } catch (err) {
      toast.error(getApiError(err) || 'Upload failed — try using a URL link instead')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const clearValue = () => { onChange(''); setMode('link') }

  const getFileIcon = (url) => {
    if (!url) return null
    if (url.match(/\.(jpg|jpeg|png|gif|webp)/i)) return <Image size={14} className="text-nova-teal" />
    return <FileText size={14} className="text-nova-teal" />
  }

  // For Cloudinary raw PDFs, add fl_attachment:false to force inline display
  const getOpenUrl = (url) => {
    if (!url) return url
    // Cloudinary raw resource — add inline flag
    if (url.includes('res.cloudinary.com') && url.includes('/raw/')) {
      return url.replace('/upload/', '/upload/fl_attachment:false/')
    }
    return url
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {/* Toggle between link and file upload */}
        <div className="flex items-center gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`px-2 py-0.5 rounded transition-colors ${mode === 'link' ? 'bg-nova-navy text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Link size={10} className="inline mr-1" />URL
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`px-2 py-0.5 rounded transition-colors ${mode === 'file' ? 'bg-nova-navy text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Upload size={10} className="inline mr-1" />Upload
          </button>
        </div>
      </div>

      {mode === 'link' ? (
        /* URL input mode */
        <div className="relative">
          <Input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://drive.google.com/… or upload a file →"
            className={value ? 'pr-16' : ''}
          />
          {value && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <a href={getOpenUrl(value)} target="_blank" rel="noopener noreferrer"
                className="p-1 rounded text-nova-teal hover:bg-nova-teal/10" title="Open link">
                <ExternalLink size={13} />
              </a>
              <button type="button" onClick={clearValue}
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" title="Clear">
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* File upload mode */
        <div>
          {value ? (
            /* File already uploaded — show it */
            <div className="flex items-center gap-2 px-3 py-2.5 bg-nova-teal/10 border border-nova-teal/30 rounded-lg">
              {getFileIcon(value)}
              <a href={getOpenUrl(value)} target="_blank" rel="noopener noreferrer"
                className="text-xs text-nova-teal truncate flex-1 hover:underline">
                {value.split('/').pop()?.split('?')[0] || 'Uploaded file'}
              </a>
              <button type="button" onClick={clearValue}
                className="text-gray-400 hover:text-red-500 p-0.5 rounded flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-5 cursor-pointer hover:border-nova-green transition-colors bg-gray-50 dark:bg-gray-800/30">
              {uploading ? (
                <><Loader2 size={22} className="animate-spin text-nova-green" />
                  <p className="text-xs text-gray-500">Uploading…</p></>
              ) : (
                <><Upload size={22} className="text-nova-green" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Click to upload PDF, JPG or PNG
                  </p>
                  <p className="text-xs text-gray-400">Max 10 MB</p></>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>
      )}

      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  )
}
