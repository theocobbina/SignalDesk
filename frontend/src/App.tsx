import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ReportIssue from './pages/ReportIssue'
import RequestDetail from './pages/RequestDetail'
import RequestList from './pages/RequestList'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ReportIssue />} />
          <Route path="requests" element={<RequestList />} />
          <Route path="requests/:id" element={<RequestDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
