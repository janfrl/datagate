import { describe, expect, it } from 'vitest'
import { profileCsv } from './profile'

describe('CSV dataset profiling', () => {
  it('handles quoted fields with commas and escaped quotes', () => {
    const profile = profileCsv(
      'dataset-1',
      'name,note\n"Ada, Lovelace","She said ""hello"""\nGrace,"plain note"\n'
    )

    expect(profile.rowCount).toBe(2)
    expect(profile.columnCount).toBe(2)
    expect(profile.sampleRows).toEqual([
      {
        name: 'Ada, Lovelace',
        note: 'She said "hello"'
      },
      {
        name: 'Grace',
        note: 'plain note'
      }
    ])
  })

  it('generates unique internal names and preserves header metadata', () => {
    const profile = profileCsv(
      'dataset-1',
      ',email,email,age,active,joined\n,first@example.com,second@example.com,42,true,2026-01-02\nvalue,,third@example.com,,false,2026-01-03\n'
    )

    expect(profile.columns.map(column => column.name)).toEqual([
      'column_1',
      'email',
      'email_2',
      'age',
      'active',
      'joined'
    ])
    expect(profile.columns.map(column => ({
      name: column.name,
      originalName: column.originalName,
      wasGeneratedName: column.wasGeneratedName,
      wasDuplicateName: column.wasDuplicateName
    }))).toEqual([
      {
        name: 'column_1',
        originalName: '',
        wasGeneratedName: true,
        wasDuplicateName: false
      },
      {
        name: 'email',
        originalName: 'email',
        wasGeneratedName: false,
        wasDuplicateName: false
      },
      {
        name: 'email_2',
        originalName: 'email',
        wasGeneratedName: false,
        wasDuplicateName: true
      },
      {
        name: 'age',
        originalName: 'age',
        wasGeneratedName: false,
        wasDuplicateName: false
      },
      {
        name: 'active',
        originalName: 'active',
        wasGeneratedName: false,
        wasDuplicateName: false
      },
      {
        name: 'joined',
        originalName: 'joined',
        wasGeneratedName: false,
        wasDuplicateName: false
      }
    ])
    expect(profile.sampleRows).toEqual([
      {
        column_1: '',
        email: 'first@example.com',
        email_2: 'second@example.com',
        age: '42',
        active: 'true',
        joined: '2026-01-02'
      },
      {
        column_1: 'value',
        email: '',
        email_2: 'third@example.com',
        age: '',
        active: 'false',
        joined: '2026-01-03'
      }
    ])
  })

  it('calculates missing ratios, unique counts, and inferred types', () => {
    const profile = profileCsv(
      'dataset-1',
      'score,active,joined,comment\n10,true,2026-01-01,ok\n,false,2026-01-02,ok\n30,true,2026-01-03,\n'
    )

    expect(profile.columns).toEqual([
      expect.objectContaining({
        name: 'score',
        inferredType: 'number',
        missingCount: 1,
        missingRatio: 1 / 3,
        uniqueCount: 2,
        examples: [10, 30]
      }),
      expect.objectContaining({
        name: 'active',
        inferredType: 'boolean',
        missingCount: 0,
        missingRatio: 0,
        uniqueCount: 2,
        examples: [true, false]
      }),
      expect.objectContaining({
        name: 'joined',
        inferredType: 'date',
        missingCount: 0,
        missingRatio: 0,
        uniqueCount: 3
      }),
      expect.objectContaining({
        name: 'comment',
        inferredType: 'string',
        missingCount: 1,
        missingRatio: 1 / 3,
        uniqueCount: 1,
        examples: ['ok']
      })
    ])
  })
})
