import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Package, Boxes, Calendar, Flag, Bike, Truck, User, UserCheck, Contact, Phone,
  MapPin, MapPinned, Zap, Banknote, ImagePlus, StickyNote, Hash, PenLine,
  AlertTriangle, AlertCircle, CheckCircle2, ClipboardList, Send, PackageSearch,
  Info,
} from 'lucide-react';
import api from '../../services/api';
import { calculateDeliveryCost } from '../../utils/pricing';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { CreateShipmentInput, PackageType, ShipmentPriority, ShipmentSpeed, VehicleType } from '../../types/models';
import CustomSelect from '../../components/Form/CustomSelect';
import FileUpload from '../../components/Form/FileUpload';
import DatePicker from '../../components/Form/DatePicker';

const PRIORITY_OPTIONS = [
  { value: 'Standard', label: 'Standard' },
  { value: 'High', label: 'High' },
];

const PICKUP_REGION_OPTIONS = [
  { value: 'Kumasi', label: 'Kumasi' },
];

const REGION_OPTIONS = [
  { value: 'Kumasi', label: 'Kumasi' },
  { value: 'Accra', label: 'Accra' },
  { value: 'Takoradi', label: 'Takoradi' },
  { value: 'Sunyani', label: 'Sunyani' },
  { value: 'Tamale', label: 'Tamale' },
];

const KUMASI_SUB_AREA_OPTIONS = [
  { value: 'CampusAndEnvirons', label: 'KNUST Campus, Ayeduase, Ayigya, Bomso, Kotei' },
  { value: 'Other', label: 'Other Kumasi Areas' },
];

const SPEED_OPTIONS = [
  { value: 'Same day', label: 'Same day' },
  { value: 'Next day', label: 'Next day' },
  { value: 'Express', label: 'Express' },
];

