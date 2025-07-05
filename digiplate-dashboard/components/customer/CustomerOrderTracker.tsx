


import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, OrderStatus } from '../../types';
import { CheckIcon, BellIcon, PartyPopperIcon } from '../icons';
import { useTranslation } from '../../contexts/LanguageContext';

interface CustomerOrderTrackerProps {
    orderId: string;
    onDismiss: (orderId: string) => void;
}

const CustomerOrderTracker: React.FC<CustomerOrderTrackerProps> = ({ orderId, onDismiss }) => {
    const { t } = useTranslation();
    const [order, setOrder] = useState<Order | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderId) {
            setError("No order to track.");
            setLoading(false);
            return;
        }

        const orderRef = doc(db, 'orders', orderId);
        const unsubscribe = onSnapshot(orderRef, (docSnap) => {
            if (docSnap.exists()) {
                setOrder({ ...(docSnap.data() as Order), id: docSnap.id });
            } else {
                setError("This order could not be found.");
            }
            setLoading(false);
        }, (err) => {
            console.error("Error tracking order:", err);
            setError("Could not track the order status.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [orderId]);

    const getStepStatus = (stepStatus: OrderStatus, currentStatus: OrderStatus | undefined): 'active' | 'complete' | 'pending' => {
        if (!currentStatus) return 'pending';
        
        const statusOrder: OrderStatus[] = ['New', 'In Progress', 'Ready', 'Completed'];
        const stepIndex = statusOrder.indexOf(stepStatus);
        const currentIndex = statusOrder.indexOf(currentStatus);
        
        if (currentIndex > stepIndex) return 'complete';
        if (currentIndex === stepIndex) return 'active';
        return 'pending';
    };

    const StepperStep = ({ icon, title, status }: { icon: React.ReactNode, title: string, status: 'active' | 'complete' | 'pending' }) => {
        const statusClasses = {
            active: 'bg-brand-customer text-white',
            complete: 'bg-green-500 text-white',
            pending: 'bg-brand-gray-200 dark:bg-brand-gray-700 text-brand-gray-400 dark:text-brand-gray-500',
        };
        return (
            <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${statusClasses[status]}`}>
                    {status === 'complete' ? <CheckIcon className="w-5 h-5" /> : icon}
                </div>
                <p className={`mt-2 text-xs font-semibold transition-colors ${status === 'pending' ? 'text-brand-gray-400' : 'text-brand-gray-800 dark:text-white'}`}>{title}</p>
            </div>
        );
    }
    
    const StepperLine = ({ status }: { status: 'active' | 'complete' | 'pending' }) => (
        <div className={`flex-1 h-1 rounded-full mx-2 transition-colors duration-300 ${status === 'complete' ? 'bg-green-500' : 'bg-brand-gray-200 dark:bg-brand-gray-700'}`}></div>
    );

    if (loading) {
        return <div className="bg-white dark:bg-brand-gray-800 p-4 rounded-xl shadow-md animate-pulse">Loading order...</div>;
    }
    
    if (error) {
        return <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-xl shadow-md text-red-700 dark:text-red-300">{error}</div>;
    }

    if (!order) {
        return null; // Or a placeholder for a missing order
    }

    return (
        <div className="bg-white dark:bg-brand-gray-800 p-5 rounded-2xl shadow-lg border border-brand-gray-200 dark:border-brand-gray-700">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-lg text-brand-gray-800 dark:text-white">{t('customer_tracker_plate', order.plateNumber || '')}</h3>
                    <p className="text-xs text-brand-gray-500">ID: {order.id.substring(0, 8)}</p>
                </div>
                {order.status === 'Completed' && (
                    <button
                        onClick={() => onDismiss(order.id)}
                        className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-1 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
                    >
                        {t('customer_tracker_dismiss')}
                    </button>
                )}
            </div>
            
            {order.status === 'Completed' ? (
                <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                    <PartyPopperIcon className="w-8 h-8"/>
                    <span className="font-bold text-lg">{t('customer_tracker_completed_message')}</span>
                </div>
            ) : (
                <div className="flex items-center w-full">
                    <StepperStep 
                        icon={<CheckIcon className="w-5 h-5" />}
                        title={t('customer_tracker_step_confirmed')}
                        status={getStepStatus('New', order.status)}
                    />
                    <StepperLine status={getStepStatus('New', order.status)} />
                    <StepperStep 
                        icon={<BellIcon className="w-5 h-5" />}
                        title={t('customer_tracker_step_preparing')}
                        status={getStepStatus('In Progress', order.status)}
                    />
                    <StepperLine status={getStepStatus('In Progress', order.status)} />
                    <StepperStep 
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.97l-1.9 3.8a2 2 0 00.342 2.345l1.224 1.224a2 2 0 00.741.523V20m0 0a2 2 0 01-2 2H7m0 0a2 2 0 01-2-2V7a2 2 0 012-2h2.5"></path></svg>}
                        title={t('customer_tracker_step_ready')}
                        status={getStepStatus('Ready', order.status)}
                    />
                </div>
            )}
        </div>
    );
};

export default CustomerOrderTracker;