import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FiMapPin, FiArrowRight } from 'react-icons/fi';
import type { RouteWithStops } from '@/hooks/useRoutes';

interface RouteCardProps {
  route: RouteWithStops;
}

export function RouteCard({ route }: RouteCardProps) {
  const navigate = useNavigate();
  const stopCount = route.stops.length;

  return (
    <Card
      className="border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all cursor-pointer"
      onClick={() => navigate(`/libre-sakay/routes/${route.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-1 w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
              <FiMapPin className="w-4 h-4 text-primary-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-heading-700">{route.name}</p>
                <Badge variant="outline" className="text-xs border-primary-100 text-primary-600 bg-primary-50">
                  {stopCount} stop{stopCount !== 1 ? 's' : ''}
                </Badge>
              </div>

              {route.description && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{route.description}</p>
              )}

              {route.stops.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {route.stops.slice(0, 3).map(stop => (
                    <span key={stop.id} className="text-xs text-gray-400">
                      {stop.name}
                    </span>
                  ))}
                  {route.stops.length > 3 && (
                    <span className="text-xs text-gray-400">+{route.stops.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <FiArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}
