import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { RestaurantProfile, PrintSettings, Order, Role } from '../types';
import PrintableTicket from './PrintableTicket';
import { Timestamp } from 'firebase/firestore';
import StaffManager from './StaffManager';
import { useTranslation } from '../contexts/LanguageContext';

interface SettingsPageProps {
    userId: string;
    onProfileUpdate: (profile: RestaurantProfile) => void;
    role: Role | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ userId, onProfileUpdate, role }) => {
    const { t } = useTranslation();
    
    const defaultPrintSettings: PrintSettings = {
        headerText: t('printable_ticket_default_header'),
        footerText: t('printable_ticket_default_footer'),
        fontSize: 'xs',
        showRestaurantName: true,
        showStoreName: true,
        showPlateNumber: true,
        showOrderId: true,
        showDateTime: true,
        showUrgentBanner: true,
        showQRCode: false,
    };

    const sampleOrder: Order = {
        id: 'SAMPLE123',
        plateNumber: 'YUM-789',
        storeName: 'Main Branch',
        storeId: 'sampleStoreId',
        items: [
            { name: 'Burger', quantity: 1, price: 9.500, selectedModifiers: [{ groupName: 'Add-ons', optionName: 'Extra Cheese', optionPrice: 1.000 }], menuItemId: 'sample-burger' },
            { name: 'Fries', quantity: 2, price: 3.000, selectedModifiers: [], menuItemId: 'sample-fries' },
            { name: 'Soda', quantity: 1, price: 2.000, selectedModifiers: [], menuItemId: 'sample-soda' },
        ],
        subtotal: 17.500,
        tip: 3.000,
        platformFee: 0.525,
        total: 21.025,
        status: 'New',
        userId: 'sample-user',
        createdAt: Timestamp.now(),
        isUrgent: true,
    };

    const [profile, setProfile] = useState<RestaurantProfile>({ id: '', name: '', address: '', logoUrl: '', avatarUrl: '', isLiveTrackingEnabled: true, customerBranding: { brandColor: '#28a7a1' } });
    const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [extractedLogoColors, setExtractedLogoColors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        if (!userId) return;
        
        const fetchProfile = async () => {
            setLoading(true);
            const docRef = doc(db, 'restaurantProfiles', userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as RestaurantProfile;
                setProfile({ isLiveTrackingEnabled: true, ...data });
                setPrintSettings(data.printSettings || defaultPrintSettings);
                if (data.logoUrl) {
                    setLogoPreview(data.logoUrl);
                    extractColorsFromImage(data.logoUrl).then(setExtractedLogoColors);
                }
                if (data.avatarUrl) setAvatarPreview(data.avatarUrl);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [userId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'avatar') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (type === 'logo') {
                    setLogoFile(file);
                    setLogoPreview(result);
                    extractColorsFromImage(result).then(setExtractedLogoColors);
                } else {
                    setAvatarFile(file);
                    setAvatarPreview(result);
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const extractColorsFromImage = (imageUrl: string): Promise<string[]> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = imageUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve([]);
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                const colorCounts: Record<string, number> = {};
                
                const sampleRate = 10;
                for (let i = 0; i < imageData.length; i += 4 * sampleRate) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    if ((r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) continue;
                    
                    const hex = `#${('00' + r.toString(16)).slice(-2)}${('00' + g.toString(16)).slice(-2)}${('00' + b.toString(16)).slice(-2)}`;
                    colorCounts[hex] = (colorCounts[hex] || 0) + 1;
                }

                const sortedColors = Object.entries(colorCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 6)
                    .map(([color]) => color);
                
                resolve(sortedColors);
            };
            img.onerror = () => resolve([]);
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (name === 'brandColor') {
             setProfile(prev => ({...prev, customerBranding: { ...prev.customerBranding, brandColor: value }}));
             return;
        }

        if (type === 'checkbox') {
             const { checked } = e.target as HTMLInputElement;
             setProfile(prev => ({ ...prev, [name]: checked }));
        } else {
            setProfile(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePrintSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = (e.target as HTMLInputElement).checked;
        setPrintSettings(prev => ({
            ...prev,
            [name]: isCheckbox ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            setMessage(t('settings_user_not_found'));
            return;
        }
        setSaving(true);
        setMessage('');

        let newLogoUrl = profile.logoUrl;
        let newAvatarUrl = profile.avatarUrl;

        try {
            if (logoFile) {
                const logoStorageRef = ref(storage, `logos/${userId}/logo`);
                const logoSnapshot = await uploadBytes(logoStorageRef, logoFile);
                newLogoUrl = await getDownloadURL(logoSnapshot.ref);
            }
            if (avatarFile) {
                const avatarStorageRef = ref(storage, `avatars/${userId}/avatar`);
                const avatarSnapshot = await uploadBytes(avatarStorageRef, avatarFile);
                newAvatarUrl = await getDownloadURL(avatarSnapshot.ref);
            }

            const updatedProfile: RestaurantProfile = { ...profile, logoUrl: newLogoUrl, avatarUrl: newAvatarUrl, printSettings };
            
            const docRef = doc(db, 'restaurantProfiles', userId);
            await setDoc(docRef, updatedProfile, { merge: true });

            setProfile(updatedProfile);
            onProfileUpdate(updatedProfile);
            setLogoFile(null);
            setAvatarFile(null);
            setMessage(t('settings_update_success'));
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage(t('settings_update_error'));
        } finally {
            setSaving(false);
             setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const ToggleSwitch = ({ id, label, description, checked, onChange }: { id: string, label: string, description?: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
         <label htmlFor={id} className="flex items-center justify-between cursor-pointer">
            <div className="flex-grow">
                <span className="text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">{label}</span>
                {description && <p className="text-xs text-brand-gray-500">{description}</p>}
            </div>
            <div className="relative ms-4">
                <input type="checkbox" id={id} name={id} className="sr-only" checked={checked} onChange={onChange} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-brand-teal' : 'bg-brand-gray-300 dark:bg-brand-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4 rtl:-translate-x-4' : ''}`}></div>
            </div>
        </label>
    );

    if (loading) {
        return <div className="flex justify-center items-center h-full">{t('settings_loading')}</div>;
    }
    
    if (role !== 'admin') {
         return <div className="flex justify-center items-center h-full text-brand-gray-500">{t('common_permission_denied')}</div>;
    }
    
    const TabButton = ({ view, label }: { view: string; label: string }) => (
        <button
            type="button"
            onClick={() => setActiveTab(view)}
            className={`px-4 py-2 text-sm font-semibold rounded-md ${
                activeTab === view
                    ? 'bg-brand-teal text-white'
                    : 'text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex space-x-2 rtl:space-x-reverse bg-brand-gray-200 dark:bg-brand-gray-900 p-1 rounded-lg self-start">
                <TabButton view="profile" label={t('settings_tab_profile')} />
                <TabButton view="staff" label={t('settings_tab_staff')} />
                <TabButton view="print" label={t('settings_tab_print')} />
            </div>

            {activeTab === 'staff' && (
                <StaffManager ownerId={userId} />
            )}

            {activeTab === 'profile' && (
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white dark:bg-brand-gray-900 p-6 sm:p-8 rounded-xl shadow-md">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        <div className="md:col-span-1">
                             <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white mb-1">{t('settings_account_title')}</h2>
                            <p className="text-sm text-brand-gray-500">{t('settings_account_desc')}</p>
                        </div>
                        <div className="md:col-span-2 space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                <label className="block text-sm font-bold text-brand-gray-700 dark:text-brand-gray-300">{t('settings_avatar_label')}</label>
                                <div className="md:col-span-2 flex items-center gap-4">
                                    <img src={avatarPreview || 'https://placehold.co/200x200/1f2937/374151?text=Avatar'} alt="Avatar Preview" className="h-20 w-20 object-cover rounded-full" />
                                    <label htmlFor="avatar-upload" className="cursor-pointer bg-white dark:bg-brand-gray-700 py-2 px-3 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-brand-gray-700 dark:text-brand-gray-200 hover:bg-brand-gray-50 dark:hover:bg-brand-gray-600">
                                        <span>{t('settings_change_button')}</span>
                                        <input id="avatar-upload" name="avatar-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'avatar')} accept="image/png, image/jpeg" />
                                    </label>
                                </div>
                            </div>

                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                <label className="block text-sm font-bold text-brand-gray-700 dark:text-brand-gray-300">{t('settings_info_label')}</label>
                                <div className="md:col-span-2 space-y-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('settings_name_label')}</label>
                                        <input type="text" name="name" id="name" value={profile.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                                    </div>
                                    <div>
                                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('settings_phone_label')}</label>
                                        <input type="tel" name="phoneNumber" id="phoneNumber" value={profile.phoneNumber || ''} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                                    </div>
                                    <div>
                                        <label htmlFor="address" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('settings_address_label')}</label>
                                        <textarea name="address" id="address" value={profile.address} onChange={handleChange} rows={3} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"></textarea>
                                    </div>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                 <label className="block text-sm font-bold text-brand-gray-700 dark:text-brand-gray-300">{t('settings_logo_label')}</label>
                                 <div className="md:col-span-2">
                                    <div className="mt-1 flex items-center gap-4">
                                        <span className="h-16 w-16 rounded-full overflow-hidden bg-brand-gray-100 dark:bg-brand-gray-700 flex items-center justify-center">
                                            <img 
                                                src={logoPreview || 'https://placehold.co/128x128/1f2937/374151?text=Logo'}
                                                alt="Logo Preview"
                                                className="h-full w-full object-cover"
                                            />
                                        </span>
                                        <label htmlFor="logo-upload" className="cursor-pointer bg-white dark:bg-brand-gray-700 py-2 px-3 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-brand-gray-700 dark:text-brand-gray-200 hover:bg-brand-gray-50 dark:hover:bg-brand-gray-600">
                                            <span>{t('settings_change_button')}</span>
                                            <input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'logo')} accept="image/png, image/jpeg" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                <h3 className="block text-sm font-bold text-brand-gray-700 dark:text-brand-gray-300">{t('settings_experience_label')}</h3>
                                <div className="md:col-span-2">
                                    <ToggleSwitch
                                        id="isLiveTrackingEnabled"
                                        label={t('settings_tracking_toggle')}
                                        description={t('settings_tracking_desc')}
                                        checked={profile.isLiveTrackingEnabled ?? true}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div data-tour-id="settings-branding" className="bg-white dark:bg-brand-gray-900 p-6 sm:p-8 rounded-xl shadow-md">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        <div className="md:col-span-1">
                             <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white mb-1">{t('settings_branding_title')}</h2>
                            <p className="text-sm text-brand-gray-500">{t('settings_branding_desc')}</p>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label htmlFor="brandColor" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('settings_brand_color_label')}</label>
                                <div className="mt-1 flex items-center gap-4">
                                    <input type="color" name="brandColor" id="brandColor" value={profile.customerBranding?.brandColor || '#28a7a1'} onChange={handleChange} className="w-10 h-10 p-1 bg-white dark:bg-brand-gray-600 border border-brand-gray-300 dark:border-brand-gray-500 rounded-md cursor-pointer"/>
                                    <input type="text" value={profile.customerBranding?.brandColor || '#28a7a1'} onChange={handleChange} name="brandColor" className="block w-full max-w-xs px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                                </div>
                            </div>
                             {extractedLogoColors.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('settings_logo_colors_label')}</label>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {extractedLogoColors.map(color => (
                                            <button 
                                                key={color}
                                                type="button"
                                                onClick={() => handleChange({ target: { name: 'brandColor', value: color, type: 'color' }} as any)}
                                                className="w-8 h-8 rounded-full cursor-pointer border-2 border-white/50 shadow"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                             )}
                        </div>
                     </div>
                </div>
                 <div className="flex justify-end items-center gap-4 pt-2">
                    {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
                    <button type="submit" disabled={saving} className="bg-brand-teal text-white font-bold py-2 px-6 rounded-lg text-sm hover:bg-brand-teal-dark disabled:bg-teal-300">
                        {saving ? t('common_saving') : t('settings_save_profile_button')}
                    </button>
                </div>
                </form>
            )}

            {activeTab === 'print' && (
                <div className="bg-white dark:bg-brand-gray-900 p-6 sm:p-8 rounded-xl shadow-md space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white mb-1">{t('settings_print_title')}</h2>
                        <p className="text-sm text-brand-gray-500">{t('settings_print_desc')}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-brand-gray-200 dark:border-brand-gray-700 pt-8">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="headerText" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('settings_print_header_label')}</label>
                                <input type="text" name="headerText" id="headerText" value={printSettings.headerText} onChange={handlePrintSettingChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                            </div>
                             <div>
                                <label htmlFor="footerText" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('settings_print_footer_label')}</label>
                                <input type="text" name="footerText" id="footerText" value={printSettings.footerText} onChange={handlePrintSettingChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                            </div>
                            <div>
                                <label htmlFor="fontSize" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('settings_print_font_size_label')}</label>
                                <select name="fontSize" id="fontSize" value={printSettings.fontSize} onChange={handlePrintSettingChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal">
                                    <option value="xs">{t('settings_font_small')}</option>
                                    <option value="sm">{t('settings_font_medium')}</option>
                                    <option value="base">{t('settings_font_large')}</option>
                                </select>
                            </div>
                            <div className="space-y-3 pt-2">
                               <ToggleSwitch id="showRestaurantName" label={t('settings_print_show_restaurant_name')} checked={printSettings.showRestaurantName} onChange={handlePrintSettingChange} />
                               <ToggleSwitch id="showStoreName" label={t('settings_print_show_store_name')} checked={printSettings.showStoreName} onChange={handlePrintSettingChange} />
                               <ToggleSwitch id="showPlateNumber" label={t('settings_print_show_plate')} checked={printSettings.showPlateNumber} onChange={handlePrintSettingChange} />
                               <ToggleSwitch id="showOrderId" label={t('settings_print_show_order_id')} checked={printSettings.showOrderId} onChange={handlePrintSettingChange} />
                               <ToggleSwitch id="showDateTime" label={t('settings_print_show_datetime')} checked={printSettings.showDateTime} onChange={handlePrintSettingChange} />
                               <ToggleSwitch id="showUrgentBanner" label={t('settings_print_show_urgent')} checked={printSettings.showUrgentBanner} onChange={handlePrintSettingChange} />
                               <ToggleSwitch id="showQRCode" label={t('settings_print_show_qr')} checked={printSettings.showQRCode} onChange={handlePrintSettingChange} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-brand-gray-700 dark:text-brand-gray-300 mb-2">{t('settings_print_preview_label')}</label>
                            <div className="bg-brand-gray-100 dark:bg-brand-gray-800 p-4 rounded-lg flex justify-center items-start">
                                <div className="transform scale-90 origin-top">
                                   <PrintableTicket order={sampleOrder} profile={{...profile, printSettings}} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;