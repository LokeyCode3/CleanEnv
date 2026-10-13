import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  MapPin, X, Camera, CheckCircle2, AlertCircle, ChevronRight,
  ChevronLeft, Star, Loader2, ShieldCheck, ShieldX,
} from 'lucide-react';
import { categoryApi, reportApi } from '@/lib/api';
import { IssueCategory } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type Step = 1 | 2 | 3 | 4 | 5;

// Status of each uploaded image after AI validation
type ImageValidationStatus = 'pending' | 'checking' | 'valid' | 'invalid';

interface ImageFile {
  file: File;
  preview: string;
  status: ImageValidationStatus;
  score: number;
  reason: string;
}

interface FormData {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categorySlug: string;
  images: ImageFile[];
  primaryIndex: number;
  lat: number | null;
  lng: number | null;
  address: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark: string;
  title: string;
  description: string;
  severity: string;
}

const initialForm: FormData = {
  categoryId: '', categoryName: '', categoryIcon: '', categorySlug: '',
  images: [], primaryIndex: 0,
  lat: null, lng: null,
  address: '', area: '', city: '', district: '', state: '', pincode: '', landmark: '',
  title: '', description: '', severity: 'medium',
};

const STEPS = ['Category', 'Photos', 'Location', 'Details', 'Review'];

