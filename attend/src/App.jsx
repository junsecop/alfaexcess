import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Attendance from './pages/Attendance'
import WorkLog from './pages/WorkLog'
import Billing from './pages/Billing'
import DataUploads from './pages/DataUploads'
import Products from './pages/Products'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="/attendance" element={
            <PrivateRoute roles={['admin','manager','staff']}><Attendance /></PrivateRoute>
          } />
          <Route path="/work-log" element={
            <PrivateRoute roles={['admin','manager','staff']}><WorkLog /></PrivateRoute>
          } />
          <Route path="/billing" element={
            <PrivateRoute><Billing /></PrivateRoute>
          } />
          <Route path="/data-uploads" element={
            <PrivateRoute roles={['admin','manager']}><DataUploads /></PrivateRoute>
          } />
          <Route path="/products" element={
            <PrivateRoute><Products /></PrivateRoute>
          } />
          <Route path="/notifications" element={
            <PrivateRoute><Notifications /></PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute><Settings /></PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
