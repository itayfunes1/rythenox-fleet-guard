import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rythenox'

interface IncidentAlertProps {
  serviceName?: string
  incidentTitle?: string
  incidentDescription?: string
  status?: string
  impact?: string
  action?: 'opened' | 'updated' | 'resolved'
  occurredAt?: string
  statusUrl?: string
}

const labelFor = (action?: string) => {
  switch (action) {
    case 'resolved': return 'Incident resolved'
    case 'updated': return 'Incident updated'
    default: return 'New incident'
  }
}

const accentFor = (action?: string) =>
  action === 'resolved' ? '#16a34a' : action === 'updated' ? '#d97706' : '#dc2626'

const IncidentAlertEmail = ({
  serviceName = 'Service',
  incidentTitle = 'Incident detected',
  incidentDescription = '',
  status = 'investigating',
  impact = 'minor',
  action = 'opened',
  occurredAt = new Date().toISOString(),
  statusUrl = 'https://rythenox-fleet-guard.lovable.app/status',
}: IncidentAlertProps) => {
  const accent = accentFor(action)
  const label = labelFor(action)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`[${label}] ${serviceName}: ${incidentTitle}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...badge, backgroundColor: accent }}>
            <Text style={badgeText}>{label.toUpperCase()}</Text>
          </Section>
          <Heading style={h1}>{incidentTitle}</Heading>
          <Text style={subhead}>{serviceName}</Text>

          {incidentDescription ? (
            <Text style={text}>{incidentDescription}</Text>
          ) : null}

          <Section style={meta}>
            <Text style={metaRow}><strong>Status:</strong> {status}</Text>
            <Text style={metaRow}><strong>Impact:</strong> {impact}</Text>
            <Text style={metaRow}><strong>Time:</strong> {occurredAt}</Text>
          </Section>

          <Hr style={hr} />
          <Text style={text}>
            View live status and history at{' '}
            <a href={statusUrl} style={link}>{statusUrl}</a>
          </Text>
          <Text style={footer}>{SITE_NAME} status monitor</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: IncidentAlertEmail,
  subject: (d: Record<string, any>) =>
    `[${labelFor(d?.action)}] ${d?.serviceName ?? 'Service'}: ${d?.incidentTitle ?? 'Incident'}`,
  displayName: 'Incident alert',
  previewData: {
    serviceName: 'Relay Network',
    incidentTitle: 'Degraded heartbeats from edge nodes',
    incidentDescription: '2 of 5 nodes have not reported in over 2 minutes.',
    status: 'investigating',
    impact: 'minor',
    action: 'opened',
    occurredAt: new Date().toISOString(),
    statusUrl: 'https://rythenox-fleet-guard.lovable.app/status',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const badge = { display: 'inline-block', borderRadius: '4px', padding: '4px 10px', marginBottom: '16px' }
const badgeText = { color: '#ffffff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }
const subhead = { fontSize: '13px', color: '#64748b', margin: '0 0 16px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 14px' }
const meta = { backgroundColor: '#f8fafc', borderRadius: '6px', padding: '12px 14px', margin: '8px 0 16px' }
const metaRow = { fontSize: '13px', color: '#334155', margin: '2px 0' }
const link = { color: '#4f46e5', textDecoration: 'underline' }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '20px 0 0' }
