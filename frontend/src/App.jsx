import { useEffect, useMemo, useState, useRef } from 'react'
import './App.css'
import custosVisionLogo from './assets/custosvision-logo.png'
import { parseCurrencyDigits, displayCurrency, toCents, fromCents, sumMoney } from './currency.js'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percentFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const dateShortFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const dateLongFmt = new Intl.DateTimeFormat('pt-BR')

const chartPalette = ['#7c5ce0', '#3284d6', '#e58a32', '#d95887', '#23a58c', '#ba65cf', '#bd6546', '#6b8d32']

const initialCategories = [
  'Alimentação',
  'Moradia',
  'Contas',
  'Mobilidade',
  'Saúde',
  'Educação',
  'Lazer',
]
const initialProfile = { name: 'João Silva', email: 'joao@email.com' }
const AUTH_SESSION_KEY = 'cv-auth-session'
const AUTH_TOKEN_KEY = 'cv-auth-token'
const MAX_VALUE = 99999999.99
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

function capitalizeFirstLetter(value = '') {
  return String(value).replace(/^(\s*)([a-zà-ÿ])/i, (_, spaces, letter) => `${spaces}${letter.toUpperCase()}`)
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
  const text = String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const date = new Date(`${text}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const [year, month, day] = text.split('-').map(Number)
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day
    ? date
    : null
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

function normalizeCpf(cpf = '') {
  return cpf.replace(/\D/g, '').slice(0, 11)
}

function formatCpf(cpf = '') {
  const digits = normalizeCpf(cpf)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

async function hashPassword(password) {
  if (!window.crypto?.subtle)
    throw new Error('Seu navegador não oferece suporte à proteção de senha usada pelo protótipo.')
  const data = new TextEncoder().encode(password)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function apiRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY) || ''}`,
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está ligado e tente novamente.')
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('O servidor não retornou os dados da API. Verifique se o backend está ligado e se o endereço da API está correto.')
  }
  const payload = await response.json()
  if (!response.ok) {
    const error = new Error(
      payload?.erro ||
        payload?.detalhe ||
        payload?.error ||
        payload?.message ||
        'Não foi possível concluir a operação.',
    )
    error.status = response.status
    throw error
  }

  return payload
}

function mapApiUser(user) {
  if (!user) return null
  return {
    id: String(user.id_usuario),
    id_usuario: user.id_usuario,
    name: user.nome,
    email: user.email,
  }
}

function mapApiTransaction(item, type) {
  if (!item) throw new Error('A API não retornou o lançamento salvo.')
  const databaseId = item[type === 'expense' ? 'id_despesa' : 'id_renda']
  if (databaseId == null) throw new Error('O lançamento retornou sem identificador.')
  return {
    id: `${type}-${databaseId}`,
    databaseId,
    databaseType: type,
    type,
    description: item.descricao || '',
    category: item[type === 'expense' ? 'tipo_despesa' : 'tipo_renda'] || 'Outros',
    periodicity: item.periodicidade || 'Única',
    date: String(item.datas || item.data || '').slice(0, 10),
    value: Number(item.valor) || 0,
  }
}

function getSessionUserId() {
  return localStorage.getItem(AUTH_SESSION_KEY)
}

function mapApiGoal(item) {
  return {
    id: item.id_meta,
    name: item.nome,
    target: Number(item.valor_objetivo),
    saved: Number(item.valor_acumulado),
    deadline: String(item.prazo).slice(0, 10),
  }
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
  return Math.min(99.99, Math.round((savedCents / targetCents) * 100 * 100) / 100)
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
  return Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000,
  )
}

function formatMonthLabel(monthKey) {
  if (!monthKey) return '—'
  const date = parseDate(`${monthKey}-01`)
  return date ? date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : monthKey
}

function buildMonthlySeries(transactions, months = 6, selectedMonth = null) {
  const latest = transactions
    .map((item) => item.date)
    .filter((value) => parseDate(value))
    .sort()
    .at(-1)
  const base = selectedMonth ? parseDate(`${selectedMonth}-01`) : parseDate(latest) || new Date()
  if (selectedMonth) months = 1
  const series = []

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(base.getFullYear(), base.getMonth() - offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthItems = transactions.filter((item) => String(item.date).startsWith(key))
    const income = sumMoney(monthItems.filter((item) => item.type === 'income'))
    const expense = sumMoney(monthItems.filter((item) => item.type === 'expense'))
    series.push({
      key,
      count: monthItems.length,
      label: formatMonthLabel(key),
      income,
      expense,
      balance: fromCents(toCents(income) - toCents(expense)),
    })
  }

  return series
}

