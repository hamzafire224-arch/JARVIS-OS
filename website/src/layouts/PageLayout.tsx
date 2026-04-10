import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from '../sections/Header'
import Footer from '../sections/Footer'

export default function PageLayout() {
  const { pathname } = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app-root scroll-active">
      <Header />
      <main style={{ paddingTop: '4rem' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
