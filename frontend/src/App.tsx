import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { MotionConfig, motion } from 'framer-motion'
import {
  ArrowRight,
  Activity,
  Bell,
  Boxes,
  Check,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Factory,
  Globe2,
  History,
  Leaf,
  LayoutDashboard,
  Menu,
  MapPinned,
  Microscope,
  PackageCheck,
  Search,
  Settings,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Truck,
  Warehouse,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import './App.css'

type Batch = {
  batch_id: string
  product_name: string
  product_category: string
  manufacturer: string
  production_date: string
  expiry_date: string
  production_quantity: number
  batch_quality_status: string
  recall_status: string
  risk_level: string
}

type Shipment = {
  batch_id: string
  product: string
  production_date: string
  expiry_date: string
  shipped_quantity: number
  destination: string
  inventory_quantity: number
  recall_status: string
  shipment_status: string
}

type DashboardSummary = {
  total_registered_batches: number
  active_shipments: number
  batches_under_investigation: number
  pending_recall_operations: number
  affected_destinations: number
  inventory_awaiting_isolation: number
}

type NotificationItem = {
  id: number
  title: string
  message: string
  severity: 'High' | 'Medium' | 'Low'
  read: boolean
  source: string
}

type InvestigationResult = {
  batch_id: string
  risk_priority: string
  risk_score: number
  affected_destinations: string[]
  supporting_evidence: string[]
  recommended_action: string
  approval_status: string
  outstanding_information: string
  shipments: Shipment[]
  batch: Batch
  status: string
  risk_factors?: Record<string, number>
  risk_methodology?: string
  data_provenance?: { mode: string; status: string; message: string }
  execution_trace?: { step: string; method: string; status: string; summary: string }[]
}

type HealthStatus = {
  status: string
  service: string
  database: string
  database_status?: string
  database_message?: string
  ai_mode?: string
}

type RecallActionRecord = {
  action_id: number
  destination: string
  action: string
  status: string
  progress: number
  simulated: number
  updated_at: string
}

type RecallCaseRecord = {
  recall_id: string
  batch_id: string
  status: string
  created_at: string
  updated_at: string
  closed_at: string | null
  investigation: InvestigationResult
  actions: RecallActionRecord[]
  approvals: { decision: string; actor: string; reason: string; created_at: string }[]
}

type AuditRecord = {
  event_id: number
  actor: string
  action: string
  recall_id: string | null
  batch_id: string | null
  timestamp: string
  details: Record<string, unknown>
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const GlobeScene = lazy(() => import('./components/GlobeScene'))

const demoBatches: Batch[] = [
  { batch_id: 'B001', product_name: 'Organic Milk', product_category: 'Dairy', manufacturer: 'Sunrise Farms', production_date: '2026-11-01', expiry_date: '2026-11-15', production_quantity: 2500, batch_quality_status: 'Approved', recall_status: 'Pending recall', risk_level: 'High' },
  { batch_id: 'B002', product_name: 'Apple Juice', product_category: 'Beverages', manufacturer: 'Northberry Co', production_date: '2026-11-02', expiry_date: '2026-12-02', production_quantity: 1800, batch_quality_status: 'Approved', recall_status: 'Clear', risk_level: 'Low' },
  { batch_id: 'B003', product_name: 'Packaged Yogurt', product_category: 'Dairy', manufacturer: 'Bluegrass Foods', production_date: '2026-11-03', expiry_date: '2026-11-13', production_quantity: 2200, batch_quality_status: 'Under review', recall_status: 'Under investigation', risk_level: 'High' },
  { batch_id: 'B004', product_name: 'Tomato Sauce', product_category: 'Condiments', manufacturer: 'Harbor Kitchen', production_date: '2026-11-04', expiry_date: '2027-02-04', production_quantity: 3000, batch_quality_status: 'Approved', recall_status: 'Clear', risk_level: 'Low' },
  { batch_id: 'B005', product_name: 'Fresh Cream', product_category: 'Dairy', manufacturer: 'Coastal Dairy', production_date: '2026-11-05', expiry_date: '2026-11-12', production_quantity: 1500, batch_quality_status: 'Approved', recall_status: 'Pending recall', risk_level: 'Critical' },
  { batch_id: 'B006', product_name: 'Orange Nectar', product_category: 'Beverages', manufacturer: 'Sunrise Farms', production_date: '2026-11-06', expiry_date: '2026-12-06', production_quantity: 1700, batch_quality_status: 'Under review', recall_status: 'Under investigation', risk_level: 'Medium' },
]

const demoShipments: Shipment[] = [
  { batch_id: 'B001', product: 'Organic Milk', production_date: '2026-11-01', expiry_date: '2026-11-15', shipped_quantity: 500, destination: 'Chennai', inventory_quantity: 120, recall_status: 'Pending', shipment_status: 'Dispatched' },
  { batch_id: 'B001', product: 'Organic Milk', production_date: '2026-11-01', expiry_date: '2026-11-15', shipped_quantity: 500, destination: 'Bangalore', inventory_quantity: 80, recall_status: 'Pending', shipment_status: 'In transit' },
  { batch_id: 'B001', product: 'Organic Milk', production_date: '2026-11-01', expiry_date: '2026-11-15', shipped_quantity: 500, destination: 'Hyderabad', inventory_quantity: 50, recall_status: 'Pending', shipment_status: 'Received' },
  { batch_id: 'B003', product: 'Packaged Yogurt', production_date: '2026-11-03', expiry_date: '2026-11-13', shipped_quantity: 400, destination: 'Coimbatore', inventory_quantity: 100, recall_status: 'Pending', shipment_status: 'Received' },
  { batch_id: 'B003', product: 'Packaged Yogurt', production_date: '2026-11-03', expiry_date: '2026-11-13', shipped_quantity: 400, destination: 'Bangalore', inventory_quantity: 70, recall_status: 'Pending', shipment_status: 'In transit' },
  { batch_id: 'B005', product: 'Fresh Cream', production_date: '2026-11-05', expiry_date: '2026-11-12', shipped_quantity: 350, destination: 'Mumbai', inventory_quantity: 110, recall_status: 'Pending', shipment_status: 'Received' },
  { batch_id: 'B005', product: 'Fresh Cream', production_date: '2026-11-05', expiry_date: '2026-11-12', shipped_quantity: 350, destination: 'Delhi', inventory_quantity: 90, recall_status: 'Pending', shipment_status: 'Dispatched' },
  { batch_id: 'B006', product: 'Orange Nectar', production_date: '2026-11-06', expiry_date: '2026-12-06', shipped_quantity: 320, destination: 'Chennai', inventory_quantity: 45, recall_status: 'Review', shipment_status: 'Received' },
  { batch_id: 'B002', product: 'Apple Juice', production_date: '2026-11-02', expiry_date: '2026-12-02', shipped_quantity: 300, destination: 'Chennai', inventory_quantity: 90, recall_status: 'Clear', shipment_status: 'Received' },
  { batch_id: 'B002', product: 'Apple Juice', production_date: '2026-11-02', expiry_date: '2026-12-02', shipped_quantity: 300, destination: 'Mumbai', inventory_quantity: 60, recall_status: 'Clear', shipment_status: 'Dispatched' },
  { batch_id: 'B004', product: 'Tomato Sauce', production_date: '2026-11-04', expiry_date: '2027-02-04', shipped_quantity: 250, destination: 'Hyderabad', inventory_quantity: 30, recall_status: 'Clear', shipment_status: 'Received' },
  { batch_id: 'B004', product: 'Tomato Sauce', production_date: '2026-11-04', expiry_date: '2027-02-04', shipped_quantity: 250, destination: 'Chennai', inventory_quantity: 40, recall_status: 'Clear', shipment_status: 'Dispatched' },
]

const demoDashboard: DashboardSummary = {
  total_registered_batches: 6,
  active_shipments: 4420,
  batches_under_investigation: 2,
  pending_recall_operations: 2,
  affected_destinations: 6,
  inventory_awaiting_isolation: 885,
}

const demoNotifications: NotificationItem[] = [
  { id: 1, title: 'Batch B001 recall review', message: 'Inventory exposure flagged in Chennai and Hyderabad.', severity: 'High', read: false, source: 'Demo data' },
  { id: 2, title: 'B003 investigation status', message: 'Risk review updated for packaged yogurt distribution.', severity: 'Medium', read: true, source: 'Demo rules' },
  { id: 3, title: 'Inventory isolation reminder', message: 'Two destinations require confirmation before moving stock.', severity: 'Low', read: false, source: 'Demo data' },
]

const demoReport = {
  batches: demoBatches,
  shipments: demoShipments,
  generated_at: new Date().toISOString(),
  data_source: 'Demo records',
}

async function getResponseError(response: Response): Promise<string> {
  const body = await response.text()
  if (body) {
    try {
      const payload: unknown = JSON.parse(body)
      if (payload && typeof payload === 'object' && 'detail' in payload) {
        const detail = payload.detail
        if (typeof detail === 'string') return detail
        if (Array.isArray(detail)) {
          const messages = detail
            .map((item) => item && typeof item === 'object' && 'msg' in item ? String(item.msg) : '')
            .filter(Boolean)
          if (messages.length) return messages.join('; ')
        }
      }
    } catch {
      return `Request failed (${response.status}): ${body.slice(0, 180)}`
    }
  }
  return `Request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ''})`
}

const navItems = [
  { path: '/', label: 'Landing', icon: Globe2 },
  { path: '/about', label: 'About BatchBack', icon: Leaf },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/batches', label: 'Batch Registry', icon: Boxes },
  { path: '/supply-chain', label: 'Supply Chain', icon: MapPinned },
  { path: '/ai', label: 'AI Recall Intelligence', icon: ShieldAlert },
  { path: '/recall-ops', label: 'Recall Operations', icon: PackageCheck },
  { path: '/inventory', label: 'Inventory Monitor', icon: Warehouse },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/audit', label: 'Audit History', icon: History },
  { path: '/reports', label: 'Analytics & Reports', icon: TrendingUp },
  { path: '/settings', label: 'Settings', icon: Settings },
]

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }
  const payload: unknown = await response.json()
  return (typeof payload === 'string' ? JSON.parse(payload) : payload) as T
}

