import { useState, useEffect, useRef } from 'react'
import { MapPin, Siren, Phone, Mail, CheckCircle2, Clock, AlertTriangle, Radio, X } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import LiveDemoPanel, { LiveDemoToggle } from '../components/LiveDemoPanel'
import { useLiveDemoFeed } from '../hooks/useLiveDemoFeed'

const INCIDENTS = [
  {
    id: 'pipe',
    label: 'Прорыв трубы водоснабжения',
    icon: '💧',
    color: '#3b82f6',
    address: 'ул. Ленина, 14, Омск',
    coords: [54.9893, 73.3682],
    radius: 200,
    services: [
      { name: 'АО «Омск РТС»', role: 'Управляющая компания теплосетей', phone: '8-800-250-01-55', email: 'info@omsk-rts.ru', type: 'uk' },
      { name: 'МКУ «Служба заказчика»', role: 'Жилищный фонд', phone: '+7 (3812) 99-30-81', email: 'szakazchika@omskportal.ru', type: 'uk' },
      { name: 'МЧС ПЧ-1 Омск', role: 'Первая пожарная часть', phone: '112', email: 'mchs@55.mchs.gov.ru', type: 'mchs' },
      { name: 'МинЖКХ Омской области', role: 'Ведомство ЖКХ', phone: '+7 (3812) 24-55-02', email: 'mzkhke@omskportal.ru', type: 'ministry' },
    ],
    evacuation: 'МБОУ «Школа № 55» (ул. Пушкина, 94) — 300 м',
    risk: 'Затопление подвалов, угроза обрушения перекрытий. Отключение водоснабжения в 3 домах.',
  },
  {
    id: 'bpla',
    label: 'Падение БПЛА',
    icon: '✈️',
    color: '#dc2626',
    address: 'ул. Красный Путь, 107, Омск',
    coords: [54.9823, 73.3751],
    radius: 350,
    services: [
      { name: 'МЧС ПЧ-3 Омск', role: 'Ближайшая пожарная часть', phone: '112', email: 'mchs@55.mchs.gov.ru', type: 'mchs' },
      { name: 'ФСБ по Омской области', role: 'Федеральная служба безопасности', phone: '+7 (3812) 20-00-00', email: 'fsb@omsk.gov.ru', type: 'mchs' },
      { name: 'ООО «УК Центр»', role: 'Управляющая компания МКД', phone: '+7 (3812) 33-00-11', email: 'uk-center@omsk.ru', type: 'uk' },
      { name: 'Аппарат Губернатора', role: 'Экстренная связь с руководством', phone: '+7 (3812) 24-49-49', email: 'gov@omskportal.ru', type: 'ministry' },
    ],
    evacuation: 'МБОУ «Гимназия № 19» (ул. Карла Либкнехта, 33) — 450 м',
    risk: 'Возможное задымление, обломки в радиусе 350 м. Требуется оцепление территории.',
  },
  {
    id: 'heat',
    label: 'Прорыв теплотрассы',
    icon: '🔥',
    color: '#f97316',
    address: 'пр. Мира, 56, Омск',
    coords: [54.9945, 73.3812],
    radius: 150,
    services: [
      { name: 'АО «Омск РТС»', role: 'Теплоснабжающая организация', phone: '8-800-250-01-55', email: 'info@omsk-rts.ru', type: 'uk' },
      { name: 'МЧС ПЧ-2 Омск', role: 'Пожарная часть', phone: '112', email: 'mchs@55.mchs.gov.ru', type: 'mchs' },
      { name: 'МКУ «ЖКО Центральный»', role: 'Жилищная контора', phone: '+7 (3812) 23-11-44', email: 'jko-center@omsk.ru', type: 'uk' },
      { name: 'МинЖКХ Омской области', role: 'Ведомство ЖКХ', phone: '+7 (3812) 24-55-02', email: 'mzkhke@omskportal.ru', type: 'ministry' },
    ],
    evacuation: 'МБОУ «Школа № 45» (ул. Химиков, 5) — 380 м',
    risk: 'Ожоговая опасность от пара. Без отопления 12 МКД. Угроза обледенения дорожного покрытия.',
  },
]

const SERVICE_COLORS = { mchs: '#dc2626', uk: '#3b82f6', ministry: '#7c3aed' }
const SERVICE_LABELS = { mchs: 'МЧС', uk: 'УК / РСО', ministry: 'Ведомство' }

