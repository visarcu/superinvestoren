'use client'

import { useRouter } from 'next/navigation'
import NotificationSettings from '@/components/NotificationSettings'

export default function NotificationsPage() {
  const router = useRouter()

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-theme-primary mb-2">
            Benachrichtigungen
          </h1>
          <p className="text-theme-secondary">
            Verwalte deine E-Mail-Benachrichtigungen und Alerts
          </p>
        </div>
        
        <NotificationSettings />
      </div>
    </div>
  )
}