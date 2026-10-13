'use client'
import { useRef, useState, useEffect } from 'react'

export default function CameraCapture({ onClose, onVideoReady }: { onClose: () => void, onVideoReady: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recording, setRecording] = useState(false)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

  useEffect(() => {
    startCamera(facing)
    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [facing])

  const startCamera = async (mode: 'user' | 'environment') => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
    }
    try {
      let s: MediaStream
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: 720, height: 1280 },
          audio: true
        })
      } catch {
        try {
          s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: true
          })
        } catch {
          try {
            s = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            })
          } catch {
            s = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            })
          }
        }
      }
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        await videoRef.current.play().catch(() => {})
      }
    } catch (e: any) {
      console.error(e)
      if (e.name === 'NotAllowedError') {
        alert('Você precisa clicar em PERMITIR na janelinha da câmera')
      } else {
        alert(`Erro câmera: ${e.name} - ${e.message}`)
      }
    }
  }

  const startRec = () => {
    if (!stream) return
    const chunks: Blob[] = []
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm' })
    mr.ondataavailable = (ev) => chunks.push(ev.data)
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      setRecordedBlob(blob)
      setPreviewUrl(URL.createObjectURL(blob))
    }
    mr.start()
    mediaRecorderRef.current = mr
    setRecording(true)
    setTimeout(() => {
      if (mr.state === 'recording') stopRec()
    }, 30000)
  }

  const stopRec = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const confirm = () => {
    if (!recordedBlob) return
    const file = new File([recordedBlob], `dengo-${Date.now()}.webm`, { type: 'video/webm' })
    onVideoReady(file)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 999, display: 'flex', flexDirection: 'column' }}>
      {!previewUrl? (
        <>
          <video ref={videoRef} autoPlay playsInline muted style={{ flex: 1, objectFit: 'cover', transform: facing === 'user'? 'scaleX(-1)' : 'none' }} />
          <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000' }}>
            <button onClick={onClose} style={{ color: '#fff', background: 'none', border: 'none', fontSize: 22 }}>✕</button>

            <button onClick={recording? stopRec : startRec} style={{ width: 72, height: 72, borderRadius: 99, background: recording? '#FE2C55' : '#FFE600', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {recording? (
                <div style={{ width: 24, height: 24, background: '#fff', borderRadius: 4 }} />
              ) : (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              )}
            </button>

            <button onClick={() => setFacing(f => f === 'user'? 'environment' : 'user')} style={{ color: '#fff', background: '#222', border: 'none', borderRadius: 99, width: 40, height: 40 }}>🔄</button>
          </div>
          {recording && <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#FE2C55', color: '#fff', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 900 }}>● REC</div>}
        </>
      ) : (
        <>
          <video src={previewUrl} autoPlay loop playsInline style={{ flex: 1, objectFit: 'cover' }} />
          <div style={{ padding: 20, display: 'flex', gap: 12, background: '#000' }}>
            <button onClick={() => { setPreviewUrl(null); setRecordedBlob(null); startCamera(facing) }} style={{ flex: 1, padding: 14, borderRadius: 99, background: '#222', color: '#fff', border: 'none', fontWeight: 700 }}>Refazer</button>
            <button onClick={confirm} style={{ flex: 1, padding: 14, borderRadius: 99, background: '#FFE600', color: '#000', border: 'none', fontWeight: 900 }}>Usar vídeo</button>
          </div>
        </>
      )}
    </div>
  )
}