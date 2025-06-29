

import React, { useState, useMemo } from 'react';
import { Order } from '../types';
import Modal from './Modal';
import { XIcon, PrintIcon } from './icons';
import { useTranslation } from '../contexts/LanguageContext';

interface OrderDetailModalProps {
    order: Order;
    onClose: () => void;
    onPrint: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onPrint }) => {
    const { t } = useTranslation();
    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

    const handleToggleCheck = (itemIndex: number) => {
        setCheckedItems(prev => ({ ...prev, [itemIndex]: !prev[itemIndex] }));
    };

    const allItemsChecked = useMemo(() => {
        if (order.items.length === 0) return false;
        const checkedCount = Object.values(checkedItems).filter(Boolean).length;
        return order.items.length === checkedCount;
    }, [order.items, checkedItems]);

    return (
        <Modal onClose={onClose}>
            <div className="relative bg-white dark:bg-brand-gray-800 text-brand-gray-800 dark:text-brand-gray-200 rounded-lg max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start pb-3 mb-4 border-b border-brand-gray-200 dark:border-brand-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold">{t('order_detail_title')}</h2>
                        <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400">
                            {t('order_card_plate')} <span className="font-semibold text-brand-teal">{order.plateNumber || t('common_na')}</span>
                        </p>
                        <p className="text-xs text-brand-gray-400 mt-1">ID: {order.id}</p>
                    </div>
                    <button onClick={onClose} className="p-1 -mt-1 -me-1 text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-white rounded-full hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body - Item List */}
                <div className="flex-grow overflow-y-auto my-1 pe-2 space-y-3">
                    <h3 className="text-lg font-semibold mb-2">{t('order_detail_items_title')}</h3>
                    <ul className="space-y-3">
                        {order.items.map((item, index) => (
                            <li key={index}>
                                <label className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ${checkedItems[index] ? 'bg-green-50 dark:bg-green-900/40 border-s-4 border-green-400' : 'bg-brand-gray-50 dark:bg-brand-gray-700/60'}`}>
                                    <input
                                        type="checkbox"
                                        checked={!!checkedItems[index]}
                                        onChange={() => handleToggleCheck(index)}
                                        className="h-5 w-5 rounded text-brand-teal focus:ring-brand-teal-dark border-gray-300 dark:border-gray-600 dark:bg-brand-gray-700"
                                    />
                                    <div className={`mx-4 flex-grow transition-opacity ${checkedItems[index] ? 'opacity-50 line-through' : 'opacity-100'}`}>
                                        <div className="font-semibold">{item.quantity} x {item.name}</div>
                                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                            <div className="ps-2 text-xs text-brand-gray-500">
                                                {item.selectedModifiers.map((mod, modIndex) => (
                                                    <div key={modIndex}>&bull; {mod.optionName}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`font-semibold transition-opacity ${checkedItems[index] ? 'opacity-50 line-through' : 'opacity-100'}`}>
                                        OMR {(item.quantity * item.price).toFixed(3)}
                                    </div>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-brand-gray-200 dark:border-brand-gray-700">
                    {allItemsChecked && (
                        <div className="text-center p-3 mb-3 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-semibold">
                           {t('order_detail_all_items_checked')}
                        </div>
                    )}
                    <div className="flex justify-between items-center text-xl font-bold mb-4">
                        <span>{t('order_detail_total')}</span>
                        <span className="text-brand-teal">OMR {order.total.toFixed(3)}</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <button onClick={onClose} className="w-full bg-brand-gray-500 text-white font-bold py-3 rounded-lg hover:bg-brand-gray-600 transition-colors">
                            {t('common_close')}
                        </button>
                        <button onClick={onPrint} className="w-full flex items-center justify-center bg-brand-teal text-white font-bold py-3 rounded-lg hover:bg-brand-teal-dark transition-colors">
                            <PrintIcon className="w-5 h-5 me-2" />
                            {t('order_detail_print_button')}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default OrderDetailModal;
