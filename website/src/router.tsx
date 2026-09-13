import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import PageLayout from './layouts/PageLayout'
import PricingPage from './pages/PricingPage'
import ComparePage from './pages/ComparePage'
import AboutPage from './pages/AboutPage'
import FeaturesPage from './pages/FeaturesPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    element: <PageLayout />,
    children: [
      { path: '/pricing', element: <PricingPage /> },
      { path: '/compare', element: <ComparePage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/features', element: <FeaturesPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
    ],
  },
])
