import { useEffect, useMemo, useState } from 'react'
import './App.css'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percentFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const dateShortFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const dateLongFmt = new Intl.DateTimeFormat('pt-BR')

const initialCategories = ['Alimentação', 'Moradia', 'Contas', 'Mobilidade', 'Saúde', 'Educação', 'Lazer']
const initialProfile = { name: 'João Silva', email: 'joao@email.com' }
const AUTH_USERS_KEY = 'cv-auth-users'
const AUTH_SESSION_KEY = 'cv-auth-session'

function toCents(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) : 0
}

function fromCents(cents) {
  return cents / 100
}

function sumMoney(items, selector = item => item.value) {
  return fromCents(items.reduce((sum, item) => sum + toCents(selector(item)), 0))
}

function todayInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'CV'
  return `${parts[0][0] || ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase()
}

function getFirstName(name = '') {
  return name.trim().split(/\s+/)[0] || 'usuário'
}

function normalizeEmail(email = '') {
  return email.trim().toLowerCase()
}

function load(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

async function hashPassword(password) {
  if (!window.crypto?.subtle) throw new Error('Seu navegador não oferece suporte à proteção de senha usada pelo protótipo.')
  const data = new TextEncoder().encode(password)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function getAccounts() {
  return load(AUTH_USERS_KEY, [])
}

function userStorageKey(userId, area) {
  return `cv-user-${userId}-${area}`
}

function getSessionAccount() {
  const userId = localStorage.getItem(AUTH_SESSION_KEY)
  if (!userId) return null
  return getAccounts().find(account => account.id === userId) || null
}

function migrateLegacyWorkspace(userId) {
  const mappings = [
    ['cv-transactions', 'transactions'],
    ['cv-goals', 'goals'],
    ['cv-categories', 'categories'],
  ]

  mappings.forEach(([legacyKey, area]) => {
    const destination = userStorageKey(userId, area)
    if (localStorage.getItem(destination) !== null) return
    const legacy = localStorage.getItem(legacyKey)
    if (legacy !== null) localStorage.setItem(destination, legacy)
  })
}

function isGoalComplete(goal) {
  const targetCents = toCents(goal.target)
  return targetCents > 0 && toCents(goal.saved) >= targetCents
}

function goalProgress(goal) {
  const targetCents = toCents(goal.target)
  const savedCents = toCents(goal.saved)
  if (targetCents <= 0) return 0
  if (savedCents >= targetCents) return 100
  return Math.min(99.99, Math.round(((savedCents / targetCents) * 100) * 100) / 100)
}

function formatProgress(progress) {
  return `${percentFmt.format(progress)}%`
}

function isGoalOverdue(goal) {
  if (!goal.deadline || isGoalComplete(goal)) return false
  const deadline = parseDate(goal.deadline)
  if (!deadline) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  return deadline < today
}

function goalStatus(goal) {
  if (isGoalComplete(goal)) return 'Concluída'
  if (isGoalOverdue(goal)) return 'Vencida'
  return 'Em andamento'
}

function daysUntil(dateValue) {
  const date = parseDate(dateValue)
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return Math.ceil((date - today) / 86400000)
}


function formatMonthLabel(monthKey) {
  if (!monthKey) return '—'
  const date = parseDate(`${monthKey}-01`)
  return date ? date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : monthKey
}

function buildMonthlySeries(transactions, months = 6) {
  const base = new Date()
  const series = []

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(base.getFullYear(), base.getMonth() - offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthItems = transactions.filter(item => String(item.date).startsWith(key))
    const income = sumMoney(monthItems.filter(item => item.type === 'income'))
    const expense = sumMoney(monthItems.filter(item => item.type === 'expense'))
    series.push({ key, label: formatMonthLabel(key), income, expense, balance: fromCents(toCents(income) - toCents(expense)) })
  }

  return series
}


function buildBalanceTimeline(transactions, limit = 12) {
  const ordered = [...transactions].sort((a, b) => {
    const dateCompare = String(a.date || '').localeCompare(String(b.date || ''))
    if (dateCompare !== 0) return dateCompare
    return Number(a.id || 0) - Number(b.id || 0)
  })

  let balanceCents = 0
  const allPoints = ordered.map(item => {
    const beforeCents = balanceCents
    const valueCents = Math.max(0, toCents(item.value))
    balanceCents += item.type === 'income' ? valueCents : -valueCents
    return {
      id: item.id,
      date: item.date,
      type: item.type,
      description: item.description,
      value: fromCents(valueCents),
      before: fromCents(beforeCents),
      balance: fromCents(balanceCents),
    }
  })

  if (!allPoints.length) return []
  const visible = allPoints.slice(-limit)
  const first = visible[0]
  return [
    {
      id: `start-${first.id}`,
      date: first.date,
      type: 'start',
      description: 'Saldo antes dos movimentos exibidos',
      value: 0,
      before: first.before,
      balance: first.before,
    },
    ...visible,
  ]
}

function passwordStrength(password) {
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Muito forte']
  return { score, label: labels[score] }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function App() {
  const [authUser, setAuthUser] = useState(() => getSessionAccount())
  const [page, setPage] = useState('dashboard')
  const [transactions, setTransactions] = useState(() => authUser ? load(userStorageKey(authUser.id, 'transactions'), []) : [])
  const [goals, setGoals] = useState(() => authUser ? load(userStorageKey(authUser.id, 'goals'), []) : [])
  const [categories, setCategories] = useState(() => authUser ? load(userStorageKey(authUser.id, 'categories'), initialCategories) : initialCategories)
  const [profile, setProfile] = useState(() => authUser ? load(userStorageKey(authUser.id, 'profile'), { name: authUser.name, email: authUser.email }) : initialProfile)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)

  const persist = (area, value, setter) => {
    if (!authUser) return
    setter(value)
    localStorage.setItem(userStorageKey(authUser.id, area), JSON.stringify(value))
  }

  const loadWorkspace = (account, migrateLegacy = false) => {
    if (migrateLegacy) migrateLegacyWorkspace(account.id)
    setTransactions(load(userStorageKey(account.id, 'transactions'), []))
    setGoals(load(userStorageKey(account.id, 'goals'), []))
    setCategories(load(userStorageKey(account.id, 'categories'), initialCategories))
    setProfile(load(userStorageKey(account.id, 'profile'), { name: account.name, email: account.email }))
    setPage('dashboard')
    setModal(null)
  }

  const notify = (message, tone = 'success') => {
    setToast({ id: Date.now(), message, tone })
  }

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), toast.tone === 'warning' ? 4200 : 2800)
    return () => clearTimeout(timer)
  }, [toast])

  const totals = useMemo(() => {
    const incomes = transactions.filter(item => item.type === 'income')
    const expenses = transactions.filter(item => item.type === 'expense')
    const income = sumMoney(incomes)
    const expense = sumMoney(expenses)
    return { income, expense, balance: fromCents(toCents(income) - toCents(expense)) }
  }, [transactions])

  const overdueGoals = useMemo(() => goals.filter(isGoalOverdue), [goals])

  useEffect(() => {
    if (!authUser || !overdueGoals.length) return
    const todayKey = todayInputValue()
    const signature = overdueGoals.map(goal => goal.id).sort().join(',')
    const notificationKey = `cv-overdue-notified-${authUser.id}-${todayKey}`
    if (sessionStorage.getItem(notificationKey) !== signature) {
      notify(`${overdueGoals.length} meta${overdueGoals.length > 1 ? 's estão' : ' está'} com o prazo vencido.`, 'warning')
      sessionStorage.setItem(notificationKey, signature)
    }
  }, [authUser, overdueGoals])

  const register = async ({ name, email, password }) => {
    const cleanName = name.trim()
    const cleanEmail = normalizeEmail(email)
    const accounts = getAccounts()
    if (!cleanName) return { ok: false, error: 'Informe seu nome.' }
    if (!cleanEmail) return { ok: false, error: 'Informe um e-mail válido.' }
    if (accounts.some(account => normalizeEmail(account.email) === cleanEmail)) return { ok: false, error: 'Já existe uma conta cadastrada com este e-mail.' }
    if (password.length < 6) return { ok: false, error: 'A senha deve ter pelo menos 6 caracteres.' }

    try {
      const passwordHash = await hashPassword(password)
      const account = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        createdAt: new Date().toISOString(),
      }
      const firstAccount = accounts.length === 0
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify([...accounts, account]))
      localStorage.setItem(AUTH_SESSION_KEY, account.id)
      localStorage.setItem(userStorageKey(account.id, 'profile'), JSON.stringify({ name: cleanName, email: cleanEmail }))
      setAuthUser(account)
      loadWorkspace(account, firstAccount)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message || 'Não foi possível criar a conta.' }
    }
  }

  const login = async ({ email, password }) => {
    const cleanEmail = normalizeEmail(email)
    const account = getAccounts().find(item => normalizeEmail(item.email) === cleanEmail)
    if (!account) return { ok: false, error: 'E-mail ou senha incorretos.' }
    try {
      const passwordHash = await hashPassword(password)
      if (passwordHash !== account.passwordHash) return { ok: false, error: 'E-mail ou senha incorretos.' }
      localStorage.setItem(AUTH_SESSION_KEY, account.id)
      setAuthUser(account)
      loadWorkspace(account)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message || 'Não foi possível entrar na conta.' }
    }
  }

  const logout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY)
    setAuthUser(null)
    setTransactions([])
    setGoals([])
    setCategories(initialCategories)
    setProfile(initialProfile)
    setModal(null)
    setPage('dashboard')
  }

  const addTransaction = form => {
    const transaction = {
      id: Date.now(),
      type: form.type,
      description: form.description.trim(),
      category: form.category,
      date: form.date,
      value: fromCents(toCents(form.value)),
    }
    persist('transactions', [transaction, ...transactions], setTransactions)
    setModal(null)
    notify(transaction.type === 'income' ? 'Renda adicionada com sucesso.' : 'Despesa adicionada com sucesso.')
  }

  const updateTransaction = (id, form) => {
    const next = transactions.map(item => item.id === id ? {
      ...item,
      ...form,
      description: form.description.trim(),
      value: fromCents(toCents(form.value)),
    } : item)
    persist('transactions', next, setTransactions)
    setModal(null)
    notify('Lançamento atualizado.')
  }

  const removeTransaction = id => {
    persist('transactions', transactions.filter(item => item.id !== id), setTransactions)
    setModal(null)
    notify('Lançamento excluído.')
  }

  const addGoal = form => {
    const targetCents = toCents(form.target)
    const savedCents = Math.min(targetCents, Math.max(0, toCents(form.saved)))
    const nextGoal = {
      id: Date.now(),
      name: form.name.trim(),
      target: fromCents(targetCents),
      saved: fromCents(savedCents),
      deadline: form.deadline,
      status: savedCents >= targetCents ? 'Concluída' : 'Em andamento',
    }
    persist('goals', [nextGoal, ...goals], setGoals)
    setModal(null)
    notify('Meta criada com sucesso.')
  }

  const updateGoal = (id, form) => {
    const targetCents = toCents(form.target)
    const savedCents = Math.min(targetCents, Math.max(0, toCents(form.saved || 0)))
    const next = goals.map(goal => goal.id === id ? {
      ...goal,
      name: form.name.trim(),
      target: fromCents(targetCents),
      saved: fromCents(savedCents),
      deadline: form.deadline,
      status: savedCents >= targetCents ? 'Concluída' : 'Em andamento',
    } : goal)
    persist('goals', next, setGoals)
    setModal(null)
    notify('Meta atualizada.')
  }

  const removeGoal = id => {
    persist('goals', goals.filter(goal => goal.id !== id), setGoals)
    setModal(null)
    notify('Meta excluída.')
  }

  const addContribution = (id, value) => {
    const next = goals.map(goal => {
      if (goal.id !== id) return goal
      const targetCents = toCents(goal.target)
      const savedCents = Math.min(targetCents, toCents(goal.saved) + Math.max(0, toCents(value)))
      return { ...goal, saved: fromCents(savedCents), status: savedCents >= targetCents ? 'Concluída' : 'Em andamento' }
    })
    persist('goals', next, setGoals)
    setModal(null)
    const updated = next.find(goal => goal.id === id)
    notify(isGoalComplete(updated) ? 'Meta concluída! Parabéns pelo objetivo alcançado.' : 'Aporte registrado. Progresso atualizado.')
  }

  const addCategory = name => {
    const cleanName = name.trim()
    if (!cleanName) return { ok: false, error: 'Informe um nome para a categoria.' }
    if (categories.some(category => category.toLowerCase() === cleanName.toLowerCase())) return { ok: false, error: 'Essa categoria já existe.' }
    persist('categories', [...categories, cleanName], setCategories)
    setModal(null)
    notify('Categoria criada.')
    return { ok: true }
  }

  const removeCategory = category => {
    const inUse = transactions.some(item => item.category === category)
    if (inUse) {
      notify('Essa categoria está sendo usada em lançamentos e não pode ser excluída.', 'warning')
      setModal(null)
      return
    }
    persist('categories', categories.filter(item => item !== category), setCategories)
    setModal(null)
    notify('Categoria excluída.')
  }

  const saveProfile = nextProfile => {
    if (!authUser) return
    const normalized = { name: nextProfile.name.trim(), email: normalizeEmail(nextProfile.email) }
    const accounts = getAccounts()
    const emailInUse = accounts.some(account => account.id !== authUser.id && normalizeEmail(account.email) === normalized.email)
    if (emailInUse) return notify('Este e-mail já está sendo usado por outra conta.', 'warning')

    const nextAccounts = accounts.map(account => account.id === authUser.id ? { ...account, ...normalized } : account)
    const updatedAccount = nextAccounts.find(account => account.id === authUser.id)
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(nextAccounts))
    setAuthUser(updatedAccount)
    persist('profile', normalized, setProfile)
    notify('Perfil atualizado com sucesso.')
  }

  const changePassword = async (currentPassword, newPassword) => {
    if (!authUser) return { ok: false, error: 'Sessão inválida.' }
    try {
      const currentHash = await hashPassword(currentPassword)
      if (currentHash !== authUser.passwordHash) return { ok: false, error: 'A senha atual está incorreta.' }
      const passwordHash = await hashPassword(newPassword)
      const nextAccounts = getAccounts().map(account => account.id === authUser.id ? { ...account, passwordHash, passwordUpdatedAt: new Date().toISOString() } : account)
      const updatedAccount = nextAccounts.find(account => account.id === authUser.id)
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(nextAccounts))
      setAuthUser(updatedAccount)
      setModal(null)
      notify('Senha atualizada com sucesso.')
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message || 'Não foi possível alterar a senha.' }
    }
  }

  const exportBackup = () => {
    if (!authUser) return
    const payload = {
      app: 'CustosVision',
      version: 6,
      exportedAt: new Date().toISOString(),
      profile,
      transactions,
      goals,
      categories,
    }
    downloadFile(`custosvision-backup-${todayInputValue()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
    notify('Backup exportado com sucesso.')
  }

  const resetWorkspace = () => {
    persist('transactions', [], setTransactions)
    localStorage.setItem(userStorageKey(authUser.id, 'goals'), JSON.stringify([]))
    localStorage.setItem(userStorageKey(authUser.id, 'categories'), JSON.stringify(initialCategories))
    setGoals([])
    setCategories(initialCategories)
    setModal(null)
    notify('Dados financeiros desta conta foram redefinidos.', 'warning')
  }

  if (!authUser) return <AuthScreen onLogin={login} onRegister={register} />

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} profile={profile} overdueCount={overdueGoals.length} onLogout={() => setModal({ type: 'logout' })} />
      <main className="main-content">
        <Topbar page={page} setPage={setPage} profile={profile} overdueCount={overdueGoals.length} />

        {page === 'dashboard' && <Dashboard totals={totals} transactions={transactions} goals={goals} categories={categories} profile={profile} setPage={setPage} setModal={setModal} />}
        {page === 'transactions' && <Transactions transactions={transactions} categories={categories} setModal={setModal} />}
        {page === 'goals' && <Goals goals={goals} setModal={setModal} />}
        {page === 'categories' && <Categories categories={categories} transactions={transactions} setModal={setModal} />}
        {page === 'profile' && <Profile profile={profile} authUser={authUser} onSave={saveProfile} onChangePassword={() => setModal({ type: 'password' })} onExport={exportBackup} onReset={() => setModal({ type: 'reset' })} onLogout={() => setModal({ type: 'logout' })} />}
      </main>

      <MobileNav page={page} setPage={setPage} overdueCount={overdueGoals.length} />

      {modal?.type === 'transaction' && <TransactionModal categories={categories} initialType={modal.transactionType} transaction={modal.transaction} onClose={() => setModal(null)} onSubmit={modal.transaction ? updateTransaction : addTransaction} />}
      {modal?.type === 'goal' && <GoalModal goal={modal.goal} onClose={() => setModal(null)} onSubmit={modal.goal ? updateGoal : addGoal} />}
      {modal?.type === 'contribution' && <ContributionModal goal={modal.goal} onClose={() => setModal(null)} onSubmit={addContribution} />}
      {modal?.type === 'category' && <CategoryModal onClose={() => setModal(null)} onSubmit={addCategory} />}
      {modal?.type === 'password' && <PasswordModal onClose={() => setModal(null)} onSubmit={changePassword} />}
      {modal?.type === 'delete-transaction' && <ConfirmModal title="Excluir lançamento?" text={`O lançamento “${modal.transaction.description}” será removido permanentemente.`} confirmLabel="Excluir lançamento" danger onClose={() => setModal(null)} onConfirm={() => removeTransaction(modal.transaction.id)} />}
      {modal?.type === 'delete-goal' && <ConfirmModal title="Excluir meta?" text={`A meta “${modal.goal.name}” e seu progresso serão removidos desta conta.`} confirmLabel="Excluir meta" danger onClose={() => setModal(null)} onConfirm={() => removeGoal(modal.goal.id)} />}
      {modal?.type === 'delete-category' && <ConfirmModal title="Excluir categoria?" text={`A categoria “${modal.category}” será removida. Categorias em uso não podem ser excluídas.`} confirmLabel="Excluir categoria" danger onClose={() => setModal(null)} onConfirm={() => removeCategory(modal.category)} />}
      {modal?.type === 'logout' && <ConfirmModal title="Sair da conta?" text="Sua sessão será encerrada neste navegador. Seus dados locais continuarão salvos." confirmLabel="Sair" onClose={() => setModal(null)} onConfirm={logout} />}
      {modal?.type === 'reset' && <ConfirmModal title="Redefinir dados financeiros?" text="Todos os lançamentos e metas desta conta serão apagados. As categorias voltarão ao padrão. Seu login e perfil serão mantidos." confirmLabel="Redefinir dados" danger onClose={() => setModal(null)} onConfirm={resetWorkspace} />}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

