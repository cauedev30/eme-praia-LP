import HeroBanner from '@/components/HeroBanner'
import CategoryGrid from '@/components/CategoryGrid'
import FeatureBanner from '@/components/FeatureBanner'
import ProductFeed from '@/components/ProductFeed'

export default function HomePage() {
  return (
    <main>
      <HeroBanner />
      <CategoryGrid />
      <FeatureBanner />
      <ProductFeed />
    </main>
  )
}
