import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateDeliveryCost } from '../utils/pricing';

export default function RequestPickupPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const navigate = useNavigate();

  // Shared Sender State
  const [pickupDate, setPickupDate] = useState('');
  const [pickupMode, setPickupMode] = useState('motorbike');
  const [deliveryPriority, setDeliveryPriority] = useState('Standard');
  const [senderContact, setSenderContact] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
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
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Bulk Delivery State
  const [numberOfPackages, setNumberOfPackages] = useState<number | ''>('');
  const [bulkReceiverMode, setBulkReceiverMode] = useState<'upload' | 'manual'>('upload');
  const [bulkImagePreviews, setBulkImagePreviews] = useState<string[]>([]);
  const [bulkReceivers, setBulkReceivers] = useState<Array<{ name: string, number: string, dropoffLocation: string, region: string, speed: string, priority: string }>>([]);

  // Calculated Cost (Single Delivery)
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === 'single') {
      const cost = calculateDeliveryCost({
        region: dropoffRegion,
        kumasiSubArea: dropoffRegion === 'Kumasi' ? dropoffKumasiSubArea : undefined
      });
      setEstimatedCost(cost);
    }
  }, [dropoffRegion, dropoffKumasiSubArea, activeTab]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isBulk: boolean = false) => {
    if (isBulk) {
      if (e.target.files) {
        const filesArray = Array.from(e.target.files);
        const newUrls = filesArray.map(file => URL.createObjectURL(file));
        setBulkImagePreviews(prev => [...prev, ...newUrls]);
      }
    } else {
      const file = e.target.files?.[0];
      if (file) {
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

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

  return (
    <div className="page-shell light-shell">
      <main className="create-shell container">
        <h1>Request a Pickup</h1>
        <p className="muted-text">Fill in the details below to schedule a delivery.</p>

        {/* TABS */}
        <div style={{ display: 'flex', background: 'var(--success-bg)', padding: '6px', borderRadius: '12px', marginBottom: '32px', width: 'fit-content' }}>
          <button
            onClick={() => setActiveTab('single')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'single' ? 'var(--green)' : 'transparent',
              color: activeTab === 'single' ? '#fff' : 'var(--navy)',
              fontWeight: activeTab === 'single' ? 'bold' : '600',
              cursor: 'pointer',
              fontSize: '1.05rem',
              transition: 'all 0.2s ease'
            }}
          >
            Single Delivery
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'bulk' ? 'var(--green)' : 'transparent',
              color: activeTab === 'bulk' ? '#fff' : 'var(--navy)',
              fontWeight: activeTab === 'bulk' ? 'bold' : '600',
              cursor: 'pointer',
              fontSize: '1.05rem',
              transition: 'all 0.2s ease'
            }}
          >
            Bulk Delivery
          </button>
        </div>

        <div className="step-layout">
          <div className="form-card large-card">

            {/* SHARED FIELDS */}
            <h2 className="form-section-title">Pickup Details</h2>
            <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
              <label>
                <span>Preferred Pickup Date</span>
                <input
                  type="text"
                  onFocus={(e) => {
                    e.target.type = 'date';
                    try { if ('showPicker' in HTMLInputElement.prototype) e.target.showPicker(); } catch (err) { }
                  }}
                  onClick={(e) => {
                    try { if ('showPicker' in HTMLInputElement.prototype && e.target.type === 'date') (e.target as HTMLInputElement).showPicker(); } catch (err) { }
                  }}
                  onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                  placeholder="Select Preferred Date"
                  value={pickupDate}
                  onChange={e => setPickupDate(e.target.value)}
                />
              </label>
              <label>
                <span>Delivery Priority</span>
                <select value={deliveryPriority} onChange={e => setDeliveryPriority(e.target.value)}>
                  <option value="Standard">Standard</option>
                  <option value="High">High</option>
                </select>
              </label>
            </div>

            <div className="field-grid" style={{ marginBottom: '16px' }}>
              <label>
                <span>Pickup Mode</span>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button type="button" onClick={() => setPickupMode('motorbike')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `2px solid ${pickupMode === 'motorbike' ? 'var(--green)' : 'var(--border)'}`, background: pickupMode === 'motorbike' ? 'var(--success-bg)' : '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                    <span>🏍️</span> Motorbike
                  </button>
                  <button type="button" onClick={() => setPickupMode('van')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `2px solid ${pickupMode === 'van' ? 'var(--green)' : 'var(--border)'}`, background: pickupMode === 'van' ? 'var(--success-bg)' : '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                    <span>🚐</span> Van
                  </button>
                </div>
              </label>
            </div>

            <h2 className="form-section-title">Sender Information</h2>
            <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
              <label>
                <span>Sender's Name</span>
                <input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="John Doe" />
              </label>
              <label>
                <span>Sender's Number</span>
                <input value={senderNumber} onChange={e => setSenderNumber(e.target.value)} placeholder="024XXXXXXX" />
              </label>
              <label>
                <span>Pickup Contact Name (Optional)</span>
                <input value={senderContact} onChange={e => setSenderContact(e.target.value)} placeholder="Who should we call for pickup?" />
              </label>
              <label>
                <span>Region</span>
                <select value={pickupRegion} onChange={e => setPickupRegion(e.target.value)}>
                  <option value="Kumasi">Kumasi</option>
                </select>
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Pickup Location</span>
                <input value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} placeholder="Specific area or landmark" />
              </label>
            </div>

            {/* TAB SPECIFIC FIELDS */}
            {activeTab === 'single' ? (
              <>
                <h2 className="form-section-title">Receiver Information</h2>
                <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
                  <label>
                    <span>Receiver's Name</span>
                    <input value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Jane Doe" />
                  </label>
                  <label>
                    <span>Receiver's Number</span>
                    <input value={receiverNumber} onChange={e => setReceiverNumber(e.target.value)} placeholder="024XXXXXXX" />
                  </label>
                  <label>
                    <span>Dropoff Region</span>
                    <select value={dropoffRegion} onChange={e => setDropoffRegion(e.target.value)}>
                      <option value="Kumasi">Kumasi</option>
                      <option value="Accra">Accra</option>
                      <option value="Takoradi">Takoradi</option>
                      <option value="Sunyani">Sunyani</option>
                      <option value="Tamale">Tamale</option>
                    </select>
                  </label>
                  {dropoffRegion === 'Kumasi' && (
                    <label>
                      <span>Kumasi Area</span>
                      <select value={dropoffKumasiSubArea} onChange={e => setDropoffKumasiSubArea(e.target.value as any)}>
                        <option value="CampusAndEnvirons">KNUST Campus, Ayeduase, Ayigya, Bomso, Kotei</option>
                        <option value="Other">Other Kumasi Areas</option>
                      </select>
                    </label>
                  )}
                  <label style={{ gridColumn: '1 / -1' }}>
                    <span>Dropoff Location</span>
                    <input value={dropoffLocation} onChange={e => setDropoffLocation(e.target.value)} placeholder="Specific landmark or street" />
                  </label>
                </div>

                <h2 className="form-section-title">Package Details</h2>
                <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
                  <label>
                    <span>Delivery Speed</span>
                    <select value={deliverySpeed} onChange={e => setDeliverySpeed(e.target.value)}>
                      <option value="" disabled>Select Speed</option>
                      <option value="Same day">Same day</option>
                      <option value="Next day">Next day</option>
                      <option value="Express">Express</option>
                    </select>
                  </label>
                  <label>
                    <span>Package Type</span>
                    <select value={packageType} onChange={e => setPackageType(e.target.value)}>
                      <option value="" disabled>Select Package</option>
                      <option value="food">Food</option>
                      <option value="parcel">Parcel</option>
                      <option value="electronics">Electronics</option>
                      <option value="fragile">Fragile items (cake, glass, ice, etc.)</option>
                      <option value="other">Other</option>
                    </select>
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
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 150.00 (Leave blank if none)"
                      value={productFee}
                      onChange={e => setProductFee(e.target.value)}
                    />
                  </label>
                </div>

                <div className="field-grid one-col" style={{ marginBottom: '16px' }}>
                  <label>
                    <span>Upload Package Image</span>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} style={{ padding: '8px 0' }} />
                  </label>
                  {imagePreview && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={imagePreview} alt="Preview" style={{ maxWidth: '200px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                    </div>
                  )}
                </div>

                <h2 className="form-section-title">Additional Instructions</h2>
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
                <h2 className="form-section-title">Package Details</h2>
                <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
                  <label>
                    <span>Delivery Speed</span>
                    <select value={deliverySpeed} onChange={e => setDeliverySpeed(e.target.value)}>
                      <option value="" disabled>Select Speed</option>
                      <option value="Same day">Same day</option>
                      <option value="Next day">Next day</option>
                      <option value="Express">Express</option>
                    </select>
                  </label>
                  <label>
                    <span>Package Type</span>
                    <select value={packageType} onChange={e => setPackageType(e.target.value)}>
                      <option value="" disabled>Select Package</option>
                      <option value="food">Food</option>
                      <option value="parcel">Parcel</option>
                      <option value="electronics">Electronics</option>
                      <option value="fragile">Fragile items</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label>
                    <span>Number of Packages <span style={{ color: 'var(--danger, #ef4444)' }}>*</span></span>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 5"
                      value={numberOfPackages}
                      onChange={handleNumPackagesChange}
                    />
                  </label>
                  <label>
                    <span>
                      Product Fee
                      <span style={{ display: 'block', color: '#6a7069', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'normal' }}>
                        Do you want the rider to collect payment for the product from the buyer? If yes, indicate the amount
                      </span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 150.00 (Leave blank if none)"
                      value={productFee}
                      onChange={e => setProductFee(e.target.value)}
                    />
                  </label>
                </div>

                <h2 className="form-section-title">Receiver Information</h2>
                {numberOfPackages === '' || numberOfPackages < 1 ? (
                  <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger, #ef4444)', color: 'var(--danger, #ef4444)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    <span><strong>Action Required:</strong> Please enter the number of packages above to unlock receiver information.</span>
                  </div>
                ) : (
                  <div style={{ animation: 'fadeIn 0.3s ease-out' }}>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: ' 8px' }}>
                      <button
                        type="button"
                        onClick={() => setBulkReceiverMode('upload')}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: bulkReceiverMode === 'upload' ? '2px solid var(--green)' : '1px solid var(--border)', background: bulkReceiverMode === 'upload' ? 'var(--success-bg)' : '#fff', cursor: 'pointer' }}
                      >
                        Upload Image(s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkReceiverMode('manual')}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: bulkReceiverMode === 'manual' ? '2px solid var(--green)' : '1px solid var(--border)', background: bulkReceiverMode === 'manual' ? 'var(--success-bg)' : '#fff', cursor: 'pointer' }}
                      >
                        Enter Manually
                      </button>
                    </div>
                    <p style={{ color: '#586159', marginBottom: '16px', lineHeight: '1.5', fontSize: '0.95rem' }}>
                      <strong>Upload images</strong> of your packages with their receiver details for us to process, or <strong>enter the details manually</strong> below.
                    </p>

                    {bulkReceiverMode === 'upload' ? (
                      <div className="field-grid one-col">
                        <label>
                          <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, true)} style={{ padding: '8px 0' }} />
                        </label>
                        {bulkImagePreviews.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {bulkImagePreviews.map((preview, index) => (
                              <img key={index} src={preview} alt={`Preview ${index}`} style={{ maxWidth: '150px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {bulkReceivers.map((rec, i) => (
                          <div key={i} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: '#f8fafc' }}>
                            <h4 style={{ margin: '0 0 16px 0' }}>Receiver {i + 1}</h4>
                            <div className="field-grid two-col">
                              <label>
                                <span>Name</span>
                                <input value={rec.name} onChange={e => handleBulkReceiverChange(i, 'name', e.target.value)} placeholder="Jane Doe" />
                              </label>
                              <label>
                                <span>Number</span>
                                <input value={rec.number} onChange={e => handleBulkReceiverChange(i, 'number', e.target.value)} placeholder="024XXXXXXX" />
                              </label>
                              <label>
                                <span>Region</span>
                                <select value={rec.region} onChange={e => handleBulkReceiverChange(i, 'region', e.target.value)}>
                                  <option value="Kumasi">Kumasi</option>
                                  <option value="Accra">Accra</option>
                                  <option value="Takoradi">Takoradi</option>
                                  <option value="Sunyani">Sunyani</option>
                                  <option value="Tamale">Tamale</option>
                                </select>
                              </label>
                              <label>
                                <span>Dropoff Location</span>
                                <input value={rec.dropoffLocation} onChange={e => handleBulkReceiverChange(i, 'dropoffLocation', e.target.value)} placeholder="Specific landmark or street" />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <h2 className="form-section-title">Additional Instructions</h2>
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
            <div className="summary-card" style={{ position: 'sticky', top: '100px' }}>
              <div className="card-title">Order Summary</div>

              <div className="summary-row"><span>Type</span><strong>{activeTab === 'single' ? 'Single Delivery' : 'Bulk Delivery'}</strong></div>
              <div className="summary-row"><span>Vehicle</span><strong>{pickupMode === 'motorbike' ? 'Motorbike' : 'Van'}</strong></div>
              <div className="summary-row"><span>Priority</span><strong>{deliveryPriority}</strong></div>
              <div className="summary-row"><span>Speed</span><strong>{deliverySpeed}</strong></div>

              {activeTab === 'single' ? (
                <>
                  <div className="summary-row" style={{ marginTop: '16px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
                    <span>Estimated Fee</span>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--green)' }}>
                      {estimatedCost ? `GHS ${estimatedCost.toFixed(2)}` : 'Pending'}
                    </strong>
                  </div>
                </>
              ) : (
                <div className="summary-row" style={{ marginTop: '16px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
                  <span>Total Packages</span>
                  <strong style={{ fontSize: '1.2rem' }}>{numberOfPackages || 0}</strong>
                </div>
              )}

              <button className="primary-green wide-btn" onClick={() => navigate('/shipments')} style={{ marginTop: '24px' }}>
                Create Order →
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
