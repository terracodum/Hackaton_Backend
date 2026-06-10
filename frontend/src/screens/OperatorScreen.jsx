import { useState, useMemo, useEffect, useRef } from 'react'
import {
  CheckSquare,
  Square,
  Send,
  Filter,
  X,
  CheckCircle2,
  Building2,
  Loader2,
  Copy,
  Mail,
} from 'lucide-react'
import { getAllDemoDistrictReports } from '../demo'
import { api } from '../api/client'
import LiveDemoPanel, { LiveDemoToggle } from '../components/LiveDemoPanel'
import { useLiveDemoFeed } from '../hooks/useLiveDemoFeed'

const FALLBACK_AGENCY = { name: 'Иные ведомства Омской области', email: 'gov@omskportal.ru' }

const SEVERITY_COLORS = {
  0: '#94a3b8', 1: '#84cc16', 2: '#eab308', 3: '#f97316', 4: '#dc2626',
}

const SEVERITY_LABELS = {
  0: 'Шум', 1: 'Микро', 2: 'Локальный', 3: 'Системный', 4: 'ЧП',
}

const RULES = [
  {
    re: /отопл|теплоснаб|жкх|водоснабж|водоотвед|канализ|прорыв трубы|кипяток|протечк|кровл|подвал|лифт|управляющ компани|ресурсоснабж|плата за жи|коммунал|мкд|квитанц|счётчик|прибор учёт|горячая вода|холодная вода|водопровод|отключение воды|отключение отоплен/,
    agency: { name: 'Министерство ЖКХ и энергетики', email: 'mzkhke@omskportal.ru' },
    label: 'ЖКХ',
  },
  {
    re: /уборк.*снег|уборк.*дорог|снег.*дорог|наледь|яма.*дорог|дорог.*яма|асфальт|некачественн.*дорог|ремонт.*дорог|строительств.*дорог|тротуар|мост|переход|разметк|светофор|дорожн.*знак|лежач.*полиц|ямы|выбоин|грейдир|грунтовая дорог/,
    agency: { name: 'Министерство транспорта и дорожного хозяйства', email: 'mintrans@omskportal.ru' },
    label: 'Дороги',
  },
  {
    re: /автобус|маршрут обществ|остановк|проезд в|стоимость проезд|транспортн.*карт|льготн.*проезд|контролер|подвижн.*состав|расписани|общественн.*транспорт|маршрутк/,
    agency: { name: 'Министерство транспорта и дорожного хозяйства', email: 'mintrans@omskportal.ru' },
    label: 'Транспорт',
  },
  {
    re: /мусор|свалк|тко|вывоз.*отход|контейнер|полигон|мусорн|несанкц.*сброс|раздельн.*сортировк|санитарн/,
    agency: { name: 'Министерство природных ресурсов и экологии', email: 'minpriroda@omskportal.ru' },
    label: 'Мусор / ТКО',
  },
  {
    re: /загрязн|выброс.*атмосфер|эколог|вырубк|браконьер|водоохран|химическ.*отход|радиоакт|гибель.*животн|лес.*вырубк/,
    agency: { name: 'Министерство природных ресурсов и экологии', email: 'minpriroda@omskportal.ru' },
    label: 'Экология',
  },
  {
    re: /школ|детский сад|садик|образован|учебн|педагог|учитель|воспитател|директор.*школ|егэ|огэ|питан.*школ|нехватк.*мест.*школ|нехватк.*мест.*сад|безопасность образ/,
    agency: { name: 'Министерство образования', email: 'minedu@omskportal.ru' },
    label: 'Образование',
  },
  {
    re: /больниц|поликлиник|врач|медицин|анализ|лечен|скорая|аптек|лекарств|здравоохран|медпомощ|запись.*врач|очередь.*больниц|нехватк.*врач|нехватк.*медработ|оборудован.*больниц/,
    agency: { name: 'Министерство здравоохранения', email: 'minzdrav@omskportal.ru' },
    label: 'Здравоохранение',
  },
  {
    re: /пособи|инвалид|сирот|льгот.*социал|малоимущ|пенсион|ветеран труда|многодет|матер.*капитал|социальн.*поддержк|единое пособ|выплат.*задержк|соцконтракт|опека|попечительств/,
    agency: { name: 'Министерство труда и социального развития', email: 'mintrud@omskportal.ru' },
    label: 'Соцзащита',
  },
  {
    re: /благоустр|детск.*площадк|спортивн.*площадк|двор.*содержан|лавочк|урн|освещени.*двор|парк|сквер|зелен.*насажд|вырубк.*дерев|упавш.*дерев|ограждени|фасад|кровл.*нежил/,
    agency: { name: 'Министерство строительства, жилищной политики и архитектуры', email: 'minstroy@omskportal.ru' },
    label: 'Благоустройство',
  },
  {
    re: /газ|газиф|газоснабж|отключение газ|электр|электроснабж|подстанц|лэп|энергет|низкое качество.*электр|отключение электр/,
    agency: { name: 'Министерство энергетики и жилищно-коммунального комплекса', email: 'mzkhke@omskportal.ru' },
    label: 'Энергетика',
  },
]