function AuthScreen({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const strength = passwordStrength(password)

  const changeMode = nextMode => {
    setMode(nextMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (mode === 'register' && password !== confirmPassword) return setError('As senhas não coincidem.')
    setLoading(true)
    const result = mode === 'login' ? await onLogin({ email, password }) : await onRegister({ name, email, password })
    setLoading(false)
    if (!result?.ok) setError(result?.error || 'Não foi possível continuar.')
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-intro">
          <Logo />
          <div className="auth-copy">
            <span className="auth-kicker">SEU DINHEIRO, COM MAIS CLAREZA</span>
            <h1>Controle financeiro que você entende de verdade.</h1>
            <p>Registre movimentações, acompanhe metas e transforme números em decisões simples para o seu dia a dia.</p>
          </div>
          <div className="auth-preview" aria-hidden="true">
            <div className="preview-top"><span>Saldo disponível</span><b>+12,4%</b></div>
            <strong>R$ 4.286,40</strong>
            <div className="preview-bars"><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="preview-legend"><span><b className="dot green" />Receitas</span><span><b className="dot purple" />Economia</span></div>
          </div>
          <div className="auth-benefits">
            <div><span>↗</span><p><strong>Visão completa</strong>Receitas e despesas organizadas em poucos cliques.</p></div>
            <div><span>◎</span><p><strong>Metas claras</strong>Progresso, prazo e quanto ainda falta em um só lugar.</p></div>
            <div><span>⌁</span><p><strong>Dados por conta</strong>Cada usuário mantém sua própria visão financeira.</p></div>
          </div>
          <small>CustosVision • Projeto Integrador</small>
        </div>

        <div className="auth-card-wrap">
          <div className="auth-card">
            <div className="auth-mobile-brand"><Logo /></div>
            <div className="auth-tabs" role="tablist" aria-label="Acesso à conta">
              <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Entrar</button>
              <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Criar conta</button>
            </div>
            <div className="auth-heading">
              <span className="auth-mini-kicker">{mode === 'login' ? 'ACESSO SEGURO' : 'COMECE AGORA'}</span>
              <h2>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
              <p>{mode === 'login' ? 'Entre para continuar acompanhando sua vida financeira.' : 'Leva menos de um minuto para organizar sua primeira visão financeira.'}</p>
            </div>

            <form className="auth-form" onSubmit={submit}>
              {mode === 'register' && <Field label="Nome completo"><input autoFocus autoComplete="name" required value={name} onChange={event => setName(event.target.value)} placeholder="Seu nome" /></Field>}
              <Field label="E-mail"><input autoFocus={mode === 'login'} autoComplete="email" required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="voce@email.com" /></Field>
              <Field label="Senha">
                <div className="password-field"><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength="6" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div>
              </Field>
              {mode === 'register' && <>
                <div className="password-strength" aria-label={`Força da senha: ${strength.label}`}><div>{[0,1,2,3,4].map(index => <i key={index} className={index < strength.score ? 'active' : ''} />)}</div><span>{strength.label}</span></div>
                <Field label="Confirmar senha"><input autoComplete="new-password" required minLength="6" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Digite a senha novamente" /></Field>
              </>}
              {error && <div className="auth-error">{error}</div>}
              <button className="btn primary auth-submit" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar no CustosVision' : 'Criar minha conta'}</button>
            </form>

            <p className="auth-switch">{mode === 'login' ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'} <button type="button" onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Criar conta' : 'Entrar'}</button></p>
            <p className="auth-local-note">Protótipo acadêmico: a autenticação e os dados ficam armazenados localmente neste navegador.</p>
          </div>
        </div>
      </section>
    </main>
  )
}

function Logo() {
  return <div className="brand"><span className="brand-mark">C</span><span>Custos<span>Vision</span></span></div>
}

const navItems = [
  ['dashboard', '⌂', 'Visão geral'],
  ['transactions', '↔', 'Lançamentos'],
  ['goals', '◎', 'Metas'],
  ['categories', '▦', 'Categorias'],
  ['profile', '○', 'Perfil'],
]

function Sidebar({ page, setPage, profile, overdueCount, onLogout }) {
  return (
    <aside className="sidebar">
      <Logo />
      <nav>
        <span className="nav-label">NAVEGAÇÃO</span>
        {navItems.slice(0, 4).map(([id, icon, label]) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(id)}><span className="nav-icon">{icon}</span><span>{label}</span>{id === 'goals' && overdueCount > 0 && <b className="nav-count">{overdueCount}</b>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="mini-tip"><span>✦</span><p><strong>Dica financeira</strong>Consistência vale mais que perfeição: registre seus gastos com frequência.</p></div>
        <button className={page === 'profile' ? 'profile-mini active-profile' : 'profile-mini'} onClick={() => setPage('profile')}><span className="avatar">{getInitials(profile.name)}</span><span><strong>{profile.name}</strong><small>{profile.email}</small></span><b>›</b></button>
        <button className="sidebar-logout" onClick={onLogout}><span>↪</span>Sair da conta</button>
      </div>
    </aside>
  )
}

function MobileNav({ page, setPage, overdueCount }) {
  return <nav className="mobile-nav" aria-label="Navegação principal">{navItems.map(([id, icon, label]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><span>{icon}{id === 'goals' && overdueCount > 0 && <b>{overdueCount}</b>}</span><small>{label === 'Visão geral' ? 'Início' : label}</small></button>)}</nav>
}

function Topbar({ page, setPage, profile, overdueCount }) {
  const titles = { dashboard: 'Visão geral', transactions: 'Lançamentos', goals: 'Metas', categories: 'Categorias', profile: 'Meu perfil' }
  return <header className="topbar"><div className="mobile-logo"><Logo /></div><div className="topbar-title"><p className="eyebrow">CUSTOSVISION</p><h1>{titles[page]}</h1></div><div className="topbar-actions">{overdueCount > 0 && <button className="alert-pill" onClick={() => setPage('goals')}><span>!</span>{overdueCount} meta{overdueCount > 1 ? 's' : ''} vencida{overdueCount > 1 ? 's' : ''}</button>}<button className="avatar top-avatar" onClick={() => setPage('profile')} title="Abrir perfil">{getInitials(profile.name)}</button></div></header>
}

function Dashboard({ totals, transactions, goals, categories, profile, setPage, setModal }) {
  const savingRate = totals.income > 0 ? Math.max(0, Math.min(100, Math.round((totals.balance / totals.income) * 100))) : 0
  const expenseTransactions = transactions.filter(item => item.type === 'expense')
  const categoryTotals = categories.map(category => ({ label: category, value: sumMoney(expenseTransactions.filter(item => item.category === category)) })).filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 5)
  const maxCategory = Math.max(...categoryTotals.map(item => item.value), 1)
  const recent = [...transactions].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5)
  const completed = goals.filter(isGoalComplete).length
  const activeGoals = goals.filter(goal => !isGoalComplete(goal) && !isGoalOverdue(goal)).length
  const overdueCount = goals.filter(isGoalOverdue).length
  const nearest = goals.filter(goal => !isGoalComplete(goal) && goal.deadline).sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0]
  const biggestExpense = [...expenseTransactions].sort((a, b) => Number(b.value) - Number(a.value))[0]
  const monthlySeries = useMemo(() => buildMonthlySeries(transactions, 6), [transactions])
  const balanceTimeline = useMemo(() => buildBalanceTimeline(transactions, 12), [transactions])
  const expenseTotal = sumMoney(categoryTotals, item => item.value)
  const goalStatusData = [
    { label: 'Concluídas', value: completed },
    { label: 'Em andamento', value: activeGoals },
    { label: 'Vencidas', value: overdueCount },
  ].filter(item => item.value > 0)

  return <div className="page dashboard-page">
    <section className="welcome-row"><div><span className="section-kicker">SEU PANORAMA</span><h2>Olá, {getFirstName(profile.name)} 👋</h2><p>Uma visão simples para você saber onde está e qual é o próximo passo.</p></div><div className="quick-actions"><button className="btn secondary" onClick={() => setModal({ type: 'transaction', transactionType: 'expense' })}>− Nova despesa</button><button className="btn primary" onClick={() => setModal({ type: 'transaction', transactionType: 'income' })}>＋ Nova renda</button></div></section>

    <section className="cards-grid">
      <MetricCard label="Saldo atual" value={money.format(totals.balance)} note={totals.balance >= 0 ? 'Receitas menos despesas' : 'Atenção: saldo negativo'} icon="◈" tone="purple" trend={totals.balance >= 0 ? 'positivo' : 'atenção'} />
      <MetricCard label="Receitas" value={money.format(totals.income)} note={`${transactions.filter(item => item.type === 'income').length} entrada${transactions.filter(item => item.type === 'income').length !== 1 ? 's' : ''} registrada${transactions.filter(item => item.type === 'income').length !== 1 ? 's' : ''}`} icon="↗" tone="green" />
      <MetricCard label="Despesas" value={money.format(totals.expense)} note={`${expenseTransactions.length} saída${expenseTransactions.length !== 1 ? 's' : ''} registrada${expenseTransactions.length !== 1 ? 's' : ''}`} icon="↘" tone="red" />
      <MetricCard label="Taxa de economia" value={`${savingRate}%`} note="Percentual preservado da renda" icon="◎" tone="blue" />
    </section>

    <section className="panel chart-panel realtime-balance-panel">
      <PanelHeader title="Saldo em tempo real" subtitle="Cada renda faz a linha subir; cada despesa faz a linha cair" />
      {transactions.length ? <RunningBalanceChart data={balanceTimeline} /> : <MiniEmpty text="Adicione uma renda ou despesa para começar a formar sua curva de saldo." />}
    </section>

    <section className="dashboard-grid dashboard-grid-charts">
      <div className="panel chart-panel chart-panel-large">
        <PanelHeader title="Fluxo financeiro" subtitle="Receitas e despesas dos últimos 6 meses" />
        {transactions.length ? <CashFlowChart data={monthlySeries} /> : <MiniEmpty text="Adicione lançamentos para acompanhar a evolução mensal em gráfico." />}
      </div>
      <div className="panel chart-panel">
        <PanelHeader title="Distribuição das despesas" subtitle="Participação por categoria" action="Ver categorias" onAction={() => setPage('categories')} />
        {categoryTotals.length ? <DonutChart data={categoryTotals} totalLabel="Total em despesas" totalFormatter={value => money.format(value)} valueFormatter={value => money.format(value)} /> : <MiniEmpty text="Quando você registrar despesas, a divisão por categoria aparece aqui." />}
      </div>
    </section>

    <section className="dashboard-grid dashboard-grid-main">
      <div className="panel insight-panel">
        <PanelHeader title="Para onde seu dinheiro está indo" subtitle="Categorias com maior volume de despesas" action="Ver categorias" onAction={() => setPage('categories')} />
        {categoryTotals.length ? <div className="category-bars">{categoryTotals.map(item => <div className="category-bar-row" key={item.label}><div><strong>{item.label}</strong><span>{money.format(item.value)}</span></div><div className="category-track"><i style={{ width: `${expenseTotal > 0 ? (item.value / Math.max(expenseTotal, 1)) * 100 : (item.value / maxCategory) * 100}%` }} /></div></div>)}</div> : <MiniEmpty text="Quando você registrar despesas, este resumo aparece aqui." />}
      </div>

      <div className="panel financial-pulse">
        <PanelHeader title="Pulso financeiro" subtitle="Resumo rápido do que merece atenção" />
        <div className="pulse-list">
          <PulseItem icon="◎" label="Metas em andamento" value={`${activeGoals + overdueCount}`} detail={nearest ? `Próxima: ${nearest.name}` : 'Nenhuma meta pendente'} tone="purple" />
          <PulseItem icon="↘" label="Maior despesa" value={biggestExpense ? money.format(biggestExpense.value) : money.format(0)} detail={biggestExpense ? biggestExpense.description : 'Nenhuma despesa registrada'} tone="red" />
          <PulseItem icon="✓" label="Metas concluídas" value={`${completed}`} detail={goals.length ? `de ${goals.length} metas` : 'Crie sua primeira meta'} tone="green" />
        </div>
        {!!goalStatusData.length && <div className="pulse-goals-chart"><DonutChart data={goalStatusData} totalLabel="Metas" totalFormatter={value => `${value}`} valueFormatter={value => `${value} meta${value !== 1 ? 's' : ''}`} compact /></div>}
      </div>
    </section>

    <section className="dashboard-grid dashboard-grid-bottom">
      <div className="panel recent-panel">
        <PanelHeader title="Últimos lançamentos" subtitle="Movimentações mais recentes" action="Ver todos" onAction={() => setPage('transactions')} />
        <TransactionTable items={recent} compact />
      </div>
      <div className="panel goal-summary">
        <PanelHeader title="Metas em destaque" subtitle="Acompanhe seus objetivos" action="Ver todas" onAction={() => setPage('goals')} />
        {goals.length ? goals.slice(0, 3).map(goal => <GoalMini key={goal.id} goal={goal} />) : <MiniEmpty text="Crie uma meta e acompanhe o progresso por aqui." />}
        <button className="text-button" onClick={() => setModal({ type: 'goal' })}>＋ Criar nova meta</button>
      </div>
    </section>
  </div>
}

function MetricCard({ label, value, note, icon, tone, trend }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><p>{label}</p><strong>{value}</strong><small className={trend === 'atenção' ? 'note-danger' : ''}>{note}</small></article>
}

function PulseItem({ icon, label, value, detail, tone }) {
  return <div className="pulse-item"><span className={`pulse-icon ${tone}`}>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></div>
}

function PanelHeader({ title, subtitle, action, onAction }) {
  return <div className="panel-header"><div><h3>{title}</h3><p>{subtitle}</p></div>{action && <button onClick={onAction}>{action} →</button>}</div>
}

function RunningBalanceChart({ data }) {
  const width = 760
  const height = 270
  const padding = { top: 22, right: 24, bottom: 42, left: 58 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const balances = data.map(item => Number(item.balance) || 0)
  const rawMin = Math.min(0, ...balances)
  const rawMax = Math.max(0, ...balances)
  const spread = Math.max(rawMax - rawMin, 1)
  const margin = Math.max(spread * .12, 1)
  const minValue = rawMin - margin
  const maxValue = rawMax + margin
  const range = Math.max(maxValue - minValue, 1)
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0
  const xForIndex = index => padding.left + index * stepX
  const yForValue = value => padding.top + ((maxValue - value) / range) * chartHeight
  const zeroY = yForValue(0)
  const current = data[data.length - 1]
  const previous = data.length > 1 ? data[data.length - 2] : current
  const lastDelta = fromCents(toCents(current?.balance || 0) - toCents(previous?.balance || 0))
  const signature = data.map(item => `${item.id}-${item.balance}`).join('|')
  const gridValues = [0, .25, .5, .75, 1].map(step => minValue + range * step)

  return <div className="running-balance-shell">
    <div className="running-balance-head">
      <div><span>Saldo atual</span><strong className={(current?.balance || 0) >= 0 ? 'positive' : 'negative'}>{money.format(current?.balance || 0)}</strong></div>
      {current?.type !== 'start' && <div className={`last-movement ${current?.type === 'income' ? 'income' : 'expense'}`}><span>{current?.type === 'income' ? '↗ Última renda' : '↘ Última despesa'}</span><strong>{current?.type === 'income' ? '+' : '−'} {money.format(Math.abs(current?.value || lastDelta))}</strong><small>{current?.description}</small></div>}
    </div>
    <div className="running-chart-scroll">
      <svg viewBox={`0 0 ${width} ${height}`} className="running-balance-chart" role="img" aria-label="Evolução do saldo acumulado a cada lançamento">
        <defs>
          <linearGradient id={`balanceArea-${signature.length}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--purple)" stopOpacity=".16" /><stop offset="100%" stopColor="var(--purple)" stopOpacity="0" /></linearGradient>
        </defs>
        {gridValues.map((value, index) => {
          const y = yForValue(value)
          return <g key={`grid-${index}`}><line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="chart-grid-line" /><text x={padding.left - 8} y={y + 3} textAnchor="end" className="running-grid-label">{money.format(value)}</text></g>
        })}
        {zeroY >= padding.top && zeroY <= height - padding.bottom && <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} className="balance-zero-line" />}
        {data.slice(1).map((item, index) => {
          const prev = data[index]
          const x1 = xForIndex(index)
          const y1 = yForValue(prev.balance)
          const x2 = xForIndex(index + 1)
          const y2 = yForValue(item.balance)
          return <line key={`${signature}-segment-${item.id}`} x1={x1} y1={y1} x2={x2} y2={y2} className={`balance-segment ${item.type}`} />
        })}
        {data.map((item, index) => {
          const x = xForIndex(index)
          const y = yForValue(item.balance)
          const date = parseDate(item.date)
          const label = index === 0 ? 'Início' : date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'
          return <g key={`${signature}-point-${item.id}`}>
            <circle cx={x} cy={y} r={index === data.length - 1 ? 6 : 4} className={`balance-point ${item.type}`}><title>{index === 0 ? `Saldo inicial exibido: ${money.format(item.balance)}` : `${item.description}: ${item.type === 'income' ? '+' : '−'} ${money.format(item.value)} · Saldo ${money.format(item.balance)}`}</title></circle>
            {(data.length <= 9 || index === 0 || index === data.length - 1 || index % 2 === 0) && <text x={x} y={height - 14} textAnchor="middle" className="chart-axis-label">{label}</text>}
          </g>
        })}
      </svg>
    </div>
    <div className="movement-legend"><span><i className="income" />Renda: saldo sobe</span><span><i className="expense" />Despesa: saldo cai</span><span><i className="current" />Ponto atual</span></div>
  </div>
}

function CashFlowChart({ data }) {
  const width = 560
  const height = 240
  const paddingX = 28
  const paddingY = 22
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2
  const maxValue = Math.max(...data.flatMap(item => [item.income, item.expense, 0]), 1)
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0
  const yForValue = value => height - paddingY - (value / maxValue) * chartHeight
  const buildPath = key => data.map((item, index) => `${index === 0 ? 'M' : 'L'} ${paddingX + index * stepX} ${yForValue(item[key])}`).join(' ')
  const incomePath = buildPath('income')
  const expensePath = buildPath('expense')
  const gridValues = [0, .25, .5, .75, 1].map(step => maxValue * step)

  return <div className="chart-shell">
    <div className="chart-legend"><span><i className="income" />Receitas</span><span><i className="expense" />Despesas</span></div>
    <div className="chart-stage line-chart-stage">
      <svg viewBox={`0 0 ${width} ${height}`} className="line-chart" role="img" aria-label="Gráfico de receitas e despesas por mês">
        {gridValues.map((value, index) => {
          const y = yForValue(value)
          return <g key={index}><line x1={paddingX} y1={y} x2={width - paddingX} y2={y} className="chart-grid-line" /><text x={2} y={y + 3} className="chart-grid-label">{money.format(value)}</text></g>
        })}
        <path d={incomePath} className="chart-line income" />
        <path d={expensePath} className="chart-line expense" />
        {data.map((item, index) => {
          const x = paddingX + index * stepX
          return <g key={item.key}><circle cx={x} cy={yForValue(item.income)} r="4" className="chart-point income" /><circle cx={x} cy={yForValue(item.expense)} r="4" className="chart-point expense" /><text x={x} y={height - 4} textAnchor="middle" className="chart-axis-label">{item.label}</text></g>
        })}
      </svg>
    </div>
    <div className="chart-summary-grid">
      <div><span>Receitas no período</span><strong>{money.format(sumMoney(data, item => item.income))}</strong></div>
      <div><span>Despesas no período</span><strong>{money.format(sumMoney(data, item => item.expense))}</strong></div>
      <div><span>Melhor saldo mensal</span><strong>{money.format(Math.max(...data.map(item => item.balance), 0))}</strong></div>
    </div>
  </div>
}

function DonutChart({ data, totalLabel, totalFormatter, valueFormatter, compact = false }) {
  const palette = ['var(--purple)', '#6bc79f', '#4c83cb', '#ef8e62', '#e0649a', '#9c88ff']
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const radius = compact ? 48 : 56
  const circumference = 2 * Math.PI * radius
  let accumulator = 0

  return <div className={`donut-layout ${compact ? 'compact' : ''}`}>
    <div className="donut-visual">
      <svg viewBox="0 0 160 160" className="donut-chart" role="img" aria-label={totalLabel}>
        <circle cx="80" cy="80" r={radius} className="donut-track" />
        {data.map((item, index) => {
          const value = Number(item.value || 0)
          const portion = total > 0 ? value / total : 0
          const dash = portion * circumference
          const offset = -accumulator * circumference
          accumulator += portion
          return <circle key={item.label} cx="80" cy="80" r={radius} className="donut-segment" style={{ stroke: palette[index % palette.length], strokeDasharray: `${dash} ${circumference - dash}`, strokeDashoffset: offset }} />
        })}
      </svg>
      <div className="donut-center"><span>{totalLabel}</span><strong>{totalFormatter(total)}</strong></div>
    </div>
    <div className="donut-legend">{data.map((item, index) => {
      const share = total > 0 ? (Number(item.value || 0) / total) * 100 : 0
      return <div className="donut-legend-row" key={item.label}><span><i style={{ background: palette[index % palette.length] }} />{item.label}</span><strong>{valueFormatter(item.value)}</strong><small>{percentFmt.format(share)}%</small></div>
    })}</div>
  </div>
}

function GoalProgressChart({ goals }) {
  const orderedGoals = [...goals].sort((a, b) => goalProgress(b) - goalProgress(a)).slice(0, 5)
  return <div className="goal-progress-list">{orderedGoals.map(goal => {
    const progress = goalProgress(goal)
    const status = goalStatus(goal)
    return <div className="goal-progress-item" key={goal.id}><div className="goal-progress-top"><strong>{goal.name}</strong><span>{formatProgress(progress)}</span></div><div className="goal-progress-bar"><i style={{ width: `${progress}%` }} /></div><div className="goal-progress-meta"><small>{money.format(goal.saved)} de {money.format(goal.target)}</small><b className={`status-inline ${status === 'Concluída' ? 'done' : status === 'Vencida' ? 'danger' : 'pending'}`}>{status}</b></div></div>
  })}</div>
}

function GoalMini({ goal }) {
  const progress = goalProgress(goal)
  const status = goalStatus(goal)
  const days = daysUntil(goal.deadline)

  let deadlineText = 'Sem prazo'

  if (goal.deadline) {
    if (status === 'Concluída') {
      deadlineText = 'Meta concluída'
    } else if (days === 0) {
      deadlineText = 'Vence hoje'
    } else if (days < 0) {
      deadlineText = `Vencida há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`
    } else {
      deadlineText = `${days} dia${days !== 1 ? 's' : ''} restante${days !== 1 ? 's' : ''}`
    }
  }

  return (
    <div className="goal-mini">
      <div className="goal-mini-top">
        <div>
          <strong>{goal.name}</strong>
          <small>{deadlineText}</small>
        </div>

        <span>{formatProgress(progress)}</span>
      </div>

      <div className="progress">
        <i style={{ width: `${progress}%` }} />
      </div>

      <div className="goal-mini-bottom">
        <span>
          {money.format(goal.saved || 0)} de {money.format(goal.target || 0)}
        </span>

        <span
          className={`status-inline ${
            status === 'Concluída'
              ? 'done'
              : status === 'Vencida'
                ? 'danger'
                : 'pending'
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  )
}

function Transactions({ transactions, categories, setModal }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('all')
  const [month, setMonth] = useState('all')

  const months = useMemo(() => [...new Set(transactions.map(item => String(item.date).slice(0, 7)).filter(Boolean))].sort().reverse(), [transactions])
  const filtered = useMemo(() => [...transactions]
    .filter(item => `${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase()))
    .filter(item => type === 'all' || item.type === type)
    .filter(item => category === 'all' || item.category === category)
    .filter(item => month === 'all' || String(item.date).startsWith(month))
    .sort((a, b) => String(b.date).localeCompare(String(a.date))), [transactions, search, type, category, month])

  const filteredIncome = sumMoney(filtered.filter(item => item.type === 'income'))
  const filteredExpense = sumMoney(filtered.filter(item => item.type === 'expense'))
  const filteredBalance = fromCents(toCents(filteredIncome) - toCents(filteredExpense))
  const monthlySeries = useMemo(() => buildMonthlySeries(filtered, 6), [filtered])
  const balanceTimeline = useMemo(() => buildBalanceTimeline(filtered, 12), [filtered])
  const filteredExpensesByCategory = categories.map(label => ({ label, value: sumMoney(filtered.filter(item => item.type === 'expense' && item.category === label)) })).filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 5)

  const exportCsv = () => {
    const header = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor']
    const rows = filtered.map(item => [item.date, item.type === 'income' ? 'Renda' : 'Despesa', item.description, item.category, Number(item.value).toFixed(2).replace('.', ',')])
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n')
    downloadFile(`custosvision-lancamentos-${todayInputValue()}.csv`, `﻿${csv}`, 'text/csv;charset=utf-8')
  }

  return <div className="page">
    <section className="section-heading"><div><span className="section-kicker">MOVIMENTAÇÕES</span><h2>Seus lançamentos</h2><p>Busque, filtre, edite e acompanhe tudo que entrou e saiu.</p></div><div className="heading-actions"><button className="btn secondary" disabled={!filtered.length} onClick={exportCsv}>↓ Exportar CSV</button><button className="btn primary" onClick={() => setModal({ type: 'transaction', transactionType: 'expense' })}>＋ Novo lançamento</button></div></section>

    <section className="mini-metrics-grid"><MiniMetric label="Receitas filtradas" value={money.format(filteredIncome)} tone="green" /><MiniMetric label="Despesas filtradas" value={money.format(filteredExpense)} tone="red" /><MiniMetric label="Resultado" value={money.format(filteredBalance)} tone={filteredBalance >= 0 ? 'purple' : 'red'} /></section>

    <div className="panel filters-panel">
      <div className="search-box wide">⌕<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por descrição ou categoria" /></div>
      <select value={type} onChange={event => setType(event.target.value)}><option value="all">Todos os tipos</option><option value="income">Rendas</option><option value="expense">Despesas</option></select>
      <select value={category} onChange={event => setCategory(event.target.value)}><option value="all">Todas as categorias</option><option>Renda principal</option><option>Renda extra</option>{categories.map(item => <option key={item}>{item}</option>)}</select>
      <select value={month} onChange={event => setMonth(event.target.value)}><option value="all">Todos os meses</option>{months.map(item => <option key={item} value={item}>{new Date(`${item}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</option>)}</select>
      <span className="filter-count">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
    </div>

    <section className="panel chart-panel realtime-balance-panel page-charts-inline">
      <PanelHeader title="Saldo acumulado dos lançamentos filtrados" subtitle="O gráfico reage instantaneamente aos lançamentos visíveis no filtro" />
      {filtered.length ? <RunningBalanceChart data={balanceTimeline} /> : <MiniEmpty text="Ajuste os filtros ou cadastre lançamentos para visualizar a curva de saldo." />}
    </section>

    <section className="dashboard-grid dashboard-grid-charts page-charts-inline">
      <div className="panel chart-panel chart-panel-large">
        <PanelHeader title="Evolução mensal filtrada" subtitle="Receitas e despesas conforme os filtros aplicados" />
        {filtered.length ? <CashFlowChart data={monthlySeries} /> : <MiniEmpty text="Ajuste os filtros ou cadastre lançamentos para visualizar o gráfico." />}
      </div>
      <div className="panel chart-panel">
        <PanelHeader title="Despesas por categoria" subtitle="Composição do filtro atual" />
        {filteredExpensesByCategory.length ? <DonutChart data={filteredExpensesByCategory} totalLabel="Despesas filtradas" totalFormatter={value => money.format(value)} valueFormatter={value => money.format(value)} /> : <MiniEmpty text="Quando houver despesas no filtro atual, elas aparecerão divididas aqui." />}
      </div>
    </section>

    <section className="panel table-panel"><TransactionTable items={filtered} onEdit={transaction => setModal({ type: 'transaction', transaction })} onDelete={transaction => setModal({ type: 'delete-transaction', transaction })} /></section>
  </div>
}

function TransactionTable({ items, compact = false, onEdit, onDelete }) {
  if (!items.length) return <EmptyState title="Nenhum lançamento encontrado" text="Adicione uma renda ou despesa, ou ajuste os filtros para encontrar outros resultados." />
  return <div className="table-wrap"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Tipo</th><th className="right">Valor</th>{!compact && <th className="right">Ações</th>}</tr></thead><tbody>{items.map(item => <tr key={item.id}><td><div className="description-cell"><span className={`type-dot ${item.type}`}>{item.type === 'income' ? '↗' : '↘'}</span><strong>{item.description}</strong></div></td><td>{item.category}</td><td>{parseDate(item.date) ? dateShortFmt.format(parseDate(item.date)) : '—'}</td><td><span className={`badge ${item.type}`}>{item.type === 'income' ? 'Renda' : 'Despesa'}</span></td><td className={`right value ${item.type}`}>{item.type === 'income' ? '+' : '−'} {money.format(item.value)}</td>{!compact && <td className="right"><div className="table-actions"><button className="icon-button" title="Editar" onClick={() => onEdit(item)}>✎</button><button className="icon-button danger" title="Excluir" onClick={() => onDelete(item)}>×</button></div></td>}</tr>)}</tbody></table></div>
}

function Goals({ goals, setModal }) {
  const overdue = goals.filter(isGoalOverdue)
  const totalTarget = sumMoney(goals, goal => goal.target)
  const totalSaved = sumMoney(goals, goal => Math.min(Number(goal.saved) || 0, Number(goal.target) || 0))
  const completed = goals.filter(isGoalComplete).length
  const averageProgress = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goalProgress(goal), 0) / goals.length) : 0
  const active = goals.filter(goal => !isGoalComplete(goal) && !isGoalOverdue(goal)).length
  const goalDistribution = [
    { label: 'Concluídas', value: completed },
    { label: 'Em andamento', value: active },
    { label: 'Vencidas', value: overdue.length },
  ].filter(item => item.value > 0)

  return <div className="page">
    <section className="section-heading"><div><span className="section-kicker">OBJETIVOS</span><h2>Metas financeiras</h2><p>Transforme planos em objetivos com valor, prazo e progresso visível.</p></div><button className="btn primary" onClick={() => setModal({ type: 'goal' })}>＋ Nova meta</button></section>
    <section className="mini-metrics-grid goals-metrics"><MiniMetric label="Total planejado" value={money.format(totalTarget)} tone="purple" /><MiniMetric label="Já acumulado" value={money.format(totalSaved)} tone="green" /><MiniMetric label="Progresso médio" value={`${averageProgress}%`} tone="blue" /><MiniMetric label="Concluídas" value={`${completed}/${goals.length}`} tone="green" /></section>
    {overdue.length > 0 && <div className="goal-alert"><span>!</span><div><strong>Atenção aos prazos</strong><p>Você tem {overdue.length} meta{overdue.length > 1 ? 's' : ''} vencida{overdue.length > 1 ? 's' : ''} que ainda precisa{overdue.length > 1 ? 'm' : ''} ser concluída{overdue.length > 1 ? 's' : ''}.</p></div></div>}

    {!!goals.length && <section className="dashboard-grid dashboard-grid-charts page-charts-inline">
      <div className="panel chart-panel">
        <PanelHeader title="Distribuição das metas" subtitle="Status atual dos seus objetivos" />
        <DonutChart data={goalDistribution} totalLabel="Metas" totalFormatter={value => `${value}`} valueFormatter={value => `${value} meta${value !== 1 ? 's' : ''}`} />
      </div>
      <div className="panel chart-panel chart-panel-large">
        <PanelHeader title="Progresso por objetivo" subtitle="As metas mais avançadas do seu plano" />
        <GoalProgressChart goals={goals} />
      </div>
    </section>}

    {goals.length ? <div className="goals-grid">{goals.map(goal => <GoalCard key={goal.id} goal={goal} onContribution={() => setModal({ type: 'contribution', goal })} onEdit={() => setModal({ type: 'goal', goal })} onDelete={() => setModal({ type: 'delete-goal', goal })} />)}</div> : <section className="panel"><EmptyState title="Você ainda não criou metas" text="Crie seu primeiro objetivo financeiro e acompanhe cada avanço até chegar lá." action="Criar primeira meta" onAction={() => setModal({ type: 'goal' })} /></section>}
  </div>
}

function GoalCard({ goal, onContribution, onEdit, onDelete }) {
  const progress = goalProgress(goal)
  const status = goalStatus(goal)
  const days = daysUntil(goal.deadline)

  const saved = Number(goal.saved) || 0
  const target = Number(goal.target) || 0
  const remaining = Math.max(0, target - saved)

  let deadlineText = 'Sem prazo definido'

  if (goal.deadline) {
    if (status === 'Concluída') {
      deadlineText = 'Meta concluída'
    } else if (days === 0) {
      deadlineText = 'Vence hoje'
    } else if (days < 0) {
      const overdueDays = Math.abs(days)
      deadlineText = `Vencida há ${overdueDays} dia${overdueDays !== 1 ? 's' : ''}`
    } else {
      deadlineText = `${days} dia${days !== 1 ? 's' : ''} restante${days !== 1 ? 's' : ''}`
    }
  }

  return (
    <article className="goal-card">

      <div className="goal-card-header">
        <div>
          <span
            className={`status-inline ${
              status === 'Concluída'
                ? 'done'
                : status === 'Vencida'
                  ? 'danger'
                  : 'pending'
            }`}
          >
            {status}
          </span>

          <h3>{goal.name}</h3>
        </div>

        <div className="goal-card-actions">
          <button
            className="icon-button"
            title="Editar meta"
            onClick={onEdit}
          >
            ✎
          </button>

          <button
            className="icon-button danger"
            title="Excluir meta"
            onClick={onDelete}
          >
            ×
          </button>
        </div>
      </div>

      <div className="goal-values">
        <div>
          <span>Acumulado</span>
          <strong>{money.format(saved)}</strong>
        </div>

        <div>
          <span>Objetivo</span>
          <strong>{money.format(target)}</strong>
        </div>
      </div>

      <div className="goal-progress-info">
        <span>Progresso</span>
        <strong>{formatProgress(progress)}</strong>
      </div>

      <div className="goal-progress-bar">
        <i style={{ width: `${progress}%` }} />
      </div>

      <div className="goal-card-details">
        <div>
          <span>Falta</span>
          <strong>{money.format(remaining)}</strong>
        </div>

        <div>
          <span>Prazo</span>
          <strong>
            {goal.deadline && parseDate(goal.deadline)
              ? dateLongFmt.format(parseDate(goal.deadline))
              : '—'}
          </strong>
        </div>
      </div>

      <div className="goal-deadline">
        <span>◷</span>
        <span>{deadlineText}</span>
      </div>

      {status !== 'Concluída' && (
        <button
          className="btn primary goal-contribution-button"
          onClick={onContribution}
        >
          ＋ Adicionar aporte
        </button>
      )}

    </article>
  )
}

function Categories({ categories, transactions, setModal }) {
  const expenseTransactions = transactions.filter(item => item.type === 'expense')
  const totalExpenses = sumMoney(expenseTransactions)
  const data = categories.map((category, index) => {
    const items = expenseTransactions.filter(item => item.category === category)
    const total = sumMoney(items)
    return { category, total, count: items.length, index }
  }).sort((a, b) => b.total - a.total)
  const chartData = data.filter(item => item.total > 0).slice(0, 5).map(item => ({ label: item.category, value: item.total }))

  return <div className="page">
    <section className="section-heading"><div><span className="section-kicker">ORGANIZAÇÃO</span><h2>Categorias</h2><p>Entenda quais áreas concentram mais despesas e mantenha seus registros consistentes.</p></div><button className="btn primary" onClick={() => setModal({ type: 'category' })}>＋ Nova categoria</button></section>
    <section className="category-overview panel"><div><span>Total em despesas</span><strong>{money.format(totalExpenses)}</strong></div><div><span>Categorias ativas</span><strong>{data.filter(item => item.count > 0).length}</strong></div><div><span>Categorias cadastradas</span><strong>{categories.length}</strong></div></section>

    <section className="dashboard-grid dashboard-grid-charts page-charts-inline">
      <div className="panel chart-panel chart-panel-large">
        <PanelHeader title="Categorias que mais pesam" subtitle="Participação das principais despesas" />
        {chartData.length ? <DonutChart data={chartData} totalLabel="Despesas" totalFormatter={value => money.format(value)} valueFormatter={value => money.format(value)} /> : <MiniEmpty text="Registre despesas para ver a participação de cada categoria." />}
      </div>
      <div className="panel insight-panel">
        <PanelHeader title="Leitura rápida" subtitle="Resumo proporcional das categorias" />
        {data.some(item => item.total > 0) ? <div className="category-bars">{data.filter(item => item.total > 0).slice(0, 5).map(({ category, total }) => {
          const share = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
          return <div className="category-bar-row" key={category}><div><strong>{category}</strong><span>{money.format(total)}</span></div><div className="category-track"><i style={{ width: `${share}%` }} /></div></div>
        })}</div> : <MiniEmpty text="As categorias passam a ganhar comparação visual assim que houver despesas." />}
      </div>
    </section>

    <div className="category-grid">{data.map(({ category, total, count, index }) => {
      const share = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0
      return <article className="category-card" key={category}><span className={`category-symbol c${index % 5}`}>{['⌂','◉','▤','◆','＋'][index % 5]}</span><div className="category-card-main"><div className="category-title-row"><h3>{category}</h3><span>{share}%</span></div><p>{money.format(total)} · {count} lançamento{count !== 1 ? 's' : ''}</p><div className="category-progress"><i style={{ width: `${share}%` }} /></div></div><button className="icon-button subtle danger" title="Excluir categoria" onClick={() => setModal({ type: 'delete-category', category })}>×</button></article>
    })}</div>
  </div>
}

function Profile({ profile, authUser, onSave, onChangePassword, onExport, onReset, onLogout }) {
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  useEffect(() => { setName(profile.name); setEmail(profile.email) }, [profile])

  const submitProfile = event => {
    event.preventDefault()
    if (name.trim() && email.trim()) onSave({ name, email })
  }

  const created = authUser?.createdAt ? new Date(authUser.createdAt) : null

  return <div className="page profile-page">
    <section className="section-heading"><div><span className="section-kicker">CONTA</span><h2>Meu perfil</h2><p>Gerencie seus dados, segurança e uma cópia local das suas informações.</p></div></section>
    <div className="profile-layout">
      <aside className="panel profile-card"><span className="avatar avatar-xl">{getInitials(name)}</span><h3>{name}</h3><p>{email}</p><div className="profile-divider" /><div className="profile-meta"><span><small>Conta criada</small><strong>{created && !Number.isNaN(created.getTime()) ? created.toLocaleDateString('pt-BR') : '—'}</strong></span><span><small>Armazenamento</small><strong>Local neste navegador</strong></span></div></aside>
      <div className="profile-stack">
        <form className="panel profile-form" onSubmit={submitProfile}><PanelHeader title="Informações pessoais" subtitle="Esses dados identificam sua conta no CustosVision" /><Field label="Nome completo"><input required value={name} onChange={event => setName(event.target.value)} /></Field><Field label="E-mail"><input required type="email" value={email} onChange={event => setEmail(event.target.value)} /></Field><div className="form-actions"><button className="btn primary" type="submit">Salvar alterações</button></div></form>
        <section className="panel settings-card"><PanelHeader title="Segurança" subtitle="Proteja o acesso à sua conta local" /><div className="settings-row"><div><strong>Senha da conta</strong><p>Altere sua senha sempre que achar necessário.</p></div><button className="btn secondary" onClick={onChangePassword}>Alterar senha</button></div><div className="settings-row"><div><strong>Sessão atual</strong><p>Encerre o acesso neste navegador.</p></div><button className="btn secondary" onClick={onLogout}>Sair da conta</button></div></section>
        <section className="panel settings-card"><PanelHeader title="Dados e backup" subtitle="Recursos úteis para apresentação e segurança do protótipo" /><div className="settings-row"><div><strong>Exportar backup</strong><p>Baixe metas, lançamentos, categorias e perfil em JSON.</p></div><button className="btn secondary" onClick={onExport}>↓ Exportar</button></div><div className="settings-row danger-row"><div><strong>Redefinir dados financeiros</strong><p>Apaga lançamentos e metas desta conta, mantendo login e perfil.</p></div><button className="btn danger-outline" onClick={onReset}>Redefinir</button></div></section>
      </div>
    </div>
  </div>
}

function MiniMetric({ label, value, tone = 'purple' }) {
  return <article className={`mini-metric ${tone}`}><span>{label}</span><strong>{value}</strong></article>
}

function MiniEmpty({ text }) {
  return <div className="mini-empty"><span>◎</span><p>{text}</p></div>
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

function Modal({ title, subtitle, onClose, children, narrow = false }) {
  useEffect(() => {
    const handleKey = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className={`modal ${narrow ? 'modal-narrow' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><h3>{title}</h3><p>{subtitle}</p></div><button onClick={onClose} aria-label="Fechar">×</button></div>{children}</div></div>
}

function TransactionModal({ categories, initialType, transaction, onClose, onSubmit }) {
  const [form, setForm] = useState(() => transaction ? { ...transaction, value: Number(transaction.value).toFixed(2) } : { type: initialType || 'expense', description: '', category: categories[0] || 'Outros', date: todayInputValue(), value: '' })
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = event => {
    event.preventDefault()
    if (!form.description.trim() || toCents(form.value) <= 0) return
    if (transaction) onSubmit(transaction.id, form)
    else onSubmit(form)
  }
  return <Modal title={transaction ? 'Editar lançamento' : 'Novo lançamento'} subtitle={transaction ? 'Atualize os dados desta movimentação.' : 'Registre uma movimentação financeira.'} onClose={onClose}><form onSubmit={submit} className="form-grid"><Field label="Tipo"><div className="segmented"><button type="button" className={form.type === 'expense' ? 'selected' : ''} onClick={() => setForm({ ...form, type: 'expense' })}>Despesa</button><button type="button" className={form.type === 'income' ? 'selected' : ''} onClick={() => setForm({ ...form, type: 'income' })}>Renda</button></div></Field><Field label="Descrição"><input autoFocus required name="description" value={form.description} onChange={update} placeholder="Ex.: Supermercado" /></Field><Field label="Valor"><input required min="0.01" step="0.01" name="value" type="number" value={form.value} onChange={update} placeholder="0,00" /></Field><Field label="Data"><input required name="date" type="date" value={form.date} onChange={update} /></Field><label className="field full-field"><span>Categoria</span><select name="category" value={form.category} onChange={update}>{form.type === 'income' && <><option>Renda principal</option><option>Renda extra</option></>}{categories.map(category => <option key={category}>{category}</option>)}</select></label><div className="modal-actions full-field"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary">{transaction ? 'Salvar alterações' : 'Salvar lançamento'}</button></div></form></Modal>
}

function GoalModal({ goal, onClose, onSubmit }) {
  const [form, setForm] = useState(() => goal ? { name: goal.name, target: Number(goal.target).toFixed(2), saved: Number(goal.saved).toFixed(2), deadline: goal.deadline } : { name: '', target: '', saved: '', deadline: '' })
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = event => {
    event.preventDefault()
    if (!form.name.trim() || toCents(form.target) <= 0 || !form.deadline) return
    if (goal) onSubmit(goal.id, form)
    else onSubmit(form)
  }
  return <Modal title={goal ? 'Editar meta' : 'Nova meta'} subtitle={goal ? 'Ajuste nome, valores ou prazo do objetivo.' : 'Defina um objetivo para manter o foco.'} onClose={onClose}><form onSubmit={submit} className="form-grid"><label className="field full-field"><span>Nome da meta</span><input autoFocus required name="name" value={form.name} onChange={update} placeholder="Ex.: Reserva de emergência" /></label><Field label="Valor objetivo"><input required min="0.01" step="0.01" type="number" name="target" value={form.target} onChange={update} placeholder="0,00" /></Field><Field label="Valor acumulado"><input min="0" step="0.01" type="number" name="saved" value={form.saved} onChange={update} placeholder="0,00" /></Field><label className="field full-field"><span>Prazo</span><input required type="date" name="deadline" value={form.deadline} onChange={update} /></label><div className="modal-actions full-field"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary">{goal ? 'Salvar alterações' : 'Criar meta'}</button></div></form></Modal>
}

function ContributionModal({ goal, onClose, onSubmit }) {
  const [value, setValue] = useState('')
  const targetCents = toCents(goal.target)
  const savedCents = toCents(goal.saved)
  const remainingCents = Math.max(0, targetCents - savedCents)
  const remaining = fromCents(remainingCents)
  const maxContribution = remaining.toFixed(2)
  const submit = event => {
    event.preventDefault()
    const contributionCents = toCents(value)
    if (contributionCents > 0 && contributionCents <= remainingCents) onSubmit(goal.id, fromCents(contributionCents))
  }
  return <Modal title="Fazer aporte" subtitle={goal.name} onClose={onClose}><form onSubmit={submit} className="form-grid"><div className="contribution-summary full-field"><span>Falta para a meta</span><strong>{money.format(remaining)}</strong></div><label className="field full-field"><span>Valor do aporte</span><input autoFocus required min="0.01" max={maxContribution} step="0.01" type="number" value={value} onChange={event => setValue(event.target.value)} placeholder="0,00" /></label><div className="quick-values full-field">{[25, 50, 100].map(percent => { const amount = fromCents(Math.floor((remainingCents * percent) / 100)); return <button type="button" key={percent} disabled={amount < 0.01} onClick={() => setValue(Math.min(remaining, amount).toFixed(2))}>{percent}% <span>{money.format(amount)}</span></button> })}<button type="button" onClick={() => setValue(maxContribution)}>Completar <span>{money.format(remaining)}</span></button></div><div className="modal-actions full-field"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary">Registrar aporte</button></div></form></Modal>
}

function PasswordModal({ onClose, onSubmit }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const strength = passwordStrength(password)

  const submit = async event => {
    event.preventDefault()
    if (password.length < 6) return setError('A nova senha deve ter pelo menos 6 caracteres.')
    if (password !== confirmPassword) return setError('As senhas não coincidem.')
    if (currentPassword === password) return setError('Escolha uma senha diferente da atual.')
    setSaving(true)
    setError('')
    const result = await onSubmit(currentPassword, password)
    setSaving(false)
    if (result && !result.ok) setError(result.error)
  }

  return <Modal title="Alterar senha" subtitle="Confirme sua senha atual e defina uma nova." onClose={onClose}><form onSubmit={submit} className="form-grid"><label className="field full-field"><span>Senha atual</span><input autoFocus required type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} placeholder="Digite sua senha atual" /></label><label className="field full-field"><span>Nova senha</span><input required minLength="6" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" /></label><div className="password-strength full-field"><div>{[0,1,2,3,4].map(index => <i key={index} className={index < strength.score ? 'active' : ''} />)}</div><span>{strength.label}</span></div><label className="field full-field"><span>Confirmar nova senha</span><input required minLength="6" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Digite a senha novamente" /></label>{error && <div className="form-error full-field">{error}</div>}<p className="password-note full-field">Nesta versão acadêmica, a autenticação é local. Em produção, login e senha devem ser validados no backend.</p><div className="modal-actions full-field"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar nova senha'}</button></div></form></Modal>
}

function CategoryModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const submit = event => {
    event.preventDefault()
    const result = onSubmit(name)
    if (result && !result.ok) setError(result.error)
  }
  return <Modal title="Nova categoria" subtitle="Crie uma categoria personalizada para suas despesas." onClose={onClose} narrow><form onSubmit={submit} className="form-grid"><label className="field full-field"><span>Nome</span><input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Assinaturas" /></label>{error && <div className="form-error full-field">{error}</div>}<div className="modal-actions full-field"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary">Criar categoria</button></div></form></Modal>
}

function ConfirmModal({ title, text, confirmLabel, danger = false, onClose, onConfirm }) {
  return <Modal title={title} subtitle={text} onClose={onClose} narrow><div className="confirm-box"><span className={danger ? 'danger' : ''}>{danger ? '!' : '↪'}</span><p>{danger ? 'Esta ação não pode ser desfeita.' : 'Você poderá entrar novamente quando quiser.'}</p></div><div className="modal-actions"><button className="btn secondary" onClick={onClose}>Cancelar</button><button className={danger ? 'btn danger-solid' : 'btn primary'} onClick={onConfirm}>{confirmLabel}</button></div></Modal>
}

function Toast({ toast, onClose }) {
  const icons = { success: '✓', warning: '!', error: '×' }
  return <div className={`toast ${toast.tone || 'success'}`} role="status"><span>{icons[toast.tone] || icons.success}</span><p>{toast.message}</p><button onClick={onClose} aria-label="Fechar aviso">×</button></div>
}

function EmptyState({ title, text, action, onAction }) {
  return <div className="empty"><span>◎</span><h3>{title}</h3><p>{text}</p>{action && <button className="btn primary" onClick={onAction}>{action}</button>}</div>
}

export default App
