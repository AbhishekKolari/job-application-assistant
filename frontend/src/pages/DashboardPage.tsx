import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts'
import { Loader2, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react'

import { dashboardApi } from '../api/routes'
import type { ApplicationRecord } from '../types'

const STATUS_OPTIONS: Array<{ label: ApplicationRecord['status']; color: string }> = [
  { label: 'Not Applied', color: '#94a3b8' },
  { label: 'Applied', color: '#6366f1' },
  { label: 'Interview', color: '#fbbf24' },
  { label: 'Offer', color: '#34d399' },
  { label: 'Rejected', color: '#f87171' },
]

const STATUS_COLORS = STATUS_OPTIONS.reduce<Record<string, string>>((acc, cur) => {
  acc[cur.label] = cur.color
  return acc
}, {})

export const DashboardPage = () => {
  const queryClient = useQueryClient()
  const summaryQuery = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: dashboardApi.summary })
  const applicationsQuery = useQuery({ queryKey: ['dashboard', 'applications'], queryFn: dashboardApi.applications })

  const statusMutation = useMutation({
    mutationFn: (payload: { job_id: string; status: ApplicationRecord['status'] }) =>
      dashboardApi.updateStatus({ job_id: payload.job_id, status: payload.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'applications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => dashboardApi.remove(jobId),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard', 'applications'] })
      const previous = queryClient.getQueryData<ApplicationRecord[]>(['dashboard', 'applications']) ?? []
      queryClient.setQueryData<ApplicationRecord[]>(
        ['dashboard', 'applications'],
        previous.filter((record) => record.job_id !== jobId),
      )
      return { previous }
    },
    onError: (_err, _jobId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['dashboard', 'applications'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'applications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
    },
  })

  const loading = summaryQuery.isLoading || applicationsQuery.isLoading
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
        <Loader2 className="spin" size={32} />
      </div>
    )
  }

  const summary = summaryQuery.data
  const applications = applicationsQuery.data ?? []

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Pipeline overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
          <Metric label="Tracked roles" value={summary?.total_jobs ?? 0} trend="+12 this month" trendPositive />
          <Metric label="Applications" value={summary?.applied ?? 0} />
          <Metric label="Interviews" value={summary?.interviews ?? 0} trend="+2 this week" trendPositive />
          <Metric label="Offers" value={summary?.offers ?? 0} trend="stable" />
          <Metric label="Rejections" value={summary?.rejections ?? 0} trend="-1 vs last month" />
        </div>
      </section>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px,1fr)' }}>
        <ChartCard title="Weekly applications" description="Rolling 6 weeks of submissions">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={summary?.weekly_applications ?? []}>
              <defs>
                <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorApps)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Status over time" description="Daily change in pipeline">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={summary?.status_over_time ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              {['Applied', 'Interview', 'Offer', 'Rejected'].map((status) => (
                <Line
                  key={status}
                  type="monotone"
                  dataKey={status}
                  stroke={STATUS_COLORS[status] || '#94a3b8'}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Application tracker</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Every job you discover is tracked here—update stages or remove old listings.
            </p>
          </div>
        </div>
        {applications.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {applications.map((app) => (
              <ApplicationRow
                key={app.job_id}
                record={app}
                onStatusChange={(status) => statusMutation.mutate({ job_id: app.job_id, status })}
                onDelete={() => deleteMutation.mutate(app.job_id)}
                loading={statusMutation.isPending || deleteMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const Metric = ({
  label,
  value,
  trend,
  trendPositive,
}: {
  label: string
  value: number
  trend?: string
  trendPositive?: boolean
}) => (
  <div className="glass-card" style={{ padding: '1rem', borderRadius: 20 }}>
    <p className="text-muted" style={{ margin: 0 }}>
      {label}
    </p>
    <h3 style={{ margin: '0.4rem 0' }}>{value}</h3>
    {trend && (
      <p style={{ margin: 0, fontSize: 13, color: trendPositive ? '#10b981' : '#f97316', display: 'flex', gap: 4, alignItems: 'center' }}>
        {trendPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </p>
    )}
  </div>
)

const ChartCard = ({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) => (
  <div className="glass-card" style={{ padding: '1.25rem', borderRadius: 24 }}>
    <h4 style={{ margin: 0 }}>{title}</h4>
    <p style={{ margin: '0.2rem 0 0.8rem', color: 'var(--text-muted)' }}>{description}</p>
    {children}
  </div>
)

const ApplicationRow = ({
  record,
  onStatusChange,
  onDelete,
  loading,
}: {
  record: ApplicationRecord
  onStatusChange: (status: ApplicationRecord['status']) => void
  onDelete: () => void
  loading: boolean
}) => {
  const statusOptions = useMemo(() => STATUS_OPTIONS, [])
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
        gap: '0.75rem',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
      }}
    >
      <div>
        <strong>{record.job_title}</strong>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>{record.company}</p>
      </div>
      <Badge
        label="Match"
        value={typeof record.match_score === 'number' ? `${record.match_score.toFixed(0)}%` : '—'}
        color={typeof record.match_score === 'number' ? STATUS_COLORS.Applied : 'var(--text-muted)'}
      />
      <div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Status</p>
        <select
          value={record.status}
          onChange={(e) => onStatusChange(e.target.value as ApplicationRecord['status'])}
          disabled={loading}
          style={{
            borderRadius: 10,
            border: '1px solid var(--border-color)',
            padding: '0.35rem 0.7rem',
            background: 'var(--bg-muted)',
          }}
        >
          {statusOptions.map((option) => (
            <option key={option.label} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {record.tailored_resume_url && (
          <a href={record.tailored_resume_url} target="_blank" rel="noreferrer" className="pill" style={{ border: '1px solid var(--border-color)' }}>
            Resume
          </a>
        )}
        {record.tailored_cover_letter_url && (
          <a href={record.tailored_cover_letter_url} target="_blank" rel="noreferrer" className="pill" style={{ border: '1px solid var(--border-color)' }}>
            Cover
          </a>
        )}
      </div>
      <a
        href={record.application_link ?? '#'}
        target="_blank"
        rel="noreferrer"
        className="accent-button"
        style={{ padding: '0.6rem 1rem', borderRadius: 12 }}
      >
        View
      </a>
      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        style={{ border: 'none', background: 'transparent', cursor: loading ? 'not-allowed' : 'pointer' }}
        aria-label={`Remove ${record.job_title}`}
      >
        <Trash2 size={18} color="var(--text-muted)" />
      </button>
    </div>
  )
}

const Badge = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span className="text-muted" style={{ fontSize: 13 }}>
      {label}
    </span>
    <strong style={{ color }}>{value}</strong>
  </div>
)

const EmptyState = () => (
  <div
    style={{
      border: '1px dashed var(--border-color)',
      borderRadius: 16,
      padding: '1.5rem',
      textAlign: 'center',
      color: 'var(--text-muted)',
    }}
  >
    <p style={{ margin: 0 }}>
      Search for roles via “Find jobs” and they’ll appear here automatically. Update status or delete them as you go.
    </p>
  </div>
)
