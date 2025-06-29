import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, Timestamp, query, where, doc, getDoc, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { MenuItem, CartItem, Store, RestaurantProfile, OrderItem, Category } from '../../types';
import CustomerItemCard from './CustomerItemCard';
import Cart from './Cart';
import ItemDetailModal from './ItemDetailModal';
import CheckoutView from './CheckoutView';
import CustomerOrderTracker from './CustomerOrderTracker';
import ActiveOrdersButton from './ActiveOrdersButton';
import SlideInPanel from '../ui/SlideInPanel';
import { useTranslation } from '../../contexts/LanguageContext';

const darkenColor = (hex: string, percent: number): string => {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    r = Math.floor(r * (100 - percent) / 100);
    g = Math.floor(g * (100 - percent) / 100);
    b = Math.floor(b * (100 - percent) / 100);

    return `#${('00' + r.toString(16)).slice(-2)}${('00' + g.toString(16)).slice(-2)}${('00' + b.toString(16)).slice(-2)}`;
};


interface CustomerMenuPageProps {
    storeId?: string;
    restaurantId: string;
}

type View = 'menu' | 'checkout';

const CustomerMenuPage: React.FC<CustomerMenuPageProps> = ({ storeId, restaurantId }) => {
    const { t } = useTranslation();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [profile, setProfile] = useState<RestaurantProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<View>('menu');
    const [tipAmount, setTipAmount] = useState(0);
    const [plateNumber, setPlateNumber] = useState('');
    const [storeName, setStoreName] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [activeOrderIds, setActiveOrderIds] = useState<string[]>([]);
    const [isTrackingPanelOpen, setIsTrackingPanelOpen] = useState(false);
    const [justOrdered, setJustOrdered] = useState(false);

    const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

    useEffect(() => {
        const brandColor = profile?.customerBranding?.brandColor || '#28a7a1';
        document.documentElement.style.setProperty('--brand-color-customer', brandColor);
        document.documentElement.style.setProperty('--brand-color-customer-dark', darkenColor(brandColor, 10));
        
        return () => {
            document.documentElement.style.removeProperty('--brand-color-customer');
            document.documentElement.style.removeProperty('--brand-color-customer-dark');
        }
    }, [profile]);

    useEffect(() => {
        if (!restaurantId) {
            setError(t('customer_menu_error_no_restaurant'));
            setLoading(false);
            return;
        }
        setLoading(true);

        const profileRef = doc(db, "restaurantProfiles", restaurantId);
        getDoc(profileRef).then(docSnap => {
            if (docSnap.exists()) {
                setProfile(docSnap.data() as RestaurantProfile);
            }
        });

        if (storeId) {
            const storeRef = doc(db, "stores", storeId);
            getDoc(storeRef).then(docSnap => {
                if (docSnap.exists()) {
                    setStoreName((docSnap.data() as Store).name);
                }
            });
        }
        
        const fetchData = async () => {
            try {
                const categoriesQuery = query(collection(db, "categories"), where("userId", "==", restaurantId), orderBy("order", "asc"));
                const categoriesSnapshot = await getDocs(categoriesQuery);
                const fetchedCategories = categoriesSnapshot.docs.map(doc => ({...doc.data(), id: doc.id}) as Category);
                setCategories(fetchedCategories);

                const menuItemsQuery = query(
                    collection(db, "menuItems"), 
                    where("userId", "==", restaurantId)
                );
                const menuItemsSnapshot = await getDocs(menuItemsQuery);
                const fetchedItems = menuItemsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id}) as MenuItem);
                setMenuItems(fetchedItems);
                
                if (fetchedItems.length === 0) {
                     setError(t('customer_menu_error_no_items'));
                }

            } catch (err: any) {
                console.error("Firebase menu snapshot error:", err);
                setError(t('customer_menu_error_could_not_load'));
            } finally {
                setLoading(false);
            }
        }
        
        fetchData();

    }, [restaurantId, storeId, t]);

    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0].id);
        }
    }, [categories, activeCategory]);

    useEffect(() => {
        const observerOptions = {
            rootMargin: '-30% 0px -70% 0px', // When the category is in the middle 30% of the viewport
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveCategory(entry.target.id);
                }
            });
        }, observerOptions);

        const refs = categoryRefs.current;
        Object.values(refs).forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => {
            Object.values(refs).forEach(ref => {
                if (ref) observer.unobserve(ref);
            });
        };
    }, [categories, menuItems]); // Re-run observer when content changes

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.basePrice + item.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0)) * item.quantity, 0), [cart]);
    const platformFee = useMemo(() => subtotal * 0.03, [subtotal]);
    const total = useMemo(() => subtotal + tipAmount + platformFee, [subtotal, tipAmount, platformFee]);

    const handleAddToCart = (item: CartItem) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(cartItem => cartItem.cartItemId === item.cartItemId);
            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingItemIndex].quantity += item.quantity;
                return newCart;
            } else {
                 return [...prevCart, item];
            }
        });
        setSelectedItem(null); // Close modal on add
        setToastMessage(t('customer_menu_toast_added', item.quantity, item.name));
        setTimeout(() => setToastMessage(null), 2500);
    };

    const handleUpdateQuantity = (cartItemId: string, quantity: number) => {
        setCart(prevCart => {
            if (quantity <= 0) {
                return prevCart.filter(item => item.cartItemId !== cartItemId);
            }
            return prevCart.map(item => item.cartItemId === cartItemId ? { ...item, quantity } : item);
        });
    };

    const handleProceedToCheckout = () => {
        if (cart.length > 0) {
            setView('checkout');
        }
    }

    const handlePlaceOrder = async () => {
        if (cart.length === 0 || !plateNumber.trim()) return;

        const orderItems: OrderItem[] = cart.map(cartItem => ({
            name: cartItem.name,
            menuItemId: cartItem.id, // Important for recipe lookup
            price: cartItem.basePrice + cartItem.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0),
            quantity: cartItem.quantity,
            selectedModifiers: cartItem.selectedModifiers,
        }));

        const newOrder: any = {
            items: orderItems,
            plateNumber: plateNumber.trim(),
            subtotal,
            tip: tipAmount,
            platformFee,
            total,
            status: 'New' as const,
            createdAt: Timestamp.now(),
            userId: restaurantId,
        };
        
        if (storeId) {
            newOrder.storeId = storeId;
            newOrder.storeName = storeName || "Store";
        }

        try {
            const docRef = await addDoc(collection(db, "orders"), newOrder);
            
            if (profile?.isLiveTrackingEnabled ?? true) {
                setActiveOrderIds(prev => [...prev, docRef.id]);
                setIsTrackingPanelOpen(true);
                setJustOrdered(true);
                setTimeout(() => setJustOrdered(false), 500);
            }

            setCart([]);
            setTipAmount(0);
            setPlateNumber('');
            setView('menu');
            setToastMessage(t('customer_menu_toast_order_placed'));
            setTimeout(() => setToastMessage(null), 2500);
        } catch (error) {
            console.error("Error placing order: ", error);
            alert(t('customer_menu_alert_order_failed'));
        }
    };
    
    const handleDismissOrder = (orderIdToRemove: string) => {
        setActiveOrderIds(prev => prev.filter(id => id !== orderIdToRemove));
    };

    const handleSelectItem = (item: MenuItem) => {
        if (!item.isAvailable) return;
        
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

    const scrollToCategory = (categoryId: string) => {
        categoryRefs.current[categoryId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const getItemsForCategory = (categoryName: string) => {
        return menuItems
            .filter(item => item.category === categoryName)
            .sort((a,b) => a.order - b.order);
    }

    if (loading) {
        return <div className="flex justify-center items-center h-screen bg-gray-50">{t('customer_menu_loading')}</div>;
    }
    
    if (error) {
        return <div className="flex justify-center items-center h-screen bg-gray-50 text-red-500">{error}</div>;
    }

    if (view === 'checkout') {
        return <CheckoutView 
            cart={cart}
            subtotal={subtotal}
            tipAmount={tipAmount}
            platformFee={platformFee}
            total={total}
            plateNumber={plateNumber}
            onPlateNumberChange={setPlateNumber}
            onTipChange={setTipAmount}
            onPlaceOrder={handlePlaceOrder}
            onBack={() => setView('menu')}
            restaurantName={profile?.name}
        />
    }

    return (
        <div className="bg-brand-gray-50 dark:bg-brand-gray-900 min-h-screen font-sans">
            <header className="bg-white/80 dark:bg-brand-gray-900/80 backdrop-blur-md shadow-sm p-4 sticky top-0 z-10">
                <div className="flex items-center space-x-4 rtl:space-x-reverse max-w-5xl mx-auto">
                    {profile?.logoUrl && <img src={profile.logoUrl} alt="Restaurant Logo" className="h-12 w-12 object-cover rounded-full shadow-md" />}
                    <div>
                        <h1 className="text-2xl font-bold text-brand-gray-800 dark:text-white">{profile?.name || t('customer_menu_welcome')}</h1>
                        <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 font-medium">{profile?.address}</p>
                    </div>
                </div>
            </header>

            <div className="sticky top-[88px] bg-white/80 dark:bg-brand-gray-900/80 backdrop-blur-md z-10 shadow-sm overflow-hidden">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex space-x-4 rtl:space-x-reverse overflow-x-auto py-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => scrollToCategory(category.id)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
                                    activeCategory === category.id
                                    ? 'bg-brand-customer text-white'
                                    : 'bg-brand-gray-200 dark:bg-brand-gray-800 text-brand-gray-700 dark:text-brand-gray-300 hover:bg-brand-gray-300 dark:hover:bg-brand-gray-700'
                                }`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto p-4 pb-40">
                {categories.length === 0 && !loading && (
                    <div className="text-center py-10">
                        <p className="text-gray-500">{t('customer_menu_no_items_placeholder')}</p>
                    </div>
                )}
                {categories.map(category => (
                    <section 
                        key={category.id} 
                        id={category.id}
                        ref={el => { categoryRefs.current[category.id] = el; }}
                        className="mb-8 pt-4 scroll-mt-32"
                    >
                        <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white mb-4">{category.name}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {getItemsForCategory(category.name).map(item => (
                                <CustomerItemCard key={item.id} item={item} onSelectItem={handleSelectItem} />
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {(profile?.isLiveTrackingEnabled ?? true) && activeOrderIds.length > 0 && (
                <ActiveOrdersButton
                    orderCount={activeOrderIds.length}
                    onClick={() => setIsTrackingPanelOpen(true)}
                    animate={justOrdered}
                />
            )}
            
            {(profile?.isLiveTrackingEnabled ?? true) && (
                <SlideInPanel isOpen={isTrackingPanelOpen} onClose={() => setIsTrackingPanelOpen(false)}>
                    <div className="h-full flex flex-col bg-brand-gray-50 dark:bg-brand-gray-900">
                        <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white p-6 pb-2">
                            {t('customer_menu_active_orders_title')}
                        </h2>
                        <div className="flex-grow overflow-y-auto p-6 pt-2 space-y-4">
                            {[...activeOrderIds].reverse().map(id => (
                                <CustomerOrderTracker
                                    key={id}
                                    orderId={id}
                                    onDismiss={handleDismissOrder}
                                />
                            ))}
                            {activeOrderIds.length === 0 && <p className="text-center text-brand-gray-500 pt-10">{t('customer_menu_no_active_orders')}</p>}
                        </div>
                    </div>
                </SlideInPanel>
            )}
            
            <Cart 
                cart={cart}
                onUpdateQuantity={handleUpdateQuantity}
                onProceedToCheckout={handleProceedToCheckout}
            />

            <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="bg-brand-gray-800 text-white font-semibold py-2 px-5 rounded-full shadow-lg">
                    {toastMessage}
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

export default CustomerMenuPage;