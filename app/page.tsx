'use client'
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import { useState, useRef, useEffect } from 'react'
import { supabase } from './lib/supabase'
import CameraCapture from './components/CameraCapture'

type Comment = { id: number, user: string, avatar: string, text: string }
type Video = { id: number, src: string, question: string, level: string, likes: number, comments: number, saves: number, shares: number, liked: boolean, saved: boolean, following: boolean, commentsList: Comment[] }

const EMOJIS = ["❤️","😂","😍","😮","😢","🙏","🔥","👏","😊","🥺","🤔","😱","💚","🌿","🍄","🍃","😳","👌","✨","💀"]

export default function Page(){
  const [videos, setVideos] = useState<Video[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<HTMLVideoElement[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const drawerInputRef = useRef<HTMLInputElement>(null)
  const rightInputRef = useRef<HTMLInputElement>(null)

  useEffect(()=>{
    const load = async ()=>{
      const { data } = await supabase.from('videos').select('*').order('created_at', {ascending:false})
      if(data && data.length > 0){
        const fromDb: Video[] = data.map((row:any)=>({
          id: row.id, src: row.video_url, question: row.caption || "NOVO VIDEO", level: row.level || 'NOVO', likes: row.likes_count || 0, comments: 0, saves: 0, shares: 0, liked: false, saved: false, following: false, commentsList: []
        }))
        setVideos(fromDb)
      }
    }
    load()
  },[])

  useEffect(()=>{
    const c = containerRef.current
    if(!c) return
    const onScroll = ()=>{
      const idx = Math.round(c.scrollTop / c.clientHeight)
      if(idx >=0 && idx < videos.length) setCurrentIdx(idx)
    }
    c.addEventListener('scroll', onScroll, {passive:true})
    return ()=> c.removeEventListener('scroll', onScroll)
  },[videos.length])

  useEffect(()=>{
    videoRefs.current.forEach((v,i)=>{
      if(!v) return; v.muted=isMuted;
      if(i===currentIdx) v.play().catch(()=>{}); else v.pause()
    })
  },[currentIdx, isMuted])

  const current = videos[currentIdx]
  const format = (n:number)=> n>=1000? (n/1000).toFixed(1).replace('.0','')+'K' : n.toString()
  const isLoading = videos.length === 0

  const toggleLike = (idx:number)=> setVideos(v=> v.map((vid,i)=> i===idx? {...vid, liked:!vid.liked, likes: vid.liked? Number(vid.likes)-1 : Number(vid.likes)+1 } : vid))
const toggleSave = (idx:number)=> setVideos(v=> v.map((vid,i)=> i===idx? {...vid, saved:!vid.saved, saves: vid.saved? Number(vid.saves)-1 : Number(vid.saves)+1 } : vid))
  const toggleFollow = (idx:number)=> setVideos(v=> v.map((vid,i)=> i===idx? {...vid, following:!vid.following} : vid))

  const openComments = ()=>{
    setShowDrawer(true)
    setTimeout(()=>{
      if(window.innerWidth <= 1100) drawerInputRef.current?.focus()
      else rightInputRef.current?.focus()
    },200)
  }

  const addComment = ()=>{
    if(!newComment.trim() ||!current) return
    const c: Comment = { id: Date.now(), user: 'Você', avatar: 'https://i.pravatar.cc/100?img=31', text: newComment }
    setVideos(v=> v.map((vid,i)=> i===currentIdx? {...vid, commentsList:[c,...vid.commentsList], comments: vid.comments+1} : vid))
    setNewComment('')
    setShowEmojis(false)
  }

  const insertEmoji = (emoji: string) => setNewComment(prev => prev + emoji)

  const handleShare = async (idx:number)=>{
    const url = window.location.href + '#video-' + videos[idx].id
    if(navigator.share){ try{ await navigator.share({ title: 'DENGO', text: videos[idx].question, url }) }catch{} }
    setVideos(v=> v.map((vid,i)=> i===idx? {...vid, shares: vid.shares+1} : vid))
  }

  const uploadFile = async (file: File) => {
    if(file.size > 30 * 1024 * 1024){ alert("Vídeo muito grande! Use até 30MB"); return }
    setUploading(true)
    setShowUploadOptions(false)
    const timeoutId = setTimeout(()=>{ alert("Demorou demais, cancelei. Tente um vídeo menor."); setUploading(false) }, 20000)
    try{
      const fileName = `${Date.now()}-${file.name.replace(/\s/g,'_')}`
      const { error } = await supabase.storage.from('videos').upload(fileName, file, { upsert:true })
      if (error) throw error
      const { data } = supabase.storage.from('videos').getPublicUrl(fileName)
      const frases = ["Será que essa planta é venenosa?","Essa fruta pode comer?","Que bicho é esse?","Pode comer cru?","Essa planta queima a pele?"]
      const { data: inserted, error: dbErr } = await supabase.from('videos').insert([{ video_url: data.publicUrl, caption: frases[Math.floor(Math.random()*frases.length)] }]).select().single()
      if (dbErr) throw dbErr
      const nv: Video = { id: inserted.id, src: inserted.video_url, question: inserted.caption, level: "NOVO", likes: 0, comments: 0, saves: 0, shares: 0, liked: false, saved: false, following: false, commentsList: [] }
      setVideos(prev => { const novaLista = [nv,...prev]; setTimeout(() => { setCurrentIdx(0); containerRef.current?.scrollTo({ top: 0, behavior: 'instant' as any }) }, 80); return novaLista })
    } catch(e:any){
      console.log(e); alert("Erro: "+(e.message||e))
    } finally {
      clearTimeout(timeoutId)
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (isLoading) { return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'black', color:'white'}}>Carregando...</div> }
  if (!current) { return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'black', color:'white'}}>Nenhum vídeo encontrado.</div> }

  return (
    <div className="dengo-root">
      <input type="file" ref={fileInputRef} accept="video/*" onChange={e=>{ const file = e.target.files?.[0]; if(file) uploadFile(file) }} style={{display:'none'}}/>

      <div className="mobile-header">
        <div style={{display:'flex', alignItems:'center'}}>
          <span style={{color:'#FFE600', fontWeight:900, fontSize:22, display:'flex', alignItems:'center'}}>D<span style={{display:'inline-flex', flexDirection:'column', gap:4, margin:'0 2px'}}><span style={{width:18, height:4, background:'#FFE600'}}/><span style={{width:14, height:4, background:'#FFE600'}}/><span style={{width:18, height:4, background:'#FFE600'}}/></span>NG</span>
          <div style={{width:28, height:28, background:'#FFE600', borderRadius:99, display:'flex', alignItems:'center', justifyContent:'center', marginLeft:3}}><div style={{width:14, height:8, borderBottom:'2.5px solid #000', borderRadius:'0 0 99px 99px', marginTop:2}}/></div>
        </div>
      </div>

      <div className="main-layout">
        <div className="left-sidebar">
          <div style={{padding:'16px 12px 12px', display:'flex', alignItems:'center'}}>
            <span style={{color:'#FFE600', fontWeight:900, fontSize:26, display:'flex', alignItems:'center'}}>D<span style={{display:'inline-flex', flexDirection:'column', gap:5, margin:'0 3px'}}><span style={{width:22, height:5, background:'#FFE600'}}/><span style={{width:18, height:5, background:'#FFE600'}}/><span style={{width:22, height:5, background:'#FFE600'}}/></span>NG</span>
            <div style={{width:34, height:34, background:'#FFE600', borderRadius:99, display:'flex', alignItems:'center', justifyContent:'center', marginLeft:4}}><div style={{width:18, height:10, borderBottom:'3px solid #000', borderRadius:'0 0 99px 99px', marginTop:2}}/></div>
          </div>
          <div style={{padding:'8px 12px'}}><div style={{background:'#1a1a1a', borderRadius:99, padding:'10px 14px', color:'#666', fontSize:13}}>🔍 Buscar</div></div>
          <div style={{padding:'16px 8px 0', display:'flex', flexDirection:'column', gap:6}}>
            <div style={{background:'#1a1a1a', color:'#fff', padding:'10px 12px', borderRadius:8, fontWeight:700, fontSize:13}}>🏠 Para ti</div>
            <div style={{color:'#555', padding:'10px 12px', fontSize:13}}>🎯 Explorar</div>
            <div style={{color:'#555', padding:'10px 12px', fontSize:13}}>👥 Amigos</div>
          </div>
        </div>

        <div ref={containerRef} className="center-feed">
          {videos.map((vid, idx)=>(
            <div key={vid.id} className="video-page">
              <div className="video-card" onDoubleClick={()=>toggleLike(idx)}>
                <video ref={el=>{videoRefs.current[idx]=el as any}} src={vid.src} loop playsInline muted={isMuted} style={{height:'100%', width:'100%', objectFit:'cover'}} onClick={e=>{ const v=e.currentTarget as HTMLVideoElement; v.paused? v.play() : v.pause()}}/>
                <button onClick={()=>setIsMuted(!isMuted)} className="mute-btn">{isMuted?'🔇':'🔊'}</button>
                <div className="right-actions">
                  <div style={{position:'relative', cursor:'pointer'}} onClick={()=>toggleFollow(idx)}><img src="https://i.pravatar.cc/100?img=11" style={{width:40, height:40, borderRadius:99, border:'2px solid #fff'}}/><div style={{position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%)', width:16, height:16, background: vid.following? '#fff' : '#FE2C55', color: vid.following? '#000' : '#fff', borderRadius:99, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, border:'2px solid #000', fontSize:9}}>{vid.following? '✓' : '+'}</div></div>
                  <div className="action-item"><button onClick={()=>toggleLike(idx)} className={`action-btn ${vid.liked?'liked':''}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button><span>{format(vid.likes)}</span></div>
                  <div className="action-item"><button onClick={openComments} className="action-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM9 11H7V9H9V11ZM13 11H11V9H13V11ZM17 11H15V9H17V11Z"/></svg></button><span>{format(vid.comments)}</span></div>
                  <div className="action-item"><button onClick={()=>toggleSave(idx)} className={`action-btn ${vid.saved?'saved':''}`}><svg width="18" height="18" viewBox="0 0 24 24" fill={vid.saved?"#000":"white"}><path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z"/></svg></button><span>{format(vid.saves)}</span></div>
                  <div className="action-item"><button onClick={()=>handleShare(idx)} className="action-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.35C15.11 18.58 15.08 18.81 15.08 19.05C15.08 20.61 16.34 21.87 17.91 21.87C19.47 21.87 20.74 20.61 20.74 19.05C20.74 17.49 19.47 16.23 17.91 16.23L18 16.08Z"/></svg></button><span>{format(vid.shares)}</span></div>
                </div>
                <div className="video-caption"><div style={{display:'flex', gap:4, alignItems:'center'}}><span className="level-badge">{vid.level}</span><span className="question-badge">{vid.question}</span></div><div style={{marginTop:6, fontSize:10, opacity:0.9}}>🔊 som original - dengo.oficial</div></div>
              </div>
            </div>
          ))}
        </div>

        <div className="right-sidebar">
          <div style={{display:'flex', borderBottom:'1px solid #1e1e1e', padding:'10px 12px', gap:16}}><div style={{color:'#fff', fontWeight:800, fontSize:13, borderBottom:'2px solid #fff', paddingBottom:8}}>Comentarios ({format(current.comments)})</div><div style={{color:'#555', fontSize:13}}>Video {currentIdx+1}/{videos.length}</div></div>
          <div style={{flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:16}}>
            {current.commentsList.map(c=>(<div key={c.id} style={{display:'flex', gap:8}}><img src={c.avatar} style={{width:28, height:28, borderRadius:99}}/><div style={{flex:1}}><div style={{color:'#fff', fontSize:12, fontWeight:700}}>{c.user}</div><div style={{color:'#ccc', fontSize:12, marginTop:2}}>{c.text}</div></div></div>))}
          </div>
          {showEmojis && <div className="emoji-bar">{EMOJIS.map(e=><button key={e} onClick={()=>insertEmoji(e)} className="emoji-btn">{e}</button>)}</div>}
          <div style={{padding:'10px', borderTop:'1px solid #1e1e1e', display:'flex', gap:8, alignItems:'center'}}>
            <button onClick={()=>setShowEmojis(!showEmojis)} style={{background:'none', border:'none', fontSize:20, cursor:'pointer'}}>😊</button>
            <input ref={rightInputRef} value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=> e.key==='Enter' && addComment()} placeholder="Añadir comentario..." style={{flex:1, background:'#1a1a1a', border:'none', borderRadius:99, padding:'10px 14px', color:'#fff', outline:'none', fontSize:12}}/>
            <button onClick={addComment} style={{width:32, height:32, borderRadius:99, background: newComment? '#FE2C55' : '#333', border:'none', color:'#fff', cursor:'pointer'}}>↑</button>
          </div>
        </div>
      </div>

      {/* BOTAO + MENOR E MAIS FORTE */}
      <div className="bottom-plus-fixed">
        <button onClick={()=>setShowUploadOptions(true)} className="plus-btn-small">
          <span className="plus-small-icon">+</span>
        </button>
        {uploading && <div className="uploading-mini">Enviando... <button onClick={()=>setUploading(false)} style={{background:'#FFE600', color:'#000', border:'none', borderRadius:99, padding:'2px 8px', marginLeft:6, fontWeight:800, fontSize:10}}>X</button></div>}
      </div>

      <div className="bottom-nav"><div style={{color:'#fff', fontSize:20}}>🏠</div><div style={{color:'#555', fontSize:20}}>🔍</div><div style={{width:64}}/><div style={{color:'#555', fontSize:20}}>💬</div><div style={{color:'#555', fontSize:20}}>👤</div></div>

      {showUploadOptions && (
        <>
          <div onClick={()=>setShowUploadOptions(false)} className="drawer-overlay-global"/>
          <div className="upload-options-sheet">
            <div style={{display:'flex', justifyContent:'center', padding:'12px'}}><div style={{width:36, height:4, background:'#333', borderRadius:99}}/></div>
            <div style={{padding:'0 16px 20px'}}>
              <div style={{color:'#fff', fontWeight:800, fontSize:16, marginBottom:16, textAlign:'center'}}>Criar novo vídeo</div>
              <button onClick={()=>{ setShowUploadOptions(false); setShowCamera(true) }} className="upload-option-btn"><div className="upload-icon">📷</div><div><div style={{fontWeight:700, fontSize:14}}>Câmera</div><div style={{fontSize:11, color:'#888', marginTop:2}}>Gravar um vídeo novo</div></div></button>
              <button onClick={()=>{ fileInputRef.current?.click() }} className="upload-option-btn"><div className="upload-icon">🖼️</div><div><div style={{fontWeight:700, fontSize:14}}>Galeria</div><div style={{fontSize:11, color:'#888', marginTop:2}}>Escolher da sua galeria</div></div></button>
              <button onClick={()=>setShowUploadOptions(false)} style={{width:'100%', marginTop:12, background:'#1a1a1a', border:'none', borderRadius:99, padding:'12px', color:'#fff', fontWeight:600, cursor:'pointer'}}>Cancelar</button>
            </div>
          </div>
        </>
      )}

      {showDrawer && (
        <>
          <div onClick={()=>{setShowDrawer(false); setShowEmojis(false)}} className="drawer-overlay-global"/>
          <div className="comments-drawer-global">
            <div style={{display:'flex', justifyContent:'center', padding:'10px'}}><div style={{width:36, height:4, background:'#333', borderRadius:99}}/></div>
            <div style={{display:'flex', justifyContent:'space-between', padding:'0 16px 12px', borderBottom:'1px solid #2a2a2a'}}><span style={{color:'#fff', fontWeight:800, fontSize:13}}>{format(current.comments)} comentarios</span><button onClick={()=>setShowDrawer(false)} style={{background:'none', border:'none', color:'#fff', fontSize:18, cursor:'pointer'}}>✕</button></div>
            <div style={{flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:14}}>
              {current.commentsList.map(c=>(<div key={c.id} style={{display:'flex', gap:8}}><img src={c.avatar} style={{width:28, height:28, borderRadius:99}}/><div style={{flex:1}}><div style={{color:'#fff', fontSize:12, fontWeight:700}}>{c.user}</div><div style={{color:'#ddd', fontSize:12, marginTop:2}}>{c.text}</div></div></div>))}
            </div>
            {showEmojis && <div className="emoji-bar">{EMOJIS.map(e=><button key={e} onClick={()=>insertEmoji(e)} className="emoji-btn">{e}</button>)}</div>}
            <div style={{padding:10, borderTop:'1px solid #2a2a2a', display:'flex', gap:8, alignItems:'center'}}>
              <button onClick={()=>setShowEmojis(!showEmojis)} style={{background:'none', border:'none', fontSize:20, cursor:'pointer'}}>😊</button>
              <input ref={drawerInputRef} value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=> e.key==='Enter' && addComment()} placeholder="Añadir comentario..." style={{flex:1, background:'#2a2a2a', border:'none', borderRadius:99, padding:'10px 14px', color:'#fff', outline:'none', fontSize:12}}/>
              <button onClick={addComment} style={{background:'#FE2C55', border:'none', borderRadius:99, padding:'10px 16px', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer'}}>Post</button>
            </div>
          </div>
        </>
      )}

      {showCamera && <CameraCapture onClose={()=>setShowCamera(false)} onVideoReady={(file)=> uploadFile(file)} />}

      <style>{`
.dengo-root{height:100vh; width:100vw; background:#000; display:flex; flex-direction:column; overflow:hidden; font-family:Inter, Arial}
.main-layout{flex:1; display:flex; overflow:visible; height:100vh}
.left-sidebar{width:240px; background:#000; border-right:1px solid #1a1a1a; display:flex; flex-direction:column; z-index:20}
.center-feed{flex:1; height:100vh; overflow-y:auto; overflow-x:hidden; scroll-snap-type:y mandatory;}
.center-feed::-webkit-scrollbar{display:none}
.video-page{width:100%; min-height:100vh; height:100vh; display:flex; justify-content:center; align-items:center; scroll-snap-align:start; scroll-snap-stop:always}
.video-card{position:relative; height:88vh; aspect-ratio:9/16; max-width:360px; background:#000; border-radius:8; overflow:hidden}
.right-sidebar{width:340px; background:#000; border-left:1px solid #1a1a1a; display:flex; flex-direction:column; z-index:20}
.mobile-header{display:none}.bottom-nav{display:none}
.bottom-plus-fixed{position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; flex-direction:column; align-items:center; gap:8px}
.plus-btn-small{
  width:46px;
  height:46px;
  background:#0f0f0f;
  border:1px solid #2a2a2a;
  border-radius:12px;
  display:flex;
  align-items:center;
  justifyContent:center;
  cursor:pointer;
  box-shadow:0 4px 16px rgba(0,0,0,0.6);
}
.plus-small-icon{
  color:#FFE600;
  font-size:32px;
  font-weight:500;
  line-height:1;
  display:block;
  transform:translateY(-1px);
}
.plus-btn-small:active{transform:scale(0.92)}
.uploading-mini{background:#FFE600; color:#000; font-weight:800; font-size:11px; padding:6px 12px; border-radius:99px; display:flex; align-items:center}
.mute-btn{position:absolute; left:10px; top:10px; width:26px; height:26px; border-radius:99px; background:rgba(0,0,0,0.55); border:none; color:#fff; font-size:11px; cursor:pointer; z-index:5}

/* BOTOES DA DIREITA MENORES E ICONES MAIS FORTES */
.right-actions{position:absolute; right:8px; bottom:84px; display:flex; flex-direction:column; gap:14px; align-items:center; z-index:10}
.action-item{display:flex; flex-direction:column; align-items:center; gap:4px}
.action-btn{
  width:38px;
  height:38px;
  border-radius:99px;
  background:#1e1e1e;
  border:1px solid #2a2a2a;
  display:flex;
  align-items:center;
  justifyContent:center;
  cursor:pointer;
}
.action-btn.liked{background:#FE2C55; border-color:#FE2C55}
.action-btn.saved{background:#FFE600; border-color:#FFE600}
.action-btn svg{filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));}
.action-item span{color:#fff; font-size:11px; font-weight:800; text-shadow:0 1px 2px rgba(0,0,0,0.8)}

.video-caption{position:absolute; bottom:48px; left:10px; right:66px; color:#fff; z-index:10}
.level-badge{background:#FFE600; color:#000; padding:2px 6px; font-weight:900; font-size:10px}
.question-badge{background:#FFE600; color:#000; padding:4px 8px; font-weight:900; font-size:12px; white-space:pre-line}
.drawer-overlay-global{position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:90}
.comments-drawer-global{position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; height:60%; background:#1a1a1a; border-top-left-radius:16px; border-top-right-radius:16px; z-index:91; display:flex; flex-direction:column}
.upload-options-sheet{position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; background:#161616; border-top-left-radius:20px; border-top-right-radius:20px; z-index:92}
.upload-option-btn{width:100%; display:flex; align-items:center; gap:12px; background:#1e1e1e; border:1px solid #2a2a2a; border-radius:12px; padding:14px 16px; margin-bottom:10px; color:#fff; cursor:pointer; text-align:left}
.upload-icon{width:40px; height:40px; background:#2a2a2a; border-radius:10px; display:flex; align-items:center; justifyContent:center; font-size:18px}
.emoji-bar{display:flex; gap:6px; padding:8px 12px; overflow-x:auto; background:#111; border-top:1px solid #2a2a2a}
.emoji-bar::-webkit-scrollbar{display:none}
.emoji-btn{background:none; border:none; font-size:22px; cursor:pointer; padding:4px 6px}
@media(min-width:1101px){.bottom-plus-fixed{left:calc((100vw - 100px) / 2); bottom:16px}.drawer-overlay-global,.comments-drawer-global{left:calc((100vw - 100px) / 2); max-width:360px}.upload-options-sheet{left:calc((100vw - 100px) / 2); max-width:360px}}
@media(min-width:769px) and (max-width:1100px){.bottom-plus-fixed{left:calc((100vw + 240px) / 2)}}
@media(max-width:768px){.left-sidebar,.right-sidebar{display:none}.mobile-header{display:flex; justifyContent:space-between; alignItems:center; padding:10px 12px; background:#000; border-bottom:1px solid #1a1a1a; z-index:30}.bottom-nav{display:flex; justifyContent:space-around; alignItems:center; padding:10px 0 14px; background:#000; border-top:1px solid #1a1a1a; z-index:40}.bottom-plus-fixed{left:50%; bottom:64px}.video-page{height:calc(100vh - 102px); min-height:calc(100vh - 102px)}.video-card{height:100%; width:100%; max-width:100%; border-radius:0}}
`}</style>
    </div>
  )
}