const DISTRICT_COORDS = {
  'Омск г.о.': [54.9885, 73.3242],
  'Омский район': [54.9400, 73.5500],
  'Тарский район': [56.9000, 74.3700],
  'Калачинский район': [55.0600, 74.5700],
  'Муромцевский район': [56.3800, 75.3500],
  'Большереченский район': [56.1100, 74.6500],
  'Азовский немецкий национальный район': [54.7300, 72.4600],
  'Любинский район': [55.1600, 72.6200],
  'Исилькульский район': [54.9100, 71.2800],
  'Москаленский район': [54.9400, 71.7000],
  'Черлакский район': [54.1500, 74.0000],
  'Кормиловский район': [55.0000, 73.9000],
  'Марьяновский район': [54.9600, 72.7100],
  'Таврический район': [54.0900, 72.2500],
  'Называевский район': [55.5700, 71.3500],
  'Нижнеомский район': [55.8800, 73.6500],
  'Горьковский район': [55.0300, 74.8200],
  'Тевризский район': [57.5000, 74.3500],
  'Знаменский район': [57.0300, 73.2000],
}
const DEFAULT_COORDS = [54.9885, 73.3242]

const SERVICE_TEMPLATES = {
  jkh: [
    { name: 'АО «Омск РТС»', role: 'Теплоснабжающая организация', phone: '8-800-250-01-55', email: 'info@omsk-rts.ru', type: 'uk' },
    { name: 'МКУ «Служба заказчика»', role: 'Жилищный фонд', phone: '+7 (3812) 99-30-81', email: 'szakazchika@omskportal.ru', type: 'uk' },
    { name: 'МЧС Омской области', role: 'Экстренная служба', phone: '112', email: 'mchs@55.mchs.gov.ru', type: 'mchs' },
    { name: 'МинЖКХ Омской области', role: 'Ведомство ЖКХ', phone: '+7 (3812) 24-55-02', email: 'mzkhke@omskportal.ru', type: 'ministry' },
  ],
  roads: [
    { name: 'КУ «Управление дорожного хозяйства»', role: 'Содержание дорог', phone: '+7 (3812) 39-01-82', email: 'udh@omskportal.ru', type: 'uk' },
    { name: 'МЧС Омской области', role: 'Экстренная служба', phone: '112', email: 'mchs@55.mchs.gov.ru', type: 'mchs' },
    { name: 'МинТранс Омской области', role: 'Ведомство транспорта', phone: '+7 (3812) 24-52-86', email: 'mintrans@omskportal.ru', type: 'ministry' },
  ],
  ecology: [
    { name: 'Росприроднадзор по Омской области', role: 'Природоохранный надзор', phone: '+7 (3812) 34-09-77', email: 'rpn@omsk.ru', type: 'uk' },
    { name: 'МЧС Омской области', role: 'Экстренная служба', phone: '112', email: 'mchs@55.mchs.gov.ru', type: 'mchs' },
    { name: 'МинПрироды Омской области', role: 'Ведомство экологии', phone: '+7 (3812) 24-54-79', email: 'minpriroda@omskportal.ru', type: 'ministry' },
  ],
  default: [
    { name: 'МЧС Омской области', role: 'Экстренная служба', phone: '112', email: 'mchs@55.mchs.gov.ru', type: 'mchs' },
    { name: 'Администрация Омской области', role: 'Координирующий орган', phone: '+7 (3812) 24-49-49', email: 'gov@omskportal.ru', type: 'ministry' },
  ],
}

function buildLiveIncident(event) {
  const hay = ((event.text || '') + ' ' + (event.group || '') + ' ' + (event.topic || '')).toLowerCase()
  let services = SERVICE_TEMPLATES.default
  let color = '#f97316'
  let icon = '⚠️'

  if (/отопл|водоснабж|канализ|жкх|прорыв|кипяток|лифт|коммунал/.test(hay)) {
    services = SERVICE_TEMPLATES.jkh; color = '#3b82f6'; icon = '💧'
  } else if (/дорог|снег|наледь|яма|асфальт|тротуар|мост/.test(hay)) {
    services = SERVICE_TEMPLATES.roads; color = '#eab308'; icon = '🚧'
  } else if (/загрязн|эколог|выброс|мусор|свалк/.test(hay)) {
    services = SERVICE_TEMPLATES.ecology; color = '#16a34a'; icon = '☣️'
  } else if (event.severity === 4) {
    color = '#dc2626'; icon = '🚨'
  }

  const coords = DISTRICT_COORDS[event.municipality] || DEFAULT_COORDS
  const jitter = () => (Math.random() - 0.5) * 0.008
  return {
    id: `live-${event.uid}`,
    label: event.topic || event.label || 'Критическое обращение',
    icon,
    color,
    address: event.municipality || 'Омская область',
    coords: [coords[0] + jitter(), coords[1] + jitter()],
    radius: event.severity === 4 ? 400 : 250,
    services,
    evacuation: null,
    risk: event.text,
    isLive: true,
  }
}

function createIncidentIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:${color};border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px ${color}55;display:flex;align-items:center;justify-content:center;font-size:14px;">🚨</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function MapFly({ coords }) {
  const map = useMap()
  useEffect(() => { map.flyTo(coords, 15, { duration: 1.2 }) }, [coords, map])
  return null
}

export default function EmergencyScreen({ dark }) {
  const [incidentIdx, setIncidentIdx] = useState(0)
  const [liveActiveIncident, setLiveActiveIncident] = useState(null)
  const [notified, setNotified] = useState(new Set())
  const [log, setLog] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [active, setActive] = useState(false)
  const timerRef = useRef(null)
  const [liveOn, setLiveOn] = useState(false)
  const [liveCritical, setLiveCritical] = useState([])
  const seenLiveRef = useRef(new Set())
  const liveFeed = useLiveDemoFeed(liveOn)

  useEffect(() => {
    for (const event of liveFeed.events) {
      if (seenLiveRef.current.has(event.uid)) continue
      seenLiveRef.current.add(event.uid)
      if (event.severity < 3) continue
      setLiveCritical((prev) => [event, ...prev].slice(0, 20))
      setLog((prev) => [{
        time: new Date().toLocaleTimeString('ru-RU'),
        msg: `${event.severity === 4 ? '🚨' : '⚠️'} LIVE: ${event.label} · ${event.municipality || '—'}`,
      }, ...prev])
    }
  }, [liveFeed.events])

  const incident = liveActiveIncident || INCIDENTS[incidentIdx]

  useEffect(() => {
    setNotified(new Set())
    setLog([])
    setElapsed(0)
    setActive(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [incidentIdx, liveActiveIncident])

  const respondToLive = (event) => {
    const inc = buildLiveIncident(event)
    setLiveActiveIncident(inc)
    setNotified(new Set())
    setLog([{
      time: new Date().toLocaleTimeString('ru-RU'),
      msg: `⚡ Принято в работу: «${inc.label}» — ${inc.address}`,
    }])
  }

  const clearLiveIncident = () => {
    setLiveActiveIncident(null)
  }

  const startTimer = () => {
    if (active) return
    setActive(true)
    setLog((prev) => [{
      time: new Date().toLocaleTimeString('ru-RU'),
      msg: `⚡ Инцидент зафиксирован: «${incident.label}» — ${incident.address}`,
    }, ...prev])
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const notify = (service) => {
    if (notified.has(service.name)) return
    if (!active) startTimer()
    setNotified((prev) => new Set([...prev, service.name]))
    setLog((prev) => [{
      time: new Date().toLocaleTimeString('ru-RU'),
      msg: `📨 Оповещение отправлено: ${service.name} (${service.email})`,
    }, ...prev])
  }

  const notifyAll = () => {
    if (!active) startTimer()
    incident.services.forEach((s) => notify(s))
    setLog((prev) => [{
      time: new Date().toLocaleTimeString('ru-RU'),
      msg: `🚨 Массовое оповещение: все ${incident.services.length} службы оповещены`,
    }, ...prev])
  }

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* incident selector */}
      <div
        className="px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
      >
        <Siren className="w-4 h-4 text-red-600 flex-shrink-0" />
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Тип инцидента:</span>
        {liveActiveIncident ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: liveActiveIncident.color, color: '#fff' }}>
              {liveActiveIncident.icon} {liveActiveIncident.label}
              <span className="text-[10px] font-black opacity-80 ml-1">· LIVE</span>
            </div>
            <button
              onClick={clearLiveIncident}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs"
              style={{ background: 'var(--bg-sub)', color: 'var(--muted)' }}
            >
              <X className="w-3.5 h-3.5" /> К сценариям
            </button>
          </>
        ) : (
          INCIDENTS.map((inc, i) => (
            <button
              key={inc.id}
              onClick={() => setIncidentIdx(i)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: i === incidentIdx ? inc.color : 'var(--bg-sub)',
                color: i === incidentIdx ? '#fff' : 'var(--text-2)',
              }}
            >
              {inc.icon} {inc.label}
            </button>
          ))
        )}

        <div className="ml-auto flex items-center gap-3">
          <LiveDemoToggle enabled={liveOn} onToggle={() => setLiveOn((v) => !v)} />
          {active && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: '#dc262618', border: '1px solid #dc2626' }}>
              <Clock className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span className="text-sm font-bold text-red-600">{formatTime(elapsed)}</span>
            </div>
          )}
        </div>
      </div>


      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">
        {/* left: map + risk */}
        <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* risk banner */}
          <div className="flex-shrink-0 px-4 py-3 rounded-xl flex gap-3"
            style={{ background: `${incident.color}15`, border: `1.5px solid ${incident.color}60` }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: incident.color }} />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: incident.color }}>
                {incident.label} · {incident.address}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>{incident.risk}</p>
              {incident.evacuation && (
                <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--muted)' }}>
                  🏫 Эвакуация: {incident.evacuation}
                </p>
              )}
            </div>
          </div>

          {/* map */}
          <div className="flex-1 min-h-[280px] rounded-xl overflow-hidden" style={{ ...card }}>
            <MapContainer
              center={incident.coords}
              zoom={15}
              style={{ width: '100%', height: '100%', minHeight: 280 }}
              zoomControl={true}
            >
              {dark
                ? <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                : <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              }
              <MapFly coords={incident.coords} />
              <Circle
                center={incident.coords}
                radius={incident.radius}
                pathOptions={{ color: incident.color, fillColor: incident.color, fillOpacity: 0.15, weight: 2 }}
              />
              <Marker position={incident.coords} icon={createIncidentIcon(incident.color)}>
                <Popup>{incident.label}<br />{incident.address}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        {/* right: services + log */}
        <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
          {/* notify all */}
          <button
            onClick={notifyAll}
            className="flex-shrink-0 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: notified.size === incident.services.length ? '#16a34a' : '#dc2626',
              color: '#fff',
            }}
          >
            {notified.size === incident.services.length
              ? <><CheckCircle2 className="w-4 h-4" /> Все службы оповещены</>
              : <><Siren className="w-4 h-4" /> Оповестить все службы</>
            }
          </button>

          {/* services */}
          <div className="flex-shrink-0 space-y-2">
            {incident.services.map((service) => {
              const done = notified.has(service.name)
              return (
                <div
                  key={service.name}
                  className="p-3.5 rounded-xl flex items-center gap-3"
                  style={{
                    ...card,
                    opacity: done ? 0.75 : 1,
                    boxShadow: done ? `0 0 0 1.5px ${SERVICE_COLORS[service.type]}` : 'none',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: `${SERVICE_COLORS[service.type]}22`, color: SERVICE_COLORS[service.type] }}
                  >
                    {SERVICE_LABELS[service.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>
                      {service.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{service.role}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                        <Phone className="w-3 h-3" />{service.phone}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                        <Mail className="w-3 h-3" />{service.email}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => notify(service)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: done ? '#dcfce7' : SERVICE_COLORS[service.type],
                      color: done ? '#166534' : '#fff',
                    }}
                  >
                    {done ? '✓ Отправлено' : 'Оповестить'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* live critical feed */}
          {(liveOn || liveCritical.length > 0) && (
            <div className="flex-shrink-0" style={{ ...card, padding: 12 }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                    Критические обращения · live
                  </span>
                </div>
                {liveCritical.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    +{liveCritical.length}
                  </span>
                )}
              </div>
              {liveCritical.length === 0 ? (
                liveOn && (
                  <p className="text-xs text-center py-3" style={{ color: 'var(--muted)' }}>
                    Ожидание поступления критических обращений...
                  </p>
                )
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {liveCritical.map((event) => {
                    const color = event.severity === 4 ? '#dc2626' : '#f97316'
                    return (
                      <div
                        key={event.uid}
                        onClick={() => respondToLive(event)}
                        className="p-2.5 rounded-lg cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{
                          background: liveActiveIncident?.id === `live-${event.uid}` ? `${color}25` : `${color}10`,
                          border: `1.5px solid ${liveActiveIncident?.id === `live-${event.uid}` ? color : `${color}50`}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="text-[10px] font-black px-1.5 py-0.5 rounded"
                            style={{ background: color, color: '#fff' }}
                          >
                            {event.severity === 4 ? '🚨 ЧП' : '⚠️ Сист.'}
                          </span>
                          <span className="text-[10px] font-semibold" style={{ color }}>
                            {event.municipality || '—'}
                          </span>
                          {event.group && (
                            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>· {event.group}</span>
                          )}
                          {liveActiveIncident?.id === `live-${event.uid}` && (
                            <span className="ml-auto text-[10px] font-bold" style={{ color }}>▶ активен</span>
                          )}
                        </div>
                        <p className="text-xs leading-snug line-clamp-2" style={{ color: 'var(--text-2)' }}>
                          {event.text}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* log */}
          {log.length > 0 && (
            <div className="flex-1 min-h-0" style={{ ...card, padding: 12 }}>
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  Лог реагирования
                </span>
              </div>
              <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 160 }}>
                {log.map((entry, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="flex-shrink-0 font-mono" style={{ color: 'var(--muted)' }}>{entry.time}</span>
                    <span style={{ color: 'var(--text-2)' }}>{entry.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* не показываем тосты — карточки уже есть в правой панели */}
    </div>
  )
}
