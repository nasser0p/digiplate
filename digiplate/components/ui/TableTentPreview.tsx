import React from 'react';
import { Store, RestaurantProfile } from '../../types';

interface TableTentPreviewProps {
    store: Store;
    profile: RestaurantProfile | null;
    qrCodeDataUrl: string;
}

const TableTentPreview: React.FC<TableTentPreviewProps> = ({ store, profile, qrCodeDataUrl }) => {
    return (
        <div className="w-[210mm] h-[297mm] p-8 bg-white text-black font-sans flex flex-col items-center justify-around">
            {/* Top half (will be visible from one side) */}
            <div className="w-full h-1/2 flex flex-col items-center justify-center text-center">
                <img
                    src={profile?.logoUrl || 'https://i.imgur.com/gK7sP9S.png'}
                    alt="Logo"
                    className="h-24 w-24 object-contain mb-4"
                />
                <h2 className="text-3xl font-bold">{profile?.name || 'Your Restaurant'}</h2>
                <p className="text-xl text-gray-600">{store.name}</p>
                
                <div className="mt-8 flex items-center justify-center">
                    <div className="p-2 border-4 border-black rounded-lg">
                       {qrCodeDataUrl ? (
                            <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                        ) : (
                            <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">Loading...</div>
                        )}
                    </div>
                </div>
                
                <p className="mt-6 text-2xl font-semibold">Scan to View Menu & Order</p>
            </div>

            {/* Dashed line for folding */}
            <div className="w-full border-t-2 border-dashed border-gray-400 my-4"></div>

            {/* Bottom half (will be visible from the other side, upside down) */}
            <div className="w-full h-1/2 flex flex-col items-center justify-center text-center transform rotate-180">
                 <img
                    src={profile?.logoUrl || 'https://i.imgur.com/gK7sP9S.png'}
                    alt="Logo"
                    className="h-24 w-24 object-contain mb-4"
                />
                <h2 className="text-3xl font-bold">{profile?.name || 'Your Restaurant'}</h2>
                <p className="text-xl text-gray-600">{store.name}</p>
                
                <div className="mt-8 flex items-center justify-center">
                    <div className="p-2 border-4 border-black rounded-lg">
                       {qrCodeDataUrl ? (
                            <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                        ) : (
                            <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">Loading...</div>
                        )}
                    </div>
                </div>
                
                <p className="mt-6 text-2xl font-semibold">Scan to View Menu & Order</p>
            </div>
        </div>
    );
};

export default TableTentPreview;
