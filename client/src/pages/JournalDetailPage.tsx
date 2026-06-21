import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TopHeader from '../components/TopHeader'
import api from '../lib/api'
import { useBiometricGuard } from '../lib/useBiometricGuard'

interface JournalEntry {
  id: string
  content: string
  mood?: number
  createdAt: string
}

const MOOD_OPTIONS = [
  { value: 1, emoji: '💔', label: 'Muito mal' },
  { value: 2, emoji: '😔', label: 'Mal' },
  { value: 3, emoji: '😐', label: 'Ok' },
  { value: 4, emoji: '😊', label: 'Bem' },
  { value: 5, emoji: '🔥', label: 'Excelente' },
]

export default function JournalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, authenticate, error } = useBiometricGuard()

  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [editContent, setEditContent] = useState('')
  const [editMood, setEditMood] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    api.get(`/journal/${id}`)
      .then(res => {
        const e = res.data?.entry
        setEntry(e)
        setEditContent(e.content)
        setEditMood(e.mood ?? undefined)
      })
      .catch(() => navigate('/journal'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleSave = async () => {
    if (!id || saving) return
    setSaving(true)
    try {
      const res = await api.put(`/journal/${id}`, {
        content: editContent,
        mood: editMood,
      })
      setEntry(res.data.entry)
      setEditing(false)
    } catch {
      // keep editing
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || deleting) return
    setDeleting(true)
    try {
      await api.delete(`/journal/${id}`)
      navigate('/journal')
    } catch {
      setDeleting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const getMoodEmoji = (mood?: number) => {
    if (!mood) return null
    return MOOD_OPTIONS.find(m => m.value === mood)?.emoji ?? null
  }

  if (loading) {
    return (
      <div className="app-shell" style={{ background: 'var(--color-background)' }}>
        <TopHeader title="Diário" onBack={() => navigate('/journal')} />
        <main className="app-main">
          <div style={{ textAlign: 'center', paddingTop: '80px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.1em' }}>
            CARREGANDO...
          </div>
        </main>
      </div>
    )
  }

  if (!entry) return null

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      <TopHeader
        title={editing ? 'Editando' : 'Diário'}
        onBack={() => editing ? setEditing(false) : navigate('/journal')}
      />

      <main className="app-main-wide" style={{ flex: 1, paddingBottom: '48px' }}>
        {!isAuthenticated ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', gap: '20px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-primary)' }}>fingerprint</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px' }}>Diário Bloqueado</h2>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-on-surface-variant)', padding: '0 20px' }}>
              Por segurança e privacidade, seu diário precisa ser desbloqueado usando biometria.
            </p>
            {error && <p style={{ color: 'var(--color-forge-orange)', fontSize: '12px' }}>{error}</p>}
            <button
              onClick={authenticate}
              className="glass-panel"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-forge-border)',
                padding: '12px 24px',
                borderRadius: '12px',
                color: 'var(--color-on-surface)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        ) : (
          <>
        {editing ? (
          /* ─── EDIT MODE ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '10px' }}>
                Humor
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {MOOD_OPTIONS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setEditMood(editMood === m.value ? undefined : m.value)}
                    title={m.label}
                    style={{
                      flex: 1, padding: '10px 0',
                      background: editMood === m.value ? 'rgba(83,215,239,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${editMood === m.value ? 'rgba(83,215,239,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '10px', cursor: 'pointer',
                      fontSize: '20px', transition: 'all 0.15s',
                      transform: editMood === m.value ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                Reflexão
              </label>
              <textarea
                className="forge-textarea"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={12}
                maxLength={10000}
                placeholder="Escreva aqui..."
                style={{ lineHeight: 1.8 }}
              />
              <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)', opacity: 0.5 }}>
                  {editContent.length}/10000
                </span>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-forge-teal)', opacity: 0.7 }}>lock</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.05em' }}>
                Salvo com criptografia AES-256-GCM end-to-end
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancelar</button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                onClick={handleSave}
                disabled={saving || !editContent.trim()}
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>

        ) : (
          /* ─── VIEW MODE ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Date header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-forge-teal)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {formatDate(entry.createdAt)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>
                    {formatTime(entry.createdAt)}
                  </span>
                  {entry.mood && (
                    <span style={{ fontSize: '20px' }}>{getMoodEmoji(entry.mood)}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', padding: '8px 12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  color: 'var(--color-on-surface-variant)', flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
              </button>
            </div>

            {/* Content */}
            <div
              className="glass-panel ghost-border"
              style={{ padding: '24px', borderRadius: '16px', minHeight: '200px' }}
            >
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '16px', lineHeight: 1.85,
                color: 'var(--color-on-surface)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {entry.content}
              </p>
            </div>

            {/* Encryption notice */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>lock</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Protegido com AES-256-GCM · Apenas você pode ler
              </span>
            </div>

            {/* Danger zone */}
            <div style={{ marginTop: '12px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {confirmDelete ? (
                <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,71,87,0.25)', background: 'rgba(255,71,87,0.06)' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', marginBottom: '14px', lineHeight: 1.5 }}>
                    Remover este registro? Os dados serão apagados permanentemente.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-ghost" style={{ flex: 1, padding: '10px' }} onClick={() => setConfirmDelete(false)}>Cancelar</button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        flex: 2, padding: '10px',
                        background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.4)',
                        borderRadius: '8px', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#ff4757', letterSpacing: '0.06em',
                      }}
                    >
                      {deleting ? 'Excluindo...' : 'Sim, apagar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)',
                    display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.05em',
                    padding: '8px 0', opacity: 0.6, transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-error)' }}>delete</span>
                  Apagar este registro
                </button>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  )
}
