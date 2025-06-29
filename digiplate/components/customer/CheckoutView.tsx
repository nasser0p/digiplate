import React from 'react';
import { CartItem } from '../../types';

interface CheckoutViewProps {
    cart: CartItem[];
    subtotal: number;
    tipAmount: number;
    platformFee: number;
    total: number;
    plateNumber: string;
    onPlateNumberChange: (value: string) => void;
    onTipChange: (value: number) => void;
    onPlaceOrder: () => void;
    onBack: () => void;
    restaurantName?: string;
}

const CheckoutView: React.FC<CheckoutViewProps> = ({ cart, subtotal, tipAmount, platformFee, total, plateNumber, onPlateNumberChange, onTipChange, onPlaceOrder, onBack, restaurantName }) => {
    const tipPercentages = [15, 18, 20];

    const calculateItemTotal = (item: CartItem) => {
        const modifiersPrice = item.selectedModifiers.reduce((modSum, mod) => modSum + mod.optionPrice, 0);
        return (item.basePrice + modifiersPrice) * item.quantity;
    }

    return (
        <div className="bg-brand-gray-50 dark:bg-brand-gray-900 min-h-screen font-sans text-brand-gray-800 dark:text-brand-gray-200">
            <header className="bg-white dark:bg-brand-gray-800 shadow-md p-4 sticky top-0 z-10 flex items-center">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div className="text-center flex-grow">
                     <h1 className="text-xl font-bold">Checkout</h1>
                     <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400">{restaurantName}</p>
                </div>
                <div className="w-10"></div> {/* Spacer */}
            </header>
            
            <main className="p-4 max-w-2xl mx-auto">
                <div className="space-y-6">

                    {/* Order Summary */}
                    <div className="bg-white dark:bg-brand-gray-800 rounded-xl shadow p-5">
                        <h2 className="text-lg font-bold mb-4">Your Order</h2>
                        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                            {cart.map(item => (
                                 <div key={item.cartItemId} className="flex justify-between items-start text-sm">
                                    <div className="flex-grow">
                                        <p><span className="font-semibold">{item.quantity}x</span> {item.name}</p>
                                        {item.selectedModifiers.length > 0 && (
                                            <div className="pl-4 text-xs text-brand-gray-500 dark:text-brand-gray-400">
                                                {item.selectedModifiers.map(m => `+ ${m.optionName}`).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <p className="font-medium flex-shrink-0">OMR {calculateItemTotal(item).toFixed(3)}</p>
                                </div>
                            ))}
                        </div>
                         <div className="border-t border-brand-gray-200 dark:border-brand-gray-700 pt-4 flex justify-between font-semibold">
                            <span>Subtotal</span>
                            <span>OMR {subtotal.toFixed(3)}</span>
                        </div>
                    </div>

                    {/* Tip */}
                    <div className="bg-white dark:bg-brand-gray-800 rounded-xl shadow p-5">
                        <h3 className="font-bold mb-3">Add a Tip</h3>
                        <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mb-4">Your server appreciates your generosity!</p>
                        <div className="flex space-x-2 mb-3">
                             {tipPercentages.map(p => {
                                const tipValue = subtotal * (p / 100);
                                return (
                                    <button 
                                        key={p} 
                                        onClick={() => onTipChange(tipValue)}
                                        className={`flex-1 py-2 px-1 text-sm rounded-lg border-2 transition-all duration-200 font-semibold ${tipAmount === tipValue ? 'bg-brand-customer text-white border-brand-customer' : 'bg-transparent text-brand-customer border-brand-gray-300 dark:border-brand-gray-600 hover:border-brand-customer'}`}
                                    >
                                        {p}%
                                    </button>
                                )
                             })}
                        </div>
                        <div className="flex items-center">
                             <span className="text-lg font-semibold mr-2 text-brand-gray-400">OMR</span>
                             <input 
                                type="number"
                                placeholder="Custom Tip"
                                value={tipAmount > 0 ? tipAmount.toFixed(3) : ''}
                                onChange={(e) => onTipChange(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-customer focus:border-brand-customer"
                            />
                        </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="bg-white dark:bg-brand-gray-800 rounded-xl shadow p-5">
                         <h3 className="font-bold mb-2">Delivery Info</h3>
                         <div>
                            <label htmlFor="plateNumber" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Car Plate Number</label>
                            <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mb-2">So we can bring your order to you.</p>
                             <input 
                                id="plateNumber"
                                type="text"
                                placeholder="e.g., ABC-123"
                                value={plateNumber}
                                onChange={(e) => onPlateNumberChange(e.target.value.toUpperCase())}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-customer focus:border-brand-customer text-lg font-mono tracking-widest text-center"
                            />
                         </div>
                    </div>
                    
                    {/* Total */}
                    <div className="bg-white dark:bg-brand-gray-800 rounded-xl shadow p-5 space-y-2 text-sm">
                         <div className="flex justify-between">
                            <span className="text-brand-gray-500 dark:text-brand-gray-400">Subtotal</span>
                            <span>OMR {subtotal.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-brand-gray-500 dark:text-brand-gray-400">Tip</span>
                            <span>OMR {tipAmount.toFixed(3)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-brand-gray-500 dark:text-brand-gray-400">Platform Fee</span>
                            <span>OMR {platformFee.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t border-brand-gray-200 dark:border-brand-gray-700 pt-3 mt-3">
                            <span>Total</span>
                            <span className="text-brand-customer">OMR {total.toFixed(3)}</span>
                        </div>
                    </div>

                    <button
                        onClick={onPlaceOrder}
                        disabled={!plateNumber.trim()}
                        className="w-full mt-2 bg-green-500 text-white font-bold py-4 px-4 rounded-xl hover:bg-green-600 transition-colors text-lg shadow-lg hover:shadow-xl disabled:bg-brand-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        Place Order & Pay OMR {total.toFixed(3)}
                    </button>
                    {!plateNumber.trim() && <p className="text-xs text-center text-red-500 mt-2">Please enter a plate number to proceed.</p>}
                     <p className="text-xs text-center text-brand-gray-400 mt-2">Payment is simulated for this demo.</p>
                </div>
            </main>
        </div>
    );
}

export default CheckoutView;