async function apiPost<T>(path: string, payload: Record<string, string>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }
  return response.json() as Promise<T>
}

function useApiData<T>(path: string, fallback: T) {
  const [data, setData] = useState<T>(fallback)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        const result = await apiGet<T>(path)
        if (mounted) {
          setData(result)
          setError(null)
        }
      } catch (requestError) {
        if (mounted) {
          setError(requestError instanceof Error ? requestError.message : 'Unknown error')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [path])

  return { data, loading, error }
}

function StatCard({ title, value, subtitle, accent }: { title: string; value: string | number; subtitle: string; accent?: string }) {
  return (
    <motion.div className="stat-card" whileHover={{ y: -3 }}>
      <div className="stat-card__label">{title}</div>
      <div className="stat-card__value" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="stat-card__meta">{subtitle}</div>
    </motion.div>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading-state" role="status" aria-label={label}>
      <span>{label}</span>
      <div className="loading-state__lines" aria-hidden="true">
        <i /><i /><i />
      </div>
    </div>
  )
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="section-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p className="section-description">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function getStatusColor(value: string) {
  if (value.toLowerCase().includes('clear')) return 'var(--success)'
  if (value.toLowerCase().includes('pending') || value.toLowerCase().includes('investigation') || value.toLowerCase().includes('review')) return 'var(--warning)'
  if (value.toLowerCase().includes('critical') || value.toLowerCase().includes('high')) return 'var(--danger)'
  return 'var(--cyan)'
}

