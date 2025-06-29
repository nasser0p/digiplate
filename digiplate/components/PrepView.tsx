import React from 'react';
import { PrepItem } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface PrepViewProps {
    items: PrepItem[];
}

const PrepView: React.FC<PrepViewProps> = ({ items }) => {
    const { t } = useTranslation();

    if (items.length === 0) {
        return (
            <div className="flex justify-center items-center h-96 bg-white dark:bg-brand-gray-900 rounded-xl shadow-md">
                <p className="text-brand-gray-500">{t('prep_view_no_items')}</p>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map(item => (
                <div key={item.name} className="bg-white dark:bg-brand-gray-900 rounded-xl shadow-lg p-4 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-baseline mb-2">
                            <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white leading-tight">{item.name}</h3>
                            <span className="text-3xl font-extrabold text-brand-teal ms-2">
                                {item.totalQuantity}x
                            </span>
                        </div>
                        <div className="border-t border-brand-gray-100 dark:border-brand-gray-800 mt-2 pt-2">
                            <h4 className="text-xs font-semibold text-brand-gray-400 uppercase mb-1">{t('prep_view_from_orders')}</h4>
                            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto pe-1">
                                {item.orders.map(order => (
                                    <li key={order.orderId} className="flex justify-between items-center text-brand-gray-600 dark:text-brand-gray-300">
                                        <span>{t('order_card_plate')} {order.plateNumber || t('common_na')}</span>
                                        <span className="font-bold text-brand-gray-700 dark:text-brand-gray-100">x{order.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PrepView;
