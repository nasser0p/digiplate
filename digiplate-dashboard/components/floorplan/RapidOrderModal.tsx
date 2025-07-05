import React, { useState, useMemo, useEffect } from 'react';
import { collection, Timestamp, query, where, doc, getDoc, getDocs, addDoc, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { MenuItem, Category, CartItem, Order, OrderItem } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { XIcon } from '../icons';
import ItemDetailModal from '../customer/ItemDetailModal';

interface RapidOrderModalProps {
    restaurantId: string;
    tableNumber: string;
    orderIdToAppend?: string;
    onClose: () => void;
    menuItems: MenuItem[];
    categories: Category[];
}

const RapidOrderModal: React.FC<RapidOrderModalProps> = ({
    restaurantId,
    tableNumber,
    orderIdToAppend,
    onClose,
    menuItems: allItems,
    categories
}) => {
    const { t } = useTranslation();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [orderNotes, setOrderNotes] = useState('');
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const filteredMenuItems = useMemo(() => {
        if (!searchTerm) return allItems.filter(item => item.isAvailable);
        return allItems.filter(item => 
            item.isAvailable && item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allItems, searchTerm]);

    const getItemsForCategory = (categoryId: string) => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return [];
        return filteredMenuItems
            .filter(item => item.category === category.name)
            .sort((a,b) => a.order - b.order);
    }

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.basePrice + item.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0)) * item.quantity, 0), [cart]);

    const handleAddToCart = (item: CartItem) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(cartItem => cartItem.cartItemId === item.cartItemId && cartItem.notes === item.notes);
            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingItemIndex].quantity += item.quantity;
                return newCart;
            } else {
                 return [...prevCart, item];
            }
        });
        setSelectedItem(null);
    };

    const handleUpdateQuantity = (cartItemId: string, change: number) => {
        setCart(prevCart => {
            const itemIndex = prevCart.findIndex(item => item.cartItemId === cartItemId);
            if (itemIndex === -1) return prevCart;
            
            const newCart = [...prevCart];
            const newQuantity = newCart[itemIndex].quantity + change;
            
            if (newQuantity <= 0) {
                newCart.splice(itemIndex, 1);
            } else {
                newCart[itemIndex] = { ...newCart[itemIndex], quantity: newQuantity };
            }
            return newCart;
        });
    };
    
    const handleNoteChange = (cartItemId: string, note: string) => {
        setCart(prevCart =>
            prevCart.map(item =>
                item.cartItemId === cartItemId ? { ...item, notes: note } : item
            )
        );
    };


    const handleSelectItem = (item: MenuItem) => {
        if (!item.modifierGroups || item.modifierGroups.length === 0) {
            const cartItemId = item.id;
            const cartItem: CartItem = {
                cartItemId,
                id: item.id,
                name: item.name,
                basePrice: item.price,
                quantity: 1,
                imageUrl: item.imageUrl,
                selectedModifiers: [],
            };
            handleAddToCart(cartItem);
        } else {
            setSelectedItem(item);
        }
    }

    const handleSubmitOrder = async () => {
        if (cart.length === 0) return;
        setLoading(true);

        const orderItems: OrderItem[] = cart.map(cartItem => {
            const newOrderItem: OrderItem = {
                name: cartItem.name,
                menuItemId: cartItem.id,
                price: cartItem.basePrice + cartItem.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0),
                quantity: cartItem.quantity,
                selectedModifiers: cartItem.selectedModifiers,
                isDelivered: false,
            };

            if (cartItem.notes) {
                newOrderItem.notes = cartItem.notes;
            }
            
            return newOrderItem;
        });
        
        try {
            if (orderIdToAppend) {
                const orderRef = doc(db, 'orders', orderIdToAppend);
                const orderSnap = await getDoc(orderRef);
                if (orderSnap.exists()) {
                    const existingOrder = orderSnap.data() as Order;
                    const combinedItems = [...existingOrder.items, ...orderItems];
                    const newSubtotal = combinedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                    const newPlatformFee = newSubtotal * 0.03;
                    const newTotal = newSubtotal + existingOrder.tip + newPlatformFee;

                    await updateDoc(orderRef, {
                        items: combinedItems,
                        subtotal: newSubtotal,
                        platformFee: newPlatformFee,
                        total: newTotal
                    });
                }
            } else {
                const newOrderData: Omit<Order, 'id'> = {
                    items: orderItems,
                    plateNumber: tableNumber,
                    subtotal,
                    tip: 0, // Staff orders don't have tips by default
                    platformFee: subtotal * 0.03,
                    total: subtotal * 1.03,
                    status: 'New',
                    createdAt: Timestamp.now(),
                    userId: restaurantId,
                    notes: orderNotes.trim(),
                };
                await addDoc(collection(db, "orders"), newOrderData);
            }
            onClose();
        } catch (error) {
            console.error("Error creating/updating order:", error);
            alert("Failed to send order.");
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-brand-gray-900 w-full h-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-brand-gray-200 dark:border-brand-gray-800">
                    <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white">{t('rapid_order_title', tableNumber)}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">
                        <XIcon className="w-6 h-6 text-brand-gray-500"/>
                    </button>
                </header>

                <div className="flex-grow flex overflow-hidden">
                    {/* Left Panel: Menu */}
                    <div className="w-3/5 flex flex-col border-e border-brand-gray-200 dark:border-brand-gray-800">
                        <div className="p-4 flex-shrink-0">
                            <input
                                type="text"
                                placeholder={t('rapid_order_search_items')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                            />
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {categories.map(category => {
                                const itemsInCategory = getItemsForCategory(category.id);
                                if (itemsInCategory.length === 0) return null;
                                return (
                                <section key={category.id} className="p-4 pt-0 mb-4">
                                    <h3 className="text-sm font-bold text-brand-gray-500 dark:text-brand-gray-400 uppercase tracking-wider mb-2">{category.name}</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {itemsInCategory.map(item => (
                                            <button 
                                                key={item.id}
                                                onClick={() => handleSelectItem(item)}
                                                className="w-full text-left p-2 rounded-lg hover:bg-brand-gray-100 dark:hover:bg-brand-gray-800/50 transition-all border border-transparent hover:border-brand-gray-200 dark:hover:border-brand-gray-700 hover:shadow-md group"
                                            >
                                                <div className="w-full h-24 rounded-md mb-2 overflow-hidden bg-brand-gray-200 dark:bg-brand-gray-700">
                                                    <img 
                                                        src={item.imageUrl || `https://placehold.co/200x150/1f2937/e5e7eb?text=${encodeURIComponent(item.name)}`} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                                    />
                                                </div>
                                                <div className="flex justify-between items-start">
                                                    <span className="font-semibold text-sm text-brand-gray-800 dark:text-brand-gray-200">{item.name}</span>
                                                    <span className="text-xs font-mono text-brand-gray-600 dark:text-brand-gray-400">OMR {item.price.toFixed(3)}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )})}
                        </div>
                    </div>

                    {/* Right Panel: Ticket */}
                    <div className="w-2/5 flex flex-col bg-brand-gray-50 dark:bg-brand-gray-800/50">
                        <div className="p-4 flex-shrink-0">
                            <h3 className="text-lg font-bold text-brand-gray-800 dark:text-white">{t('rapid_order_live_ticket')}</h3>
                        </div>
                        <div className="flex-grow overflow-y-auto px-4 space-y-3">
                           {cart.length === 0 && <p className="text-center text-brand-gray-500 p-8">{t('rapid_order_no_items')}</p>}
                           {cart.map(item => (
                               <div key={item.cartItemId} className="bg-white dark:bg-brand-gray-700 p-3 rounded-lg shadow-sm">
                                   <div className="flex justify-between items-center">
                                       <span className="font-semibold">{item.name}</span>
                                       <div className="flex items-center gap-2">
                                           <button onClick={() => handleUpdateQuantity(item.cartItemId, -1)} className="w-6 h-6 rounded-full border text-lg font-bold flex items-center justify-center">-</button>
                                           <span className="font-bold w-4 text-center">{item.quantity}</span>
                                           <button onClick={() => handleUpdateQuantity(item.cartItemId, 1)} className="w-6 h-6 rounded-full border text-lg font-bold flex items-center justify-center">+</button>
                                       </div>
                                   </div>
                                    <div className="text-xs text-brand-gray-500 dark:text-brand-gray-400 pl-1 pt-1">
                                       {item.selectedModifiers.length > 0 && (
                                           <p>{item.selectedModifiers.map(m => `+ ${m.optionName}`).join(', ')}</p>
                                       )}
                                       <input
                                            type="text"
                                            placeholder={t('rapid_order_item_note_placeholder')}
                                            value={item.notes || ''}
                                            onChange={(e) => handleNoteChange(item.cartItemId, e.target.value)}
                                            className="w-full text-xs p-1 mt-1 rounded border bg-brand-gray-50 dark:bg-brand-gray-600 border-brand-gray-200 dark:border-brand-gray-500"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                   </div>
                               </div>
                           ))}
                        </div>
                        <div className="flex-shrink-0 px-4 pb-4">
                            <label htmlFor="orderNotes" className="text-sm font-semibold text-brand-gray-600 dark:text-brand-gray-300">{t('rapid_order_notes_label')}</label>
                            <textarea
                                id="orderNotes"
                                value={orderNotes}
                                onChange={(e) => setOrderNotes(e.target.value)}
                                placeholder={t('rapid_order_notes_placeholder')}
                                rows={2}
                                className="mt-1 block w-full px-3 py-2 text-sm bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                            />
                        </div>
                        <footer className="flex-shrink-0 p-4 border-t border-brand-gray-200 dark:border-brand-gray-700 space-y-3">
                           <div className="flex justify-between font-semibold">
                               <span>{t('rapid_order_subtotal')}</span>
                               <span>OMR {subtotal.toFixed(3)}</span>
                           </div>
                           <div className="flex justify-between font-bold text-xl">
                               <span>{t('rapid_order_total')}</span>
                               <span>OMR {(subtotal * 1.03).toFixed(3)}</span>
                           </div>
                           <button 
                                onClick={handleSubmitOrder} 
                                disabled={cart.length === 0 || loading}
                                className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors disabled:bg-green-300"
                           >
                               {loading ? t('common_saving') : (orderIdToAppend ? t('rapid_order_add_to_order') : t('rapid_order_send_to_kitchen'))}
                           </button>
                        </footer>
                    </div>
                </div>
            </div>
            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onAddToCart={handleAddToCart}
                />
            )}
        </div>
    );
};

export default RapidOrderModal;