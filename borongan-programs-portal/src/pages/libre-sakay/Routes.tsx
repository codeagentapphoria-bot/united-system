import { FiArrowLeft, FiMap } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useRoutes } from '@/hooks/useRoutes';
import { RouteCard } from '@/components/libre-sakay/RouteCard';
import { Card, CardContent } from '@/components/ui/card';

export function Routes() {
  const navigate = useNavigate();
  const { data: routes = [], isLoading } = useRoutes();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/libre-sakay')}
            className="text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Back"
          >
            <FiArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/da-logo.png" alt="DA" className="h-7 w-auto" />
            <span className="font-semibold text-heading-700">Libre Sakay</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <FiMap size={14} />
              {isLoading ? 'Loading…' : `${routes.length} route${routes.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-heading-800">Bus Routes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse all available routes and their stops
          </p>
        </div>

        {/* Route list */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : routes.length === 0 ? (
          <Card className="border border-dashed border-gray-200">
            <CardContent className="py-10 text-center">
              <p className="text-gray-400 text-sm">No routes available at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {routes.map(route => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
