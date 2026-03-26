import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const HAS_UPDATED_AT = new Set(['User', 'Task', 'Bill', 'Product'])

const INCLUDE_MAP = {
  user:        { table: 'User', fk: 'userId' },
  assignedTo:  { table: 'User', fk: 'assignedToId' },
  assignedBy:  { table: 'User', fk: 'assignedById' },
  submittedBy: { table: 'User', fk: 'submittedById' },
  approvedBy:  { table: 'User', fk: 'approvedById' },
  createdBy:   { table: 'User', fk: 'createdById' },
  uploadedBy:  { table: 'User', fk: 'uploadedById' },
}

function applySelect(record, select) {
  if (!select || !record) return record
  const out = {}
  for (const k of Object.keys(select)) out[k] = record[k]
  return out
}

async function attachIncludes(list, include) {
  if (!include || !list.length) return list
  for (const [key, opts] of Object.entries(include)) {
    const mapping = INCLUDE_MAP[key]
    if (!mapping) continue
    const ids = [...new Set(list.map(r => r[mapping.fk]).filter(Boolean))]
    if (!ids.length) { list.forEach(r => { r[key] = null }); continue }
    const { data } = await sb.from(mapping.table).select('*').in('id', ids)
    const byId = Object.fromEntries((data || []).map(u => [u.id, u]))
    list.forEach(r => {
      const rel = byId[r[mapping.fk]] || null
      r[key] = rel && opts?.select ? applySelect(rel, opts.select) : rel
    })
  }
  return list
}

function applyWhere(q, where) {
  if (!where) return q
  for (const [key, value] of Object.entries(where)) {
    if (typeof value === 'object' && value !== null && key.includes('_') && !('in' in value) && !('startsWith' in value)) {
      for (const [sk, sv] of Object.entries(value)) q = q.eq(sk, sv)
      continue
    }
    if (value === null) { q = q.is(key, null); continue }
    if (typeof value === 'object') {
      if ('startsWith' in value) q = q.like(key, `${value.startsWith}%`)
      else if ('in' in value) q = q.in(key, value.in)
    } else {
      q = q.eq(key, value)
    }
  }
  return q
}

function createModel(tableName) {
  const withUpdatedAt = HAS_UPDATED_AT.has(tableName)
  const now = () => new Date().toISOString()
  return {
    async findUnique({ where, include, select } = {}) {
      let q = sb.from(tableName).select('*')
      q = applyWhere(q, where)
      const { data } = await q.maybeSingle()
      if (!data) return null
      let result = include ? (await attachIncludes([{ ...data }], include))[0] : data
      return select ? applySelect(result, select) : result
    },
    async findFirst({ where, include, select } = {}) {
      let q = sb.from(tableName).select('*').limit(1)
      q = applyWhere(q, where)
      const { data } = await q
      if (!data?.[0]) return null
      let result = include ? (await attachIncludes([{ ...data[0] }], include))[0] : data[0]
      return select ? applySelect(result, select) : result
    },
    async findMany({ where, include, select, orderBy, take } = {}) {
      let q = sb.from(tableName).select('*')
      q = applyWhere(q, where)
      if (orderBy) {
        const [col, dir] = Object.entries(orderBy)[0]
        q = q.order(col, { ascending: dir === 'asc' })
      }
      if (take) q = q.limit(take)
      const { data } = await q
      let list = (data || []).map(r => ({ ...r }))
      if (include) list = await attachIncludes(list, include)
      if (select) list = list.map(r => applySelect(r, select))
      return list
    },
    async create({ data, include, select } = {}) {
      const t = now()
      const record = { id: uuidv4(), ...data, createdAt: t, ...(withUpdatedAt && { updatedAt: t }) }
      const { data: created, error } = await sb.from(tableName).insert(record).select().single()
      if (error) throw new Error(error.message)
      let result = include ? (await attachIncludes([{ ...created }], include))[0] : created
      return select ? applySelect(result, select) : result
    },
    async createMany({ data } = {}) {
      const t = now()
      const records = data.map(d => ({ id: uuidv4(), ...d, createdAt: t, ...(withUpdatedAt && { updatedAt: t }) }))
      const { error } = await sb.from(tableName).insert(records)
      if (error) throw new Error(error.message)
      return { count: records.length }
    },
    async update({ where, data, include, select } = {}) {
      const payload = { ...data, ...(withUpdatedAt && { updatedAt: now() }) }
      let q = sb.from(tableName).update(payload)
      q = applyWhere(q, where)
      const { data: updated, error } = await q.select().single()
      if (error) throw new Error(error.message)
      let result = include ? (await attachIncludes([{ ...updated }], include))[0] : updated
      return select ? applySelect(result, select) : result
    },
    async updateMany({ where, data } = {}) {
      const payload = { ...data, ...(withUpdatedAt && { updatedAt: now() }) }
      let q = sb.from(tableName).update(payload)
      q = applyWhere(q, where)
      const { error, count } = await q
      if (error) throw new Error(error.message)
      return { count: count || 0 }
    },
    async upsert({ where, update, create, include } = {}) {
      let q = sb.from(tableName).select('*')
      q = applyWhere(q, where)
      const { data: existing } = await q.maybeSingle()
      if (existing) return this.update({ where: { id: existing.id }, data: update, include })
      return this.create({ data: create, include })
    },
    async delete({ where } = {}) {
      let q = sb.from(tableName).delete()
      q = applyWhere(q, where)
      const { data, error } = await q.select().single()
      if (error) throw new Error(error.message)
      return data
    },
    async deleteMany({ where } = {}) {
      let q = sb.from(tableName).delete()
      q = applyWhere(q, where)
      const { error, count } = await q
      if (error) throw new Error(error.message)
      return { count: count || 0 }
    },
    async count({ where } = {}) {
      let q = sb.from(tableName).select('*', { count: 'exact', head: true })
      q = applyWhere(q, where)
      const { count, error } = await q
      if (error) throw new Error(error.message)
      return count || 0
    },
  }
}

const db = {
  user:         createModel('User'),
  attendance:   createModel('Attendance'),
  task:         createModel('Task'),
  bill:         createModel('Bill'),
  product:      createModel('Product'),
  notification: createModel('Notification'),
  upload:       createModel('Upload'),
}

export default db
export { sb }
