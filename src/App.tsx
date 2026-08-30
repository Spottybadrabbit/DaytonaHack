import { Route, Routes } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { AgentDetail } from '@/pages/AgentDetail'
import { Dashboard } from '@/pages/Dashboard'
import { FieldLab } from '@/pages/FieldLab'
import { Landing } from '@/pages/Landing'
import { Marketplace } from '@/pages/Marketplace'
import { NotFound } from '@/pages/NotFound'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/field-lab" element={<FieldLab />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  )
}
