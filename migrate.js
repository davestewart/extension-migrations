/**
 * Creates a version comparison object
 *
 * @param   {string|number}   version   Version to compare
 * @param   {number}          [max=4]   The number of parts to compare against
 */
export function v (version, max = 4) {
  const parse = (version, toString) => {
    const parts = String(version).split('.').map(Number)
    while (parts.length < max) {
      parts.push(0)
    }
    return toString
      ? parts.join('.')
      : parts
  }

  const parts = parse(version)

  const cmp = (other) => {
    if (other !== undefined) {
      const otherParts = parse(other)
      for (let i = 0; i < 4; i++) {
        if (parts[i] > otherParts[i]) return 1
        if (parts[i] < otherParts[i]) return -1
      }
      return 0
    }
  }

  // comparisons
  const eq = other => cmp(other) === 0
  const gt = other => cmp(other) > 0
  const lt = other => cmp(other) < 0
  const gte = other => cmp(other) >= 0
  const lte = other => cmp(other) <= 0
  const between = (min, max) => gt(min) && lt(max)
  const within = (min, max) => gte(min) && lte(max)

  return {
    // version
    parts,
    version,
    versionFull: parts.join('.'),

    // comparisons
    eq,
    gt,
    lt,
    gte,
    lte,
    between,
    within,

    // utils
    parse,
    cmp,
  }
}

/**
 * @typedef   {Object}  Migration
 * @property  {(from: string, to: string) => void}  up      Up migration
 * @property  {(from: string, to: string) => void} [down]   Down migration
 */

/**
 * @typedef {Record<string, Migration>}  Migrations
 */

/**
 * Run migrations between versions
 *
 * @param   {Migrations}      migrations    Hash of version numbers with up/down methods
 * @param   {string|number}   from          Previous version (null for fresh install)
 * @param   {string|number}   to            Target version to migrate to
 * @returns {Promise<{ versions: string[], type: 'skip'|'none'|'all'|'up'|'down'} | null>}}
 */
export async function migrate (migrations, from, to) {
  // convert versions to comparable objects
  const prev = from ? v(from) : null

  // get sorted version numbers from migrations
  const versions = Object.keys(migrations)
    .map(version => v(version))
    .sort((a, b) => a.cmp(b.version))

  // output
  const last = versions.at(-1)?.version
  to = to || last
  const results = []
  let type

  // no migrations
  if (versions.length === 0) {
    type = 'skip'
  }

  // fresh install
  else if (!prev) {
    type = to === last ? 'all' : 'some'
    for (const { version } of versions) {
      if (v(version).lte(to)) {
        results.push(version)
        await migrations[version].up(version, 'none')
      }
    }
  }

  // same version
  else if (prev.eq(to)) {
    type = 'none'
  }

  // upgrade
  else if (prev.lt(to)) {
    type = 'up'
    for (const { version } of versions) {
      if (v(version).gt(from) && v(version).lte(to)) {
        results.push(version)
        await migrations[version].up(version, prev.version)
      }
    }
  }

  // downgrade
  else if (prev.gt(to)) {
    type = 'down'
    for (const { version } of [...versions].reverse()) {
      if (v(version).gt(to) && v(version).lte(from)) {
        results.push(version)
        await migrations[version].down(version, prev.version)
      }
    }
  }

  // return
  return {
    versions: results,
    type,
  }
}
