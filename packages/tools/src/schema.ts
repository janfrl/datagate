import type { DatasetProfile, Finding, ToolResult } from '@datagate/shared'
import { createFinding, schemaToolId, scoreImpact, uniqueRatio, normalizeName } from './utils'

const identifierName = /(^|_)(id|uuid|guid|token|key)($|_)/
const highCardinalityRatio = 0.9
const highCardinalityMinimumRows = 10

export function analyzeSchema(profile: DatasetProfile): ToolResult {
  const findings: Finding[] = []

  for (const column of profile.columns) {
    const normalized = normalizeName(column.name)
    const columnUniqueRatio = uniqueRatio(column.uniqueCount, profile.rowCount)

    if (column.wasGeneratedName === true || column.originalName === '') {
      findings.push(createFinding({
        toolId: schemaToolId,
        category: 'schema',
        severity: 'high',
        column: column.name,
        title: 'Column name is empty',
        message: `Column "${column.name}" appears to come from an empty CSV header.`,
        recommendation: 'Rename the column to a clear, domain-specific field name.',
        evidence: {
          detection: column.wasGeneratedName === true ? 'generated-column-name' : 'empty-original-column-name'
        }
      }))
    }

    if (column.wasDuplicateName === true) {
      findings.push(createFinding({
        toolId: schemaToolId,
        category: 'schema',
        severity: 'high',
        column: column.name,
        title: 'Duplicate original column name detected',
        message: `Column "${column.name}" came from a duplicate CSV header.`,
        recommendation: 'Rename duplicate columns so each field has a unique meaning.',
        evidence: {
          detection: 'duplicate-original-column-name'
        }
      }))
    }

    if (column.inferredType === 'unknown') {
      findings.push(createFinding({
        toolId: schemaToolId,
        category: 'schema',
        severity: 'medium',
        column: column.name,
        title: 'Column type could not be inferred',
        message: `Column "${column.name}" has no clear deterministic type in the current profile.`,
        recommendation: 'Populate this column with consistent values, remove it, or document why it is intentionally empty.',
        evidence: {
          missingRatio: column.missingRatio,
          uniqueCount: column.uniqueCount
        }
      }))
    }

    if (identifierName.test(normalized)) {
      findings.push(createFinding({
        toolId: schemaToolId,
        category: 'schema',
        severity: 'medium',
        column: column.name,
        title: 'Suspicious identifier column detected',
        message: `Column "${column.name}" appears to contain identifiers rather than model-ready attributes.`,
        recommendation: 'Review whether this identifier should be excluded, joined against reference data, or handled as metadata.',
        evidence: {
          detection: 'identifier-column-name',
          uniqueRatio: columnUniqueRatio
        }
      }))
    }

    if (column.inferredType === 'string' && profile.rowCount >= highCardinalityMinimumRows && columnUniqueRatio >= highCardinalityRatio) {
      findings.push(createFinding({
        toolId: schemaToolId,
        category: 'schema',
        severity: identifierName.test(normalized) ? 'medium' : 'low',
        column: column.name,
        title: 'High-cardinality string column detected',
        message: `Column "${column.name}" has a very high unique-value ratio.`,
        recommendation: 'Check whether this field is an identifier, free text, or sparse categorical value before using it downstream.',
        evidence: {
          uniqueCount: column.uniqueCount,
          rowCount: profile.rowCount,
          uniqueRatio: columnUniqueRatio
        }
      }))
    }
  }

  return {
    toolId: schemaToolId,
    findings,
    scoreImpact: scoreImpact(findings)
  }
}