function buildBalanceTimeline(transactions, limit = 12) {
  const ordered = [...transactions].sort((a, b) => {
    const dateCompare = String(a.date || '').localeCompare(String(b.date || ''))
    if (dateCompare !== 0) return dateCompare
    return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true })
  })

  let balanceCents = 0
  const allPoints = ordered.map((item) => {
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


function niceAxisStep(maxAbs, targetSteps = 4) {
  const safeMax = Math.max(Math.abs(Number(maxAbs) || 0), 1)
  const rawStep = safeMax / targetSteps
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

function buildSymmetricScale(values, targetSteps = 4) {
  const maxAbs = Math.max(...values.map(value => Math.abs(Number(value) || 0)), 1)
  const step = niceAxisStep(maxAbs, targetSteps)
  const limit = Math.max(step, Math.ceil(maxAbs / step) * step)
  const ticks = []
  for (let value = limit; value >= -limit; value -= step) ticks.push(Math.abs(value) < step / 1000 ? 0 : value)
  return { min: -limit, max: limit, range: limit * 2, step, ticks }
}

function formatAxisTick(value) {
  const rounded = Math.round(Number(value) || 0)
  const formatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.abs(rounded))
  if (rounded > 0) return `+${formatted}`
  if (rounded < 0) return `−${formatted}`
  return '0'
}

function groupTransactionsByDescription(items) {
  const grouped = new Map()
  items.forEach(item => {
    const label = String(item.description || 'Sem descrição').trim() || 'Sem descrição'
    const key = label.toLocaleLowerCase('pt-BR')
    const current = grouped.get(key) || { label, value: 0, count: 0 }
    current.value = fromCents(toCents(current.value) + toCents(item.value))
    current.count += 1
    grouped.set(key, current)
  })
  return [...grouped.values()].sort((a, b) => b.value - a.value)
}

function getMonthlyIncomeSummary(transactions) {
  const incomes = transactions.filter(item => item.type === 'income')
  const monthKeys = [...new Set(incomes.map(item => String(item.date || '').slice(0, 7)).filter(Boolean))]
  const divisor = Math.max(monthKeys.length, 1)
  const principalTotal = sumMoney(incomes.filter(item => item.category === 'Renda principal'))
  const extraTotal = sumMoney(incomes.filter(item => item.category === 'Renda extra'))
  return {
    months: monthKeys.length,
    principalAverage: fromCents(Math.round(toCents(principalTotal) / divisor)),
    extraAverage: fromCents(Math.round(toCents(extraTotal) / divisor)),
    totalAverage: fromCents(Math.round(toCents(principalTotal + extraTotal) / divisor)),
  }
}

function getGoalMonthlyPlan(goal, incomeSummary) {
  const target = Number(goal?.target) || 0
  const saved = Number(goal?.saved) || 0
  const remaining = Math.max(0, target - saved)
  const deadline = parseDate(goal?.deadline)
  if (!deadline || target <= 0) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  const days = Math.ceil((deadline - today) / 86400000)
  const months = days < 0 ? 0 : Math.max(1, Math.ceil(Math.max(days, 1) / 30.4375))
  const monthly = months > 0 ? fromCents(Math.ceil(toCents(remaining) / months)) : remaining
  const incomeAverage = Number(incomeSummary?.totalAverage) || 0
  const incomeShare = incomeAverage > 0 ? (monthly / incomeAverage) * 100 : null
  return { remaining, months, monthly, incomeAverage, incomeShare, principalAverage: incomeSummary?.principalAverage || 0, extraAverage: incomeSummary?.extraAverage || 0, overdue: days < 0 }
}


// O plano sugerido pertence à criação da meta e não muda com aportes posteriores.
// Persistência exclusiva do frontend, separada por usuário e identificador da meta.
function fixedGoalPlanKey(goalId) {
  const accountId = localStorage.getItem(AUTH_SESSION_KEY) || 'sem-sessao'
  return `cv-goal-original-plan:${accountId}:${goalId}`
}

function getFixedGoalPlan(goal, incomeSummary) {
  if (!goal?.id) return getGoalMonthlyPlan(goal, incomeSummary)
  const key = fixedGoalPlanKey(goal.id)
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null')
    if (stored && typeof stored.monthly === 'number') return stored
  } catch { /* Plano antigo inválido: gera um registro uma única vez. */ }
  const original = getGoalMonthlyPlan(goal, incomeSummary)
  if (original) localStorage.setItem(key, JSON.stringify(original))
  return original
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
  const [authUser, setAuthUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [categories, setCategories] = useState(initialCategories)
  const [databaseCategories, setDatabaseCategories] = useState([])
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceError, setWorkspaceError] = useState('')
  const operationPending = useRef(false)
  const runOperation = async (action) => {
    if (operationPending.current) return
    operationPending.current = true
    try {
      return await action()
    } finally {
      operationPending.current = false
    }
  }
  const [profile, setProfile] = useState(initialProfile)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)

  const loadWorkspace = (account) => {
    setWorkspaceLoading(true)
    setWorkspaceError('')
    setTransactions([])
    setGoals([])
    setCategories([])
    setDatabaseCategories([])
    setProfile({ name: account.name, email: account.email })
    setPage('dashboard')
    setModal(null)
  }

  useEffect(() => {
    let cancelled = false

    const restoreSession = async () => {
      const userId = getSessionUserId()
      if (!userId || !localStorage.getItem(AUTH_TOKEN_KEY)) {
        if (!cancelled) setAuthChecking(false)
        return
      }

      try {
        const user = await apiRequest(`/usuarios/${encodeURIComponent(userId)}`)
        if (cancelled) return
        const account = mapApiUser(user)
        if (user.token) localStorage.setItem(AUTH_TOKEN_KEY, user.token)
        setAuthUser(account)
        loadWorkspace(account)
      } catch {
        if (!cancelled) {
          localStorage.removeItem(AUTH_SESSION_KEY)
          localStorage.removeItem(AUTH_TOKEN_KEY)
        }
      } finally {
        if (!cancelled) setAuthChecking(false)
      }
    }

    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const notify = (message, tone = 'success') => {
    setToast({ id: Date.now(), message, tone })
  }

  const loadDatabaseWorkspace = async () => {
    const [expenses, incomes, metas, categorias] = await Promise.all([
      apiRequest('/despesas'),
      apiRequest('/rendas'),
      apiRequest('/metas'),
      apiRequest('/categorias'),
    ])
    return {
      transactions: [
        ...expenses.map((item) => mapApiTransaction(item, 'expense')),
        ...incomes.map((item) => mapApiTransaction(item, 'income')),
      ],
      goals: metas.map(mapApiGoal),
      categories: categorias,
    }
  }

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), toast.tone === 'warning' || toast.tone === 'error' ? 5200 : 3800)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!authUser) return undefined
    let active = true
    setWorkspaceLoading(true)
    loadDatabaseWorkspace()
      .then((data) => {
        if (!active) return
        setTransactions(data.transactions)
        setGoals(data.goals)
        setDatabaseCategories(data.categories)
        setCategories(data.categories.map((item) => item.nome))
        setWorkspaceError('')
      })
      .catch((error) => {
        if (active) setWorkspaceError(error.message || 'Não foi possível carregar os dados.')
      })
      .finally(() => {
        if (active) setWorkspaceLoading(false)
      })
    return () => {
      active = false
    }
  }, [authUser])

  const totals = useMemo(() => {
    const incomes = transactions.filter((item) => item.type === 'income')
    const expenses = transactions.filter((item) => item.type === 'expense')
    const income = sumMoney(incomes)
    const expense = sumMoney(expenses)
    return { income, expense, balance: fromCents(toCents(income) - toCents(expense)) }
  }, [transactions])

  const overdueGoals = useMemo(() => goals.filter(isGoalOverdue), [goals])

  useEffect(() => {
    if (!authUser || !overdueGoals.length) return
    const todayKey = todayInputValue()
    const signature = overdueGoals
      .map((goal) => goal.id)
      .sort()
      .join(',')
    const notificationKey = `cv-overdue-notified-${authUser.id}-${todayKey}`
    if (sessionStorage.getItem(notificationKey) !== signature) {
      notify(
        `${overdueGoals.length} meta${overdueGoals.length > 1 ? 's estão' : ' está'} com o prazo vencido.`,
        'warning',
      )
      sessionStorage.setItem(notificationKey, signature)
    }
  }, [authUser, overdueGoals])

  const register = async ({ name, cpf, email, password }) => {
    const cleanName = name.trim()
    const cleanCpf = normalizeCpf(cpf)
    const cleanEmail = normalizeEmail(email)
    if (!cleanName) return { ok: false, error: 'Informe seu nome.' }
    if (cleanCpf.length !== 11) return { ok: false, error: 'Informe um CPF válido com 11 dígitos.' }
    if (!cleanEmail) return { ok: false, error: 'Informe um e-mail válido.' }
    if (password.length < 6)
      return { ok: false, error: 'A senha deve ter pelo menos 6 caracteres.' }

    try {
      const passwordHash = await hashPassword(password)
      const user = await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          nome: cleanName,
          cpf: cleanCpf,
          email: cleanEmail,
          senha: passwordHash,
        }),
      })
      const account = mapApiUser(user)
      if (user.token) localStorage.setItem(AUTH_TOKEN_KEY, user.token)
      if (!account?.id) throw new Error('A API não retornou o usuário cadastrado.')
      return { ok: true, account }
    } catch (error) {
      return { ok: false, error: error.message || 'Não foi possível criar a conta.' }
    }
  }

  const login = async ({ email, password }) => {
    const cleanEmail = normalizeEmail(email)
    if (!cleanEmail || !password) return { ok: false, error: 'Informe e-mail e senha.' }

    try {
      const passwordHash = await hashPassword(password)
      const user = await apiRequest('/usuarios/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, senha: passwordHash }),
      })
      const account = mapApiUser(user)
      if (user.token) localStorage.setItem(AUTH_TOKEN_KEY, user.token)
      if (!account?.id) throw new Error('A API não retornou o usuário autenticado.')
      localStorage.setItem(AUTH_SESSION_KEY, account.id)
      setAuthUser(account)
      loadWorkspace(account)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message || 'Não foi possível entrar na conta.' }
    }
  }

  const logout = async () => {
    try {
      await apiRequest('/usuarios/logout', { method: 'POST' })
    } catch {
      /* A sessão local também deve ser encerrada se a API estiver offline. */
    }
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_SESSION_KEY)
    setAuthUser(null)
    setTransactions([])
    setGoals([])
    setCategories(initialCategories)
    setProfile(initialProfile)
    setModal(null)
    setPage('dashboard')
  }

  const addTransaction = async (form) => {
    try {
      const databaseUser = authUser
      const isExpense = form.type === 'expense'
      const saved = await apiRequest(isExpense ? '/despesas' : '/rendas', {
        method: 'POST',
        body: JSON.stringify(
          isExpense
            ? {
                descricao: form.description.trim(),
                tipo_despesa: form.category,
                periodicidade: form.periodicity === 'Mensal' ? 'Mensal' : 'Única',
                datas: form.date,
                valor: fromCents(toCents(form.value)),
                id_usuario: databaseUser.id_usuario,
                id_categoria: databaseCategories.find((item) => item.nome === form.category)
                  ?.id_categoria,
              }
            : {
                descricao: form.description.trim(),
                tipo_renda: form.category,
                periodicidade: form.periodicity === 'Mensal' ? 'Mensal' : 'Única',
                datas: form.date,
                valor: fromCents(toCents(form.value)),
                id_usuario: databaseUser.id_usuario,
              },
        ),
      })
      const transaction = mapApiTransaction(saved, form.type)
      setTransactions((current) => [transaction, ...current])
      setModal(null)
      notify(isExpense ? 'Despesa salva no banco de dados.' : 'Renda salva no banco de dados.')
    } catch (error) {
      notify(error.message || 'Não foi possível salvar o lançamento.', 'error')
    }
  }

  const updateTransaction = async (id, form) => {
    const current = transactions.find((item) => item.id === id)
    if (!current?.databaseId)
      return notify('Este lançamento não está vinculado ao banco de dados.', 'warning')
    try {
      if (form.type !== current.databaseType)
        return notify('O tipo de um lançamento existente não pode ser alterado.', 'warning')
      const isExpense = current.databaseType === 'expense'
      const saved = await apiRequest(
        `${isExpense ? '/despesas' : '/rendas'}/${current.databaseId}`,
        {
          method: 'PUT',
          body: JSON.stringify(
            isExpense
              ? {
                  descricao: form.description.trim(),
                  tipo_despesa: form.category,
                  id_categoria: databaseCategories.find((item) => item.nome === form.category)
                    ?.id_categoria,
                  periodicidade: form.periodicity === 'Mensal' ? 'Mensal' : 'Única',
                  datas: form.date,
                  valor: fromCents(toCents(form.value)),
                }
              : {
                  descricao: form.description.trim(),
                  tipo_renda: form.category,
                  periodicidade: form.periodicity === 'Mensal' ? 'Mensal' : 'Única',
                  datas: form.date,
                  valor: fromCents(toCents(form.value)),
                },
          ),
        },
      )
      const updated = mapApiTransaction(saved, current.databaseType)
      setTransactions((items) => items.map((item) => (item.id === id ? updated : item)))
      setModal(null)
      notify('Lançamento atualizado no banco de dados.')
    } catch (error) {
      notify(error.message || 'Não foi possível atualizar o lançamento.', 'error')
    }
  }

  const removeTransaction = async (id) => {
    const current = transactions.find((item) => item.id === id)
    if (!current?.databaseId)
      return notify('Este lançamento não está vinculado ao banco de dados.', 'warning')
    try {
      await apiRequest(
        `${current.databaseType === 'expense' ? '/despesas' : '/rendas'}/${current.databaseId}`,
        { method: 'DELETE' },
      )
      setTransactions((items) => items.filter((item) => item.id !== id))
      setModal(null)
      notify('Lançamento excluído do banco de dados.')
    } catch (error) {
      notify(error.message || 'Não foi possível excluir o lançamento.', 'error')
    }
  }

  const saveGoal = async (id, form) => {
    try {
      const saved = await apiRequest(id ? `/metas/${id}` : '/metas', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify({
          nome: form.name.trim(),
          valor_objetivo: Number(form.target),
          valor_acumulado:
            !id || toCents(form.saved) !== toCents(goals.find((item) => item.id === id)?.saved)
              ? Number(form.saved || 0)
              : undefined,
          prazo: form.deadline,
        }),
      })
      const goal = mapApiGoal(saved)
      if (!id) getFixedGoalPlan(goal, getMonthlyIncomeSummary(transactions))
      setGoals((items) =>
        id ? items.map((item) => (item.id === id ? goal : item)) : [goal, ...items],
      )
      setModal(null)
      notify(id ? 'Meta atualizada.' : 'Meta criada com sucesso.')
    } catch (error) {
      notify(error.message, 'error')
    }
  }
  const addGoal = (form) => saveGoal(null, form)
  const updateGoal = (id, form) => saveGoal(id, form)
  const removeGoal = async (id) => {
    try {
      await apiRequest(`/metas/${id}`, { method: 'DELETE' })
      setGoals((items) => items.filter((item) => item.id !== id))
      localStorage.removeItem(fixedGoalPlanKey(id))
      setModal(null)
      notify('Meta excluída.')
    } catch (error) {
      notify(error.message, 'error')
    }
  }
  const addContribution = async (id, value) => {
    try {
      await apiRequest('/aportes-meta', {
        method: 'POST',
        body: JSON.stringify({ id_meta: id, valor: value, datas: todayInputValue() }),
      })
      // O aporte já está salvo. Se a leitura falhar, avisamos sem permitir repetir o envio.
      setModal(null)
      try {
        const updated = mapApiGoal(await apiRequest(`/metas/${id}`))
        setGoals((items) => items.map((item) => (item.id === id ? updated : item)))
        notify(
          isGoalComplete(updated)
            ? 'Meta concluída! Parabéns pelo objetivo alcançado.'
            : 'Aporte registrado.',
        )
      } catch {
        notify('Aporte salvo. Atualize a página para carregar o novo total.', 'warning')
      }
    } catch (error) {
      notify(error.message, 'error')
    }
  }
  const addCategory = async (name) => {
    const cleanName = name.trim()
    if (!cleanName) { notify('Informe um nome para a categoria.', 'warning'); return { ok: false, error: 'Informe um nome para a categoria.' } }
    if (categories.some(category => category.toLowerCase() === cleanName.toLowerCase())) { notify('Essa categoria já existe.', 'warning'); return { ok: false, error: 'Essa categoria já existe.' } }
    try {
      const saved = await apiRequest('/categorias', {
        method: 'POST',
        body: JSON.stringify({ nome: cleanName }),
      })
      setDatabaseCategories((items) => [...items, saved])
      setCategories((items) => [...items, saved.nome])
      setModal(null)
      notify('Categoria criada.')
      return { ok: true }
    } catch (error) {
      notify(error.message, 'error')
      return { ok: false, error: error.message }
    }
  }
  const removeCategory = async (category) => {
    try {
      if (transactions.some((item) => item.category === category))
        return notify('Essa categoria está em uso e não pode ser excluída.', 'warning')
      const current = databaseCategories.find((item) => item.nome === category)
      if (!current) return notify('Categoria não encontrada. Atualize a página.', 'warning')
      await apiRequest(`/categorias/${current.id_categoria}`, { method: 'DELETE' })
      setDatabaseCategories((items) =>
        items.filter((item) => item.id_categoria !== current.id_categoria),
      )
      setCategories((items) => items.filter((item) => item !== category))
      setModal(null)
      notify('Categoria excluída.')
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const saveProfile = async (nextProfile) => {
    if (!authUser) return
    const normalized = { name: nextProfile.name.trim(), email: normalizeEmail(nextProfile.email) }
    if (!normalized.name) return notify('Informe seu nome.', 'warning')
    if (!normalized.email) return notify('Informe um e-mail válido.', 'warning')

    try {
      const user = await apiRequest(`/usuarios/${encodeURIComponent(authUser.id)}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: normalized.name, email: normalized.email }),
      })
      const updatedAccount = mapApiUser(user)
      setAuthUser(updatedAccount)
      setProfile(normalized)
      notify('Perfil atualizado com sucesso.')
    } catch (error) {
      notify(error.message || 'Não foi possível atualizar o perfil.', 'warning')
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    if (!authUser) return { ok: false, error: 'Sessão inválida.' }
    try {
      const currentHash = await hashPassword(currentPassword)
      const newHash = await hashPassword(newPassword)

      const user = await apiRequest(`/usuarios/${encodeURIComponent(authUser.id)}`, {
        method: 'PUT',
        body: JSON.stringify({ senha: newHash, senha_atual: currentHash }),
      })

      const updatedAccount = mapApiUser(user)
      setAuthUser(updatedAccount)
      setModal(null)
      notify('Senha atualizada com sucesso.')
      return { ok: true }
    } catch (error) {
      const errorMessage = error.status === 401 ? 'A senha atual está incorreta.' : (error.message || 'Não foi possível alterar a senha.')
      notify(errorMessage, 'error')
      return { ok: false, error: errorMessage }
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
    downloadFile(
      `custosvision-backup-${todayInputValue()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8',
    )
    notify('Backup exportado com sucesso.')
  }

  const completeRegistration = account => {
    if (!account?.id) return
    localStorage.setItem(AUTH_SESSION_KEY, account.id)
    setAuthUser(account)
    loadWorkspace(account)
  }

  if (authChecking) return <div className="auth-loading">Conectando ao CustosVision...</div>
  if (!authUser) return <AuthScreen onLogin={login} onRegister={register} onRegistrationComplete={completeRegistration} />

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        profile={profile}
        overdueCount={overdueGoals.length}
        onLogout={() => setModal({ type: 'logout' })}
      />
      <main className="main-content">
        <p
          role="status"
          style={{ margin: 0, padding: '10px 24px', background: '#eaf8f1', fontSize: 12 }}
        >
          {workspaceLoading
            ? 'Carregando seus dados financeiros...'
            : workspaceError
              ? 'Não foi possível carregar seus dados financeiros.'
              : 'Seus dados financeiros estão salvos na sua conta.'}
        </p>
        <Topbar
          page={page}
          setPage={setPage}
          profile={profile}
          overdueCount={overdueGoals.length}
        />

        {workspaceError && (
          <div className="page" role="alert">
            <p className="form-error">{workspaceError}</p>
            <button className="btn primary" onClick={() => {
              setWorkspaceError('')
              setWorkspaceLoading(true)
              setAuthUser((current) => ({ ...current }))
            }}>Tentar novamente</button>
            <button className="btn secondary" onClick={logout}>Voltar ao login</button>
          </div>
        )}

        {!workspaceLoading && !workspaceError && <>
        {page === 'dashboard' && (
          <Dashboard
            totals={totals}
            transactions={transactions}
            goals={goals}
            categories={categories}
            profile={profile}
            setPage={setPage}
            setModal={setModal}
          />
        )}
        {page === 'transactions' && (
          <Transactions transactions={transactions} categories={categories} setModal={setModal} />
        )}
        {page === 'goals' && <Goals goals={goals} transactions={transactions} setModal={setModal} />}
        {page === 'categories' && (
          <Categories categories={categories} transactions={transactions} setModal={setModal} />
        )}
        {page === 'profile' && (
          <Profile
            profile={profile}
            onSave={saveProfile}
            onChangePassword={() => setModal({ type: 'password' })}
            onExport={exportBackup}
            onLogout={() => setModal({ type: 'logout' })}
          />
        )}
        </>}
      </main>

      <MobileNav page={page} setPage={setPage} overdueCount={overdueGoals.length} />

      {modal?.type === 'transaction' && (
        <TransactionModal
          categories={categories}
          initialType={modal.transactionType}
          transaction={modal.transaction}
          onClose={() => setModal(null)}
          onSubmit={(...args) =>
            runOperation(() => (modal.transaction ? updateTransaction : addTransaction)(...args))
          }
        />
      )}
      {modal?.type === 'goal' && (
        <GoalModal
          goal={modal.goal}
          incomeSummary={getMonthlyIncomeSummary(transactions)}
          onClose={() => setModal(null)}
          onSubmit={(...args) => runOperation(() => (modal.goal ? updateGoal : addGoal)(...args))}
        />
      )}
      {modal?.type === 'contribution' && (
        <ContributionModal
          goal={modal.goal}
          onClose={() => setModal(null)}
          onSubmit={(...args) => runOperation(() => addContribution(...args))}
        />
      )}
      {modal?.type === 'category' && (
        <CategoryModal
          onClose={() => setModal(null)}
          onSubmit={(...args) => runOperation(() => addCategory(...args))}
        />
      )}
      {modal?.type === 'password' && (
        <PasswordModal
          onClose={() => setModal(null)}
          onSubmit={(...args) => runOperation(() => changePassword(...args))}
        />
      )}
      {modal?.type === 'delete-transaction' && (
        <ConfirmModal
          title="Excluir lançamento?"
          text={`O lançamento “${modal.transaction.description}” será removido permanentemente.`}
          confirmLabel="Excluir lançamento"
          danger
          onClose={() => setModal(null)}
          onConfirm={() => runOperation(() => removeTransaction(modal.transaction.id))}
        />
      )}
      {modal?.type === 'delete-goal' && (
        <ConfirmModal
          title="Excluir meta?"
          text={`A meta “${modal.goal.name}” e seu progresso serão removidos desta conta.`}
          confirmLabel="Excluir meta"
          danger
          onClose={() => setModal(null)}
          onConfirm={() => runOperation(() => removeGoal(modal.goal.id))}
        />
      )}
      {modal?.type === 'delete-category' && (
        <ConfirmModal
          title="Excluir categoria?"
          text={`A categoria “${modal.category}” será removida. Categorias em uso não podem ser excluídas.`}
          confirmLabel="Excluir categoria"
          danger
          onClose={() => setModal(null)}
          onConfirm={() => runOperation(() => removeCategory(modal.category))}
        />
      )}
      {modal?.type === 'logout' && (
        <ConfirmModal
          title="Sair da conta?"
          text="Sua sessão será encerrada neste navegador. Seus dados continuarão salvos na sua conta."
          confirmLabel="Sair"
          onClose={() => setModal(null)}
          onConfirm={logout}
        />
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

function AuthScreen({ onLogin, onRegister, onRegistrationComplete }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registeredAccount, setRegisteredAccount] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const strength = passwordStrength(password)

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setRegisteredAccount(null)
    setFeedback(null)
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (mode === 'register' && password !== confirmPassword) {
      const message = 'As senhas não coincidem.'
      setError(message)
      setFeedback({ id: Date.now(), message, tone: 'error' })
      return
    }
    setLoading(true)
    const result =
      mode === 'login'
        ? await onLogin({ email, password })
        : await onRegister({ name, cpf, email, password })
    setLoading(false)
    if (!result?.ok) {
      const message = result?.error || 'Não foi possível continuar.'
      setError(message)
      setFeedback({ id: Date.now(), message, tone: 'error' })
      return
    }
    if (mode === 'register' && result.account) {
      setRegisteredAccount(result.account)
      setFeedback({ id: Date.now(), message: 'Sua conta foi criada com sucesso e já está pronta para uso.', tone: 'success' })
    }
  }

  if (registeredAccount) {
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
            <div className="auth-card auth-success-card">
              <div className="auth-mobile-brand"><Logo /></div>
              <div className="success-icon" aria-hidden="true">✓</div>
              <span className="auth-mini-kicker">TUDO CERTO</span>
              <h2>Cadastro criado com sucesso!</h2>
              <p className="success-message">Sua conta foi criada e já está pronta para você começar a organizar sua vida financeira.</p>
              <div className="success-account">
                <span>Conta cadastrada</span>
                <strong>{registeredAccount.email}</strong>
              </div>
              <button className="btn primary auth-submit" type="button" onClick={() => onRegistrationComplete(registeredAccount)}>Acessar minha conta</button>
              <button className="success-back" type="button" onClick={() => changeMode('login')}>Voltar para o login</button>
            </div>
          </div>
        </section>
        {feedback && <Toast toast={feedback} onClose={() => setFeedback(null)} />}
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-intro">
          <Logo />
          <div className="auth-copy">
            <span className="auth-kicker">SEU DINHEIRO, COM MAIS CLAREZA</span>
            <h1>Controle financeiro que você entende de verdade.</h1>
            <p>
              Registre movimentações, acompanhe metas e transforme números em decisões simples para
              o seu dia a dia.
            </p>
          </div>
          <div className="auth-preview" aria-hidden="true">
            <div className="preview-top">
              <span>Saldo disponível</span>
              <b>+12,4%</b>
            </div>
            <strong>R$ 4.286,40</strong>
            <div className="preview-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="preview-legend">
              <span>
                <b className="dot green" />
                Receitas
              </span>
              <span>
                <b className="dot purple" />
                Economia
              </span>
            </div>
          </div>
          <div className="auth-benefits">
            <div>
              <span>↗</span>
              <p>
                <strong>Visão completa</strong>Receitas e despesas organizadas em poucos cliques.
              </p>
            </div>
            <div>
              <span>◎</span>
              <p>
                <strong>Metas claras</strong>Progresso, prazo e quanto ainda falta em um só lugar.
              </p>
            </div>
            <div>
              <span>⌁</span>
              <p>
                <strong>Dados por conta</strong>Cada usuário mantém sua própria visão financeira.
              </p>
            </div>
          </div>
          <small>CustosVision • Projeto Integrador</small>
        </div>

        <div className="auth-card-wrap">
          <div className="auth-card">
            <div className="auth-mobile-brand">
              <Logo />
            </div>
            <div className="auth-tabs" role="tablist" aria-label="Acesso à conta">
              <button
                type="button"
                className={mode === 'login' ? 'active' : ''}
                onClick={() => changeMode('login')}
              >
                Entrar
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'active' : ''}
                onClick={() => changeMode('register')}
              >
                Criar conta
              </button>
            </div>
            <div className="auth-heading">
              <span className="auth-mini-kicker">
                {mode === 'login' ? 'ACESSO SEGURO' : 'COMECE AGORA'}
              </span>
              <h2>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
              <p>
                {mode === 'login'
                  ? 'Entre para continuar acompanhando sua vida financeira.'
                  : 'Leva menos de um minuto para organizar sua primeira visão financeira.'}
              </p>
            </div>

            <form className="auth-form" onSubmit={submit}>
              {mode === 'register' && (
                <Field label="Nome completo">
                  <input
                    autoFocus
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => setName(capitalizeFirstLetter(event.target.value))}
                    placeholder="Seu nome"
                  />
                </Field>
              )}
              {mode === 'register' && (
                <Field label="CPF">
                  <input
                    autoComplete="off"
                    inputMode="numeric"
                    required
                    maxLength="14"
                    value={cpf}
                    onChange={(event) => setCpf(formatCpf(event.target.value))}
                    placeholder="000.000.000-00"
                  />
                </Field>
              )}
              <Field label="E-mail">
                <input
                  autoComplete="email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                />
              </Field>
              <Field label="Senha">
                <div className="password-field">
                  <input
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength="6"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </Field>
              {mode === 'register' && (
                <>
                  <div
                    className="password-strength"
                    aria-label={`Força da senha: ${strength.label}`}
                  >
                    <div>
                      {[0, 1, 2, 3, 4].map((index) => (
                        <i key={index} className={index < strength.score ? 'active' : ''} />
                      ))}
                    </div>
                    <span>{strength.label}</span>
                  </div>
                  <Field label="Confirmar senha">
                    <input
                      autoComplete="new-password"
                      required
                      minLength="6"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Digite a senha novamente"
                    />
                  </Field>
                </>
              )}
              {error && <div className="auth-error">{error}</div>}
              <button className="btn primary auth-submit" disabled={loading}>
                {loading
                  ? 'Aguarde...'
                  : mode === 'login'
                    ? 'Entrar no CustosVision'
                    : 'Criar minha conta'}
              </button>
            </form>

            <p className="auth-switch">
              {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'}{' '}
              <button
                type="button"
                onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
            <p className="auth-local-note">
              Protótipo acadêmico: os dados financeiros ficam vinculados à sua conta.
            </p>
          </div>
        </div>
      </section>
      {feedback && <Toast toast={feedback} onClose={() => setFeedback(null)} />}
    </main>
  )
}

function Logo() {
  return (
    <div className="brand">
      <svg
        className="brand-logo"
        viewBox="155 218 1740 244"
        role="img"
        aria-label="custosVision"
        focusable="false"
      >
        <image href={custosVisionLogo} width="2048" height="682" />
      </svg>
    </div>
  )
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
        {navItems.slice(0, 4).map(([id, icon, label]) => (
          <button
            key={id}
            className={page === id ? 'nav-item active' : 'nav-item'}
            onClick={() => setPage(id)}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
            {id === 'goals' && overdueCount > 0 && <b className="nav-count">{overdueCount}</b>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="mini-tip">
          <span>✦</span>
          <p>
            <strong>Dica financeira</strong>Consistência vale mais que perfeição: registre seus
            gastos com frequência.
          </p>
        </div>
        <button
          className={page === 'profile' ? 'profile-mini active-profile' : 'profile-mini'}
          onClick={() => setPage('profile')}
        >
          <span className="avatar">{getInitials(profile.name)}</span>
          <span>
            <strong>{profile.name}</strong>
            <small>{profile.email}</small>
          </span>
          <b>›</b>
        </button>
        <button className="sidebar-logout" onClick={onLogout}>
          <span>↪</span>Sair da conta
        </button>
      </div>
    </aside>
  )
}

function MobileNav({ page, setPage, overdueCount }) {
  return (
    <nav className="mobile-nav" aria-label="Navegação principal">
      {navItems.map(([id, icon, label]) => (
        <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>
          <span>
            {icon}
            {id === 'goals' && overdueCount > 0 && <b>{overdueCount}</b>}
          </span>
          <small>{label === 'Visão geral' ? 'Início' : label}</small>
        </button>
      ))}
    </nav>
  )
}

function Topbar({ page, setPage, profile, overdueCount }) {
  const titles = {
    dashboard: 'Visão geral',
    transactions: 'Lançamentos',
    goals: 'Metas',
    categories: 'Categorias',
    profile: 'Meu perfil',
  }
  return (
    <header className="topbar">
      <div className="mobile-logo">
        <Logo />
      </div>
      <div className="topbar-title">
        <p className="eyebrow">CUSTOSVISION</p>
        <h1>{titles[page]}</h1>
      </div>
      <div className="topbar-actions">
        {overdueCount > 0 && (
          <button className="alert-pill" onClick={() => setPage('goals')}>
            <span>!</span>
            {overdueCount} meta{overdueCount > 1 ? 's' : ''} vencida{overdueCount > 1 ? 's' : ''}
          </button>
        )}
        <button
          className="avatar top-avatar"
          onClick={() => setPage('profile')}
          title="Abrir perfil"
        >
          {getInitials(profile.name)}
        </button>
      </div>
    </header>
  )
}

function Dashboard({ totals, transactions, goals, profile, setPage, setModal }) {
  const savingRate =
    totals.income > 0 ? Math.round((totals.balance / totals.income) * 10000) / 100 : null
  const expenseTransactions = transactions.filter((item) => item.type === 'expense')
  const categoryTotals = [...new Set(expenseTransactions.map((item) => item.category))]
    .map((category) => ({
      label: category,
      value: sumMoney(expenseTransactions.filter((item) => item.category === category)),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
  const maxCategory = Math.max(...categoryTotals.map((item) => item.value), 1)
  const recent = [...transactions]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5)
  const completed = goals.filter(isGoalComplete).length
  const activeGoals = goals.filter((goal) => !isGoalComplete(goal) && !isGoalOverdue(goal)).length
  const overdueCount = goals.filter(isGoalOverdue).length
  const nearest = goals
    .filter((goal) => !isGoalComplete(goal) && goal.deadline)
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0]
  const biggestExpense = [...expenseTransactions].sort(
    (a, b) => Number(b.value) - Number(a.value),
  )[0]
  const monthlySeries = useMemo(() => buildMonthlySeries(transactions, 6), [transactions])
  const balanceTimeline = useMemo(() => buildBalanceTimeline(transactions, 12), [transactions])
  const expenseTotal = sumMoney(categoryTotals, (item) => item.value)
  const goalStatusData = [
    { label: 'Concluídas', value: completed },
    { label: 'Em andamento', value: activeGoals },
    { label: 'Vencidas', value: overdueCount },
  ].filter((item) => item.value > 0)

  return (
    <div className="page dashboard-page">
      <section className="welcome-row">
        <div>
          <span className="section-kicker">SEU PANORAMA</span>
          <h2>Olá, {getFirstName(profile.name)} 👋</h2>
          <p>Uma visão simples para você saber onde está e qual é o próximo passo.</p>
        </div>
        <div className="quick-actions">
          <button
            className="btn secondary"
            onClick={() => setModal({ type: 'transaction', transactionType: 'expense' })}
          >
            − Nova despesa
          </button>
          <button
            className="btn primary"
            onClick={() => setModal({ type: 'transaction', transactionType: 'income' })}
          >
            ＋ Nova renda
          </button>
        </div>
      </section>

      <section className="cards-grid">
        <MetricCard
          label="Saldo atual"
          value={money.format(totals.balance)}
          note={totals.balance >= 0 ? 'Receitas menos despesas' : 'Atenção: saldo negativo'}
          icon="◈"
          tone="purple"
          trend={totals.balance >= 0 ? 'positivo' : 'atenção'}
        />
        <MetricCard
          label="Receitas"
          value={money.format(totals.income)}
          note={`${transactions.filter((item) => item.type === 'income').length} entrada${transactions.filter((item) => item.type === 'income').length !== 1 ? 's' : ''} registrada${transactions.filter((item) => item.type === 'income').length !== 1 ? 's' : ''}`}
          icon="↗"
          tone="green"
        />
        <MetricCard
          label="Despesas"
          value={money.format(totals.expense)}
          note={`${expenseTransactions.length} saída${expenseTransactions.length !== 1 ? 's' : ''} registrada${expenseTransactions.length !== 1 ? 's' : ''}`}
          icon="↘"
          tone="red"
        />
        <MetricCard
          label="Taxa de economia"
          value={savingRate === null ? '—' : formatProgress(savingRate)}
          note={savingRate === null ? 'Sem renda para calcular' : 'Percentual preservado da renda'}
          icon="◎"
          tone="blue"
        />
      </section>

      <section className="panel chart-panel realtime-balance-panel">
        <PanelHeader
          title="Saldo em tempo real"
          subtitle="Cada renda faz a linha subir; cada despesa faz a linha cair"
        />
        {transactions.length ? (
          <DashboardBalanceBars data={balanceTimeline} />
        ) : (
          <MiniEmpty text="Adicione uma renda ou despesa para começar a formar sua curva de saldo." />
        )}
      </section>

      <section className="dashboard-grid dashboard-grid-charts">
        <div className="panel chart-panel chart-panel-large">
          <PanelHeader
            title="Fluxo financeiro"
            subtitle="Seis meses até o lançamento mais recente"
          />
          {transactions.length ? (
            <DashboardCashFlowRows data={monthlySeries} />
          ) : (
            <MiniEmpty text="Adicione lançamentos para acompanhar a evolução mensal em gráfico." />
          )}
        </div>
        <div className="panel chart-panel">
          <PanelHeader
            title="Distribuição das despesas"
            subtitle="Participação por categoria"
            action="Ver categorias"
            onAction={() => setPage('categories')}
          />
          {categoryTotals.length ? (
            <DonutChart
              data={categoryTotals}
              totalLabel="Total em despesas"
              totalFormatter={(value) => money.format(value)}
              valueFormatter={(value) => money.format(value)}
            />
          ) : (
            <MiniEmpty text="Quando você registrar despesas, a divisão por categoria aparece aqui." />
          )}
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid-main">
        <div className="panel insight-panel">
          <PanelHeader
            title="Para onde seu dinheiro está indo"
            subtitle="Categorias com maior volume de despesas"
            action="Ver categorias"
            onAction={() => setPage('categories')}
          />
          {categoryTotals.length ? (
            <CategoryRankingChart data={categoryTotals} total={expenseTotal} />
          ) : (
            <MiniEmpty text="Quando você registrar despesas, este resumo aparece aqui." />
          )}
        </div>

        <div className="panel financial-pulse">
          <PanelHeader title="Pulso financeiro" subtitle="Resumo rápido do que merece atenção" />
          <div className="pulse-list">
            <PulseItem
              icon="◎"
              label="Metas em andamento"
              value={`${activeGoals + overdueCount}`}
              detail={nearest ? `Próxima: ${nearest.name}` : 'Nenhuma meta pendente'}
              tone="purple"
            />
            <PulseItem
              icon="↘"
              label="Maior despesa"
              value={biggestExpense ? money.format(biggestExpense.value) : money.format(0)}
              detail={biggestExpense ? biggestExpense.description : 'Nenhuma despesa registrada'}
              tone="red"
            />
            <PulseItem
              icon="✓"
              label="Metas concluídas"
              value={`${completed}`}
              detail={goals.length ? `de ${goals.length} metas` : 'Crie sua primeira meta'}
              tone="green"
            />
          </div>
          {!!goalStatusData.length && (
            <div className="pulse-goals-chart">
              <DonutChart
                data={goalStatusData}
                totalLabel="Metas"
                totalFormatter={(value) => `${value}`}
                valueFormatter={(value) => `${value} meta${value !== 1 ? 's' : ''}`}
                compact
              />
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid-bottom">
        <div className="panel recent-panel">
          <PanelHeader
            title="Últimos lançamentos"
            subtitle="Movimentações mais recentes"
            action="Ver todos"
            onAction={() => setPage('transactions')}
          />
          <TransactionTable items={recent} compact />
        </div>
        <div className="panel goal-summary">
          <PanelHeader
            title="Metas em destaque"
            subtitle="Acompanhe seus objetivos"
            action="Ver todas"
            onAction={() => setPage('goals')}
          />
          {goals.length ? (
            <div className="goal-summary-list">
              {goals.slice(0, 3).map((goal) => <GoalMini key={goal.id} goal={goal} />)}
            </div>
          ) : (
            <MiniEmpty text="Crie uma meta e acompanhe o progresso por aqui." />
          )}
          <button className="text-button" onClick={() => setModal({ type: 'goal' })}>
            ＋ Criar nova meta
          </button>
        </div>
      </section>
    </div>
  )
}

function MetricCard({ label, value, note, icon, tone, trend }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small className={trend === 'atenção' ? 'note-danger' : ''}>{note}</small>
    </article>
  )
}

function PulseItem({ icon, label, value, detail, tone }) {
  return (
    <div className="pulse-item">
      <span className={`pulse-icon ${tone}`}>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  )
}

function PanelHeader({ title, subtitle, action, onAction }) {
  return (
    <div className="panel-header">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {action && <button onClick={onAction}>{action} →</button>}
    </div>
  )
}

function DashboardBalanceBars({ data }) {
  const visible = data.slice(-8)
  const current = visible[visible.length - 1]
  const values = visible.map((item) => Number(item.balance) || 0)
  const scale = buildSymmetricScale(values.length ? values : [0], 4)
  const positionForValue = (value) => ((Number(value) - scale.min) / scale.range) * 100
  const zeroBottom = positionForValue(0)

  return (
    <div className="balance-bars-shell compact">
      <div className="balance-bars-head compact">
        <div>
          <span>Saldo atual</span>
          <strong className={(current?.balance || 0) >= 0 ? 'positive' : 'negative'}>
            {money.format(current?.balance || 0)}
          </strong>
        </div>
        <small>{Math.max(visible.length - 1, 0)} movimentações visíveis</small>
      </div>
      <div className="balance-bars-grid compact" role="img" aria-label="Saldo em colunas verticais">
        <div className="balance-y-axis compact">
          {scale.ticks.map((tick) => (
            <span key={tick} style={{ bottom: `${positionForValue(tick)}%` }}>
              {money.format(tick)}
            </span>
          ))}
        </div>
        <div className="balance-bars-area compact">
          <div className="balance-zero-line" style={{ bottom: `${zeroBottom}%` }} />
          {visible.map((item, index) => {
            const value = Number(item.balance) || 0
            const barHeight = Math.max(Math.abs(positionForValue(value) - zeroBottom), 3)
            const isPositive = value >= 0
            const date = parseDate(item.date)
            const label =
              index === 0 ? 'Início' : date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'
            return (
              <div className="balance-bar-column" key={item.id}>
                <div className="balance-bar-stage">
                  <div className="balance-bar-value-chip">{money.format(value)}</div>
                  <i
                    className={`balance-vertical-bar ${isPositive ? 'positive' : 'negative'} ${item.type === 'start' ? 'neutral' : ''}`}
                    style={isPositive ? { height: `${barHeight}%`, bottom: `${zeroBottom}%` } : { height: `${barHeight}%`, top: `${100 - zeroBottom}%` }}
                    title={`${label}: ${money.format(value)}`}
                  />
                </div>
                <strong>{label}</strong>
              </div>
            )
          })}
        </div>
      </div>
      <div className="balance-bars-legend">
        <span><i className="positive" />Saldo positivo</span>
        <span><i className="negative" />Saldo negativo</span>
        <span><i className="neutral" />Ponto inicial</span>
      </div>
    </div>
  )
}

function DashboardCashFlowRows({ data }) {
  const visible = data.filter((item) => item.count > 0)
  const series = visible.length ? visible : data
  const maxValue = Math.max(...series.flatMap((item) => [Number(item.income) || 0, Number(item.expense) || 0]), 1)
  const totalIncome = sumMoney(series, (item) => item.income)
  const totalExpense = sumMoney(series, (item) => item.expense)

  return (
    <div className="dashboard-flow-shell">
      <div className="dashboard-flow-summary">
        <div><span>Receitas</span><strong className="positive">{money.format(totalIncome)}</strong></div>
        <div><span>Despesas</span><strong className="negative">{money.format(totalExpense)}</strong></div>
        <div><span>Resultado</span><strong className={totalIncome - totalExpense >= 0 ? 'positive' : 'negative'}>{money.format(fromCents(toCents(totalIncome) - toCents(totalExpense)))}</strong></div>
      </div>
      <div className="mini-grouped-chart" role="img" aria-label="Comparação mensal de receitas e despesas">
        {series.map((item) => (
          <div className="mini-grouped-column" key={item.key}>
            <div className="mini-grouped-stage">
              <i className="mini-grouped-bar income" style={{ height: `${Math.max(item.income ? 6 : 0, (item.income / maxValue) * 100)}%` }} title={`Receitas: ${money.format(item.income)}`} />
              <i className="mini-grouped-bar expense" style={{ height: `${Math.max(item.expense ? 6 : 0, (item.expense / maxValue) * 100)}%` }} title={`Despesas: ${money.format(item.expense)}`} />
            </div>
            <strong>{item.label}</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-flow-legend">
        <span><i className="income" />Receitas</span>
        <span><i className="expense" />Despesas</span>
      </div>
    </div>
  )
}

function RunningBalanceChart({ data }) {
  const visible = data.slice(-8)
  const current = visible[visible.length - 1]
  const previous = visible.length > 1 ? visible[visible.length - 2] : current
  const lastDelta = fromCents(toCents(current?.balance || 0) - toCents(previous?.balance || 0))
  const values = visible.map((item) => Number(item.balance) || 0)
  const scale = buildSymmetricScale(values.length ? values : [0], 4)
  const positionForValue = (value) => ((Number(value) - scale.min) / scale.range) * 100
  const zeroBottom = positionForValue(0)

  return (
    <div className="balance-bars-shell detailed">
      <div className="balance-bars-head detailed">
        <div>
          <span>Saldo atual</span>
          <strong className={(current?.balance || 0) >= 0 ? 'positive' : 'negative'}>
            {money.format(current?.balance || 0)}
          </strong>
        </div>
        {current?.type !== 'start' && (
          <div className={`balance-bars-badge ${current?.type === 'income' ? 'income' : 'expense'}`}>
            <span>{current?.type === 'income' ? '↗ Última renda' : '↘ Última despesa'}</span>
            <strong>{current?.type === 'income' ? '+' : '−'} {money.format(Math.abs(current?.value || lastDelta))}</strong>
            <small>{current?.description}</small>
          </div>
        )}
      </div>
      <div className="balance-bars-grid detailed" role="img" aria-label="Saldo acumulado em colunas verticais">
        <div className="balance-y-axis detailed">
          {scale.ticks.map((tick) => (
            <span key={tick} style={{ bottom: `${positionForValue(tick)}%` }}>
              {money.format(tick)}
            </span>
          ))}
        </div>
        <div className="balance-bars-area detailed">
          <div className="balance-zero-line" style={{ bottom: `${zeroBottom}%` }} />
          {visible.map((item, index) => {
            const value = Number(item.balance) || 0
            const barHeight = Math.max(Math.abs(positionForValue(value) - zeroBottom), 3)
            const isPositive = value >= 0
            const date = parseDate(item.date)
            const label =
              index === 0 ? 'Início' : date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'
            return (
              <div className="balance-bar-column" key={item.id}>
                <div className="balance-bar-stage">
                  <div className="balance-bar-value-chip">{money.format(value)}</div>
                  <i
                    className={`balance-vertical-bar ${isPositive ? 'positive' : 'negative'} ${item.type === 'start' ? 'neutral' : ''}`}
                    style={isPositive ? { height: `${barHeight}%`, bottom: `${zeroBottom}%` } : { height: `${barHeight}%`, top: `${100 - zeroBottom}%` }}
                    title={
                      index === 0
                        ? `Saldo inicial exibido: ${money.format(value)}`
                        : `${item.description}: ${item.type === 'income' ? '+' : '−'} ${money.format(item.value)} · Saldo ${money.format(value)}`
                    }
                  />
                </div>
                <strong>{label}</strong>
                <small>{money.format(value)}</small>
              </div>
            )
          })}
        </div>
      </div>
      <div className="balance-bars-legend">
        <span><i className="positive" />Saldo positivo</span>
        <span><i className="negative" />Saldo negativo</span>
        <span><i className="neutral" />Ponto inicial</span>
      </div>
    </div>
  )
}

function CashFlowChart({ data }) {
  const visible = data.filter((item) => item.count > 0)
  const series = visible.length ? visible : data
  const maxValue = Math.max(...series.flatMap((item) => [Number(item.income) || 0, Number(item.expense) || 0]), 1)
  const activeMonths = series.filter((item) => item.count > 0)

  return (
    <div className="chart-shell">
      <div className="chart-legend">
        <span><i className="income" />Receitas</span>
        <span><i className="expense" />Despesas</span>
      </div>
      <div className="grouped-bar-chart clean-bars" role="img" aria-label="Receitas e despesas por mês em gráfico de colunas">
        {series.map((item) => (
          <div className="grouped-bar-column" key={item.key}>
            <div className="grouped-bar-stage">
              <i className="grouped-bar income" style={{ height: `${Math.max(item.income ? 6 : 0, (item.income / maxValue) * 100)}%` }} title={`Receitas: ${money.format(item.income)}`} />
              <i className="grouped-bar expense" style={{ height: `${Math.max(item.expense ? 6 : 0, (item.expense / maxValue) * 100)}%` }} title={`Despesas: ${money.format(item.expense)}`} />
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="chart-summary-grid">
        <div><span>Receitas no período</span><strong>{money.format(sumMoney(series, (item) => item.income))}</strong></div>
        <div><span>Despesas no período</span><strong>{money.format(sumMoney(series, (item) => item.expense))}</strong></div>
        <div><span>Melhor saldo mensal</span><strong>{money.format(activeMonths.length ? Math.max(...activeMonths.map((item) => item.balance)) : 0)}</strong></div>
      </div>
    </div>
  )
}

function CategoryRankingChart({ data, total }) {
  const visible = data.slice(0, 6)
  const maxValue = Math.max(...visible.map((item) => Number(item.value) || 0), 1)

  return (
    <div className="category-ranking" role="img" aria-label="Ranking de categorias por volume de despesas">
      {visible.map((item, index) => {
        const share = total > 0 ? (item.value / total) * 100 : 0
        return (
          <div className="category-ranking-row" key={item.label}>
            <div className="category-ranking-top">
              <span className="category-ranking-label">{index + 1}. {item.label}</span>
              <strong>{money.format(item.value)}</strong>
            </div>
            <div className="category-ranking-track">
              <i style={{ width: `${(item.value / maxValue) * 100}%` }} />
            </div>
            <small>{percentFmt.format(share)}% do total</small>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ data, totalLabel, totalFormatter, valueFormatter, compact = false }) {
  const palette = chartPalette
  const total = sumMoney(data)
  const radius = compact ? 48 : 56
  const circumference = 2 * Math.PI * radius
  let accumulator = 0

  return (
    <div className={`donut-layout ${compact ? 'compact' : ''}`}>
      <div className="donut-visual">
        <svg viewBox="0 0 160 160" className="donut-chart" role="img" aria-label={totalLabel}>
          <circle cx="80" cy="80" r={radius} className="donut-track" />
          {data.map((item, index) => {
            const value = Number(item.value || 0)
            const portion = total > 0 ? value / total : 0
            const dash = portion * circumference
            const offset = -accumulator * circumference
            accumulator += portion
            return (
              <circle
                key={item.label}
                cx="80"
                cy="80"
                r={radius}
                className="donut-segment"
                style={{
                  stroke: item.color || palette[index % palette.length],
                  strokeDasharray: `${dash} ${circumference - dash}`,
                  strokeDashoffset: offset,
                }}
              />
            )
          })}
        </svg>
        <div className="donut-center">
          <span>{totalLabel}</span>
          <strong>{totalFormatter(total)}</strong>
        </div>
      </div>
      <div className="donut-legend">
        {data.map((item, index) => {
          const share = total > 0 ? (Number(item.value || 0) / total) * 100 : 0
          return (
            <div className="donut-legend-row" key={item.label}>
              <span>
                <i style={{ background: item.color || palette[index % palette.length] }} />
                {item.label}
              </span>
              <strong>{valueFormatter(item.value)}</strong>
              <small>{percentFmt.format(share)}%</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GoalProgressChart({ goals }) {
  const orderedGoals = [...goals].sort((a, b) => goalProgress(b) - goalProgress(a)).slice(0, 5)
  return (
    <div className="goal-progress-list">
      {orderedGoals.map((goal) => {
        const progress = goalProgress(goal)
        const status = goalStatus(goal)
        return (
          <div className="goal-progress-item" key={goal.id}>
            <div className="goal-progress-top">
              <strong>{goal.name}</strong>
              <span>{formatProgress(progress)}</span>
            </div>
            <div className="goal-progress-bar">
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className="goal-progress-meta">
              <small>
                {money.format(goal.saved)} de {money.format(goal.target)}
              </small>
              <b
                className={`status-inline ${status === 'Concluída' ? 'done' : status === 'Vencida' ? 'danger' : 'pending'}`}
              >
                {status}
              </b>
            </div>
          </div>
        )
      })}
    </div>
  )
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
            status === 'Concluída' ? 'done' : status === 'Vencida' ? 'danger' : 'pending'
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

  const months = useMemo(
    () =>
      [...new Set(transactions.map((item) => String(item.date).slice(0, 7)).filter(Boolean))]
        .sort()
        .reverse(),
    [transactions],
  )
  const filtered = useMemo(
    () =>
      [...transactions]
        .filter((item) =>
          `${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase()),
        )
        .filter((item) => type === 'all' || item.type === type)
        .filter((item) => category === 'all' || item.category === category)
        .filter((item) => month === 'all' || String(item.date).startsWith(month))
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [transactions, search, type, category, month],
  )

  const filteredIncome = sumMoney(filtered.filter((item) => item.type === 'income'))
  const filteredExpense = sumMoney(filtered.filter((item) => item.type === 'expense'))
  const filteredBalance = fromCents(toCents(filteredIncome) - toCents(filteredExpense))
  const monthlySeries = useMemo(
    () => buildMonthlySeries(filtered, 6, month === 'all' ? null : month),
    [filtered, month],
  )
  const balanceTimeline = useMemo(() => buildBalanceTimeline(filtered, 12), [filtered])
  const filteredExpensesByCategory = [
    ...new Set(filtered.filter((item) => item.type === 'expense').map((item) => item.category)),
  ]
    .map((label) => ({
      label,
      value: sumMoney(
        filtered.filter((item) => item.type === 'expense' && item.category === label),
      ),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)

  const exportCsv = () => {
    const header = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor']
    const rows = filtered.map((item) => [
      item.date,
      item.type === 'income' ? 'Renda' : 'Despesa',
      item.description,
      item.category,
      Number(item.value).toFixed(2).replace('.', ','),
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';'))
      .join('\n')
    downloadFile(
      `custosvision-lancamentos-${todayInputValue()}.csv`,
      `﻿${csv}`,
      'text/csv;charset=utf-8',
    )
  }

  return (
    <div className="page">
      <section className="section-heading">
        <div>
          <span className="section-kicker">MOVIMENTAÇÕES</span>
          <h2>Seus lançamentos</h2>
          <p>Busque, filtre, edite e acompanhe tudo que entrou e saiu.</p>
        </div>
        <div className="heading-actions">
          <button className="btn secondary" disabled={!filtered.length} onClick={exportCsv}>
            ↓ Exportar CSV
          </button>
          <button
            className="btn primary"
            onClick={() => setModal({ type: 'transaction', transactionType: 'expense' })}
          >
            ＋ Novo lançamento
          </button>
        </div>
      </section>

      <section className="mini-metrics-grid">
        <MiniMetric label="Receitas filtradas" value={money.format(filteredIncome)} tone="green" />
        <MiniMetric label="Despesas filtradas" value={money.format(filteredExpense)} tone="red" />
        <MiniMetric
          label="Resultado"
          value={money.format(filteredBalance)}
          tone={filteredBalance >= 0 ? 'purple' : 'red'}
        />
      </section>

      <div className="panel filters-panel">
        <div className="search-box wide">
          ⌕
          <input
            value={search}
            onChange={(event) => setSearch(capitalizeFirstLetter(event.target.value))}
            placeholder="Buscar por descrição ou categoria"
          />
        </div>
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">Todos os tipos</option>
          <option value="income">Rendas</option>
          <option value="expense">Despesas</option>
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Todas as categorias</option>
          <option>Renda principal</option>
          <option>Renda extra</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={month} onChange={(event) => setMonth(event.target.value)}>
          <option value="all">Todos os meses</option>
          {months.map((item) => (
            <option key={item} value={item}>
              {new Date(`${item}-01T12:00:00`).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
            </option>
          ))}
        </select>
        <span className="filter-count">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <section className="panel chart-panel realtime-balance-panel page-charts-inline">
        <PanelHeader
          title="Saldo acumulado dos lançamentos filtrados"
          subtitle="O gráfico reage instantaneamente aos lançamentos visíveis no filtro"
        />
        {filtered.length ? (
          <RunningBalanceChart data={balanceTimeline} />
        ) : (
          <MiniEmpty text="Ajuste os filtros ou cadastre lançamentos para visualizar a curva de saldo." />
        )}
      </section>

      <section className="dashboard-grid dashboard-grid-charts page-charts-inline">
        <div className="panel chart-panel chart-panel-large">
          <PanelHeader
            title="Evolução mensal filtrada"
            subtitle="Receitas e despesas conforme os filtros aplicados"
          />
          {filtered.length ? (
            <CashFlowChart data={monthlySeries} />
          ) : (
            <MiniEmpty text="Ajuste os filtros ou cadastre lançamentos para visualizar o gráfico." />
          )}
        </div>
        <div className="panel chart-panel">
          <PanelHeader title="Despesas por categoria" subtitle="Composição do filtro atual" />
          {filteredExpensesByCategory.length ? (
            <DonutChart
              data={filteredExpensesByCategory}
              totalLabel="Despesas filtradas"
              totalFormatter={(value) => money.format(value)}
              valueFormatter={(value) => money.format(value)}
            />
          ) : (
            <MiniEmpty text="Quando houver despesas no filtro atual, elas aparecerão divididas aqui." />
          )}
        </div>
      </section>

      <section className="panel table-panel">
        <TransactionTable
          items={filtered}
          onEdit={(transaction) => setModal({ type: 'transaction', transaction })}
          onDelete={(transaction) => setModal({ type: 'delete-transaction', transaction })}
        />
      </section>
    </div>
  )
}

function TransactionTable({ items, compact = false, onEdit, onDelete }) {
  if (!items.length)
    return (
      <EmptyState
        title="Nenhum lançamento encontrado"
        text="Adicione uma renda ou despesa, ou ajuste os filtros para encontrar outros resultados."
      />
    )
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Data</th>
            <th>Tipo</th>
            <th className="right">Valor</th>
            {!compact && <th className="right">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="description-cell">
                  <span className={`type-dot ${item.type}`}>
                    {item.type === 'income' ? '↗' : '↘'}
                  </span>
                  <strong>{item.description}</strong>
                  {item.periodicity === 'Mensal' && (
                    <small className="recurring-label">Mensal</small>
                  )}
                </div>
              </td>
              <td>{item.category}</td>
              <td>{parseDate(item.date) ? dateShortFmt.format(parseDate(item.date)) : '—'}</td>
              <td>
                <span className={`badge ${item.type}`}>
                  {item.type === 'income' ? 'Renda' : 'Despesa'}
                </span>
              </td>
              <td className={`right value ${item.type}`}>
                {item.type === 'income' ? '+' : '−'} {money.format(item.value)}
              </td>
              {!compact && (
                <td className="right">
                  <div className="table-actions">
                    <button className="icon-button" title="Editar" onClick={() => onEdit(item)}>
                      ✎
                    </button>
                    <button
                      className="icon-button danger"
                      title="Excluir"
                      onClick={() => onDelete(item)}
                    >
                      ×
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Goals({ goals, transactions, setModal }) {
  const incomeSummary = useMemo(() => getMonthlyIncomeSummary(transactions), [transactions])
  const overdue = goals.filter(isGoalOverdue)
  const totalTarget = sumMoney(goals, (goal) => goal.target)
  const totalSaved = sumMoney(goals, (goal) =>
    Math.min(Number(goal.saved) || 0, Number(goal.target) || 0),
  )
  const completed = goals.filter(isGoalComplete).length
  const averageProgress = goals.length
    ? Math.min(
        goals.every(isGoalComplete) ? 100 : 99.99,
        Math.round(
          (goals.reduce((sum, goal) => sum + goalProgress(goal), 0) / goals.length) * 100,
        ) / 100,
      )
    : 0
  const active = goals.filter((goal) => !isGoalComplete(goal) && !isGoalOverdue(goal)).length
  const goalDistribution = [
    { label: 'Concluídas', value: completed },
    { label: 'Em andamento', value: active },
    { label: 'Vencidas', value: overdue.length },
  ].filter((item) => item.value > 0)

  return (
    <div className="page">
      <section className="section-heading">
        <div>
          <span className="section-kicker">OBJETIVOS</span>
          <h2>Metas financeiras</h2>
          <p>Transforme planos em objetivos com valor, prazo e progresso visível.</p>
        </div>
        <button className="btn primary" onClick={() => setModal({ type: 'goal' })}>
          ＋ Nova meta
        </button>
      </section>
      <section className="mini-metrics-grid goals-metrics">
        <MiniMetric label="Total planejado" value={money.format(totalTarget)} tone="purple" />
        <MiniMetric label="Já acumulado" value={money.format(totalSaved)} tone="green" />
        <MiniMetric label="Progresso médio" value={`${averageProgress}%`} tone="blue" />
        <MiniMetric label="Concluídas" value={`${completed}/${goals.length}`} tone="green" />
      </section>
      {overdue.length > 0 && (
        <div className="goal-alert">
          <span>!</span>
          <div>
            <strong>Atenção aos prazos</strong>
            <p>
              Você tem {overdue.length} meta{overdue.length > 1 ? 's' : ''} vencida
              {overdue.length > 1 ? 's' : ''} que ainda precisa{overdue.length > 1 ? 'm' : ''} ser
              concluída{overdue.length > 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      )}

      {!!goals.length && (
        <section className="dashboard-grid dashboard-grid-charts page-charts-inline">
          <div className="panel chart-panel">
            <PanelHeader
              title="Distribuição das metas"
              subtitle="Status atual dos seus objetivos"
            />
            <DonutChart
              data={goalDistribution}
              totalLabel="Metas"
              totalFormatter={(value) => `${value}`}
              valueFormatter={(value) => `${value} meta${value !== 1 ? 's' : ''}`}
            />
          </div>
          <div className="panel chart-panel chart-panel-large">
            <PanelHeader
              title="Progresso por objetivo"
              subtitle="As metas mais avançadas do seu plano"
            />
            <GoalProgressChart goals={goals} />
          </div>
        </section>
      )}

      {goals.length ? (
        <div className="goals-grid">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              incomeSummary={incomeSummary}
              onContribution={() => setModal({ type: 'contribution', goal })}
              onEdit={() => setModal({ type: 'goal', goal })}
              onDelete={() => setModal({ type: 'delete-goal', goal })}
            />
          ))}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            title="Você ainda não criou metas"
            text="Crie seu primeiro objetivo financeiro e acompanhe cada avanço até chegar lá."
            action="Criar primeira meta"
            onAction={() => setModal({ type: 'goal' })}
          />
        </section>
      )}
    </div>
  )
}

function GoalCard({ goal, incomeSummary, onContribution, onEdit, onDelete }) {
  const progress = goalProgress(goal)
  const status = goalStatus(goal)
  const days = daysUntil(goal.deadline)
  const plan = getFixedGoalPlan(goal, incomeSummary)

  const saved = Number(goal.saved) || 0
  const target = Number(goal.target) || 0
  const remaining = fromCents(Math.max(0, toCents(target) - toCents(saved)))

  let deadlineText = 'Sem prazo definido'

  if (goal.deadline) {
    if (status === 'Concluída') deadlineText = 'Meta concluída'
    else if (days === 0) deadlineText = 'Vence hoje'
    else if (days < 0) {
      const overdueDays = Math.abs(days)
      deadlineText = `Vencida há ${overdueDays} dia${overdueDays !== 1 ? 's' : ''}`
    } else deadlineText = `${days} dia${days !== 1 ? 's' : ''} restante${days !== 1 ? 's' : ''}`
  }

  return (
    <article className={`goal-card ${status === 'Concluída' ? 'goal-card-complete' : status === 'Vencida' ? 'goal-card-overdue' : 'goal-card-active'}`}>
      <div className="goal-card-header">
        <div>
          <span
            className={`status-inline ${
              status === 'Concluída' ? 'done' : status === 'Vencida' ? 'danger' : 'pending'
            }`}
          >
            {status}
          </span>

          <h3>{goal.name}</h3>
        </div>

        <div className="goal-card-actions">
          <button className="icon-button" title="Editar meta" onClick={onEdit}>
            ✎
          </button>

          <button className="icon-button danger" title="Excluir meta" onClick={onDelete}>
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

      {status !== 'Concluída' && plan && !plan.overdue && (
        <div className="goal-monthly-plan">
          <div><span>Sugestão mensal inicial (fixa)</span><strong>{money.format(plan.monthly)}/mês</strong></div>
          <small>Planejamento inicial: {plan.months} mês(es) · {plan.incomeShare === null ? 'Cadastre suas rendas para comparar' : `${plan.incomeShare.toFixed(1).replace('.', ',')}% da renda mensal média`}</small>
        </div>
      )}
      {status !== 'Concluída' && (
        <button className="btn primary goal-contribution-button" onClick={onContribution}>
          ＋ Adicionar aporte
        </button>
      )}
    </article>
  )
}

function Categories({ categories, transactions, setModal }) {
  const [selectedCategory, setSelectedCategory] = useState(null)
  // Uma categoria excluída não pode manter o gráfico preso a um filtro antigo.
  const activeCategory = categories.includes(selectedCategory) ? selectedCategory : null
  const expenseTransactions = transactions.filter((item) => item.type === 'expense')
  const totalExpenses = sumMoney(expenseTransactions)
  const data = categories
    .map((category, index) => {
      const items = expenseTransactions.filter((item) => item.category === category)
      return { category, total: sumMoney(items), count: items.length, index,
        color: chartPalette[index % chartPalette.length] }
    })
    .sort((a, b) => b.total - a.total)
  const filteredExpenses = activeCategory
    ? expenseTransactions.filter((item) => item.category === activeCategory)
    : expenseTransactions
  const filteredTotal = sumMoney(filteredExpenses)
  // Ao selecionar, detalha as despesas da categoria por descrição.
  const chartData = activeCategory
    ? groupTransactionsByDescription(filteredExpenses).map((item, index) => ({
        ...item, color: chartPalette[index % chartPalette.length],
      }))
    : data.filter((item) => item.total > 0).map((item) => ({
        label: item.category, value: item.total, color: item.color,
      }))
  const maxCategoryChartValue = Math.max(0, ...chartData.map((item) => item.value))
  const selectCategory = (category) =>
    setSelectedCategory((current) => current === category ? null : category)

  return (
    <div className="page">
      <section className="section-heading">
        <div>
          <span className="section-kicker">ORGANIZAÇÃO</span>
          <h2>Categorias</h2>
          <p>Selecione uma categoria para ver apenas as despesas dela no gráfico.</p>
        </div>
        <button className="btn primary" onClick={() => setModal({ type: 'category' })}>
          ＋ Nova categoria
        </button>
      </section>
      <section className="category-overview panel" aria-live="polite">
        <div>
          <span>{activeCategory ? `Total em ${activeCategory}` : 'Total em despesas'}</span>
          <strong>{money.format(filteredTotal)}</strong>
        </div>
        <div>
          <span>{activeCategory ? 'Lançamentos na categoria' : 'Categorias ativas'}</span>
          <strong>{activeCategory ? filteredExpenses.length : data.filter((item) => item.count > 0).length}</strong>
        </div>
        <div>
          <span>Categorias cadastradas</span>
          <strong>{categories.length}</strong>
        </div>
      </section>

      <div className="category-filter-status">
        <p className="category-click-hint" aria-live="polite">
          {activeCategory ? `Filtro: ${activeCategory}. Clique novamente no cartão para remover.` : 'Exibindo todas as categorias. Clique em um cartão abaixo para filtrar.'}
        </p>
        {activeCategory && <button className="btn secondary" onClick={() => setSelectedCategory(null)}>Mostrar todas</button>}
      </div>
      <section className="dashboard-grid dashboard-grid-charts page-charts-inline">
        <div className="panel chart-panel chart-panel-large">
          <PanelHeader
            title={activeCategory ? `Despesas de ${activeCategory}` : 'Despesas por categoria'}
            subtitle={activeCategory ? 'Valores agrupados pela descrição do lançamento' : 'Participação de todas as categorias com despesas'}
          />
          {chartData.length ? (
            <DonutChart data={chartData} totalLabel="Despesas"
              totalFormatter={(value) => money.format(value)}
              valueFormatter={(value) => money.format(value)} />
          ) : (
            <MiniEmpty text={activeCategory ? 'Esta categoria ainda não possui despesas.' : 'Registre despesas para ver a participação de cada categoria.'} />
          )}
        </div>
        <div className="panel insight-panel">
          <PanelHeader title="Leitura rápida" subtitle={activeCategory ? `Despesas de ${activeCategory}` : 'Resumo proporcional das categorias'} />
          {chartData.length ? (
            <div className="category-bars">
              {chartData.map(({ label, value, color }) => {
                const barHeight = maxCategoryChartValue > 0 ? (value / maxCategoryChartValue) * 100 : 0
                return (
                  <div className="category-bar-row" key={label}>
                    <div><strong>{label}</strong><span>{money.format(value)}</span></div>
                    <div className="category-track"><i style={{ height: `${barHeight}%`, background: color }} /></div>
                  </div>
                )
              })}
            </div>
          ) : (
            <MiniEmpty text={activeCategory ? 'Nenhum lançamento nesta categoria.' : 'As categorias passam a ganhar comparação visual assim que houver despesas.'} />
          )}
        </div>
      </section>

      <div className="category-grid">
        {data.map(({ category, total, count, index, color }) => {
          const share = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0
          return (
            <article className={`category-card category-card-filterable ${activeCategory === category ? 'selected' : ''}`}
              key={category} style={{ '--category-color': color }}>
              <button type="button" className="category-filter-button"
                aria-label={`Filtrar categoria ${category}`} aria-pressed={activeCategory === category}
                onClick={() => selectCategory(category)}>
                <span className="category-symbol" style={{ color, background: `${color}18` }}>
                  {['⌂', '◉', '▤', '◆', '＋'][index % 5]}
                </span>
                <span className="category-card-main">
                  <span className="category-title-row"><span className="category-name">{category}</span><span style={{ color }}>{share}%</span></span>
                  <span className="category-card-summary">{money.format(total)} · {count} lançamento{count !== 1 ? 's' : ''}</span>
                  <span className="category-progress"><i style={{ width: `${share}%`, background: color }} /></span>
                </span>
              </button>
              <button type="button" className="icon-button subtle danger" title="Excluir categoria"
                aria-label={`Excluir categoria ${category}`}
                onClick={() => setModal({ type: 'delete-category', category })}>×</button>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function Profile({ profile, onSave, onChangePassword, onExport, onLogout }) {
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  useEffect(() => {
    setName(profile.name)
    setEmail(profile.email)
  }, [profile])

  const submitProfile = (event) => {
    event.preventDefault()
    if (name.trim() && email.trim()) onSave({ name, email })
  }

  return (
    <div className="page profile-page">
      <section className="section-heading">
        <div>
          <span className="section-kicker">CONTA</span>
          <h2>Meu perfil</h2>
          <p>Gerencie seus dados, segurança e uma cópia local das suas informações.</p>
        </div>
      </section>
      <div className="profile-layout">
        <aside className="panel profile-card">
          <span className="avatar avatar-xl">{getInitials(name)}</span>
          <h3>{name}</h3>
          <p>{email}</p>
          <div className="profile-divider" />
          <div className="profile-meta">
            <span>
              <small>Conta</small>
              <strong>Autenticada</strong>
            </span>
            <span>
              <small>Armazenamento</small>
              <strong>Banco de dados</strong>
            </span>
          </div>
        </aside>
        <div className="profile-stack">
          <form className="panel profile-form" onSubmit={submitProfile}>
            <PanelHeader
              title="Informações pessoais"
              subtitle="Esses dados identificam sua conta no CustosVision"
            />
            <Field label="Nome completo">
              <input required value={name} onChange={(event) => setName(capitalizeFirstLetter(event.target.value))} />
            </Field>
            <Field label="E-mail">
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <div className="form-actions">
              <button className="btn primary" type="submit">
                Salvar alterações
              </button>
            </div>
          </form>
          <section className="panel settings-card">
            <PanelHeader title="Segurança" subtitle="Proteja o acesso à sua conta" />
            <div className="settings-row">
              <div>
                <strong>Senha da conta</strong>
                <p>Altere sua senha sempre que achar necessário.</p>
              </div>
              <button className="btn secondary" onClick={onChangePassword}>
                Alterar senha
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Sessão atual</strong>
                <p>Encerre o acesso neste navegador.</p>
              </div>
              <button className="btn secondary" onClick={onLogout}>
                Sair da conta
              </button>
            </div>
          </section>
          <section className="panel settings-card">
            <PanelHeader
              title="Dados e backup"
              subtitle="Recursos úteis para apresentação e segurança do protótipo"
            />
            <div className="settings-row">
              <div>
                <strong>Exportar backup</strong>
                <p>Baixe metas, lançamentos, categorias e perfil em JSON.</p>
              </div>
              <button className="btn secondary" onClick={onExport}>
                ↓ Exportar
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value, tone = 'purple' }) {
  return (
    <article className={`mini-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function MiniEmpty({ text }) {
  return (
    <div className="mini-empty">
      <span>◎</span>
      <p>{text}</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Modal({ title, subtitle, onClose, children, narrow = false }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className={`modal ${narrow ? 'modal-narrow' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function MoneyInput({
  value,
  onChange,
  name,
  min = 0,
  max = MAX_VALUE,
  required = false,
  ...props
}) {
  const ref = useRef(null)
  useEffect(() => {
    const amount = Number(value)
    let error = ''
    if (value !== '' && value != null) {
      if (!Number.isFinite(amount) || amount < Number(min))
        error = `Informe pelo menos ${money.format(Number(min))}.`
      else if (max != null && amount > Number(max))
        error = `O valor máximo é ${money.format(Number(max))}.`
    }
    ref.current?.setCustomValidity(error)
  }, [value, min, max])

  return (
    <input
      {...props}
      ref={ref}
      name={name}
      type="text"
      inputMode="numeric"
      required={required}
      placeholder="R$ 0,00"
      value={displayCurrency(value)}
      onChange={(event) => {
        const next = parseCurrencyDigits(event.target.value)
        onChange({ target: { name, value: next } })
      }}
    />
  )
}

function ReceiptScanner({ transactionType }) {
  const [cameraOpen, setCameraOpen] = useState(false)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => {
    if (!cameraOpen) return undefined
    let active = true
    const openCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('camera-unavailable')
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (!active) return stream.getTracks().forEach(track => track.stop())
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        if (active) {
          setError('Não foi possível abrir a câmera ao vivo. Você pode escolher uma foto da nota fiscal.')
          setCameraOpen(false)
          setTimeout(() => fileRef.current?.click(), 0)
        }
      }
    }
    openCamera()
    return () => { active = false; stopCamera() }
  }, [cameraOpen])

  const capture = () => {
    const video = videoRef.current
    if (!video?.videoWidth || !video?.videoHeight) return setError('Aguarde a imagem da câmera aparecer antes de capturar.')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    setPreview(canvas.toDataURL('image/jpeg', .86))
    setError('')
    setCameraOpen(false)
    stopCamera()
  }

  const selectImage = event => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setPreview(String(reader.result || '')); setError(''); setCameraOpen(false); stopCamera() }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return <div className="receipt-scanner full-field">
    <input ref={fileRef} className="receipt-file-input" type="file" accept="image/*" capture="environment" onChange={selectImage} />
    <div className="receipt-scanner-intro"><div><span className="receipt-scanner-icon">▣</span><div><strong>Nota fiscal pela câmera</strong><small>Capture a nota para preparar o lançamento automático.</small></div></div><button type="button" className="receipt-camera-button" onClick={() => { setPreview(''); setError(''); setCameraOpen(true) }}>⌁ Abrir câmera</button></div>
    {cameraOpen && <div className="receipt-camera-live"><video ref={videoRef} autoPlay muted playsInline /><div><button type="button" className="btn secondary" onClick={() => { setCameraOpen(false); stopCamera() }}>Cancelar</button><button type="button" className="btn primary" onClick={capture}>Capturar nota</button></div></div>}
    {preview && <div className="receipt-preview"><img src={preview} alt="Prévia da nota fiscal capturada" /><div><strong>Nota capturada</strong><p>A imagem está pronta para a futura leitura automática de estabelecimento, valor e data. Nesta versão somente frontend, os campos continuam sob seu controle.</p><button type="button" onClick={() => setPreview('')}>Remover imagem</button></div></div>}
    {error && <p className="receipt-camera-error">{error}</p>}
    <small className="receipt-scanner-note">Disponível tanto para {transactionType === 'income' ? 'rendas' : 'despesas'}. A automação completa depende da integração de OCR/leitura fiscal em uma próxima etapa.</small>
  </div>
}

function TransactionModal({ categories, initialType, transaction, onClose, onSubmit }) {
  const [form, setForm] = useState(() =>
    transaction
      ? {
          ...transaction,
          periodicity: transaction.periodicity || 'Única',
          value: Number(transaction.value).toFixed(2),
        }
      : {
          type: initialType || 'expense',
          description: '',
          category: initialType === 'income' ? 'Renda principal' : categories[0] || '',
          date: todayInputValue(),
          value: '',
          periodicity: 'Única',
        },
  )
  const update = (event) => {
    const { name, value } = event.target
    const nextValue = name === 'description' ? capitalizeFirstLetter(value) : value
    setForm((current) => ({ ...current, [name]: nextValue }))
  }
  const submit = (event) => {
    event.preventDefault()
    if (!form.description.trim() || toCents(form.value) <= 0) return
    if (transaction) onSubmit(transaction.id, form)
    else onSubmit(form)
  }
  return (
    <Modal
      title={transaction ? 'Editar lançamento' : 'Novo lançamento'}
      subtitle={
        transaction
          ? 'Atualize os dados desta movimentação.'
          : 'Registre uma movimentação financeira.'
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-grid">
        <Field label="Tipo">
          <div className="segmented">
            <button
              type="button"
              className={form.type === 'expense' ? 'selected' : ''}
              disabled={Boolean(transaction)}
              onClick={() => setForm({ ...form, type: 'expense', category: categories[0] || '' })}
            >
              Despesa
            </button>
            <button
              type="button"
              className={form.type === 'income' ? 'selected' : ''}
              disabled={Boolean(transaction)}
              onClick={() => setForm({ ...form, type: 'income', category: 'Renda principal' })}
            >
              Renda
            </button>
          </div>
        </Field>
        <Field label="Descrição">
          <input
            autoFocus
            required
            maxLength={150}
            name="description"
            value={form.description}
            onChange={update}
            placeholder="Ex.: Supermercado"
          />
        </Field>
        <Field label="Valor">
          <MoneyInput required min="0.01" name="value" value={form.value} onChange={update} />
        </Field>
        <Field label="Data">
          <input required name="date" type="date" value={form.date} onChange={update} />
        </Field>
        <label className="field full-field">
          <span>Categoria</span>
          <select required name="category" value={form.category} onChange={update}>
            {form.type === 'income' ? (
              <>
                <option>Renda principal</option>
                <option>Renda extra</option>
              </>
            ) : (
              <>
                <option value="">Selecione uma categoria</option>
                {[...new Set([...categories, ...(form.category ? [form.category] : [])])].map(
                  (category) => (
                    <option key={category}>{category}</option>
                  ),
                )}
              </>
            )}
          </select>
        </label>
        {
          <label className="field full-field">
            <span>Frequência</span>
            <select name="periodicity" value={form.periodicity} onChange={update}>
              <option value="Única">Somente esta vez</option>
              <option value="Mensal">Mensal</option>
            </select>
            <small className="field-hint">
              Mensal indica que esta renda ou despesa se repete todo mês. Você ainda precisa
              cadastrar cada mês; o sistema não cria os próximos lançamentos sozinho.
            </small>
          </label>
        }
        <div className="modal-actions full-field">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary">
            {transaction ? 'Salvar alterações' : 'Salvar lançamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function GoalModal({ goal, incomeSummary, onClose, onSubmit }) {
  const [form, setForm] = useState(() =>
    goal
      ? {
          name: goal.name,
          target: Number(goal.target).toFixed(2),
          saved: Number(goal.saved).toFixed(2),
          deadline: goal.deadline,
        }
      : { name: '', target: '', saved: '', deadline: '' },
  )
  const update = (event) => {
    const { name, value } = event.target
    const nextValue = name === 'name' ? capitalizeFirstLetter(value) : value
    setForm((current) => ({ ...current, [name]: nextValue }))
  }
  const plan = goal ? getFixedGoalPlan(goal, incomeSummary) : getGoalMonthlyPlan(form, incomeSummary)
  const submit = (event) => {
    event.preventDefault()
    if (!form.name.trim() || toCents(form.target) <= 0 || !form.deadline) return
    if (goal) onSubmit(goal.id, form)
    else onSubmit(form)
  }
  return (
    <Modal
      title={goal ? 'Editar meta' : 'Nova meta'}
      subtitle={
        goal
          ? 'Ajuste nome, valores ou prazo. Alterar o acumulado substitui os aportes anteriores por esse total.'
          : 'Defina um objetivo para manter o foco.'
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-grid">
        <label className="field full-field">
          <span>Nome da meta</span>
          <input
            autoFocus
            required
            maxLength={150}
            name="name"
            value={form.name}
            onChange={update}
            placeholder="Ex.: Reserva de emergência"
          />
        </label>
        <Field label="Valor objetivo">
          <MoneyInput required min="0.01" name="target" value={form.target} onChange={update} />
        </Field>
        <Field label="Valor acumulado">
          <MoneyInput
            min="0"
            max={form.target || MAX_VALUE}
            name="saved"
            value={form.saved}
            onChange={update}
          />
        </Field>
        <label className="field full-field">
          <span>Prazo</span>
          <input required type="date" name="deadline" value={form.deadline} onChange={update} />
        </label>
        {plan && (
          <div className="goal-plan-preview full-field" aria-live="polite">
            <div className="goal-plan-preview-head">
              <span>◎</span>
              <div><strong>Planejamento da sua meta</strong><p>Sugestão fixada ao criar a meta, com base nas rendas e no prazo daquela data.</p></div>
            </div>
            <div className="goal-plan-preview-grid">
              <div><span>Guardar por mês</span><strong>{money.format(plan.monthly)}</strong></div>
              <div><span>Renda principal / mês</span><strong>{money.format(plan.principalAverage)}</strong></div>
              <div><span>Renda extra / mês</span><strong>{money.format(plan.extraAverage)}</strong></div>
            </div>
            <p className="goal-plan-preview-note">
              {plan.remaining === 0 ? 'Você já atingiu o valor desta meta.' : plan.overdue ? 'O prazo já passou. Escolha uma data futura para planejar os aportes.' : plan.incomeShare === null ? `Faltam ${money.format(plan.remaining)} em ${plan.months} mês(es). Cadastre rendas para analisar a proporção necessária.` : `Para juntar ${money.format(plan.remaining)} em ${plan.months} mês(es), reserve ${plan.incomeShare.toFixed(1).replace('.', ',')}% da sua renda mensal média. ${plan.incomeShare > 100 ? 'Atenção: o aporte supera suas rendas registradas. Considere ampliar o prazo ou ajustar a meta.' : 'Confira também suas despesas antes de assumir esse valor.'}`}
            </p>
          </div>
        )}
        <div className="modal-actions full-field">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary">{goal ? 'Salvar alterações' : 'Criar meta'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ContributionModal({ goal, onClose, onSubmit }) {
  const [value, setValue] = useState('')
  const targetCents = toCents(goal.target)
  const savedCents = toCents(goal.saved)
  const remainingCents = Math.max(0, targetCents - savedCents)
  const remaining = fromCents(remainingCents)
  const maxContribution = remaining.toFixed(2)
  const submit = (event) => {
    event.preventDefault()
    const contributionCents = toCents(value)
    if (contributionCents > 0 && contributionCents <= remainingCents)
      onSubmit(goal.id, fromCents(contributionCents))
  }
  return (
    <Modal title="Fazer aporte" subtitle={goal.name} onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <div className="contribution-summary full-field">
          <span>Falta para a meta</span>
          <strong>{money.format(remaining)}</strong>
        </div>
        <label className="field full-field">
          <span>Valor do aporte</span>
          <MoneyInput
            autoFocus
            required
            min="0.01"
            max={maxContribution}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <div className="quick-values full-field">
          {[25, 50, 100].map((percent) => {
            const amount = fromCents(Math.floor((remainingCents * percent) / 100))
            return (
              <button
                type="button"
                key={percent}
                disabled={amount < 0.01}
                onClick={() => setValue(Math.min(remaining, amount).toFixed(2))}
              >
                {percent}% <span>{money.format(amount)}</span>
              </button>
            )
          })}
          <button type="button" onClick={() => setValue(maxContribution)}>
            Completar <span>{money.format(remaining)}</span>
          </button>
        </div>
        <div className="modal-actions full-field">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary">Registrar aporte</button>
        </div>
      </form>
    </Modal>
  )
}

function PasswordModal({ onClose, onSubmit }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const strength = passwordStrength(password)

  const submit = async (event) => {
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

  return (
    <Modal
      title="Alterar senha"
      subtitle="Confirme sua senha atual e defina uma nova."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-grid">
        <label className="field full-field">
          <span>Senha atual</span>
          <input
            autoFocus
            required
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Digite sua senha atual"
          />
        </label>
        <label className="field full-field">
          <span>Nova senha</span>
          <input
            required
            minLength="6"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo de 6 caracteres"
          />
        </label>
        <div className="password-strength full-field">
          <div>
            {[0, 1, 2, 3, 4].map((index) => (
              <i key={index} className={index < strength.score ? 'active' : ''} />
            ))}
          </div>
          <span>{strength.label}</span>
        </div>
        <label className="field full-field">
          <span>Confirmar nova senha</span>
          <input
            required
            minLength="6"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Digite a senha novamente"
          />
        </label>
        {error && <div className="form-error full-field">{error}</div>}
        <p className="password-note full-field">
          A autenticação desta apresentação é validada pelo backend.
        </p>
        <div className="modal-actions full-field">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CategoryModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    const result = await onSubmit(name)
    if (result && !result.ok) setError(result.error)
  }
  return (
    <Modal
      title="Nova categoria"
      subtitle="Crie uma categoria personalizada para suas despesas."
      onClose={onClose}
      narrow
    >
      <form onSubmit={submit} className="form-grid">
        <label className="field full-field">
          <span>Nome</span>
          <input
            autoFocus
            required
            maxLength={70}
            value={name}
            onChange={(event) => setName(capitalizeFirstLetter(event.target.value))}
            placeholder="Ex.: Assinaturas"
          />
        </label>
        {error && <div className="form-error full-field">{error}</div>}
        <div className="modal-actions full-field">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary">Criar categoria</button>
        </div>
      </form>
    </Modal>
  )
}

function ConfirmModal({ title, text, confirmLabel, danger = false, onClose, onConfirm }) {
  return (
    <Modal title={title} subtitle={text} onClose={onClose} narrow>
      <div className="confirm-box">
        <span className={danger ? 'danger' : ''}>{danger ? '!' : '↪'}</span>
        <p>
          {danger
            ? 'Esta ação não pode ser desfeita.'
            : 'Você poderá entrar novamente quando quiser.'}
        </p>
      </div>
      <div className="modal-actions">
        <button className="btn secondary" onClick={onClose}>
          Cancelar
        </button>
        <button className={danger ? 'btn danger-solid' : 'btn primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

function Toast({ toast, onClose }) {
  const tone = toast.tone || 'success'
  const config = {
    success: { icon: '✓', eyebrow: 'Tudo certo', title: 'Operação concluída' },
    warning: { icon: '!', eyebrow: 'Atenção', title: 'Verifique esta informação' },
    error: { icon: '×', eyebrow: 'Não foi possível concluir', title: 'Algo deu errado' },
  }[tone] || { icon: '✓', eyebrow: 'Tudo certo', title: 'Operação concluída' }

  return (
    <div className="feedback-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`feedback-popup ${tone}`} role="status" aria-live="polite" onMouseDown={event => event.stopPropagation()}>
        <button className="feedback-close" type="button" onClick={onClose} aria-label="Fechar aviso">×</button>
        <div className="feedback-icon" aria-hidden="true">{config.icon}</div>
        <span className="feedback-eyebrow">{config.eyebrow}</span>
        <h3>{config.title}</h3>
        <p>{toast.message}</p>
        <button className="btn primary feedback-action" type="button" onClick={onClose}>Entendi</button>
      </section>
    </div>
  )
}

function EmptyState({ title, text, action, onAction }) {
  return (
    <div className="empty">
      <span>◎</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="btn primary" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

export default App
