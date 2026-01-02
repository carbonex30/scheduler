import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Departments } from './pages/Departments'
import { Employees } from './pages/Employees'
import { ShiftTemplates } from './pages/ShiftTemplates'
import { Schedules } from './pages/Schedules'
import { ScheduleDetail } from './pages/ScheduleDetail'
import { Import } from './pages/Import'
import { MLTraining } from './pages/MLTraining'
import { Settings } from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="departments" element={<Departments />} />
            <Route path="employees" element={<Employees />} />
            <Route path="shift-templates" element={<ShiftTemplates />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="schedules/:scheduleId" element={<ScheduleDetail />} />
            <Route path="import" element={<Import />} />
            <Route path="ml-training" element={<MLTraining />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