function resolveAgency(text, groupName) {
  const hay = ((text || '') + ' ' + (groupName || '')).toLowerCase()
  for (const rule of RULES) {
    if (rule.re.test(hay)) return { agency: rule.agency, category: rule.label }
  }
  return { agency: FALLBACK_AGENCY, category: groupName || 'Иное' }
}

function buildIncidents() {
  const reports = getAllDemoDistrictReports()
  const items = []
  let id = 0
  for (const report of reports) {
    for (const ex of report.incident_examples || []) {
      if (!ex.text || ex.text.length < 20) continue
      const { agency, category } = resolveAgency(ex.text, report.top_category)
      items.push({
        id: id++,
        text: ex.text,
        severity: ex.severity ?? 1,
        label: ex.label || SEVERITY_LABELS[ex.severity ?? 1] || '',
        district: report.district_name,
        category,
        agency,
      })
    }
  }
  return items.sort((a, b) => b.severity - a.severity)
}

const ALL_INCIDENTS = buildIncidents()

export default function OperatorScreen({ dark, initialDistrict }) {
  const [selected, setSelected] = useState(new Set())
  const [filterSev, setFilterSev] = useState(null)
  const [filterDistrict, setFilterDistrict] = useState(initialDistrict || '')
  const [sent, setSent] = useState(new Set())
  const [sendModal, setSendModal] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [composing, setComposing] = useState(false)
  const [emailDraft, setEmailDraft] = useState(null)
  const [copied, setCopied] = useState(false)
  const [liveOn, setLiveOn] = useState(false)
  const [liveItems, setLiveItems] = useState([])
  const seenLiveRef = useRef(new Set())
  const liveFeed = useLiveDemoFeed(liveOn)

  useEffect(() => {
    for (const event of liveFeed.events) {
      if (seenLiveRef.current.has(event.uid)) continue
      seenLiveRef.current.add(event.uid)
      const { agency, category } = resolveAgency(event.text, event.group)
      const severity = event.severity ?? 1
      setLiveItems((prev) => [{
        id: `live-${event.uid}`,
        text: event.text,
        severity,
        label: SEVERITY_LABELS[severity] || event.label,
        district: event.municipality || '',
        category,
        agency,
        isLive: true,
      }, ...prev].slice(0, 30))
    }
  }, [liveFeed.events])

  const allItems = useMemo(() => [...liveItems, ...ALL_INCIDENTS], [liveItems])

  const districts = useMemo(() => [...new Set(allItems.map((i) => i.district))].sort(), [allItems])

  const filtered = useMemo(() => {
    let items = allItems
    if (filterSev !== null) items = items.filter((i) => i.severity === filterSev)
    if (filterDistrict) items = items.filter((i) => i.district === filterDistrict)
    return items
  }, [allItems, filterSev, filterDistrict])

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((i) => i.id)))
    }
  }

  const selectedItems = filtered.filter((i) => selected.has(i.id))

  const groupByAgency = (items) => {
    const map = {}
    for (const item of items) {
      const key = item.agency.name
      if (!map[key]) map[key] = { agency: item.agency, items: [] }
      map[key].items.push(item)
    }
    return Object.values(map)
  }

  const handleSend = () => {
    if (!selectedItems.length) return
    setSendModal(groupByAgency(selectedItems))
  }

  const confirmSend = () => {
    setSent((prev) => {
      const next = new Set(prev)
      selectedItems.forEach((i) => next.add(i.id))
      return next
    })
    setSelected(new Set())
    setSendModal(null)
    setEmailDraft(null)
    setSuccessMsg(`Пакет из ${selectedItems.length} обращений отправлен в ведомства`)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const handleCompose = async (group) => {
    setComposing(group.agency.name)
    setEmailDraft(null)
    setCopied(false)
    try {
      const incidents = group.items.map((i) => ({
        text: i.text,
        severity: i.severity,
        label: i.label,
        district: i.district,
        category: i.category,
      }))
      const result = await api.composeEmail(incidents, group.agency.name, group.agency.email)
      setEmailDraft(result)
    } catch {
      setEmailDraft({ subject: 'Ошибка генерации', body: 'Не удалось получить ответ от LLM. Проверьте соединение с Ollama.' })
    } finally {
      setComposing(false)
    }
  }

  const handleCopy = () => {
    if (!emailDraft) return
    navigator.clipboard.writeText(`Тема: ${emailDraft.subject}\n\n${emailDraft.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* toolbar */}
      <div
        className="px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Обращения · {filtered.length}
        </span>

        {/* severity filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
          {[null, 4, 3, 2, 1].map((sev) => (
            <button
              key={sev ?? 'all'}
              onClick={() => setFilterSev(sev)}
              className="px-2 py-0.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: filterSev === sev
                  ? (sev !== null ? SEVERITY_COLORS[sev] : '#dc2626')
                  : 'var(--bg-sub)',
                color: filterSev === sev ? '#fff' : 'var(--muted)',
              }}
            >
              {sev === null ? 'Все' : SEVERITY_LABELS[sev]}
            </button>
          ))}
        </div>

        {/* district filter */}
        <select
          value={filterDistrict}
          onChange={(e) => setFilterDistrict(e.target.value)}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ background: 'var(--bg-sub)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          <option value="">Все районы</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-3">
          <LiveDemoToggle enabled={liveOn} onToggle={() => setLiveOn((v) => !v)} />
          {selected.size > 0 && (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Выбрано: {selected.size}
            </span>
          )}
          <button
            onClick={handleSend}
            disabled={!selected.size}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: selected.size ? '#dc2626' : 'var(--bg-sub)',
              color: selected.size ? '#fff' : 'var(--muted)',
              cursor: selected.size ? 'pointer' : 'not-allowed',
            }}
          >
            <Send className="w-3.5 h-3.5" />
            Отправить в ведомство
          </button>
        </div>
      </div>

      {/* success toast */}
      {successMsg && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium"
          style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* select all */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={toggleAll} className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
            {selected.size === filtered.length && filtered.length > 0
              ? <CheckSquare className="w-4 h-4 text-red-600" />
              : <Square className="w-4 h-4" />
            }
            Выбрать все
          </button>
        </div>

        {filtered.map((item) => {
          const isSent = sent.has(item.id)
          const isSelected = selected.has(item.id)
          const color = SEVERITY_COLORS[item.severity]

          return (
            <div
              key={item.id}
              onClick={() => !isSent && toggle(item.id)}
              className="flex gap-3 p-3.5 rounded-xl cursor-pointer transition-all"
              style={{
                ...card,
                opacity: isSent ? 0.5 : 1,
                boxShadow: isSelected ? `0 0 0 2px ${color}` : item.isLive ? `0 0 0 1.5px #16a34a` : 'none',
                cursor: isSent ? 'default' : 'pointer',
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isSent
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : isSelected
                    ? <CheckSquare className="w-4 h-4 text-red-600" />
                    : <Square className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {item.isLive && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded animate-pulse"
                      style={{ background: '#16a34a', color: '#fff' }}>● LIVE</span>
                  )}
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${color}22`, color }}
                  >
                    {item.label} · {item.severity}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{item.district}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>· {item.category}</span>
                  {isSent && (
                    <span className="text-xs font-semibold text-emerald-600">Отправлено</span>
                  )}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {item.text}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                  <Building2 className="w-3 h-3" />
                  {item.agency.name}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <LiveDemoPanel enabled={liveOn} feed={liveFeed} />

      {/* send modal */}
      {sendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => { setSendModal(null); setEmailDraft(null) }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              maxHeight: '90vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>
                Отправить в ведомства · {selectedItems.length} обращений
              </h2>
              <button onClick={() => { setSendModal(null); setEmailDraft(null) }}>
                <X className="w-5 h-5" style={{ color: 'var(--muted)' }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {/* agency groups */}
              {sendModal.map((group) => (
                <div key={group.agency.name} className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between gap-2 px-4 py-3"
                    style={{ background: 'var(--bg-sub)' }}>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {group.agency.name}
                      </div>
                      <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {group.agency.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        {group.items.length} обр.
                      </span>
                      <button
                        onClick={() => handleCompose(group)}
                        disabled={!!composing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: composing === group.agency.name ? 'var(--bg-sub)' : '#2563eb',
                          color: composing === group.agency.name ? 'var(--muted)' : '#fff',
                          opacity: composing && composing !== group.agency.name ? 0.5 : 1,
                        }}
                      >
                        {composing === group.agency.name
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Mail className="w-3.5 h-3.5" />
                        }
                        {composing === group.agency.name ? 'Генерация...' : 'Письмо AI'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* email draft */}
              {composing && !emailDraft && (
                <div className="flex flex-col items-center gap-2 py-6" style={{ color: 'var(--muted)' }}>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">LLM генерирует письмо...</span>
                </div>
              )}

              {emailDraft && (
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid #3b82f6', background: '#eff6ff' }}>
                  <div className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: '1px solid #bfdbfe', background: '#dbeafe' }}>
                    <span className="text-xs font-bold text-blue-700">Сгенерированное письмо</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: copied ? '#16a34a' : '#2563eb', color: '#fff' }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? 'Скопировано!' : 'Копировать'}
                    </button>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-xs font-semibold text-blue-800 mb-1">Тема:</div>
                    <div className="text-sm font-medium text-blue-900 mb-3">{emailDraft.subject}</div>
                    <div className="text-xs font-semibold text-blue-800 mb-1">Текст письма:</div>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed"
                      style={{ fontFamily: 'inherit' }}>
                      {emailDraft.body}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="flex gap-2 justify-end px-6 py-4"
              style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => { setSendModal(null); setEmailDraft(null) }}
                className="px-4 py-2 rounded-xl text-sm"
                style={{ background: 'var(--bg-sub)', color: 'var(--muted)' }}
              >
                Отмена
              </button>
              <button
                onClick={confirmSend}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold"
                style={{ background: '#dc2626', color: '#fff' }}
              >
                <Send className="w-4 h-4" />
                Подтвердить отправку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
