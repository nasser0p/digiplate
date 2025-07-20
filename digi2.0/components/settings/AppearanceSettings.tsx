import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { RestaurantProfile, MenuAppearance } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import MenuPreview from './MenuPreview';

interface AppearanceSettingsProps {
    userId: string;
    profile: RestaurantProfile;
    onSave: (updatedProfile: RestaurantProfile) => void;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ userId, profile, onSave }) => {
    const { t } = useTranslation();
    
    const defaultAppearance: MenuAppearance = {
        layout: 'grid',
        fontTheme: 'modern',
        brandColor: '#28a7a1',
        backgroundColor: '#f9fafb',
        textColor: '#1f2937',
        headerBannerUrl: '',
    };
    
    const [appearance, setAppearance] = useState<MenuAppearance>(profile.menuAppearance || defaultAppearance);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(profile.menuAppearance?.headerBannerUrl || null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAppearance(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setBannerPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        let newBannerUrl = appearance.headerBannerUrl;
        
        try {
            if (bannerFile) {
                const bannerRef = ref(storage, `headerBanners/${userId}/${bannerFile.name}`);
                const snapshot = await uploadBytes(bannerRef, bannerFile);
                newBannerUrl = await getDownloadURL(snapshot.ref);
            }
            
            const finalAppearance: MenuAppearance = { ...appearance, headerBannerUrl: newBannerUrl };
            const updatedProfile: RestaurantProfile = { ...profile, menuAppearance: finalAppearance };
            
            await setDoc(doc(db, 'restaurantProfiles', userId), { menuAppearance: finalAppearance }, { merge: true });
            
            onSave(updatedProfile);
            setBannerFile(null);
            setMessage(t('settings_update_success'));

        } catch (error) {
            console.error("Error saving appearance:", error);
            setMessage(t('settings_update_error'));
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const RadioCard = ({ name, value, label, checked, onChange }: { name: string, value: string, label: string, checked: boolean, onChange: (e:React.ChangeEvent<HTMLInputElement>) => void }) => (
        <label className={`block p-4 border rounded-lg cursor-pointer transition-all ${checked ? 'bg-brand-teal/10 border-brand-teal ring-2 ring-brand-teal' : 'bg-brand-gray-50 dark:bg-brand-gray-800 border-brand-gray-200 dark:border-brand-gray-700 hover:border-brand-gray-300 dark:hover:border-brand-gray-600'}`}>
            <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
            <span className="font-semibold text-sm">{label}</span>
        </label>
    );

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Settings Panel */}
                <div className="lg:col-span-1 space-y-6 bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md">
                    <div>
                        <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white mb-1">{t('settings_appearance_title')}</h2>
                        <p className="text-sm text-brand-gray-500">{t('settings_appearance_desc')}</p>
                    </div>

                    <div className="space-y-4 border-t border-brand-gray-200 dark:border-brand-gray-700 pt-4">
                        <h3 className="font-bold">{t('settings_appearance_layout')}</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <RadioCard name="layout" value="grid" label={t('settings_layout_grid')} checked={appearance.layout === 'grid'} onChange={handleChange} />
                            <RadioCard name="layout" value="list" label={t('settings_layout_list')} checked={appearance.layout === 'list'} onChange={handleChange} />
                            <RadioCard name="layout" value="elegant" label={t('settings_layout_elegant')} checked={appearance.layout === 'elegant'} onChange={handleChange} />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="font-bold">{t('settings_appearance_font')}</h3>
                        <div className="grid grid-cols-3 gap-2">
                             <RadioCard name="fontTheme" value="modern" label={t('settings_font_modern')} checked={appearance.fontTheme === 'modern'} onChange={handleChange} />
                             <RadioCard name="fontTheme" value="classic" label={t('settings_font_classic')} checked={appearance.fontTheme === 'classic'} onChange={handleChange} />
                             <RadioCard name="fontTheme" value="casual" label={t('settings_font_casual')} checked={appearance.fontTheme === 'casual'} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold">{t('settings_appearance_colors')}</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <ColorInput label={t('settings_color_brand')} name="brandColor" value={appearance.brandColor} onChange={handleChange} />
                            <ColorInput label={t('settings_color_background')} name="backgroundColor" value={appearance.backgroundColor} onChange={handleChange} />
                            <ColorInput label={t('settings_color_text')} name="textColor" value={appearance.textColor} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-bold">{t('settings_appearance_banner')}</h3>
                        <p className="text-xs text-brand-gray-500">{t('settings_banner_desc')}</p>
                        <input type="file" id="banner-upload" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg" />
                        <label htmlFor="banner-upload" className="w-full text-center cursor-pointer bg-white dark:bg-brand-gray-700 py-2 px-3 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm text-sm font-medium text-brand-gray-700 dark:text-brand-gray-200 hover:bg-brand-gray-50 dark:hover:bg-brand-gray-600">
                            {t('settings_banner_upload')}
                        </label>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-4 border-t border-brand-gray-200 dark:border-brand-gray-700">
                        {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
                        <button type="submit" disabled={saving} className="bg-brand-teal text-white font-bold py-2 px-6 rounded-lg text-sm hover:bg-brand-teal-dark disabled:bg-teal-300">
                            {saving ? t('common_saving') : t('settings_save_profile_button')}
                        </button>
                    </div>
                </div>
                
                {/* Preview Panel */}
                <div className="lg:col-span-2">
                    <h3 className="text-lg font-bold mb-2">{t('settings_appearance_preview')}</h3>
                    <div className="w-full h-[70vh] bg-brand-gray-200 dark:bg-brand-gray-800 rounded-xl p-4 overflow-hidden">
                        <div className="w-full h-full bg-white dark:bg-brand-gray-900 rounded-lg overflow-auto">
                            <MenuPreview 
                                profile={profile} 
                                appearance={{ ...appearance, headerBannerUrl: bannerPreview || appearance.headerBannerUrl }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

const ColorInput = ({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }) => (
    <div>
        <label className="block text-sm font-medium mb-1">{label}</label>
        <div className="flex items-center gap-2">
            <input type="color" name={name} value={value} onChange={onChange} className="w-8 h-8 p-0.5 bg-white dark:bg-brand-gray-600 border border-brand-gray-300 dark:border-brand-gray-500 rounded-md cursor-pointer"/>
            <input type="text" name={name} value={value} onChange={onChange} className="w-full text-sm p-1.5 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
        </div>
    </div>
);


export default AppearanceSettings;
