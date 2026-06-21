import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import TopHeader from '../components/TopHeader'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
interface GoalOption {
  id: string
  title: string
}

// ---------------------------------------------------------------------------
// Heurística de sugestão de versão mínima (Autoeficácia — Bandura, 1977)
//
// NÃO é IA nem se apresenta como tal. É uma sugestão editável de UI — o
// usuário pode apagar, reescrever ou ignorar. Nunca é obrigatória.
// ---------------------------------------------------------------------------
function suggestMinimumVersion(habitTitle: string): string {
  if (!habitTitle.trim()) return ''
  return `Versão de 2 minutos de "${habitTitle}"`
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function NewHabitPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // Campos do formulário
  const [title, setTitle] = useState('')
  const [cue, setCue] = useState('')
  const [minimumVersion, setMinimumVersion] = useState('')
  const [pairWith, setPairWith] = useState('')            // Começa VAZIO — nunca pré-populado pelo sistema
  const [goalId, setGoalId] = useState<string>('')
  const [goals, setGoals] = useState<GoalOption[]>([])
  const [loadingGoals, setLoadingGoals] = useState(true)

  // Erros inline de validação
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Carrega metas do usuário para o vínculo opcional (Progress Principle)
  useEffect(() => {
    api.get('/goals')
      .then(res => {
        const activeGoals = (res.data?.goals ?? []).filter(
          (g: { status: string }) => g.status === 'ACTIVE'
        )
        setGoals(activeGoals)
      })
      .catch(() => setGoals([]))
      .finally(() => setLoadingGoals(false))
  }, [])

  // ---------------------------------------------------------------------------
  // Validação client-side (duplicada no servidor — nunca confiar só no front)
  // ---------------------------------------------------------------------------
  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!title.trim() || title.trim().length < 3) {
      errs.title = 'Título deve ter pelo menos 3 caracteres'
    }
    if (title.length > 100) errs.title = 'Título deve ter no máximo 100 caracteres'
    if (cue.length > 150) errs.cue = 'Máximo de 150 caracteres'
    if (minimumVersion.length > 200) errs.minimumVersion = 'Máximo de 200 caracteres'
    if (pairWith.length > 200) errs.pairWith = 'Máximo de 200 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    setApiError(null)
    try {
      await api.post('/habits', {
        title: title.trim(),
        cue: cue.trim() || null,
        minimumVersion: minimumVersion.trim() || null,
        pairWith: pairWith.trim() || null,
        goalId: goalId || null,
      })
      navigate('/habits')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setApiError(axiosErr.response?.data?.message ?? 'Erro ao criar hábito.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Estilos reutilizáveis
  // ---------------------------------------------------------------------------
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--color-on-surface-variant)',
  }

  const fieldWrap: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  }

  const errorStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--color-error)',
  }

  const hintStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--color-on-surface-variant)',
    fontStyle: 'italic',
    lineHeight: 1.5,
  }

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)' }}>
      <TopHeader title="Novo Hábito" onBack={() => navigate(-1)} />

      <main className="app-main-wide">
        {/* Cabeçalho */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '28px',
            fontWeight: 700, letterSpacing: '-0.02em',
          }}>
            Forjar Hábito
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '14px',
            color: 'var(--color-on-surface-variant)', marginTop: '6px', lineHeight: 1.5,
          }}>
            Pequeno e consistente supera grande e esporádico.
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Título ──────────────────────────────────────────────────────── */}
          <div style={fieldWrap}>
            <label htmlFor="habit-title" style={labelStyle}>Nome do hábito *</label>
            <input
              id="habit-title"
              type="text"
              placeholder="Ex: Meditação matinal"
              className="forge-input"
              style={{ paddingLeft: '16px' }}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                // Autoeficácia: sugere versão mínima assim que o usuário digita,
                // mas SOMENTE se o campo ainda estiver vazio (respeita edições manuais)
                if (!minimumVersion) {
                  setMinimumVersion(suggestMinimumVersion(e.target.value))
                }
              }}
            />
            {errors.title && <span style={errorStyle}>{errors.title}</span>}
          </div>

          {/* ── Plano Se-Então / Cue ────────────────────────────────────────── */}
          <div style={fieldWrap}>
            <label htmlFor="habit-cue" style={labelStyle}>Plano Se-Então (deixa / gatilho)</label>
            <input
              id="habit-cue"
              type="text"
              placeholder='Se [contexto], então [hábito]'
              className="forge-input"
              style={{ paddingLeft: '16px' }}
              value={cue}
              onChange={(e) => setCue(e.target.value)}
            />
            {errors.cue && <span style={errorStyle}>{errors.cue}</span>}
            <p style={hintStyle}>Ex: "Se terminar o jantar, então 10 min de meditação"</p>
          </div>

          {/* ── Versão mínima garantida (Autoeficácia) ──────────────────────── */}
          <div style={fieldWrap}>
            <label htmlFor="habit-min-version" style={labelStyle}>
              Versão mínima garantida
              <span style={{ marginLeft: '6px', opacity: 0.5, textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>
                (editável — a primeira vitória deve ser garantida)
              </span>
            </label>
            <input
              id="habit-min-version"
              type="text"
              placeholder='Ex: "2 minutos de meditação"'
              className="forge-input"
              style={{ paddingLeft: '16px' }}
              value={minimumVersion}
              onChange={(e) => setMinimumVersion(e.target.value)}
            />
            {errors.minimumVersion && <span style={errorStyle}>{errors.minimumVersion}</span>}
            <p style={hintStyle}>
              Bandura (1977): autoeficácia vem de vitórias reais. Defina a menor versão que ainda conta como concluído.
            </p>
          </div>

          {/* ── Temptation Bundling ─────────────────────────────────────────── */}
          <div style={fieldWrap}>
            <label htmlFor="habit-pair" style={labelStyle}>
              Parear com algo?
              <span style={{ marginLeft: '6px', opacity: 0.5, textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>
                (opcional — definido por você)
              </span>
            </label>
            {/* Campo SEMPRE começa vazio — o sistema NUNCA sugere ou pré-popula pareamentos */}
            <input
              id="habit-pair"
              type="text"
              placeholder='Ex: "só ouço meu podcast enquanto faço isso"'
              className="forge-input"
              style={{ paddingLeft: '16px' }}
              value={pairWith}
              onChange={(e) => setPairWith(e.target.value)}
            />
            {errors.pairWith && <span style={errorStyle}>{errors.pairWith}</span>}
            <p style={hintStyle}>
              Milkman et al. (2013): parear com algo prazeroso aumenta adesão. A escolha é inteiramente sua.
            </p>
          </div>

          {/* ── Vínculo com meta (Progress Principle) ───────────────────────── */}
          <div style={fieldWrap}>
            <label htmlFor="habit-goal" style={labelStyle}>
              Vincular a uma meta de longo prazo?
              <span style={{ marginLeft: '6px', opacity: 0.5, textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>
                (opcional)
              </span>
            </label>
            {loadingGoals ? (
              <p style={hintStyle}>Carregando metas...</p>
            ) : goals.length === 0 ? (
              <p style={hintStyle}>Nenhuma meta ativa encontrada.</p>
            ) : (
              <select
                id="habit-goal"
                className="forge-input"
                style={{ paddingLeft: '16px', cursor: 'pointer' }}
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
              >
                <option value="">— Nenhuma —</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            )}
            <p style={hintStyle}>
              Amabile &amp; Kramer (2011): cada check-in vai mostrar como este hábito moveu a meta vinculada.
            </p>
          </div>

          {/* ── Nota comportamental ─────────────────────────────────────────── */}
          <div style={{
            padding: '12px 16px', borderRadius: '10px',
            background: 'rgba(47, 158, 92, 0.06)',
            border: '1px solid rgba(47, 158, 92, 0.15)',
            display: 'flex', gap: '10px',
          }}>
            <span className="material-symbols-outlined" style={{
              color: 'var(--color-forge-green)', fontSize: '16px',
              marginTop: '1px', flexShrink: 0,
            }}>
              psychology
            </span>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
              Consistência em 30 dias, sem punição por falhas. O que importa é a tendência, não a perfeição.
            </p>
          </div>

          {/* ── Erro de API ─────────────────────────────────────────────────── */}
          {apiError && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(147, 0, 10, 0.15)',
              border: '1px solid rgba(255, 180, 171, 0.2)',
              borderRadius: '0.5rem',
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-error)' }}>
                {apiError}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{ marginTop: '8px', backgroundColor: 'var(--color-forge-green)', color: '#fff' }}
          >
            {isSubmitting ? 'Criando...' : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cached</span>
                Criar Hábito
              </>
            )}
          </button>

          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
            Cancelar
          </button>
        </form>
      </main>
    </div>
  )
}
