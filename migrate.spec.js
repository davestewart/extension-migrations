import { describe, it, expect } from 'vitest'
import { migrate } from './migrate.js'
import { version } from 'vitest/node'

describe('migrate', () => {
  const up =  (to, from) => void 0
  const down = (to, from) => void 0
  const migration = { up, down }
  const migrations = {
    '0.1': migration,
    '0.2': migration,
    '0.5': migration,
    '1.0': migration,
    '1.5': migration,
    '2.0': migration,
  }

  it('no migrations: should skip migrations', async () => {
    const { type, versions } = await migrate({}, undefined, '0.1')
    expect(type).toEqual('skip')
    expect(versions).toEqual([])
  })

  it('setup: should run all migrations', async () => {
    const { type, versions } = await migrate({ '0.1': { up } }, undefined, '0.1')
    expect(type).toEqual('all')
    expect(versions).toEqual(['0.1'])
  })

  it('install: should run all migrations', async () => {
    const { type, versions } = await migrate(migrations)
    expect(type).toEqual('all')
    expect(versions).toEqual(['0.1', '0.2', '0.5', '1.0', '1.5', '2.0'])
  })

  /*
  it('partial install: should run most migrations', async () => {
    const { type, versions } = await migrate(migrations, undefined, 1.5)
    expect(type).toEqual('some')
    expect(versions).toEqual(['0.1', '0.2', '0.5', '1.0', '1.5'])
  })
  */

  it('install same version: should skip migrations', async () => {
    const { type, versions } = await migrate(migrations, 2, 2)
    expect(type).toEqual('none')
    expect(versions).toEqual([])
  })

  it('install newer version: should run higher migrations', async () => {
    const { type, versions } = await migrate(migrations, 0.2, 2)
    expect(type).toEqual('up')
    expect(versions).toEqual(['0.5', '1.0', '1.5', '2.0'])
  })

  it('install older version: should run lower migrations', async () => {
    const { type, versions } = await migrate(migrations, 2, 0.2)
    expect(type).toEqual('down')
    expect(versions).toEqual(['2.0', '1.5', '1.0', '0.5'])
  })

  it('should support throwing and catching errors', async () => {
    const error = {
      version: null,
      message: null,
    }
    try {
      await migrate({
        '2.0': {
          up (version) {
            error.version = version
            throw new Error('Could not create database')
          },
          down () {}
        },
      }, 1, 2)
    }
    catch (err) {
      error.message = err.message
    }
    expect(error.message).toEqual('Could not create database')
    expect(error.version).toEqual('2.0')
  })
})
