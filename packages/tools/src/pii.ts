import type { ColumnProfile, DatasetProfile, Finding, ToolResult } from '@datagate/shared'
import { createFinding, normalizeName, piiToolId, scoreImpact, stringValues } from './utils'

type PiiDetection = {
  detection: string
  severity: Finding['severity']
  matchedExamples: number
  matchedSampleRows: number
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const likelyNameColumn = /(^|_)(first_name|last_name|full_name|name)($|_)/
const identifierColumn = /(^|_)(id|user|user_id|customer|customer_id|account|account_id|uuid|guid)($|_)/
const emailColumn = /(^|_)(email|e_mail)($|_)/
const phoneColumn = /(^|_)(phone|mobile|telephone|tel)($|_)/
const ipColumn = /(^|_)(ip|ip_address)($|_)/

export function analyzePii(profile: DatasetProfile): ToolResult {
  const findings: Finding[] = []

  for (const column of profile.columns) {
    const detections = detectPii(profile, column)

    for (const detection of detections) {
      findings.push(createFinding({
        toolId: piiToolId,
        category: 'privacy',
        severity: detection.severity,
        column: column.name,
        title: 'Potential personal data detected',
        message: `Column "${column.name}" matched deterministic ${detection.detection} PII heuristics.`,
        recommendation: 'Review whether this field is required, and redact, aggregate, or remove personal data before sharing summaries with external systems.',
        evidence: {
          detection: detection.detection,
          matchedExamples: detection.matchedExamples,
          matchedSampleRows: detection.matchedSampleRows
        }
      }))
    }
  }

  return {
    toolId: piiToolId,
    findings,
    scoreImpact: scoreImpact(findings)
  }
}

function detectPii(profile: DatasetProfile, column: ColumnProfile): PiiDetection[] {
  const normalized = normalizeName(column.name)
  const examples = stringValues(column.examples)
  const sampleValues = profile.sampleRows
    .map(row => row[column.name])
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
  const detections: PiiDetection[] = []

  addDetection(detections, {
    detection: 'email-regex',
    severity: 'high',
    matchedExamples: countMatches(examples, isEmail),
    matchedSampleRows: countMatches(sampleValues, isEmail)
  })

  addDetection(detections, {
    detection: 'phone-like-values',
    severity: 'medium',
    matchedExamples: countMatches(examples, isPhoneLike),
    matchedSampleRows: countMatches(sampleValues, isPhoneLike)
  })

  addDetection(detections, {
    detection: 'ip-address-regex',
    severity: 'medium',
    matchedExamples: countMatches(examples, isIpAddress),
    matchedSampleRows: countMatches(sampleValues, isIpAddress)
  })

  if (emailColumn.test(normalized)) {
    addDetection(detections, namedColumnDetection('email-column-name', 'high'))
  }

  if (phoneColumn.test(normalized)) {
    addDetection(detections, namedColumnDetection('phone-column-name', 'medium'))
  }

  if (ipColumn.test(normalized)) {
    addDetection(detections, namedColumnDetection('ip-column-name', 'medium'))
  }

  if (likelyNameColumn.test(normalized)) {
    addDetection(detections, namedColumnDetection('likely-name-column', 'medium'))
  }

  if (identifierColumn.test(normalized)) {
    addDetection(detections, namedColumnDetection('identifier-column-name', 'medium'))
  }

  return detections
}

function addDetection(detections: PiiDetection[], detection: PiiDetection) {
  if (detection.matchedExamples > 0 || detection.matchedSampleRows > 0 || detection.detection.endsWith('column-name')) {
    detections.push(detection)
  }
}

function namedColumnDetection(detection: string, severity: Finding['severity']): PiiDetection {
  return {
    detection,
    severity,
    matchedExamples: 0,
    matchedSampleRows: 0
  }
}

function countMatches(values: string[], matcher: (value: string) => boolean) {
  return values.filter(matcher).length
}

function isEmail(value: string) {
  return emailRegex.test(value)
}

function isIpAddress(value: string) {
  return ipv4Regex.test(value)
}

function isPhoneLike(value: string) {
  const digits = value.replace(/\D/g, '')

  return digits.length >= 10 && digits.length <= 15
}