const PACKAGE_TYPE_OPTIONS = [
  { value: 'food', label: 'Food' },
  { value: 'parcel', label: 'Parcel' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fragile', label: 'Fragile items (cake, glass, ice, etc.)' },
  { value: 'other', label: 'Other' },
];

const PACKAGE_TYPE_OPTIONS_BULK = [
  { value: 'food', label: 'Food' },
  { value: 'parcel', label: 'Parcel' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fragile', label: 'Fragile items' },
  { value: 'other', label: 'Other' },
];

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return err instanceof Error ? err.message : fallback;
}

function mapPriority(value: string): ShipmentPriority {
  return value.toLowerCase() === 'high' ? 'high' : 'standard';
}

function mapSpeed(value: string): ShipmentSpeed {
  switch (value) {
    case 'Same day': return 'same_day';
    case 'Express': return 'express';
    case 'Next day':
    default:
      return 'next_day';
  }
}

export default function RequestPickupPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  // Shared Sender State
  const [pickupDate, setPickupDate] = useState('');
  const [pickupMode, setPickupMode] = useState('motorbike');
  const [deliveryPriority, setDeliveryPriority] = useState('Standard');
  const [senderContact, setSenderContact] = useState('');
  const [senderName, setSenderName] = useState(user?.name ?? '');
  const [senderNumber, setSenderNumber] = useState(user?.phone ?? '');
  const [pickupRegion, setPickupRegion] = useState('Kumasi');
  const [pickupLocation, setPickupLocation] = useState('');

  // Single Delivery State
  const [receiverName, setReceiverName] = useState('');
  const [receiverNumber, setReceiverNumber] = useState('');
  const [dropoffRegion, setDropoffRegion] = useState('Kumasi');
  const [dropoffKumasiSubArea, setDropoffKumasiSubArea] = useState<'CampusAndEnvirons' | 'Other'>('Other');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [deliverySpeed, setDeliverySpeed] = useState('');
  const [packageType, setPackageType] = useState('');
  const [productFee, setProductFee] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Bulk Delivery State
  const [numberOfPackages, setNumberOfPackages] = useState<number | ''>('');
  const [bulkReceiverMode, setBulkReceiverMode] = useState<'upload' | 'manual' | null>(null);
  const [bulkImagePreviews, setBulkImagePreviews] = useState<string[]>([]);
  const [bulkReceivers, setBulkReceivers] = useState<Array<{ name: string, number: string, dropoffLocation: string, region: string, speed: string, priority: string }>>([]);

  // Form Completion Checks
  const isSingleComplete = Boolean(
    senderName.trim() &&
    senderNumber.trim() &&
    pickupRegion.trim() &&
    pickupLocation.trim() &&
    receiverName.trim() &&
    receiverNumber.trim() &&
    dropoffRegion.trim() &&
    dropoffLocation.trim() &&
    deliverySpeed.trim() &&
    packageType.trim()
  );

  const isBulkComplete = Boolean(
    senderName.trim() &&
    senderNumber.trim() &&
    pickupRegion.trim() &&
    pickupLocation.trim() &&
    deliverySpeed.trim() &&
    packageType.trim() &&
    typeof numberOfPackages === 'number' &&
    numberOfPackages > 0 &&
    (
      (bulkReceiverMode === 'manual' && bulkReceivers.length === numberOfPackages && bulkReceivers.every(r => r.name.trim() && r.number.trim() && r.dropoffLocation.trim() && r.region.trim())) ||
      (bulkReceiverMode === 'upload' && bulkImagePreviews.length > 0)
    )
  );

  const isFormComplete = activeTab === 'single' ? isSingleComplete : isBulkComplete;

  // Calculated Cost (Starts at 0.00 until all required fields are filled)
  const estimatedCost = useMemo(() => {
    if (!isFormComplete) return 0;

    if (activeTab === 'single') {
      const cost = calculateDeliveryCost({
        region: dropoffRegion,
        kumasiSubArea: dropoffRegion === 'Kumasi' ? dropoffKumasiSubArea : undefined
      });
      return cost ?? 0;
    } else {
      if (bulkReceiverMode === 'manual') {
        return bulkReceivers.reduce((total, rec) => {
          const cost = calculateDeliveryCost({ region: rec.region });
          return total + (cost ?? 35);
        }, 0);
      } else {
        const count = typeof numberOfPackages === 'number' ? numberOfPackages : 0;
        return count * 35;
      }
    }
  }, [isFormComplete, activeTab, dropoffRegion, dropoffKumasiSubArea, bulkReceiverMode, bulkReceivers, numberOfPackages]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleBulkReceiverChange = (index: number, field: string, value: string) => {
    const newReceivers = [...bulkReceivers];
    newReceivers[index] = { ...newReceivers[index], [field]: value };
    setBulkReceivers(newReceivers);
  };

  const handleNumPackagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    if (valStr === '') {
      setNumberOfPackages('');
      setBulkReceivers([]);
      return;
    }

    const val = parseInt(valStr);
    if (isNaN(val) || val < 1) {
      setNumberOfPackages('');
      setBulkReceivers([]);
      return;
    }

    setNumberOfPackages(val);

    // Adjust array size
    if (val > bulkReceivers.length) {
      const added = Array.from({ length: val - bulkReceivers.length }, () => ({
        name: '', number: '', dropoffLocation: '', region: 'Kumasi', speed: 'Next day', priority: 'Standard'
      }));
      setBulkReceivers([...bulkReceivers, ...added]);
    } else if (val < bulkReceivers.length) {
      setBulkReceivers(bulkReceivers.slice(0, val));
    }
  };

  const handleSubmitSingle = async () => {
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);
    try {
      let uploadedImageUrl: string | undefined;
      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append('photo', imageFile);
          const { data } = await api.post<{ url: string }>('/uploads', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          uploadedImageUrl = data.url;
        } catch {
          uploadedImageUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageFile);
          });
        }
      }

      const payload: CreateShipmentInput = {
        vehicleType: pickupMode as VehicleType,
        priority: mapPriority(deliveryPriority),
        speed: mapSpeed(deliverySpeed),
        packageType: packageType as PackageType,
        senderName,
        senderNumber,
        pickupRegion,
        pickupLocation,
        receiverName,
        receiverNumber,
        dropoffRegion,
        dropoffLocation,
      };
      if (senderContact.trim()) payload.senderContact = senderContact;
      if (pickupDate.trim()) payload.pickupDate = pickupDate;
      if (dropoffRegion === 'Kumasi') payload.dropoffKumasiSubArea = dropoffKumasiSubArea;
      if (productFee.trim() !== '') payload.productFee = Number(productFee);
      if (additionalInstructions.trim()) payload.additionalInstructions = additionalInstructions;
      if (uploadedImageUrl) payload.packageImageUrl = uploadedImageUrl;

      await api.post('/shipments', payload);
      setSubmitSuccess(true);
      toast.success('Pickup request submitted.');
      setTimeout(() => navigate('/shipments'), 600);
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to create shipment. Please try again.');
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBulk = async () => {
    setSubmitError(null);
    setSubmitSuccess(false);

    if (bulkReceiverMode !== 'manual') {
      const message = 'Photo-based bulk entry isn\'t supported yet. Please switch to "Enter Manually" to submit this order.';
      setSubmitError(message);
      toast.error(message);
      return;
    }
    if (bulkReceivers.length === 0) {
      const message = 'Please enter the number of packages and fill in receiver details.';
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setIsSubmitting(true);
    try {
      const pickup: {
        vehicleType: VehicleType;
        packageType: PackageType;
        senderName: string;
        senderNumber: string;
        senderContact?: string;
        pickupRegion: string;
        pickupLocation: string;
        pickupDate?: string;
        productFee?: number;
        additionalInstructions?: string;
      } = {
        vehicleType: pickupMode as VehicleType,
        packageType: packageType as PackageType,
        senderName,
        senderNumber,
        pickupRegion,
        pickupLocation,
      };
      if (senderContact.trim()) pickup.senderContact = senderContact;
      if (pickupDate.trim()) pickup.pickupDate = pickupDate;
      if (productFee.trim() !== '') pickup.productFee = Number(productFee);
      if (additionalInstructions.trim()) pickup.additionalInstructions = additionalInstructions;

      const receivers = bulkReceivers.map(rec => ({
        receiverName: rec.name,
        receiverNumber: rec.number,
        dropoffRegion: rec.region,
        dropoffLocation: rec.dropoffLocation,
        speed: mapSpeed(rec.speed),
        priority: mapPriority(rec.priority),
      }));

      await api.post('/shipments/bulk', { pickup, receivers });
      setSubmitSuccess(true);
      toast.success('Bulk pickup request submitted.');
      setTimeout(() => navigate('/shipments'), 600);
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to create bulk shipment. Please try again.');
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrder = () => {
    if (activeTab === 'single') {
      handleSubmitSingle();
    } else {
      handleSubmitBulk();
    }
  };

  return (
    <div className="page-shell light-shell">
      <style>{`
        .rp-header-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--green);
          color: #0b1210;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .rp-tabs-row {
          display: flex;
          gap: 8px;
          background: var(--success-bg);
          padding: 8px;
          border-radius: 100px;
          width: fit-content;
          max-width: 100%;
          overflow-x: auto;
        }
        .rp-tab-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 28px;
          min-height: 44px;
          border: none;
          border-radius: 100px;
          cursor: pointer;
          font-size: 1.05rem;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .rp-tab-btn-sm { padding: 10px 20px; min-height: 40px; font-size: 0.95rem; }
        .rp-mode-btn {
          flex: 1;
          padding: 12px;
          min-height: 44px;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .rp-input-wrap { position: relative; display: flex; align-items: center; }
        .rp-input-wrap > svg { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
        .rp-input-wrap input, .rp-input-wrap select { padding-left: 42px !important; }
        .rp-upload-zone {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          border: 2px dashed var(--green);
          border-radius: 12px;
          background: var(--success-bg);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        @media (max-width: 768px) {
          .rp-summary-card { position: static !important; top: auto !important; }
          .step-layout { gap: 24px; }
          .rp-tab-btn { padding: 10px 18px; font-size: 0.95rem; }
          .rp-header-icon { width: 44px; height: 44px; }
        }
        @media (max-width: 480px) {
          .rp-tabs-row { width: 100%; }
          .rp-tab-btn { flex: 1; padding: 10px; font-size: 0.85rem; gap: 6px; }
          .rp-header-icon { width: 40px; height: 40px; }
          .rp-mode-btn { padding: 10px; font-size: 0.88rem; gap: 6px; }
        }
      `}</style>
      <main className="create-shell container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          <span className="rp-header-icon"><Package size={24} /></span>
          <h1 style={{ margin: 0 }}>Request a Pickup</h1>
        </div>
        <p className="muted-text">Fill in the details below to schedule a delivery.</p>

        {/* TABS */}
        <div className="rp-tabs-row" style={{ marginBottom: '32px' }}>
          <button
            className="rp-tab-btn"
            onClick={() => setActiveTab('single')}
            style={{
              background: activeTab === 'single' ? 'var(--green)' : 'transparent',
              color: activeTab === 'single' ? '#fff' : 'var(--navy)',
              fontWeight: activeTab === 'single' ? 'bold' : '600',
            }}
          >
            <Package size={17} /> Single Delivery
          </button>
          <button
            className="rp-tab-btn"
            onClick={() => setActiveTab('bulk')}
            style={{
              background: activeTab === 'bulk' ? 'var(--green)' : 'transparent',
              color: activeTab === 'bulk' ? '#fff' : 'var(--navy)',
              fontWeight: activeTab === 'bulk' ? 'bold' : '600',
            }}
          >
            <Boxes size={17} /> Bulk Delivery
          </button>
        </div>

        <div className="step-layout">
          <div className="form-card large-card">

            {/* SHARED FIELDS */}
            <h2 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Truck size={22} /> Pickup Details</h2>
            <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
              <label>
                <span>Preferred Pickup Date</span>
                <DatePicker
                  value={pickupDate}
                  onChange={setPickupDate}
                  placeholder="Select Preferred Date"
                  min={new Date().toISOString().slice(0, 10)}
                  icon={<Calendar size={17} />}
                />
              </label>
              <label>
                <span>Delivery Priority</span>
                <CustomSelect value={deliveryPriority} onChange={v => setDeliveryPriority(v)} options={PRIORITY_OPTIONS} icon={<Flag size={17} />} />
                {deliveryPriority === 'High' && (
                  <div style={{ fontSize: '12px', color: '#854d0e', background: '#fef9c3', padding: '6px 10px', borderRadius: '6px', marginTop: '8px', fontWeight: 500, lineHeight: 1.4 }}>
                    Choosing high priority attracts a slight increase in delivery fee for faster arrival.
                  </div>
                )}
              </label>
            </div>

            <div className="field-grid" style={{ marginBottom: '16px' }}>
              <label>
                <span>Pickup Mode</span>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button type="button" className="rp-mode-btn" onClick={() => setPickupMode('motorbike')} style={{ border: `2px solid ${pickupMode === 'motorbike' ? 'var(--green)' : 'var(--border)'}`, background: pickupMode === 'motorbike' ? 'var(--success-bg)' : '#fff' }}>
                    <Bike size={18} /> Motorbike
                  </button>
                  <button type="button" className="rp-mode-btn" onClick={() => setPickupMode('van')} style={{ border: `2px solid ${pickupMode === 'van' ? 'var(--green)' : 'var(--border)'}`, background: pickupMode === 'van' ? 'var(--success-bg)' : '#fff' }}>
                    <Truck size={18} /> Van
                  </button>
                </div>
              </label>
            </div>

            <h2 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><User size={22} /> Sender Information</h2>
            <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
              <label>
                <span>Sender's Name</span>
                <div className="rp-input-wrap">
                  <User size={17} />
                  <input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="John Doe" />
                </div>
              </label>
              <label>
                <span>Sender's Number</span>
                <div className="rp-input-wrap">
                  <Phone size={17} />
                  <input value={senderNumber} onChange={e => setSenderNumber(e.target.value)} placeholder="024XXXXXXX" />
                </div>
              </label>
              <label>
                <span>Pickup Contact (Optional)</span>
                <div className="rp-input-wrap">
                  <Contact size={17} />
                  <input value={senderContact} onChange={e => setSenderContact(e.target.value)} placeholder="Who should we call for pickup?" />
                </div>
              </label>
              <label>
                <span>Region</span>
                <CustomSelect value={pickupRegion} onChange={v => setPickupRegion(v)} options={PICKUP_REGION_OPTIONS} icon={<MapPin size={17} />} />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Pickup Location</span>
                <div className="rp-input-wrap">
                  <MapPinned size={17} />
                  <input value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} placeholder="Specific area or landmark" />
                </div>
              </label>
            </div>

            {/* TAB SPECIFIC FIELDS */}
            {activeTab === 'single' ? (
              <>
                <h2 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><UserCheck size={22} /> Receiver Information</h2>
                <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
                  <label>
                    <span>Receiver's Name</span>
                    <div className="rp-input-wrap">
                      <User size={17} />
                      <input value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Jane Doe" />
                    </div>
                  </label>
                  <label>
                    <span>Receiver's Number</span>
                    <div className="rp-input-wrap">
                      <Phone size={17} />
                      <input value={receiverNumber} onChange={e => setReceiverNumber(e.target.value)} placeholder="024XXXXXXX" />
                    </div>
                  </label>
                  <label>
                    <span>Dropoff Region</span>
                    <CustomSelect value={dropoffRegion} onChange={v => setDropoffRegion(v)} options={REGION_OPTIONS} icon={<MapPin size={17} />} />
                  </label>
                  {dropoffRegion === 'Kumasi' && (
                    <label>
                      <span>Kumasi Area</span>
                      <CustomSelect value={dropoffKumasiSubArea} onChange={v => setDropoffKumasiSubArea(v as 'CampusAndEnvirons' | 'Other')} options={KUMASI_SUB_AREA_OPTIONS} icon={<MapPin size={17} />} />
                    </label>
                  )}
                  <label style={{ gridColumn: '1 / -1' }}>
                    <span>Dropoff Location</span>
                    <div className="rp-input-wrap">
                      <MapPinned size={17} />
                      <input value={dropoffLocation} onChange={e => setDropoffLocation(e.target.value)} placeholder="Specific landmark or street" />
                    </div>
                  </label>
                </div>

                <h2 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><PackageSearch size={22} /> Package Details</h2>
                <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
                  <label>
                    <span>Delivery Speed</span>
                    <CustomSelect value={deliverySpeed} onChange={v => setDeliverySpeed(v)} options={SPEED_OPTIONS} icon={<Zap size={17} />} />
                  </label>
                  <label>
                    <span>Package Type</span>
                    <CustomSelect value={packageType} onChange={v => setPackageType(v)} options={PACKAGE_TYPE_OPTIONS} icon={<Package size={17} />} />
                    {packageType !== 'fragile' && (
                      <div style={{ fontSize: '12px', color: '#991b1b', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px', marginTop: '8px', fontWeight: 500, lineHeight: 1.4 }}>
                        Disclaimer: Please indicate if your package is fragile by selecting the "Fragile" option. Otherwise, you will not be eligible for a refund in case of damage.
                      </div>
                    )}
                  </label>
                </div>

                <div className="field-grid one-col" style={{ marginBottom: '16px' }}>
                  <label>
                    <span>
                      Product Fee
                      <span style={{ display: 'block', color: '#6a7069', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'normal' }}>
                        Do you want the rider to collect payment for the product from the buyer on your behalf? If yes, indicate the amount
                      </span>
                    </span>
                    <div className="rp-input-wrap">
                      <Banknote size={17} />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 150.00 (Leave blank if none)"
                        value={productFee}
                        onChange={e => setProductFee(e.target.value)}
                      />
                    </div>
                  </label>
                </div>

                <div className="field-grid one-col" style={{ marginBottom: '16px' }}>
                  <label>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ImagePlus size={15} /> Upload Package Image</span>
                    <FileUpload
                      label="Upload Package Image"
                      previews={imagePreview ? [imagePreview] : []}
                      onFilesSelected={(files) => {
                        if (files[0]) {
                          setImageFile(files[0]);
                          setImagePreview(URL.createObjectURL(files[0]));
                        }
                      }}
                      onRemove={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      icon={<ImagePlus size={18} />}
                    />
                  </label>
                </div>

                <h2 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><StickyNote size={22} /> Additional Instructions</h2>
                <div className="field-grid one-col" style={{ marginBottom: '16px' }}>
                  <label>
                    <textarea
                      value={additionalInstructions}
                      onChange={e => setAdditionalInstructions(e.target.value)}
                      rows={3}
                      placeholder="e.g. Call upon arrival"
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                {/* BULK DELIVERY DETAILS */}
                <h2 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><PackageSearch size={22} /> Package Details</h2>
                <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
                  <label>
                    <span>Delivery Speed</span>
                    <CustomSelect value={deliverySpeed} onChange={v => setDeliverySpeed(v)} options={SPEED_OPTIONS} icon={<Zap size={17} />} />
                  </label>
                  <label>
                    <span>Package Type</span>
                    <CustomSelect value={packageType} onChange={v => setPackageType(v)} options={PACKAGE_TYPE_OPTIONS_BULK} icon={<Package size={17} />} />
                    {packageType !== 'fragile' && (
                      <div style={{ fontSize: '12px', color: '#991b1b', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px', marginTop: '8px', fontWeight: 500, lineHeight: 1.4 }}>
                        Disclaimer: Please indicate if your package is fragile by selecting the "Fragile" option. Otherwise, you will not be eligible for a refund in case of damage.
                      </div>
                    )}
                  </label>
                  <label>
                    <span>Number of Packages <span style={{ color: 'var(--danger, #ef4444)' }}>*</span></span>
                    <div className="rp-input-wrap">
                      <Hash size={17} />
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 5"
                        value={numberOfPackages}
                        onChange={handleNumPackagesChange}
                      />
                    </div>
                  </label>
                  <label>
                    <span>
                      Product Fee
                      <span style={{ display: 'block', color: '#6a7069', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'normal' }}>
                        Do you want the rider to collect payment for the product from the buyer? If yes, indicate the amount
                      </span>
                    </span>
                    <div className="rp-input-wrap">
                      <Banknote size={17} />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 150.00 (Leave blank if none)"
                        value={productFee}
                        onChange={e => setProductFee(e.target.value)}
                      />
                    </div>
                  </label>
                </div>

                <h2 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><UserCheck size={22} /> Receiver Information</h2>
                {numberOfPackages === '' || numberOfPackages < 1 ? (
                  <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger, #ef4444)', color: 'var(--danger, #ef4444)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <span><strong>Action Required:</strong> Please enter the number of packages above to unlock receiver information.</span>
                  </div>
                ) : (
                  <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <p style={{ color: '#586159', marginBottom: '16px', lineHeight: '1.5', fontSize: '0.95rem' }}>
                      <strong>Choose between</strong> uploading images <strong>OR</strong> entering the details manually.
                    </p>
                    <div className="rp-tabs-row" style={{ marginBottom: '16px' }}>
                      <button
                        type="button"
                        className="rp-tab-btn rp-tab-btn-sm"
                        onClick={() => setBulkReceiverMode('upload')}
                        style={{
                          background: bulkReceiverMode === 'upload' ? 'var(--green)' : 'transparent',
                          color: bulkReceiverMode === 'upload' ? '#fff' : 'var(--navy)',
                          fontWeight: bulkReceiverMode === 'upload' ? 'bold' : '600',
                        }}
                      >
                        <ImagePlus size={16} /> Upload Image(s)
                      </button>
                      <button
                        type="button"
                        className="rp-tab-btn rp-tab-btn-sm"
                        onClick={() => setBulkReceiverMode('manual')}
                        style={{
                          background: bulkReceiverMode === 'manual' ? 'var(--green)' : 'transparent',
                          color: bulkReceiverMode === 'manual' ? '#fff' : 'var(--navy)',
                          fontWeight: bulkReceiverMode === 'manual' ? 'bold' : '600',
                        }}
                      >
                        <PenLine size={16} /> Enter Manually
                      </button>
                    </div>


                    {bulkReceiverMode === 'upload' && (
                      <div className="field-grid one-col" style={{ marginTop: '16px', animation: 'fadeIn 0.3s ease-out' }}>
                        <p style={{ color: 'var(--green-dark)', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '12px' }}>
                          Take clear pictures of packages with all relevant details visible.
                        </p>
                        <FileUpload
                          label="Tap to Select Images"
                          multiple
                          previews={bulkImagePreviews}
                          onFilesSelected={(files) => {
                            const newUrls = files.map(file => URL.createObjectURL(file));
                            setBulkImagePreviews(prev => [...prev, ...newUrls]);
                          }}
                          onRemove={(index) => setBulkImagePreviews(prev => prev.filter((_, i) => i !== index))}
                          icon={<ImagePlus size={18} />}
                        />
                      </div>
                    )}
                    
                    {bulkReceiverMode === 'manual' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px', animation: 'fadeIn 0.3s ease-out' }}>
                        {bulkReceivers.map((rec, i) => (
                          <div key={i} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: '#f8fafc' }}>
                            <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><UserCheck size={16} /> Receiver {i + 1}</h4>
                            <div className="field-grid two-col">
                              <label>
                                <span>Name</span>
                                <div className="rp-input-wrap">
                                  <User size={17} />
                                  <input value={rec.name} onChange={e => handleBulkReceiverChange(i, 'name', e.target.value)} placeholder="Jane Doe" />
                                </div>
                              </label>
                              <label>
                                <span>Number</span>
                                <div className="rp-input-wrap">
                                  <Phone size={17} />
                                  <input value={rec.number} onChange={e => handleBulkReceiverChange(i, 'number', e.target.value)} placeholder="024XXXXXXX" />
                                </div>
                              </label>
                              <label>
                                <span>Region</span>
                                <CustomSelect value={rec.region} onChange={v => handleBulkReceiverChange(i, 'region', v)} options={REGION_OPTIONS} icon={<MapPin size={17} />} />
                              </label>
                              <label>
                                <span>Dropoff Location</span>
                                <div className="rp-input-wrap">
                                  <MapPinned size={17} />
                                  <input value={rec.dropoffLocation} onChange={e => handleBulkReceiverChange(i, 'dropoffLocation', e.target.value)} placeholder="Specific landmark or street" />
                                </div>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <h2 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><StickyNote size={22} /> Additional Instructions</h2>
                <div className="field-grid one-col" style={{ marginTop: '24px' }}>
                  <label>
                    <textarea
                      value={additionalInstructions}
                      onChange={e => setAdditionalInstructions(e.target.value)}
                      rows={3}
                      placeholder="e.g. Call upon arrival"
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                  </label>
                </div>
              </>
            )}

          </div>

          <aside className="side-stack">
            <div className="summary-card rp-summary-card" style={{ position: 'sticky', top: '100px' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={18} /> Order Summary</div>

              <div className="summary-row"><span>Type</span><strong>{activeTab === 'single' ? 'Single Delivery' : 'Bulk Delivery'}</strong></div>
              <div className="summary-row"><span>Vehicle</span><strong>{pickupMode === 'motorbike' ? 'Motorbike' : 'Van'}</strong></div>
              <div className="summary-row"><span>Priority</span><strong>{deliveryPriority}</strong></div>
              <div className="summary-row"><span>Speed</span><strong>{deliverySpeed}</strong></div>

              <div className="summary-row" style={{ marginTop: '16px', borderTop: '1px dashed var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ display: 'block', fontWeight: 600, color: 'var(--navy)' }}>Estimated Fee</span>
                  <span style={{ fontSize: '11px', color: isFormComplete ? '#166534' : '#94a3b8', fontWeight: 600 }}>
                    {isFormComplete ? 'Calculated Estimate' : 'Fill required details to estimate'}
                  </span>
                </div>
                <strong style={{ fontSize: '1.3rem', color: isFormComplete ? 'var(--green-dark, #078c35)' : '#64748b' }}>
                  GHS {estimatedCost.toFixed(2)}
                </strong>
              </div>

              {activeTab === 'bulk' && (
                <div className="summary-row" style={{ marginTop: '8px' }}>
                  <span>Total Packages</span>
                  <strong style={{ fontSize: '1.1rem' }}>{numberOfPackages || 0}</strong>
                </div>
              )}

              {/* Operations Review Notice */}
              <div style={{ marginTop: '18px', padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Info size={18} color="#166534" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.45 }}>
                  <strong style={{ display: 'block', marginBottom: '2px', color: '#14532d', fontSize: '12.5px' }}>
                    Estimate &amp; Operations Review
                  </strong>
                  The amount displayed is an initial estimate. The final price is subject to review and confirmation by operations based on order specifics. Please check your <span style={{ fontWeight: 700, textDecoration: 'underline' }}>notifications</span> for the accepted final price.
                </div>
              </div>

              <button className="primary-green wide-btn" onClick={handleCreateOrder} disabled={isSubmitting} style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isSubmitting ? 'Submitting…' : (<><Send size={16} /> Create Order</>)}
              </button>
              {submitError && (
                <p style={{ color: '#991b1b', fontWeight: 600, marginTop: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> {submitError}
                </p>
              )}
              {submitSuccess && (
                <p style={{ color: 'var(--green)', fontWeight: 600, marginTop: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> Order created successfully! Redirecting…
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
