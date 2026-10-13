import { useState } from 'react';
import { useQuery } from 'react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { adminApi, categoryApi } from '@/lib/api';
import { Report, IssueCategory } from '@/types';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatusBadge, SeverityBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SEV_COLORS: Record<string, string> = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' };

const makeIcon = (severity: string) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${SEV_COLORS[severity]};width:16px;height:16px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

export const AdminMapPage = () => {
  const [filters, setFilters] = useState({ status: '', severity: '', categoryId: '' });

  const { data: categories } = useQuery('categories', () => categoryApi.getAll(), {
    select: (d) => d.data.data.categories as IssueCategory[],
  });

  const { data: reports } = useQuery(
    ['admin-map', filters],
    () => adminApi.listReports({ ...filters, limit: 500 }),
    { select: (d) => d.data.data.reports as Report[] }
  );

  const catOptions = [{ value: '', label: 'All Categories' }, ...(categories?.map((c) => ({ value: c._id, label: `${c.icon} ${c.name}` })) || [])];

  return (
    <AdminLayout title="Map View">
      <div className="flex flex-wrap gap-3 mb-4">
        <Select options={[{ value: '', label: 'All Statuses' }, { value: 'submitted', label: 'Submitted' }, { value: 'verified', label: 'Verified' }, { value: 'assigned', label: 'Assigned' }, { value: 'work_in_progress', label: 'In Progress' }]} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="w-40 text-sm" />
        <Select options={[{ value: '', label: 'All Severities' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} value={filters.severity} onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))} className="w-36 text-sm" />
        <Select options={catOptions} value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))} className="w-44 text-sm" />
      </div>

      <div className="flex gap-3 mb-3 text-xs text-gray-600 flex-wrap">
        {Object.entries(SEV_COLORS).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: c }} />
            <span className="capitalize">{s}</span>
          </span>
        ))}
        <span className="text-gray-400 ml-2">{reports?.length ?? 0} reports shown</span>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 min-h-[400px]" style={{ height: 'calc(100dvh - 260px)' }}>
        <MapContainer center={[13.0827, 80.2707]} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          {reports?.map((r) => {
            const [lng, lat] = r.location?.coordinates || [0, 0];
            if (!lat || !lng) return null;
            const cat = typeof r.categoryId !== 'string' ? r.categoryId : null;
            return (
              <Marker key={r._id} position={[lat, lng]} icon={makeIcon(r.severity)}>
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <p className="font-semibold mb-1">{cat?.icon} {r.title}</p>
                    <p className="text-xs text-gray-500 font-mono mb-2">{r.reportId}</p>
                    <div className="flex gap-1 flex-wrap mb-2">
                      <StatusBadge status={r.status} />
                      <SeverityBadge severity={r.severity} />
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{r.location?.address}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </AdminLayout>
  );
};
