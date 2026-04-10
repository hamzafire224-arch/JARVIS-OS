import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import PageLayout from './layouts/PageLayout'
import PricingPage from './pages/PricingPage'
import ComparePage from './pages/ComparePage'
import AboutPage from './pages/AboutPage'
import FeaturesPage from './pages/FeaturesPage'

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
    ],
  },
])
