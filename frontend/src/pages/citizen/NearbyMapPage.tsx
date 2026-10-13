import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reportApi, categoryApi } from '@/lib/api';
import { Report, IssueCategory } from '@/types';
import { StatusBadge, SeverityBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';

// Fix leaflet icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const severityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export const NearbyMapPage = () => {
  const navigate = useNavigate();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => setUserPos([13.0827, 80.2707]) // Default: Chennai
    );
  }, []);

  const { data: categories } = useQuery('categories', () => categoryApi.getAll(), {
    select: (d) => d.data.data.categories as IssueCategory[],
  });

  const { data: reports } = useQuery(
    ['nearby', userPos, categoryFilter, statusFilter],
    () =>
      reportApi.getNearby({
        lat: userPos![0],
        lng: userPos![1],
        radius: 5000,
        ...(categoryFilter && { category: categoryFilter }),
        ...(statusFilter && { status: statusFilter }),
      }),
    {
      enabled: !!userPos,
      select: (d) => d.data.data.reports as Report[],
    }
  );

  const catOptions = [
    { value: '', label: 'All Categories' },
    ...(categories?.map((c) => ({ value: c._id, label: `${c.icon} ${c.name}` })) || []),
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'verified', label: 'Verified' },
    { value: 'work_in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ];

  const makeIcon = (severity: string) =>
    L.divIcon({
      className: '',
      html: `<div style="background:${severityColors[severity] || '#6b7280'};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

  return (
    <div className="space-y-3">
      <h1 className="font-bold text-xl text-gray-900">Nearby Issues</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select options={catOptions} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs py-1.5 w-full sm:w-auto" />
        <Select options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs py-1.5 w-full sm:w-auto" />
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-xs text-gray-600">
        {Object.entries(severityColors).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: c }} />
            <span className="capitalize">{s}</span>
          </span>
        ))}
      </div>

      {/* Map */}
      {userPos ? (
        <div className="rounded-xl overflow-hidden border border-gray-200 h-[420px] max-h-[calc(100vh-16rem)] w-full">
          <MapContainer center={userPos} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

            {/* User location */}
            <Circle center={userPos} radius={100} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }} />

            {reports?.map((r) => {
              const [lng, lat] = r.location.coordinates;
              const cat = typeof r.categoryId !== 'string' ? r.categoryId : null;
              return (
                <Marker key={r._id} position={[lat, lng]} icon={makeIcon(r.severity)}>
                  <Popup>
                    <div className="text-sm min-w-[180px]">
                      <div className="font-semibold mb-1">{cat?.icon} {r.title}</div>
                      <div className="text-xs text-gray-500 mb-2">{r.reportId}</div>
                      <div className="flex gap-1 flex-wrap mb-2">
                        <StatusBadge status={r.status} />
                        <SeverityBadge severity={r.severity} />
                      </div>
                      <button
                        onClick={() => navigate(`/citizen/report/${r.reportId}`)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View details →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      ) : (
        <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 text-sm">
          <MapPin className="w-5 h-5 mr-2" /> Getting your location…
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        {reports?.length ?? 0} issues found within 5 km · Tap a pin to view details
      </p>
    </div>
  );
};
