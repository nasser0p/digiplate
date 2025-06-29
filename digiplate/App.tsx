import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MenuPage from './components/menu/MenuPage';
import OrdersPage from './components/OrdersPage';
import StoresPage from './components/StoresPage';
import SettingsPage from './components/SettingsPage';
import CustomerMenuPage from './components/customer/CustomerMenuPage';
import AuthPage from './components/AuthPage';
import Tour from './components/Tour';
import { RestaurantProfile, Store, Role, StaffMember } from './types';
import OnboardingWizard from './components/OnboardingWizard';
import { useTranslation } from './contexts/LanguageContext';
import InventoryPage from './components/inventory/InventoryPage';

export type Page = 'Dashboard' | 'Menus' | 'Orders' | 'Inventory' | 'Stores' | 'Settings';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [restaurantOwnerId, setRestaurantOwnerId] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState<'admin' | 'customer'>('admin');
  const [customerParams, setCustomerParams] = useState<{storeId?: string, restaurantId: string} | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  
  // Notification State
  const [hasUnseenOrder, setHasUnseenOrder] = useState(false);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const titleIntervalRef = useRef<number | null>(null);
  const originalTitleRef = useRef(document.title);

  // Tour state
  const [isTourActive, setIsTourActive] = useState(false);
  const { t } = useTranslation();


  useEffect(() => {
    notificationAudioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3');
  }, []);

  const handleNewOrder = useCallback(() => {
    if (activePage !== 'Orders') {
        setHasUnseenOrder(true);
        notificationAudioRef.current?.play().catch(e => console.error("Error playing sound:", e));
    }
  }, [activePage]);

  useEffect(() => {
    if (hasUnseenOrder) {
        if (!titleIntervalRef.current) {
            titleIntervalRef.current = window.setInterval(() => {
                document.title = document.title === originalTitleRef.current ? t('app_new_order_notification') : originalTitleRef.current;
            }, 1000);
        }
    } else {
        if (titleIntervalRef.current) {
            clearInterval(titleIntervalRef.current);
            titleIntervalRef.current = null;
        }
        document.title = originalTitleRef.current;
    }

    return () => {
        if (titleIntervalRef.current) {
            clearInterval(titleIntervalRef.current);
        }
    }
  }, [hasUnseenOrder, t]);
  
  const handleSetActivePage = (page: Page) => {
    setActivePage(page);
    if (page === 'Orders') {
        setHasUnseenOrder(false);
    }
  }

  const handleCompleteTour = async () => {
    setIsTourActive(false);
    if (user && role === 'admin') {
        try {
            const profileRef = doc(db, 'restaurantProfiles', user.uid);
            await setDoc(profileRef, { hasCompletedTour: true }, { merge: true });
            setProfile(p => p ? { ...p, hasCompletedTour: true } : null);
        } catch (error) {
            console.error("Failed to update tour status:", error);
        }
    }
  };


  const loadUserProfile = async (user: User) => {
        // 1. Check if user is an owner/admin
        const profileRef = doc(db, 'restaurantProfiles', user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
            const profileData = profileSnap.data() as RestaurantProfile;
            setProfile(profileData);
            setRole('admin');
            setRestaurantOwnerId(user.uid);
            if (profileData.onboardingCompleted && !profileData.hasCompletedTour) {
                setTimeout(() => setIsTourActive(true), 1000);
            }
            return true;
        }

        // 2. Check if user is a staff member
        const staffRef = doc(db, 'staff', user.uid);
        const staffSnap = await getDoc(staffRef);

        if (staffSnap.exists()) {
            const staffData = staffSnap.data() as Omit<StaffMember, 'id'>;
            const ownerProfileRef = doc(db, 'restaurantProfiles', staffData.restaurantId);
            const ownerProfileSnap = await getDoc(ownerProfileRef);
            
            if (ownerProfileSnap.exists()) {
                setProfile(ownerProfileSnap.data() as RestaurantProfile);
                setRole(staffData.role);
                setRestaurantOwnerId(staffData.restaurantId);
            } else {
                console.error("Staff member for a restaurant that doesn't exist.");
                setProfile(null); setRole(null); setRestaurantOwnerId(null);
            }
            return true;
        }
        return false;
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const restaurantIdParam = urlParams.get('restaurantId');
    const storeIdParam = urlParams.get('storeId');
    
    if (viewParam === 'customer' && restaurantIdParam) {
      setView('customer');
      setCustomerParams({
        storeId: storeIdParam || undefined,
        restaurantId: restaurantIdParam
      });
      setLoading(false);
      return;
    }
    
    setView('admin');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            const isExistingUser = await loadUserProfile(user);

            if (!isExistingUser && user.email) {
                 // 3. New user, check for invites using a direct lookup
                const inviteRef = doc(db, 'invites', user.email);
                const inviteSnap = await getDoc(inviteRef);

                if (inviteSnap.exists()) {
                    const invite = inviteSnap.data();

                    // Create staff document
                    const staffDocRef = doc(db, 'staff', user.uid);
                    const staffData = {
                        restaurantId: invite.restaurantId,
                        role: invite.role,
                        email: user.email,
                        name: invite.name || user.displayName || user.email,
                    };
                    await setDoc(staffDocRef, staffData);
                    await deleteDoc(inviteRef);

                    // Now that the staff doc is created, reload their profile
                    await loadUserProfile(user);
                } else {
                    // Truly new user, proceed to onboarding
                    setProfile(null); setRole(null); setRestaurantOwnerId(null);
                }
            }
        } else {
            setProfile(null); setRole(null); setRestaurantOwnerId(null);
        }
        setUser(user);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (restaurantOwnerId) {
        const storesQuery = query(collection(db, "stores"), where("userId", "==", restaurantOwnerId));
        const unsubscribeStores = onSnapshot(storesQuery, (snapshot) => {
            setStores(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Store[]);
        });
        return () => unsubscribeStores();
    } else {
        setStores([]);
    }
  }, [restaurantOwnerId]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  const renderAdminPage = () => {
    if (!user || !restaurantOwnerId) return null;
    
    const pageProps = {
        userId: restaurantOwnerId,
        role: role
    };

    switch(activePage) {
      case 'Dashboard':
        return <Dashboard {...pageProps} stores={stores} />;
      case 'Menus':
        return <MenuPage {...pageProps} />;
      case 'Orders':
        return <OrdersPage {...pageProps} onNewOrder={handleNewOrder} profile={profile} stores={stores} />;
      case 'Inventory':
        return <InventoryPage {...pageProps} />;
      case 'Stores':
        return <StoresPage {...pageProps} profile={profile} stores={stores} />;
      case 'Settings':
        return <SettingsPage userId={restaurantOwnerId} onProfileUpdate={setProfile} role={role} />;
      default:
        return <Dashboard {...pageProps} stores={stores} />;
    }
  }
  
  if (loading) {
      return <div className="flex justify-center items-center h-screen bg-brand-gray-50 dark:bg-brand-gray-900">{t('common_loading')}</div>;
  }
  
  if (view === 'customer' && customerParams) {
      return <CustomerMenuPage 
        storeId={customerParams.storeId}
        restaurantId={customerParams.restaurantId} 
      />;
  }

  if (!user) {
      return <AuthPage />;
  }

  if (user && !restaurantOwnerId) {
    return <OnboardingWizard user={user} onComplete={(newProfile) => {
        setProfile(newProfile);
        setRole('admin');
        setRestaurantOwnerId(user.uid);
        if (!newProfile.hasCompletedTour) {
            setTimeout(() => setIsTourActive(true), 500);
        }
    }} />;
  }


  return (
    <div className={`flex h-screen bg-brand-gray-50 dark:bg-brand-gray-900 text-brand-gray-800 dark:text-brand-gray-200`}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        activePage={activePage}
        setActivePage={handleSetActivePage}
        onLogout={handleLogout}
        hasUnseenOrder={hasUnseenOrder}
        role={role}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          pageTitle={activePage}
          userId={restaurantOwnerId || ''}
          profile={profile}
          role={role}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-gray-100 dark:bg-brand-gray-800 p-4 sm:p-6 lg:p-8">
          {renderAdminPage()}
        </main>
      </div>
      {isTourActive && role === 'admin' && (
        <Tour
          onComplete={handleCompleteTour}
          onNavigate={handleSetActivePage}
        />
      )}
    </div>
  );
};

export default App;