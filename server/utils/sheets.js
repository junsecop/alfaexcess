import { google } from 'googleapis'

const getAuth = () => new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth: getAuth() })
const SHEET_ID = process.env.GOOGLE_SHEET_ID

export const appendToSheet = async (range, values) => {
  if (!SHEET_ID) return { skipped: true }
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  })
  return { success: true }
}

export const syncAttendanceToSheet = async (records) => {
  const rows = records.map(r => [
    r.date, r.user?.name || '', r.status, r.checkIn || '', r.checkOut || '', r.note || '',
  ])
  return appendToSheet('Attendance!A:F', rows)
}

export const syncBillsToSheet = async (records) => {
  const rows = records.map(r => [
    r.createdAt?.toISOString().slice(0, 10), r.title, r.type, r.amount, r.status,
    r.submittedBy?.name || '', r.month || '',
  ])
  return appendToSheet('Bills!A:G', rows)
}
