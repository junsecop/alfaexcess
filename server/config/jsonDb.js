import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../data/db.json')

function readDB() {
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'))
}

function writeDB(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// Map include keys to { foreignKey, collection }
const INCLUDE_MAP = {
  user:        { fk: 'userId',        col: 'users' },
  assignedTo:  { fk: 'assignedToId',  col: 'users' },
  assignedBy:  { fk: 'assignedById',  col: 'users' },
  submittedBy: { fk: 'submittedById', col: 'users' },
  approvedBy:  { fk: 'approvedById',  col: 'users' },
  createdBy:   { fk: 'createdById',   col: 'users' },
  uploadedBy:  { fk: 'uploadedById',  col: 'users' },
}

function matchWhere(record, where) {
  for (const [key, value] of Object.entries(where)) {
    // Composite unique key e.g. userId_date: { userId, date }
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && key.includes('_') && !('in' in value) && !('startsWith' in value)) {
      for (const [subKey, subVal] of Object.entries(value)) {
        if (record[subKey] !== subVal) return false
      }
      continue
    }
    if (value === null) {
      if (record[key] !== null && record[key] !== undefined) return false
      continue
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      if ('startsWith' in value) {
        if (!String(record[key] ?? '').startsWith(value.startsWith)) return false
      } else if ('in' in value) {
        if (!value.in.includes(record[key])) return false
      }
    } else {
      if (record[key] !== value) return false
    }
  }
  return true
}

function applySelect(record, select) {
  if (!select) return record
  const out = {}
  for (const k of Object.keys(select)) out[k] = record[k]
  return out
}

function applyInclude(record, include, db) {
  if (!include) return record
  const result = { ...record }
  for (const [key, opts] of Object.entries(include)) {
    const mapping = INCLUDE_MAP[key]
    if (!mapping) continue
    const fid = record[mapping.fk]
    if (!fid) { result[key] = null; continue }
    const related = (db[mapping.col] || []).find(r => r.id === fid)
    result[key] = related
      ? (opts?.select ? applySelect(related, opts.select) : related)
      : null
  }
  return result
}

function applyOrderBy(records, orderBy) {
  if (!orderBy) return records
  const [field, dir] = Object.entries(orderBy)[0]
  return [...records].sort((a, b) => {
    const av = a[field] ?? '', bv = b[field] ?? ''
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  })
}

function createModel(collectionName) {
  return {
    async findUnique({ where, include, select } = {}) {
      const db = readDB()
      const record = (db[collectionName] || []).find(r => matchWhere(r, where))
      if (!record) return null
      let result = include ? applyInclude(record, include, db) : { ...record }
      if (select) result = applySelect(result, select)
      return result
    },

    async findFirst({ where, include, select } = {}) {
      const db = readDB()
      const record = (db[collectionName] || []).find(r => matchWhere(r, where))
      if (!record) return null
      let result = include ? applyInclude(record, include, db) : { ...record }
      if (select) result = applySelect(result, select)
      return result
    },

    async findMany({ where, include, select, orderBy, take } = {}) {
      const db = readDB()
      let records = db[collectionName] || []
      if (where) records = records.filter(r => matchWhere(r, where))
      if (orderBy) records = applyOrderBy(records, orderBy)
      if (take) records = records.slice(0, take)
      return records.map(r => {
        let result = include ? applyInclude(r, include, db) : { ...r }
        if (select) result = applySelect(result, select)
        return result
      })
    },

    async create({ data, include, select } = {}) {
      const db = readDB()
      const now = new Date().toISOString()
      const record = { id: uuidv4(), ...data, createdAt: now, updatedAt: now }
      if (!db[collectionName]) db[collectionName] = []
      db[collectionName].push(record)
      writeDB(db)
      let result = include ? applyInclude(record, include, db) : { ...record }
      if (select) result = applySelect(result, select)
      return result
    },

    async createMany({ data } = {}) {
      const db = readDB()
      const now = new Date().toISOString()
      const records = data.map(d => ({ id: uuidv4(), ...d, createdAt: now, updatedAt: now }))
      if (!db[collectionName]) db[collectionName] = []
      db[collectionName].push(...records)
      writeDB(db)
      return { count: records.length }
    },

    async update({ where, data, include, select } = {}) {
      const db = readDB()
      const records = db[collectionName] || []
      const idx = records.findIndex(r => matchWhere(r, where))
      if (idx === -1) throw new Error(`Record not found in ${collectionName}`)
      records[idx] = { ...records[idx], ...data, updatedAt: new Date().toISOString() }
      db[collectionName] = records
      writeDB(db)
      let result = include ? applyInclude(records[idx], include, db) : { ...records[idx] }
      if (select) result = applySelect(result, select)
      return result
    },

    async updateMany({ where, data } = {}) {
      const db = readDB()
      const records = db[collectionName] || []
      let count = 0
      for (let i = 0; i < records.length; i++) {
        if (!where || matchWhere(records[i], where)) {
          records[i] = { ...records[i], ...data, updatedAt: new Date().toISOString() }
          count++
        }
      }
      db[collectionName] = records
      writeDB(db)
      return { count }
    },

    async upsert({ where, update, create, include } = {}) {
      const db = readDB()
      const records = db[collectionName] || []
      const idx = records.findIndex(r => matchWhere(r, where))
      if (idx !== -1) {
        records[idx] = { ...records[idx], ...update, updatedAt: new Date().toISOString() }
        db[collectionName] = records
        writeDB(db)
        return include ? applyInclude(records[idx], include, db) : { ...records[idx] }
      } else {
        const now = new Date().toISOString()
        const record = { id: uuidv4(), ...create, createdAt: now, updatedAt: now }
        if (!db[collectionName]) db[collectionName] = []
        db[collectionName].push(record)
        writeDB(db)
        return include ? applyInclude(record, include, db) : { ...record }
      }
    },

    async delete({ where } = {}) {
      const db = readDB()
      const records = db[collectionName] || []
      const idx = records.findIndex(r => matchWhere(r, where))
      if (idx === -1) throw new Error(`Record not found in ${collectionName}`)
      const [deleted] = records.splice(idx, 1)
      db[collectionName] = records
      writeDB(db)
      return deleted
    },

    async deleteMany({ where } = {}) {
      const db = readDB()
      const records = db[collectionName] || []
      const before = records.length
      db[collectionName] = where ? records.filter(r => !matchWhere(r, where)) : []
      writeDB(db)
      return { count: before - db[collectionName].length }
    },

    async count({ where } = {}) {
      const db = readDB()
      const records = db[collectionName] || []
      return where ? records.filter(r => matchWhere(r, where)).length : records.length
    },
  }
}

const jsonDb = {
  user:         createModel('users'),
  attendance:   createModel('attendance'),
  task:         createModel('tasks'),
  bill:         createModel('bills'),
  product:      createModel('products'),
  notification: createModel('notifications'),
  upload:       createModel('uploads'),
  async $connect() {},
  async $disconnect() {},
}

export default jsonDb