function LandingPage() {
  const featureCards = [
    { title: 'Batch traceability', text: 'Track every shipment from manufacturing through destination.', icon: Factory },
    { title: 'Risk intelligence', text: 'Prioritize recalls based on verified inventory and exposure.', icon: ShieldCheck },
    { title: 'Recall orchestration', text: 'Coordinate destinations, actions, and acknowledgements in one workflow.', icon: PackageCheck },
  ]

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow">Intelligent Food Recall Coordination</div>
          <h1>Trace Faster. Recall Smarter. Protect Better.</h1>
          <p>BatchBack connects production records, inventory exposure, and destination actions so food safety teams can act decisively and transparently.</p>
          <div className="hero-actions">
            <Link to="/dashboard" className="primary-btn">Launch Command Center <ArrowRight size={16} /></Link>
            <Link to="/batches" className="secondary-btn">Explore Registry</Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="three-globe">
            <Suspense fallback={<div className="scene-loading" aria-label="Loading supply-chain visualization" />}>
              <GlobeScene />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {featureCards.map(({ title, text, icon: Icon }) => (
          <motion.div key={title} className="feature-card" whileHover={{ y: -4 }}>
            <div className="feature-icon"><Icon size={24} /></div>
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.div>
        ))}
      </section>

      <section className="workflow-panel">
        <SectionHeader eyebrow="How it works" title="From batch origin to destination action" />
        <div className="workflow-grid">
          {['Identify impacted batches', 'Trace every destination', 'Assess inventory exposure', 'Recommend and approve recall steps'].map((step, index) => (
            <div key={step} className="workflow-step">
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

    </motion.div>
  )
}

function AboutPage() {
  const workflow = [
    { number: '01', title: 'Register', text: 'Capture product and batch information.', icon: ClipboardCheck },
    { number: '02', title: 'Trace', text: 'Identify shipment paths and destinations.', icon: Truck },
    { number: '03', title: 'Analyze', text: 'Evaluate potential exposure and risk.', icon: Microscope },
    { number: '04', title: 'Coordinate', text: 'Organize recall and isolation actions.', icon: Activity },
    { number: '05', title: 'Verify', text: 'Monitor completion and maintain an audit trail.', icon: Check },
  ]
  const capabilities = [
    { title: 'Batch Intelligence', text: 'Keep product identity, quality status, and risk context together.', icon: Boxes },
    { title: 'Supply Chain Visibility', text: 'Follow recorded shipments from origin to destination.', icon: Eye },
    { title: 'AI-Assisted Risk Analysis', text: 'Surface rule-based assessments clearly; recommendations remain subject to human review.', icon: ShieldCheck },
    { title: 'Recall Operations', text: 'Coordinate destination-level work without bypassing approval.', icon: PackageCheck },
    { title: 'Inventory Monitoring', text: 'Understand recorded stock exposure by destination and batch.', icon: Warehouse },
    { title: 'Analytics and Reporting', text: 'Explore operational data and export records for review.', icon: TrendingUp },
  ]

  return (
    <motion.div className="page-shell about-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <section className="about-hero">
        <div className="about-hero__copy">
          <div className="eyebrow">About BatchBack</div>
          <h1>Building a Safer Food Supply Chain, One Batch at a Time.</h1>
          <p>BatchBack is an intelligent food recall coordination platform designed to help food safety teams trace product batches, understand supply-chain exposure, investigate potential risks, and coordinate timely recall actions.</p>
        </div>
        <div className="about-hero__image" role="img" aria-label="Fresh produce moving from farm to market" />
      </section>

      <section className="about-intro-grid">
        <div className="about-intro__label">
          <span className="eyebrow">Why BatchBack exists</span>
          <h2>Food moves through many hands. Safety decisions should not.</h2>
        </div>
        <div className="about-intro__body">
          <p>Food supply chains involve manufacturers, distributors, warehouses, retailers, and consumers. When a food safety issue occurs, identifying affected batches and tracing their destinations can become complicated, time-consuming, and fragmented.</p>
          <p>BatchBack brings batch information, shipment traceability, inventory exposure, risk assessment, and recall coordination into one centralized platform.</p>
        </div>
      </section>

      <section className="about-mission">
        <div className="about-mission__mark"><Leaf size={24} aria-hidden="true" /></div>
        <div>
          <span className="eyebrow">Our mission</span>
          <h2>To make food recall coordination faster, more transparent, and more effective through intelligent technology.</h2>
        </div>
        <span className="about-mission__index">01 / PURPOSE</span>
      </section>

      <section className="about-challenge-solution">
        <article className="about-challenge">
          <span className="eyebrow">The challenge</span>
          <h2>When information is fragmented, every minute matters.</h2>
          <ul className="about-check-list">
            {[
              'Supply-chain information is spread across stakeholders and systems.',
              'Affected batches can be difficult to identify quickly.',
              'Exposed inventory can take time to locate.',
              'Communication between supply-chain stakeholders is complex.',
              'Recall status is often difficult to see in one place.',
            ].map((item) => <li key={item}><span aria-hidden="true">—</span>{item}</li>)}
          </ul>
        </article>
        <article className="about-solution">
          <span className="eyebrow">Our solution</span>
          <h2>One shared view, from batch record to follow-through.</h2>
          <p>BatchBack supports teams with a connected operational workspace for:</p>
          <div className="about-solution__tags">
            {['Batch-level traceability', 'Destination tracking', 'Inventory exposure', 'Risk prioritization', 'Evidence-based investigation', 'Recall coordination'].map((item) => (
              <span key={item}><Check size={14} aria-hidden="true" />{item}</span>
            ))}
          </div>
        </article>
      </section>

      <section className="about-workflow">
        <div className="about-section-heading">
          <div>
            <span className="eyebrow">How BatchBack works</span>
            <h2>A considered path from signal to verified action.</h2>
          </div>
          <p>Each stage builds on recorded information and keeps people in control of decisions.</p>
        </div>
        <motion.ol className="workflow-timeline" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.45 }}>
          {workflow.map(({ number, title, text, icon: Icon }) => (
            <motion.li className="workflow-timeline__step" key={number} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Number(number) * 0.06, duration: 0.35 }}>
              <span className="workflow-timeline__number">{number}</span>
              <span className="workflow-timeline__icon"><Icon size={20} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      <section className="about-capabilities">
        <div className="about-section-heading">
          <div>
            <span className="eyebrow">Platform capabilities</span>
            <h2>Built around the work food safety teams do.</h2>
          </div>
          <Link className="text-link" to="/dashboard">Explore the platform <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="capability-grid">
          {capabilities.map(({ title, text, icon: Icon }, index) => (
            <article className={`capability-item capability-item--${index + 1}`} key={title}>
              <div className="capability-item__icon"><Icon size={20} aria-hidden="true" /></div>
              <span className="capability-item__number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <ChevronRight className="capability-item__arrow" size={18} aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="about-technology">
        <div className="about-technology__copy">
          <span className="eyebrow">Technology behind BatchBack</span>
          <h2>Modern foundations. Transparent by design.</h2>
          <p>The existing project combines a responsive web application with a Python API and a repository layer that can support a Db2-backed deployment.</p>
        </div>
        <div className="technology-stack">
          {[
            ['Frontend', 'React · TypeScript · Vite'],
            ['API', 'Python · FastAPI'],
            ['Data architecture', 'IBM Db2 integration architecture'],
          ].map(([label, value]) => (
            <div className="technology-stack__row" key={label}>
              <span>{label}</span><strong>{value}</strong>
            </div>
          ))}
          <p className="technology-stack__note"><span className="live-dot" /> Current environment: demo database. A live IBM Db2 connection has not been verified.</p>
        </div>
      </section>

      <section className="about-vision">
        <span className="eyebrow">Our vision</span>
        <p>Creating a more connected, transparent, and responsive food safety ecosystem.</p>
        <span className="about-vision__flourish" aria-hidden="true">B.</span>
      </section>

      <section className="about-cta">
        <div>
          <span className="eyebrow">A clearer way forward</span>
          <h2>Make Every Recall Action Count.</h2>
          <p>Explore the current BatchBack experience, built on transparent demo data and an extensible backend architecture.</p>
        </div>
        <div className="about-cta__actions">
          <Link to="/dashboard" className="primary-btn">Explore Command Center <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link to="/batches" className="secondary-btn">Explore Batch Registry</Link>
        </div>
      </section>
    </motion.div>
  )
}

function DashboardPage() {
  const { data: dashboard, loading, error } = useApiData<DashboardSummary>('/api/dashboard', demoDashboard)
  const { data: batches, error: batchesError } = useApiData<Batch[]>('/api/batches', demoBatches)
  const { data: notifications } = useApiData<NotificationItem[]>('/api/notifications', demoNotifications)
  const { data: report, error: reportError } = useApiData<{ shipments: Shipment[] }>('/api/reports', { shipments: demoShipments })

  const riskData = useMemo(() => {
    const map = new Map<string, number>()
    for (const batch of batchesError ? [] : batches) {
      const level = batch.risk_level
      map.set(level, (map.get(level) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [batches, batchesError])

  const recallData = useMemo(
    () => [
      { name: 'Clear', value: (batchesError ? [] : batches).filter((batch) => batch.recall_status === 'Clear').length },
      { name: 'Pending recall', value: (batchesError ? [] : batches).filter((batch) => batch.recall_status.toLowerCase().includes('pending')).length },
      { name: 'Under investigation', value: (batchesError ? [] : batches).filter((batch) => batch.recall_status.toLowerCase().includes('under investigation')).length },
    ],
    [batches, batchesError],
  )

  const destinationExposure = useMemo(() => {
    const totals = new Map<string, number>()
    for (const shipment of reportError ? [] : report.shipments) {
      totals.set(shipment.destination, (totals.get(shipment.destination) ?? 0) + shipment.shipped_quantity)
    }
    return Array.from(totals, ([name, shipments]) => ({ name, shipments }))
  }, [report.shipments, reportError])
  const shipmentRecords = reportError ? [] : report.shipments
  const activeShipmentCount = shipmentRecords.filter((shipment) => shipment.shipment_status.toLowerCase() !== 'received').length
  const nonClearShipments = shipmentRecords.filter((shipment) => shipment.recall_status.toLowerCase() !== 'clear')
  const affectedDestinationCount = new Set(nonClearShipments.map((shipment) => shipment.destination)).size
  const inventoryWithNonClearStatus = nonClearShipments.reduce((total, shipment) => total + shipment.inventory_quantity, 0)
  const underInvestigationCount = batchesError ? null : batches.filter((batch) => batch.recall_status.toLowerCase().includes('under investigation')).length
  const pendingRecallBatchCount = batchesError ? null : batches.filter((batch) => batch.recall_status.toLowerCase().includes('pending')).length

  if (loading) return <LoadingState label="Loading dashboard data…" />
  if (error) return <div className="status-banner error">Unable to fetch dashboard: {error}</div>

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="Command center" title="Operational overview" description="A current view of batch status and shipment exposure from the configured API." />
      {reportError && <div className="status-banner error" role="alert">Shipment reporting data is unavailable: {reportError}. The destination chart has been left empty.</div>}
      {batchesError && <div className="status-banner error" role="alert">Batch data could not be refreshed: {batchesError}. Batch risk charts have been left empty.</div>}
      <div className="stats-grid">
        <StatCard title="Registered Batches" value={dashboard.total_registered_batches} subtitle="From dashboard API" accent="var(--burgundy)" />
        <StatCard title="Active Shipments" value={reportError ? '—' : activeShipmentCount} subtitle="Dispatched or in-transit records" accent="var(--olive)" />
        <StatCard title="Under Investigation" value={underInvestigationCount ?? '—'} subtitle="Batch recall status records" accent="var(--warning)" />
        <StatCard title="Pending Recall Batches" value={pendingRecallBatchCount ?? '—'} subtitle="Not an operation count" accent="var(--danger)" />
        <StatCard title="Affected Destinations" value={reportError ? '—' : affectedDestinationCount} subtitle="Destinations with non-clear shipment status" accent="var(--copper)" />
        <StatCard title="Non-clear Status Inventory" value={reportError ? '—' : inventoryWithNonClearStatus.toLocaleString()} subtitle="Units; isolation completion is not tracked" accent="var(--olive-soft)" />
      </div>

      <div className="grid-two">
        <div className="panel">
          <h3>Recorded shipment exposure by destination</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={destinationExposure}>
              <defs>
                <linearGradient id="fillShipments" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6f8a71" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#6f8a71" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(37,38,34,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#6d6b64" />
              <YAxis stroke="#6d6b64" />
              <Tooltip />
              <Area type="monotone" dataKey="shipments" stroke="#34483a" fill="url(#fillShipments)" />
            </AreaChart>
          </ResponsiveContainer>
          <p className="chart-caption">Quantities are grouped from shipment records returned by the reports endpoint.</p>
        </div>

        <div className="panel">
          <h3>Risk-level breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={riskData}>
              <CartesianGrid stroke="rgba(37,38,34,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#6d6b64" />
              <YAxis stroke="#6d6b64" />
              <Tooltip />
              <Bar dataKey="value" fill="#6f8a71" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-two">
        <div className="panel">
          <h3>Recall status distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={recallData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} fill="#6f8a71" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="panel activity-panel">
          <h3>Recent notifications</h3>
          <div className="stack-list">
            {notifications.slice(0, 4).map((notification) => (
              <div key={notification.id} className="stack-item">
                <div className="stack-item__dot" style={{ background: notification.severity === 'High' ? 'var(--danger)' : notification.severity === 'Medium' ? 'var(--warning)' : 'var(--teal)' }} />
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function BatchRegistryPage() {
  const { data: batches, loading, error } = useApiData<Batch[]>('/api/batches', demoBatches)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState<'batch_id' | 'product_name' | 'risk_level'>('batch_id')

  const filtered = useMemo(() => {
    return batches.filter((batch) => {
      const query = search.toLowerCase()
      const matchesSearch = !query || [batch.batch_id, batch.product_name, batch.manufacturer, batch.product_category].some((value) => value.toLowerCase().includes(query))
      const matchesStatus = statusFilter === 'All' || batch.recall_status === statusFilter || batch.risk_level === statusFilter
      return matchesSearch && matchesStatus
    }).sort((left, right) => left[sortBy].localeCompare(right[sortBy]))
  }, [batches, search, statusFilter, sortBy])

  if (loading) return <LoadingState label="Loading batch records…" />

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="Registry" title="Batch registry" description="Search and compare product batches, recorded status, quantity, and risk classification." />
      {error && <div className="status-banner error" role="alert">Batch data could not be refreshed: {error}. The current view is sample data.</div>}
      <div className="controls-row">
        <div className="search-box">
          <Search size={16} />
          <input aria-label="Search batches" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search batch, product, category or maker" />
        </div>
        <label className="select-control">Filter
          <select aria-label="Filter batches by status or risk" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="All">All statuses</option>
          <option value="Pending recall">Pending recall</option>
          <option value="Under investigation">Under investigation</option>
          <option value="Clear">Clear</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
          </select>
        </label>
        <label className="select-control">Sort by
          <select aria-label="Sort batches" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
            <option value="batch_id">Batch ID</option>
            <option value="product_name">Product</option>
            <option value="risk_level">Risk level</option>
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Product</th>
              <th>Category</th>
              <th>Manufacturer</th>
              <th>Production</th>
              <th>Expiry</th>
              <th>Quantity</th>
              <th>Quality</th>
              <th>Recall</th>
              <th>Risk</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((batch) => (
              <tr key={batch.batch_id}>
                <td>{batch.batch_id}</td>
                <td>{batch.product_name}</td>
                <td>{batch.product_category}</td>
                <td>{batch.manufacturer}</td>
                <td>{batch.production_date}</td>
                <td>{batch.expiry_date}</td>
                <td>{batch.production_quantity.toLocaleString()}</td>
                <td>{batch.batch_quality_status}</td>
                <td><span className="pill" style={{ color: getStatusColor(batch.recall_status) }}>{batch.recall_status}</span></td>
                <td><span className="pill" style={{ color: getStatusColor(batch.risk_level) }}>{batch.risk_level}</span></td>
                <td><Link to={`/batches/${batch.batch_id}`} className="tiny-btn">View</Link></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td className="table-empty" colSpan={11}>No batch records match the current search and filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="chart-caption">Showing {filtered.length} of {batches.length} batch records. Batch quantities are listed in the units provided by the API.</p>
    </motion.div>
  )
}

function BatchDetailPage() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const [batch, setBatch] = useState<Batch | null>(null)
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [batchIsDemo, setBatchIsDemo] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!batchId) {
        setLoadError('No batch identifier was provided.')
        setLoading(false)
        return
      }
      try {
        const batchData = await apiGet<Batch>(`/api/batches/${batchId}`)
        if (active) {
          setBatch(batchData)
          setBatchIsDemo(false)
        }
      } catch (requestError) {
        const fallback = demoBatches.find((entry) => entry.batch_id === batchId) ?? null
        if (active) {
          setBatch(fallback)
          setBatchIsDemo(Boolean(fallback))
          setLoadError(requestError instanceof Error ? requestError.message : 'Unable to load batch information.')
          setLoading(false)
        }
        return
      }
      try {
        const investigationData = await apiGet<InvestigationResult>(`/api/batches/${batchId}/investigate`)
        if (active) setInvestigation(investigationData)
      } catch (requestError) {
        if (active) {
          setInvestigation(null)
          setLoadError(requestError instanceof Error ? requestError.message : 'Unable to load investigation evidence.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [batchId])

  if (loading) return <LoadingState label="Loading batch investigation…" />
  if (!batch) return <div className="status-banner error" role="alert">{loadError ?? 'Batch not found.'}</div>

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="Investigation" title={`Batch ${batch.batch_id}`} description="Recorded batch profile, shipment details, and rule-based analysis where returned by the API." action={<button className="primary-btn" onClick={() => void navigate(`/ai?batch=${encodeURIComponent(batch.batch_id)}`)}>Investigate Batch</button>} />
      {loadError && <div className="status-banner error" role="alert">
        {batchIsDemo
          ? 'The API could not provide this batch. Showing a matching sample record; no investigation evidence is fabricated.'
          : 'The batch record loaded, but its investigation evidence could not be retrieved.'} {loadError}
      </div>}
      <div className="detail-grid">
        <div className="panel">
          <h3>Batch profile</h3>
          <dl className="detail-list">
            <div><dt>Product</dt><dd>{batch.product_name}</dd></div>
            <div><dt>Category</dt><dd>{batch.product_category}</dd></div>
            <div><dt>Manufacturer</dt><dd>{batch.manufacturer}</dd></div>
            <div><dt>Production</dt><dd>{batch.production_date}</dd></div>
            <div><dt>Expiry</dt><dd>{batch.expiry_date}</dd></div>
            <div><dt>Quantity</dt><dd>{batch.production_quantity}</dd></div>
            <div><dt>Quality</dt><dd>{batch.batch_quality_status}</dd></div>
            <div><dt>Recall</dt><dd>{batch.recall_status}</dd></div>
            <div><dt>Risk</dt><dd>{batch.risk_level}</dd></div>
          </dl>
        </div>

        <div className="panel">
          <h3>Risk assessment</h3>
          <div className="risk-summary">
            <div>
              <div className="eyebrow">Priority</div>
              <strong>{investigation?.risk_priority ?? 'Not available'}</strong>
            </div>
            <div>
              <div className="eyebrow">Calculated risk score</div>
              <strong>{investigation ? `${investigation.risk_score} / 100` : 'Not available'}</strong>
            </div>
            <div>
              <div className="eyebrow">Approval</div>
              <strong>{investigation?.approval_status ?? 'Not available'}</strong>
            </div>
          </div>
          {investigation
            ? <ul className="bullet-list">{investigation.supporting_evidence.map((item) => <li key={item}>{item}</li>)}</ul>
            : <p className="empty-state">No investigation evidence was returned by the API.</p>}
          {investigation && <p className="chart-caption">Calculated by deterministic rule-based analysis. Recommendations require human review.</p>}
        </div>
      </div>

      <div className="panel full-width-panel">
        <h3>Shipment details</h3>
        <table>
          <thead>
            <tr>
              <th>Destination</th>
              <th>Shipped</th>
              <th>Inventory</th>
              <th>Status</th>
              <th>Recall status</th>
            </tr>
          </thead>
          <tbody>
            {(investigation?.shipments ?? []).map((shipment) => (
              <tr key={`${shipment.destination}-${shipment.shipment_status}`}>
                <td>{shipment.destination}</td>
                <td>{shipment.shipped_quantity}</td>
                <td>{shipment.inventory_quantity}</td>
                <td>{shipment.shipment_status}</td>
                <td>{shipment.recall_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

function SupplyChainPage() {
  const { data: batches } = useApiData<Batch[]>('/api/batches', demoBatches)
  const { data: report, loading, error } = useApiData<{ shipments: Shipment[] }>('/api/reports', { shipments: demoShipments })
  const [selected, setSelected] = useState(batches[0]?.batch_id ?? 'B001')
  const selectedBatchId = batches.some((batch) => batch.batch_id === selected) ? selected : batches[0]?.batch_id ?? ''
  const selectedBatch = batches.find((batch) => batch.batch_id === selectedBatchId)
  const shipments = error ? [] : report.shipments.filter((item) => item.batch_id === selectedBatchId)

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="Supply chain" title="Trace and exposure explorer" description="Follow shipment records to their listed destinations; intermediate facilities are shown only when provided by the API." action={<select value={selectedBatchId} onChange={(event) => setSelected(event.target.value)}><option value="">Select batch</option>{batches.map((batch) => <option key={batch.batch_id} value={batch.batch_id}>{batch.batch_id}</option>)}</select>} />
      {error && <div className="status-banner error" role="alert">Shipment data could not be loaded: {error}. Displayed records are sample data.</div>}
      {loading && <LoadingState label="Loading shipment records…" />}
      <div className="grid-two">
        <div className="panel">
          <h3>Distribution network</h3>
          <div className="network-map">
            <div className="node"><small>Recorded manufacturer</small><strong>{selectedBatch?.manufacturer ?? 'Not available'}</strong></div>
            <div className="connector" />
            <div className="node"><small>Recorded destinations</small><strong>{shipments.length}</strong></div>
          </div>
          <p className="chart-caption">Intermediate facilities are not included in the current shipment API records.</p>
          <div className="destination-list">
            {shipments.length > 0 ? shipments.map((item) => (
              <div key={`${item.destination}-${item.batch_id}`} className="destination-row">
                <strong>{item.destination}</strong>
                <span>{item.inventory_quantity} units</span>
                <span>{item.shipment_status}</span>
              </div>
            )) : <p className="empty-state">No shipment records were returned for this batch.</p>}
          </div>
        </div>
        <div className="panel">
          <h3>Shipment overview</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={shipments.map((entry) => ({ name: entry.destination, value: entry.inventory_quantity }))}>
              <CartesianGrid stroke="rgba(37,38,34,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#6d6b64" />
              <YAxis stroke="#6d6b64" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#34483a" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}

function AIPage() {
  const { data: batches } = useApiData<Batch[]>('/api/batches', demoBatches)
  const [searchParams] = useSearchParams()
  const [selected, setSelected] = useState(searchParams.get('batch') ?? 'B001')
  const [summary, setSummary] = useState<InvestigationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiGet<InvestigationResult>(`/api/batches/${selected}/investigate`)
        if (active) setSummary(result)
      } catch (requestError) {
        if (active) {
          setSummary(null)
          setError(requestError instanceof Error ? requestError.message : 'Unable to investigate this batch.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [selected])

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="AI intelligence" title="Recall recommendation workspace" description="Review evidence, calculated risk, and proposed next steps. A configured AI model is not present in this environment." action={<select value={selected} onChange={(event) => setSelected(event.target.value)}>{batches.map((batch) => <option key={batch.batch_id} value={batch.batch_id}>{batch.batch_id}</option>)}</select>} />
      <div className="panel ai-panel">
        <p className="chart-caption">Rule-based intelligence · No AI model is configured. This is decision support, not an automated recall action.</p>
        {loading && <LoadingState label="Calculating from recorded batch and shipment data…" />}
        {error && <div className="status-banner error" role="alert">Investigation could not be completed: {error}</div>}
        <div className="risk-summary">
          <div><div className="eyebrow">Priority</div><strong>{summary?.risk_priority ?? '—'}</strong></div>
          <div><div className="eyebrow">Calculated risk score</div><strong>{summary?.risk_score ?? '—'}</strong></div>
          <div><div className="eyebrow">Analysis method</div><strong>{summary ? 'Deterministic rules' : '—'}</strong></div>
        </div>
        <div className="bullet-list-wrap">
          <h3>Evidence returned by the API</h3>
          <ul className="bullet-list">
            {(summary?.supporting_evidence ?? []).map((item) => <li key={item}>{item}</li>)}
          </ul>
          {summary && <p className="chart-caption">Possible destinations: {summary.affected_destinations.join(', ') || 'None returned'}</p>}
        </div>
        <div className="recommended-box">
          <h3>Recommendation · human approval required</h3>
          <p>{summary?.recommended_action ?? 'No recommendation is shown until investigation data is returned.'}</p>
          {summary && <p><strong>Outstanding information:</strong> {summary.outstanding_information}</p>}
        </div>
        {summary && (
          <div className="investigation-trace">
            <div className="recall-list-heading">
              <h3>Investigation trace</h3>
              <span>{summary.data_provenance?.mode === 'demo' ? 'Demo records' : summary.data_provenance?.mode === 'db2' ? 'Db2 records' : 'Source not recorded'}</span>
            </div>
            <p className="chart-caption">{summary.risk_methodology ?? 'Calculation method not recorded.'} {summary.data_provenance?.message}</p>
            <div className="investigation-trace__steps">
              {(summary.execution_trace ?? []).map((step) => (
                <div key={step.step}>
                  <span>{step.status}</span>
                  <strong>{step.step}</strong>
                  <small>{step.method} · {step.summary}</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function RecallOpsPage() {
  const { data: batches } = useApiData<Batch[]>('/api/batches', demoBatches)
  const [refresh, setRefresh] = useState(0)
  const { data: cases, loading, error } = useApiData<RecallCaseRecord[]>(`/api/recalls?refresh=${refresh}`, [])
  const [selectedBatch, setSelectedBatch] = useState('B001')
  const [actor, setActor] = useState('Food Safety Operator')
  const [notice, setNotice] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dialog, setDialog] = useState<{ recallId: string; action: 'create' | 'approved' | 'rejected' | 'simulate' | 'close'; actionId?: number } | null>(null)
  const [reason, setReason] = useState('')
  const activeCases = cases.filter((item) => !['Closed', 'Rejected'].includes(item.status))
  const batchOptions = batches.length ? batches : demoBatches
  const selectedBatchId = batchOptions.some((batch) => batch.batch_id === selectedBatch) ? selectedBatch : batchOptions[0]?.batch_id ?? ''

  const submitDialog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!dialog || (dialog.action !== 'create' && reason.trim().length < 5)) return
    setSubmitting(true)
    setMutationError(null)
    try {
      if (dialog.action === 'create') {
        const created = await apiPost<RecallCaseRecord>('/api/recalls', { batch_id: dialog.recallId, actor: actor.trim() })
        setNotice(`Recall case ${created.recall_id} created for human approval. No external actions were taken.`)
      } else if (dialog.action === 'approved' || dialog.action === 'rejected') {
        await apiPost(
          `/api/recalls/${encodeURIComponent(dialog.recallId)}/approval?decision=${dialog.action}`,
          { actor: actor.trim(), reason: reason.trim() },
        )
        setNotice(`Decision recorded for ${dialog.recallId}. No real-world action was initiated.`)
      } else if (dialog.action === 'simulate' && dialog.actionId !== undefined) {
        await apiPost(
          `/api/recalls/${encodeURIComponent(dialog.recallId)}/actions/${dialog.actionId}/simulate`,
          { actor: actor.trim(), notes: reason.trim() },
        )
        setNotice(`Simulation recorded for ${dialog.recallId}. No external notification or physical inventory action occurred.`)
      } else if (dialog.action === 'close') {
        await apiPost(`/api/recalls/${encodeURIComponent(dialog.recallId)}/close`, { actor: actor.trim(), reason: reason.trim() })
        setNotice(`Case ${dialog.recallId} closed with an audit entry.`)
      }
      setRefresh((value) => value + 1)
      setDialog(null)
      setReason('')
    } catch (requestError) {
      setMutationError(requestError instanceof Error ? requestError.message : 'Unable to update the recall case.')
    } finally {
      setSubmitting(false)
    }
  }

  const dialogTitle = dialog?.action === 'create'
    ? 'Create a recall case?'
    : dialog?.action === 'approved'
    ? 'Approve recall case'
    : dialog?.action === 'rejected'
      ? 'Reject recall case'
      : dialog?.action === 'simulate'
        ? 'Record a simulated destination action'
        : 'Close recall case'
  const dialogDescription = dialog?.action === 'create'
    ? `Create a traceable demo case for batch ${dialog.recallId}? It will store the current investigation and wait for human review.`
    : dialog?.action === 'simulate'
    ? 'This only records a demo workflow step. It will not send messages or move inventory.'
    : dialog?.action === 'approved'
      ? 'Approval is recorded for the demo workflow. External actions are never triggered.'
      : 'Add a reason for the traceable human decision.'

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="Recall operations" title="Human-led recall workflow" description="Create a traceable demo case, record a human approval decision, then track explicitly simulated destination steps." />
      {error && <div className="status-banner error" role="alert">Recall cases could not be loaded: {error}</div>}
      {mutationError && <div className="status-banner error" role="alert">{mutationError}</div>}
      {notice && <div className="status-banner" role="status">{notice}</div>}
      <div className="recall-create-panel">
        <div>
          <span className="eyebrow">Start a case</span>
          <h2>Review a batch for recall coordination.</h2>
          <p>Case creation stores the available investigation and waits for human approval. It does not notify any external destination.</p>
        </div>
        <div className="recall-create-controls">
          <label>Batch
            <select value={selectedBatchId} onChange={(event) => setSelectedBatch(event.target.value)}>
              {batchOptions.map((batch) => <option key={batch.batch_id} value={batch.batch_id}>{batch.batch_id} · {batch.product_name}</option>)}
            </select>
          </label>
          <label>Operator name
            <input value={actor} maxLength={80} onChange={(event) => setActor(event.target.value)} />
          </label>
          <button className="primary-btn" disabled={submitting || !actor.trim() || !selectedBatchId || activeCases.some((item) => item.batch_id === selectedBatchId)} onClick={() => { setReason(''); setDialog({ recallId: selectedBatchId, action: 'create' }) }}>
            {submitting ? 'Saving…' : 'Create case for review'} <ArrowRight size={16} aria-hidden="true" />
          </button>
          {activeCases.some((item) => item.batch_id === selectedBatchId) && <small>An open recall case already exists for this batch.</small>}
        </div>
      </div>
      <div className="recall-case-list">
        <div className="recall-list-heading">
          <h2>Recall case register</h2>
          <span>{cases.length} recorded case{cases.length === 1 ? '' : 's'} · persistent local demo workflow</span>
        </div>
        {loading
          ? <LoadingState label="Loading recall cases…" />
          : error
            ? <div className="empty-state empty-state--large"><PackageCheck size={28} aria-hidden="true" /><h3>Recall case register unavailable.</h3><p>No conclusion about existing cases can be made until the API responds.</p></div>
            : cases.length === 0
            ? <div className="empty-state empty-state--large"><PackageCheck size={28} aria-hidden="true" /><h3>No recall cases have been created.</h3><p>Choose a batch above to begin a demo case and request human review.</p></div>
            : cases.map((recallCase) => (
                <article className="recall-case" key={recallCase.recall_id}>
                  <header className="recall-case__header">
                    <div><span className="eyebrow">{recallCase.recall_id}</span><h3>Batch {recallCase.batch_id} · {recallCase.investigation.batch.product_name}</h3></div>
                    <span className={`pill recall-status recall-status--${recallCase.status.toLowerCase().replaceAll(' ', '-')}`}>{recallCase.status}</span>
                  </header>
                  <div className="recall-case__meta">
                    <span>Created {new Date(recallCase.created_at).toLocaleString()}</span>
                    <span>Risk {recallCase.investigation.risk_priority} · calculated {recallCase.investigation.risk_score}/100</span>
                    <span>{recallCase.actions.length} destination actions</span>
                  </div>
                  {recallCase.approvals.map((approval) => (
                    <div className="approval-record" key={`${approval.decision}-${approval.created_at}`}>
                      <strong>{approval.decision === 'approved' ? 'Approved' : 'Rejected'} by {approval.actor}</strong>
                      <span>{approval.reason}</span>
                    </div>
                  ))}
                  {recallCase.status === 'Awaiting approval' && (
                    <div className="recall-case__actions">
                      <button className="primary-btn" disabled={submitting} onClick={() => { setReason(''); setDialog({ recallId: recallCase.recall_id, action: 'approved' }) }}>Review and approve</button>
                      <button className="secondary-btn secondary-btn--dark" disabled={submitting} onClick={() => { setReason(''); setDialog({ recallId: recallCase.recall_id, action: 'rejected' }) }}>Reject with reason</button>
                    </div>
                  )}
                  {recallCase.actions.length > 0 && (
                    <div className="recall-destinations">
                      {recallCase.actions.map((action) => (
                        <div className="recall-destination" key={action.action_id}>
                          <div><strong>{action.destination}</strong><span>{action.action} · {action.status}</span></div>
                          <div className="recall-destination__progress" aria-label={`${action.progress}% simulated progress`}><span style={{ width: `${action.progress}%` }} /></div>
                          {recallCase.status === 'Approved' && action.status !== 'Simulated complete' && (
                            <button className="tiny-btn" disabled={submitting} onClick={() => { setReason('Demo simulation recorded by operator.'); setDialog({ recallId: recallCase.recall_id, action: 'simulate', actionId: action.action_id }) }}>Record simulation</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {recallCase.status === 'Approved' && recallCase.actions.length > 0 && recallCase.actions.every((action) => action.status === 'Simulated complete') && (
                    <div className="recall-case__actions"><button className="secondary-btn secondary-btn--dark" disabled={submitting} onClick={() => { setReason('Simulation workflow reviewed and closed.'); setDialog({ recallId: recallCase.recall_id, action: 'close' }) }}>Close case</button></div>
                  )}
                  <p className="chart-caption">Simulation only: no external destination notification or physical inventory isolation is performed.</p>
                </article>
              ))}
      </div>
      {dialog && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setDialog(null) }}>
          <form className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="recall-dialog-title" onSubmit={(event) => void submitDialog(event)}>
            <span className="eyebrow">{dialog.recallId}</span>
            <h2 id="recall-dialog-title">{dialogTitle}</h2>
            <p>{dialogDescription}</p>
            <label>Recorded by
              <input value={actor} maxLength={80} onChange={(event) => setActor(event.target.value)} required />
            </label>
            {dialog.action !== 'create' && (
              <label>{dialog.action === 'simulate' ? 'Simulation notes' : 'Reason'}
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={1000} required rows={4} />
              </label>
            )}
            <div className="action-dialog__buttons">
              <button type="button" className="secondary-btn secondary-btn--dark" disabled={submitting} onClick={() => setDialog(null)}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={submitting || (dialog.action !== 'create' && reason.trim().length < 5)}>{submitting ? 'Recording…' : dialog.action === 'create' ? 'Create case' : 'Record decision'}</button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  )
}

function InventoryPage() {
  const reportData = useApiData<{ shipments: Shipment[] } | null>('/api/reports', { shipments: demoShipments })
  const inventorySource = useMemo(
    () => reportData.error ? [] : reportData.data?.shipments ?? [],
    [reportData.data?.shipments, reportData.error],
  )
  const inventoryData = useMemo(() => {
    const map = new Map<string, number>()
    for (const shipment of inventorySource) {
      map.set(shipment.destination, (map.get(shipment.destination) ?? 0) + shipment.inventory_quantity)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [inventorySource])
  const totalInventory = inventorySource.reduce((total, shipment) => total + shipment.inventory_quantity, 0)
  const flaggedInventory = inventorySource.reduce((total, shipment) => (
    shipment.recall_status.toLowerCase() === 'clear' ? total : total + shipment.inventory_quantity
  ), 0)
  const clearInventory = totalInventory - flaggedInventory

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="Inventory" title="Destination and stock exposure" description="Reported quantities are grouped by destination. The API does not expose physical isolation completion." />
      {reportData.error && <div className="status-banner error" role="alert">Inventory data is unavailable: {reportData.error}</div>}
      {reportData.loading
        ? <div className="status-banner" role="status">Loading inventory records…</div>
        : <div className="inventory-summary">
            <div><span>Recorded inventory</span><strong>{totalInventory.toLocaleString()}</strong><small>Units in returned shipment rows</small></div>
            <div><span>Non-clear recall status</span><strong>{flaggedInventory.toLocaleString()}</strong><small>Calculated from shipment recall statuses</small></div>
            <div><span>Clear-status inventory</span><strong>{clearInventory.toLocaleString()}</strong><small>Not a verification of physical isolation</small></div>
          </div>}
      <div className="grid-two">
        <div className="panel">
          <h3>Reported inventory by destination</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={inventoryData}>
              <CartesianGrid stroke="rgba(37,38,34,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#6d6b64" />
              <YAxis stroke="#6d6b64" />
              <Tooltip />
              <Bar dataKey="value" fill="#6f8a71" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <h3>Batch-level exposure</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Batch</th><th>Destination</th><th>Inventory</th><th>Recall status</th></tr></thead>
              <tbody>
                {inventorySource.map((shipment, index) => (
                  <tr key={`${shipment.batch_id}-${shipment.destination}-${index}`}>
                    <td><Link to={`/batches/${shipment.batch_id}`}>{shipment.batch_id}</Link></td>
                    <td>{shipment.destination}</td>
                    <td>{shipment.inventory_quantity.toLocaleString()}</td>
                    <td><span className="pill">{shipment.recall_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="chart-caption">The backend does not report isolation completion states; this view does not infer that inventory has been isolated.</p>
        </div>
      </div>
    </motion.div>
  )
}

function NotificationsPage() {
  const { data: notifications, loading, error } = useApiData<NotificationItem[]>('/api/notifications', demoNotifications)

  if (loading) return <LoadingState label="Loading notification records…" />

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="Alerts" title="Notification center" description="Review notification records returned by the BatchBack API." />
      {error && <div className="status-banner error" role="alert">Notification data could not be refreshed: {error}. Displayed entries are sample notifications.</div>}
      <div className="notification-list">
        {notifications.length > 0 ? notifications.map((item) => (
          <div key={item.id} className={`notification-item ${item.read ? 'read' : ''}`}>
            <div className="notification-item__badge" style={{ background: item.severity === 'High' ? 'var(--danger)' : item.severity === 'Medium' ? 'var(--warning)' : 'var(--teal)' }} />
            <div>
              <div className="notification-item__header">
                <strong>{item.title}</strong>
                <span>{item.severity}</span>
              </div>
              <p>{item.message}</p>
              <small>{item.source}</small>
            </div>
          </div>
        )) : <p className="empty-state">There are no notifications in the current API response.</p>}
      </div>
    </motion.div>
  )
}

function AuditPage() {
  const { data: events, loading, error } = useApiData<AuditRecord[]>('/api/audit', [])

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="Accountability" title="Audit history" description="Append-only workflow events recorded by the local demo recall process. This is not a validated enterprise audit system." />
      {error && <div className="status-banner error" role="alert">Audit history is unavailable: {error}</div>}
      {loading
        ? <LoadingState label="Loading audit history…" />
        : error
          ? <div className="empty-state empty-state--large"><History size={28} aria-hidden="true" /><h3>Audit history is unavailable.</h3><p>No conclusion about recorded events can be made until the API responds.</p></div>
          : events.length === 0
          ? <div className="empty-state empty-state--large"><History size={28} aria-hidden="true" /><h3>No workflow events recorded yet.</h3><p>Creating a recall case or recording an approval will add a timestamped event here.</p><Link className="primary-btn" to="/recall-ops">Open recall operations <ArrowRight size={16} aria-hidden="true" /></Link></div>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Event ID</th><th>Actor</th><th>Action</th><th>Batch</th><th>Recall case</th><th>Timestamp</th><th>Details</th></tr></thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.event_id}>
                      <td>{event.event_id}</td>
                      <td>{event.actor}</td>
                      <td>{event.action.replaceAll('_', ' ')}</td>
                      <td>{event.batch_id ? <Link to={`/batches/${event.batch_id}`}>{event.batch_id}</Link> : '—'}</td>
                      <td>{event.recall_id ?? '—'}</td>
                      <td>{new Date(event.timestamp).toLocaleString()}</td>
                      <td><details><summary>View details</summary><pre className="audit-details">{JSON.stringify(event.details, null, 2)}</pre></details></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
    </motion.div>
  )
}

function ReportsPage() {
  const { data: report, loading, error } = useApiData<{ batches: Batch[]; shipments: Shipment[]; recalls?: RecallCaseRecord[]; audit?: AuditRecord[]; data_provenance?: { mode: string; status: string; message: string } }>('/api/reports', demoReport)
  const reportRecords = error ? { batches: [], shipments: [] } : report
  const statusData = useMemo(() => {
    const totals = new Map<string, number>()
    for (const batch of reportRecords.batches) totals.set(batch.recall_status, (totals.get(batch.recall_status) ?? 0) + 1)
    return Array.from(totals, ([name, value]) => ({ name, value }))
  }, [reportRecords.batches])
  const destinationData = useMemo(() => {
    const totals = new Map<string, number>()
    for (const shipment of reportRecords.shipments) {
      totals.set(shipment.destination, (totals.get(shipment.destination) ?? 0) + shipment.inventory_quantity)
    }
    return Array.from(totals, ([name, inventory]) => ({ name, inventory }))
  }, [reportRecords.shipments])

  const exportCsv = () => {
    if (error) return
    const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const rows = [
      ['record_type', 'batch_id', 'product_name', 'destination', 'inventory_quantity', 'recall_status', 'risk_level'],
      ...reportRecords.batches.map((batch) => ['batch', batch.batch_id, batch.product_name, '', '', batch.recall_status, batch.risk_level]),
      ...reportRecords.shipments.map((shipment) => ['shipment', shipment.batch_id, shipment.product, shipment.destination, shipment.inventory_quantity, shipment.recall_status, '']),
    ]
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'batchback-report.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="Analytics" title="Recorded data and exports" description="Explore current batch and shipment records. Historical trends are not available in the reporting API." action={<button className="primary-btn" onClick={exportCsv} disabled={loading || Boolean(error)}>Export CSV</button>} />
      {error && <div className="status-banner error" role="alert">Report data could not be loaded: {error}. Export is disabled until data is available.</div>}
      {loading && <LoadingState label="Loading report data…" />}
      <div className="grid-two">
        <div className="panel">
          <h3>Batch recall-status distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData}>
              <CartesianGrid stroke="rgba(37,38,34,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#6d6b64" />
              <YAxis allowDecimals={false} stroke="#6d6b64" />
              <Tooltip />
              <Bar dataKey="value" name="Batches" fill="#7a3a3d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-caption">Counts are derived from batch records returned by the reports endpoint; no historical trend data is available.</p>
        </div>
        <div className="panel">
          <h3>Reported inventory by destination</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={destinationData}>
              <CartesianGrid stroke="rgba(37,38,34,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#6d6b64" />
              <YAxis stroke="#6d6b64" />
              <Tooltip />
              <Bar dataKey="inventory" name="Inventory units" fill="#6f8a71" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-caption">Inventory quantities are grouped from returned shipment records.</p>
        </div>
      </div>
      <div className="panel report-summary">
        <h3>Workflow records</h3>
        <p>Recall cases: <strong>{report.recalls?.length ?? 0}</strong> · Audit events: <strong>{report.audit?.length ?? 0}</strong></p>
        <p className="chart-caption">Recall and audit rows are local demo workflow records. No real recall action has been executed. {report.data_provenance?.message}</p>
        <Link className="text-link" to="/audit">Review audit history <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </motion.div>
  )
}

function SettingsPage() {
  const [status, setStatus] = useState<HealthStatus | null>(null)
  const [healthError, setHealthError] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const result = await apiGet<HealthStatus>('/health')
        setStatus(result)
      } catch {
        setHealthError(true)
      }
    }
    void load()
  }, [])

  return (
    <motion.div className="page-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader eyebrow="Settings" title="Application configuration" description="Review API availability and database mode without assuming a live Db2 connection." />
      <div className="settings-grid">
        <div className="panel">
          <h3>API configuration</h3>
          <div className="setting-item"><span>API base URL</span><strong>{API_BASE_URL}</strong></div>
          <div className="setting-item"><span>Integration</span><strong>Read-only endpoints</strong></div>
          <div className="setting-item"><span>External actions</span><strong>Not available</strong></div>
        </div>
        <div className="panel">
          <h3>Database status</h3>
          <div className="setting-item"><span>Service</span><strong>{status?.service ?? 'BatchBack'}</strong></div>
          <div className="setting-item"><span>Database</span><strong>{status?.database ?? 'Not verified'}</strong></div>
          <div className="setting-item"><span>API health</span><strong>{status?.status ?? (healthError ? 'Unavailable' : 'Checking…')}</strong></div>
          <p className="chart-caption">{status?.database_message ?? 'Database connection has not been verified.'} Investigation responses also report whether their records came from Db2 or demo fallback.</p>
          <div className="setting-item"><span>Database check</span><strong>{status?.database_status ?? 'Not verified'}</strong></div>
          <div className="setting-item"><span>Analysis mode</span><strong>{status?.ai_mode ?? 'Not verified'}</strong></div>
        </div>
      </div>
    </motion.div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/batches" element={<BatchRegistryPage />} />
      <Route path="/batches/:batchId" element={<BatchDetailPage />} />
      <Route path="/supply-chain" element={<SupplyChainPage />} />
      <Route path="/ai" element={<AIPage />} />
      <Route path="/recall-ops" element={<RecallOpsPage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/audit" element={<AuditPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function NotFoundPage() {
  return (
    <motion.section className="not-found-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <span className="eyebrow">404 · Page not found</span>
      <h1>This path has left the supply chain.</h1>
      <p>The page may have moved, or the address may not be correct.</p>
      <div className="hero-actions">
        <Link to="/dashboard" className="primary-btn">Return to Command Center <ArrowRight size={16} aria-hidden="true" /></Link>
        <Link to="/" className="text-link">Go to home</Link>
      </div>
    </motion.section>
  )
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const isBatchDetail = /^\/batches\/[^/]+$/.test(pathname)
  const currentLabel = isBatchDetail
    ? 'Batch investigation'
    : navItems.find((item) => item.path === pathname)?.label ?? (pathname === '/' ? 'Home' : 'Page')
  const crumbs = pathname === '/'
    ? [{ label: 'Home', to: '/' }]
    : [
        { label: 'Home', to: '/' },
        ...(isBatchDetail ? [{ label: 'Batch Registry', to: '/batches' }] : []),
        { label: currentLabel, to: pathname },
      ]

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.to}-${index}`}>
          {index > 0 && <ChevronRight size={13} aria-hidden="true" />}
          {index === crumbs.length - 1
            ? <span aria-current="page">{crumb.label}</span>
            : <Link to={crumb.to}>{crumb.label}</Link>}
        </span>
      ))}
    </nav>
  )
}

const pageDescriptions: Record<string, string> = {
  '/': 'BatchBack helps food safety teams trace batches, assess exposure, and coordinate recall actions.',
  '/about': 'Learn about BatchBack’s mission, platform capabilities, workflow, and technology.',
  '/dashboard': 'Review BatchBack operational metrics and recorded supply-chain exposure.',
  '/batches': 'Search and review batch records, risk levels, and recall status.',
  '/supply-chain': 'Explore recorded shipment destinations and batch inventory exposure.',
  '/ai': 'Review transparent, rule-based batch risk analysis and recommendations.',
  '/recall-ops': 'Review recall operation capabilities available in the current environment.',
  '/inventory': 'Review reported inventory quantities by destination and batch.',
  '/notifications': 'Review operational notifications from the BatchBack API.',
  '/audit': 'Review timestamped recall workflow events recorded in the local demo environment.',
  '/reports': 'Explore and export BatchBack report data.',
  '/settings': 'Review BatchBack service and database environment status.',
}

function AppLayout() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [healthError, setHealthError] = useState(false)

  useEffect(() => {
    let active = true
    const checkHealth = async () => {
      try {
        const result = await apiGet<HealthStatus>('/health')
        if (active) {
          setHealth(result)
          setHealthError(false)
        }
      } catch {
        if (active) {
          setHealthError(true)
        }
      }
    }

    void checkHealth()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const path = location.pathname
    const batchMatch = path.match(/^\/batches\/([^/]+)$/)
    const title = path === '/'
      ? 'BatchBack | Intelligent Food Recall Coordination'
      : batchMatch
        ? `Batch ${decodeURIComponent(batchMatch[1])} investigation | BatchBack`
        : `${navItems.find((item) => item.path === path)?.label ?? 'Page not found'} | BatchBack`
    document.title = title

    const description = pageDescriptions[path] ?? 'BatchBack is an intelligent food recall coordination platform.'
    let descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!descriptionTag) {
      descriptionTag = document.createElement('meta')
      descriptionTag.name = 'description'
      document.head.appendChild(descriptionTag)
    }
    descriptionTag.content = description
  }, [location.pathname])

  const dataEnvironment = healthError
    ? 'API unavailable · demo records'
    : health?.database_status === 'connected'
      ? 'Db2 tables verified'
      : health
        ? 'Demo data'
        : 'Checking API'

  return (
    <div className="app-shell">
      {mobileMenuOpen && (
        <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar--open' : ''}`} id="primary-navigation">
        <div className="brand-block">
          <Link className="brand-mark" to="/" aria-label="BatchBack home">B</Link>
          <div>
            <div className="brand-name">BatchBack</div>
            <div className="brand-tag">Food safety coordination</div>
          </div>
          <button className="mobile-nav-close" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)}><X size={20} /></button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === '/'} onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="eyebrow">Designed for clarity</span>
          <p>Recorded data, transparent analysis, human-led action.</p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-nav-toggle" aria-label="Open navigation" aria-expanded={mobileMenuOpen} aria-controls="primary-navigation" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <Breadcrumbs pathname={location.pathname} />
          <div className="topbar__actions">
            <Link className="icon-button" to="/notifications" aria-label="Open notifications"><Bell size={17} /></Link>
            <div className={`status-pill ${healthError ? 'status-pill--error' : ''}`} role="status">
              <span className="live-dot" /> {dataEnvironment}
            </div>
          </div>
        </header>

        <AppRoutes />
        <footer className="site-footer">
          <div className="site-footer__brand">
            <div className="brand-mark" aria-hidden="true">B</div>
            <div>
              <strong>BatchBack</strong>
              <p>Intelligent food recall coordination. Built to make batch traceability and response easier to understand.</p>
            </div>
          </div>
          <nav className="site-footer__links" aria-label="Footer navigation">
            <Link to="/about">About</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/batches">Batch Registry</Link>
            <Link to="/supply-chain">Supply Chain</Link>
            <Link to="/notifications">Notifications</Link>
          </nav>
          <div className="site-footer__disclaimer">Environment: {healthError ? 'API unavailable; demo records may be displayed.' : health?.database_status === 'connected' ? 'Db2 tables verified; check data provenance on each response.' : 'Demo data is active; a Db2 connection is not verified.'}</div>
        </footer>
      </main>
    </div>
  )
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </MotionConfig>
  )
}

export default App
