import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AuthProvider from './components/AuthProvider'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import ClusterDetail from './pages/ClusterDetail'
import Dashboard from './pages/Dashboard'
import EmergingIssues from './pages/EmergingIssues'
import Login from './pages/Login'
import ProfilePage from './pages/ProfilePage'
import ReportIssue from './pages/ReportIssue'
import RequestDetail from './pages/RequestDetail'
import RequestList from './pages/RequestList'
import Users from './pages/Users'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="login" element={<Login />} />

            {/* Any signed-in user. Students only ever see their own requests. */}
            <Route index element={<RequireAuth><ReportIssue /></RequireAuth>} />
            <Route path="requests" element={<RequireAuth><RequestList /></RequireAuth>} />
            <Route path="requests/:id" element={<RequireAuth><RequestDetail /></RequireAuth>} />
            <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

            {/* Staff and admins */}
            <Route path="dashboard" element={<RequireAuth role="staff"><Dashboard /></RequireAuth>} />
            <Route path="issues" element={<RequireAuth role="staff"><EmergingIssues /></RequireAuth>} />
            <Route path="issues/:id" element={<RequireAuth role="staff"><ClusterDetail /></RequireAuth>} />

            {/* Admins */}
            <Route path="users" element={<RequireAuth role="admin"><Users /></RequireAuth>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
