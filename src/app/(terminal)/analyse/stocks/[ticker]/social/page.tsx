// app/(terminal)/analyse/stocks/[ticker]/social/page.tsx
import SocialPulse from '@/components/SocialPulse'

export default function SocialPage({ params }: { params: { ticker: string } }) {
  return <SocialPulse ticker={params.ticker.toUpperCase()} />
}