const LocationPicker = ({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}) => {
  const [markerPos, setMarkerPos] = useState<[number, number]>(position);
  useMapEvents({
    click(e) {
      setMarkerPos([e.latlng.lat, e.latlng.lng]);
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={markerPos} />;
};

// ── Per-image validation badge ────────────────────────────────────────────────
const ImageStatusBadge = ({ img }: { img: ImageFile }) => {
  if (img.status === 'checking') {
    return (
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
        <span className="text-white text-xs ml-1 font-medium">Checking…</span>
      </div>
    );
  }
  if (img.status === 'valid') {
    return (
      <div className="absolute bottom-1 left-1 bg-green-500 text-white rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
        <ShieldCheck className="w-3 h-3" />
        <span className="text-xs font-medium">{Math.round(img.score * 100)}%</span>
      </div>
    );
  }
  if (img.status === 'invalid') {
    return (
      <div className="absolute inset-0 bg-red-500/30 border-2 border-red-500 rounded-xl flex flex-col items-center justify-center gap-1 p-1">
        <ShieldX className="w-5 h-5 text-red-600" />
        <span className="text-red-700 text-xs font-semibold text-center leading-tight">
          Not relevant
        </span>
      </div>
    );
  }
  return null;
};

export const ReportNewPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const { data: categories } = useQuery('categories', () => categoryApi.getAll(), {
    select: (d) => d.data.data.categories as IssueCategory[],
  });

  // ── Validate a single image against the AI service ────────────────────────
  const validateImage = async (index: number, file: File, categoryId: string, categorySlug: string) => {
    // Skip video files
    if (!file.type.startsWith('image/')) {
      setForm((f) => {
        const images = [...f.images];
        images[index] = { ...images[index], status: 'valid', score: 1, reason: 'Video accepted' };
        return { ...f, images };
      });
      return;
    }

    setForm((f) => {
      const images = [...f.images];
      images[index] = { ...images[index], status: 'checking' };
      return { ...f, images };
    });

    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('categoryId', categoryId);
      fd.append('description', categorySlug); // use category slug as description hint at upload time

      const { data } = await reportApi.validateImage(fd);

      setForm((f) => {
        const images = [...f.images];
        images[index] = {
          ...images[index],
          status: data.valid ? 'valid' : 'invalid',
          score: data.score ?? 0,
          reason: data.reason ?? '',
        };
        return { ...f, images };
      });

      if (!data.valid) {
        toast.error(`Photo ${index + 1}: ${data.reason}`, { duration: 5000 });
      }
    } catch {
      // Fail open — mark as valid if service is unreachable
      setForm((f) => {
        const images = [...f.images];
        images[index] = { ...images[index], status: 'valid', score: 0, reason: 'Skipped' };
        return { ...f, images };
      });
    }
  };

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const onDrop = useCallback(
    (accepted: File[]) => {
      setForm((f) => {
        const existing = f.images;
        const toAdd = accepted.slice(0, 6 - existing.length);
        const newImages: ImageFile[] = toAdd.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
          status: 'pending' as ImageValidationStatus,
          score: 0,
          reason: '',
        }));
        const startIndex = existing.length;
        const updated = { ...f, images: [...existing, ...newImages] };

        // Kick off validation for each new image
        setTimeout(() => {
          newImages.forEach((img, i) => {
            validateImage(startIndex + i, img.file, f.categoryId, f.categorySlug);
          });
        }, 0);

        return updated;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.categoryId, form.categorySlug]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/mp4': [] },
    maxFiles: 6,
    maxSize: 100 * 1024 * 1024,
  });

  const removeImage = (idx: number) => {
    setForm((f) => {
      const images = f.images.filter((_, i) => i !== idx);
      return { ...f, images, primaryIndex: Math.min(f.primaryIndex, Math.max(0, images.length - 1)) };
    });
  };

  // ── GPS ───────────────────────────────────────────────────────────────────
  const getLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setForm((f) => ({ ...f, lat, lng }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
          );
          const data = await res.json();
          const addr = data.address || {};
          setForm((f) => ({
            ...f, lat, lng,
            address: data.display_name?.slice(0, 200) || '',
            area: addr.suburb || addr.neighbourhood || addr.residential || '',
            city: addr.city || addr.town || addr.village || '',
            district: addr.county || addr.state_district || '',
            state: addr.state || '',
            pincode: addr.postcode || '',
          }));
        } catch { /* GPS only */ }
        setIsLocating(false);
      },
      () => { toast.error('Could not get location. Please select manually.'); setIsLocating(false); }
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    // Guard: reject if any image is still invalid
    const invalidImages = form.images.filter((img) => img.status === 'invalid');
    if (invalidImages.length > 0) {
      toast.error(`Please remove the ${invalidImages.length} rejected photo(s) before submitting.`);
      setStep(2);
      return;
    }

    // Guard: reject if any image is still being checked
    const checkingImages = form.images.filter((img) => img.status === 'checking');
    if (checkingImages.length > 0) {
      toast.error('Please wait for all photos to finish validating.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('categoryId', form.categoryId);
      fd.append('title', form.title || form.categoryName);
      fd.append('description', form.description);
      fd.append('severity', form.severity);
      fd.append('primaryImageIndex', String(form.primaryIndex));
      fd.append('location', JSON.stringify({
        type: 'Point',
        coordinates: [form.lng, form.lat],
        address: form.address,
        area: form.area,
        city: form.city || 'Unknown',
        district: form.district || 'Unknown',
        state: form.state || 'Unknown',
        pincode: form.pincode,
        landmark: form.landmark,
      }));
      form.images.forEach((img) => fd.append('attachments', img.file));

      const { data } = await reportApi.create(fd);
      setSubmittedId(data.data.report.reportId);
      toast.success('Report submitted successfully!');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || 'Submission failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (submittedId) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      >
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted!</h2>
        <p className="text-gray-600 mb-2">Your complaint ID is</p>
        <div className="bg-primary-50 text-primary-700 font-mono font-bold text-xl px-6 py-3 rounded-xl mb-6">
          {submittedId}
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Our team will review your report and take action shortly. You'll be notified of updates.
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/citizen/my-reports')}>
            My Reports
          </Button>
          <Button className="flex-1" onClick={() => navigate(`/citizen/report/${submittedId}`)}>
            View Report
          </Button>
        </div>
      </motion.div>
    );
  }

  const hasInvalidImages = form.images.some((img) => img.status === 'invalid');
  const hasCheckingImages = form.images.some((img) => img.status === 'checking');

  const canNext = () => {
    if (step === 1) return !!form.categoryId;
    if (step === 2) return !hasInvalidImages && !hasCheckingImages; // block if any image invalid/checking
    if (step === 3) return form.lat !== null && form.lng !== null;
    if (step === 4) return form.description.length >= 10;
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <button onClick={() => setStep((s) => (s - 1) as Step)} className="text-gray-500 hover:text-gray-700 p-2 -ml-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900">Report an Issue</h1>
          <p className="text-xs text-gray-500">Step {step} of 5: {STEPS[step - 1]}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn('h-1.5 flex-1 rounded-full transition-colors', i < step ? 'bg-primary-600' : 'bg-gray-200')}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >

          {/* ── Step 1: Category ──────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <h2 className="font-medium text-gray-900">What type of issue is this?</h2>
              <div className="grid grid-cols-2 gap-2">
                {categories?.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => setForm((f) => ({
                      ...f,
                      categoryId: cat._id,
                      categoryName: cat.name,
                      categoryIcon: cat.icon,
                      categorySlug: cat.slug,
                    }))}
                    className={cn(
                      'flex items-center gap-2 p-2 sm:p-4 rounded-xl border-2 text-left transition-all',
                      form.categoryId === cat._id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    )}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-800 leading-tight">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Photos + AI validation ───────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-medium text-gray-900">Upload evidence photos</h2>
              <p className="text-sm text-gray-500">
                Each photo is automatically checked to ensure it matches the selected issue type.
                Photos that don't match will be highlighted in red — please remove and replace them.
              </p>

              {/* Validation legend */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Accepted</span>
                <span className="flex items-center gap-1"><ShieldX className="w-3.5 h-3.5 text-red-500" /> Not relevant — remove</span>
                <span className="flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 text-blue-500" /> Checking</span>
              </div>

              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors min-h-[120px] flex flex-col items-center justify-center',
                  isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
                )}
              >
                <input {...getInputProps()} capture="environment" />
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Take Photo or Upload</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP • Max 10MB per image</p>
              </div>

              {form.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {form.images.map((img, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'relative group rounded-xl overflow-hidden aspect-square bg-gray-100',
                        img.status === 'invalid' && 'ring-2 ring-red-500'
                      )}
                    >
                      <img src={img.preview} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />

                      {/* AI validation overlay */}
                      <ImageStatusBadge img={img} />

                      {/* Remove button */}
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      {/* Primary star (only for valid images) */}
                      {img.status === 'valid' && (
                        <button
                          onClick={() => setForm((f) => ({ ...f, primaryIndex: idx }))}
                          className={cn(
                            'absolute bottom-1 right-1 rounded-full p-0.5 transition-colors z-10',
                            form.primaryIndex === idx ? 'text-yellow-400' : 'text-white/70 hover:text-yellow-400'
                          )}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Invalid image warning banner */}
              {hasInvalidImages && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3"
                >
                  <ShieldX className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      {form.images.filter((i) => i.status === 'invalid').length} photo(s) rejected
                    </p>
                    <p className="text-xs text-red-700 mt-0.5">
                      These photos don't appear to show a <strong>{form.categoryName}</strong> issue.
                      Please remove them and upload relevant photos to continue.
                    </p>
                  </div>
                </motion.div>
              )}

              {hasCheckingImages && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying photos…
                </div>
              )}

              {form.images.length > 0 && !hasInvalidImages && !hasCheckingImages && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <ShieldCheck className="w-4 h-4" />
                  All photos verified — you can continue.
                </div>
              )}

              {form.images.length > 0 && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  Tap the star on a valid photo to set it as the primary image
                </p>
              )}
            </div>
          )}

          {/* ── Step 3: Location ──────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-medium text-gray-900">Where is the issue located?</h2>
              <Button onClick={getLocation} isLoading={isLocating} variant="outline" className="w-full">
                <MapPin className="w-4 h-4" />
                {isLocating ? 'Getting location…' : 'Use My Current Location'}
              </Button>

              {form.lat && form.lng && (
                <>
                  <div className="rounded-xl overflow-hidden border border-gray-200 h-[220px] w-full">
                    <MapContainer
                      center={[form.lat, form.lng]}
                      zoom={16}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                      <LocationPicker position={[form.lat, form.lng]} onPositionChange={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))} />
                    </MapContainer>
                  </div>
                  <p className="text-xs text-gray-500">Tap the map to adjust the pin location</p>
                  <div className="space-y-3">
                    <Input label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Area / Locality" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
                      <Input label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="District" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} />
                      <Input label="Pincode" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} />
                    </div>
                    <Input label="Landmark (optional)" value={form.landmark} onChange={(e) => setForm((f) => ({ ...f, landmark: e.target.value }))} placeholder="Near bus stop, school, temple…" />
                  </div>
                </>
              )}

              {!form.lat && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">Please tap "Use My Current Location" or allow location access to continue.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Details ───────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-medium text-gray-900">Describe the issue</h2>
              <Textarea
                label="Description *"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the problem in detail. When did it start? What danger does it pose?"
                rows={5}
              />
              <Select
                label="Severity"
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                options={[
                  { value: 'low', label: '🟢 Low — Minor inconvenience' },
                  { value: 'medium', label: '🟡 Medium — Causes problems' },
                  { value: 'high', label: '🟠 High — Danger to public' },
                  { value: 'critical', label: '🔴 Critical — Immediate hazard' },
                ]}
              />
              <Input
                label="Custom Title (optional)"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={`Auto: ${form.categoryName}`}
              />
            </div>
          )}

          {/* ── Step 5: Review ────────────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-medium text-gray-900">Review your report</h2>

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                <div className="p-4 flex gap-3">
                  <span className="text-2xl">{form.categoryIcon}</span>
                  <div>
                    <div className="text-xs text-gray-500">Category</div>
                    <div className="text-sm font-medium">{form.categoryName}</div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Description</div>
                  <div className="text-sm text-gray-800">{form.description}</div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Severity</div>
                  <div className="text-sm font-medium capitalize">{form.severity}</div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Location</div>
                  <div className="text-sm">{form.address || `${form.lat?.toFixed(5)}, ${form.lng?.toFixed(5)}`}</div>
                </div>
                {form.images.length > 0 && (
                  <div className="p-4">
                    <div className="text-xs text-gray-500 mb-2">
                      Photos ({form.images.filter((i) => i.status === 'valid').length} verified)
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {form.images.slice(0, 3).map((img, i) => (
                        <div key={i} className="relative">
                          <img src={img.preview} alt="" className="w-16 h-16 rounded-lg object-cover" />
                          {img.status === 'valid' && (
                            <ShieldCheck className="absolute -bottom-1 -right-1 w-4 h-4 text-green-500 bg-white rounded-full" />
                          )}
                        </div>
                      ))}
                      {form.images.length > 3 && (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                          +{form.images.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={submit} isLoading={isSubmitting} size="lg" className="w-full">
                Submit Report
              </Button>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      {step < 5 && (
        <Button
          onClick={() => setStep((s) => (s + 1) as Step)}
          disabled={!canNext()}
          size="lg"
          className="w-full"
        >
          {step === 2 && hasInvalidImages
            ? 'Remove rejected photos to continue'
            : step === 2 && hasCheckingImages
            ? 'Verifying photos…'
            : 'Continue'}
          {!hasInvalidImages && !hasCheckingImages && <ChevronRight className="w-4 h-4" />}
        </Button>
      )}
    </div>
  );
};
