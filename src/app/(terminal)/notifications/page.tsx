// Redirect from old /notifications to new /inbox
import { redirect } from 'next/navigation'

export default function NotificationsPage() {
  redirect('/inbox')
}
