

import React, { useState, useMemo } from 'react';
import { CartItem } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';

interface CartProps {
    cart: CartItem[];
    onUpdateQuantity: (cartItemId: string, quantity: number) => void;
    onProceedToCheckout: () => void;
}

const Cart: React.FC<CartProps> = ({ cart, onUpdateQuantity, onProceedToCheckout }) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    const { totalItems, totalPrice } = useMemo(() => {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => {
            const modifiersPrice = item.selectedModifiers.reduce((modSum, mod) => modSum + mod.optionPrice, 0);
            return sum + (item.basePrice + modifiersPrice) * item.quantity;
        }, 0);
        return { totalItems, totalPrice };
    }, [cart]);

    if (cart.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-20">
            <div className={`bg-white/80 dark:bg-brand-gray-900/80 backdrop-blur-lg w-full max-w-3xl mx-auto shadow-2xl rounded-t-2xl transition-all duration-300 ease-in-out`}>
                {/* Collapsed View */}
                <div 
                    className={`p-4 flex justify-between items-center cursor-pointer`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="relative">
                           <svg className="w-7 h-7 text-brand-customer" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                           <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{totalItems}</span>
                        </div>
                        <span className="font-semibold text-lg text-brand-gray-800 dark:text-white">{t('customer_cart_total')} <span className="text-brand-customer">OMR {totalPrice.toFixed(3)}</span></span>
                    </div>
                    <button className="font-bold text-brand-customer flex items-center">
                        {isExpanded ? t('customer_cart_hide') : t('customer_cart_view')}
                        <svg className={`w-5 h-5 ms-1 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                </div>

                {/* Expanded View */}
                {isExpanded && (
                    <div className="p-4 border-t border-brand-gray-200 dark:border-brand-gray-700">
                        <h3 className="text-lg font-bold mb-3">{t('customer_cart_your_items')}</h3>
                        <div className="max-h-60 overflow-y-auto pe-2 space-y-4 mb-4">
                            {cart.map(item => (
                                <div key={item.cartItemId} className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</p>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {item.selectedModifiers.map(mod => (
                                                <div key={mod.optionName}>&bull; {mod.optionName} {mod.optionPrice > 0 ? `(+OMR ${mod.optionPrice.toFixed(3)})` : ''}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)} className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center font-bold text-lg">-</button>
                                        <span className="font-semibold w-5 text-center">{item.quantity}</span>
                                        <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="w-8 h-8 rounded-full border border-brand-customer bg-brand-customer text-white hover:bg-brand-customer-dark flex items-center justify-center font-bold text-lg">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={onProceedToCheckout}
                            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors text-lg"
                        >
                            {t('customer_cart_checkout')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart;
