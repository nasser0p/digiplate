import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { doc, onSnapshot, setDoc, collection, query, where, updateDoc, getDoc, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Role, FloorPlan, Order, FloorPlanTable, TableStatus, RestaurantProfile, MenuItem, Category } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import FloorPlanEditor from './FloorPlanEditor';
import LiveFloorPlanView from './LiveFloorPlanView';
import FloorPlanDetailsPanel from './FloorPlanDetailsPanel';
import PrintableTicket from '../PrintableTicket';
import RapidOrderModal from './RapidOrderModal';


interface FloorPlanPageProps {
    userId: string;
    role: Role | null;
    profile: RestaurantProfile | null;
}

const FloorPlanPage: React.FC<FloorPlanPageProps> = ({ userId, role, profile }) => {
    const { t } = useTranslation();
    const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'live' | 'edit'>('live');
    
    const [selectedTable, setSelectedTable] = useState<(FloorPlanTable & { status: TableStatus }) | null>(null);
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
    const [rapidOrderContext, setRapidOrderContext] = useState<{ tableNumber: string, orderIdToAppend?: string} | null>(null);


    const canEdit = role === 'admin' || role === 'manager';

    useEffect(() => {
        if (orderToPrint && profile) {
            const printContainer = document.getElementById('printable-content');
            if (printContainer) {
                const root = createRoot(printContainer);
                root.render(
                    <React.StrictMode>
                        <PrintableTicket order={orderToPrint} profile={profile} />
                    </React.StrictMode>
                );

                const timer = setTimeout(() => {
                    window.print();
                    root.unmount();
                    setOrderToPrint(null);
                }, 200);

                return () => clearTimeout(timer);
            }
        }
    }, [orderToPrint, profile]);

    useEffect(() => {
        if (!userId) return;

        const planRef = doc(db, 'floorPlans', userId);
        const unsubPlan = onSnapshot(planRef, (docSnap) => {
            if (docSnap.exists()) {
                setFloorPlan(docSnap.data() as FloorPlan);
            } else {
                setFloorPlan(null);
            }
            if(loading) setLoading(false);
        }, (error) => {
            console.error("Floor plan snapshot error:", error);
            if(loading) setLoading(false);
        });
        
        const activeOrdersQuery = query(collection(db, 'orders'), where('userId', '==', userId), where('status', 'in', ['New', 'In Progress', 'Ready']));
        const unsubOrders = onSnapshot(activeOrdersQuery, (querySnapshot) => {
            const fetchedOrders = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Order));
            setOrders(fetchedOrders);
        });
        
        const menuItemsQuery = query(collection(db, 'menuItems'), where('userId', '==', userId));
        const unsubMenuItems = onSnapshot(menuItemsQuery, (snapshot) => {
            setMenuItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem)));
        });

        const categoriesQuery = query(collection(db, "categories"), where("userId", "==", userId));
        const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
            const cats = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Category[];
            setCategories(cats.sort((a,b) => a.order - b.order));
        });

        return () => {
            unsubPlan();
            unsubOrders();
            unsubMenuItems();
            unsubCategories();
        };
    }, [userId, loading]);
    
    const tablesWithStatus = useMemo(() => {
        if (!floorPlan) return [];

        const orderMap = new Map<string, Order>();
        orders.forEach(order => {
            if (order.plateNumber) {
                const plateKey = order.plateNumber.toUpperCase();
                const existingOrder = orderMap.get(plateKey);
                if (!existingOrder || order.createdAt.seconds > existingOrder.createdAt.seconds) {
                    orderMap.set(plateKey, order);
                }
            }
        });

        return floorPlan.tables.map(table => {
            const order = orderMap.get(table.label.toUpperCase());
            let status: TableStatus = 'available';

            if (order) {
                const orderAgeMinutes = (Date.now() - order.createdAt.seconds * 1000) / 60000;
                status = (order.status === 'New' || order.status === 'In Progress') && orderAgeMinutes > 15 
                    ? 'attention' 
                    : 'ordered';
            } else if (table.status && (table.status === 'seated' || table.status === 'needs_cleaning')) {
                status = table.status;
            }

            return { 
                ...table, 
                status, 
                order: order || null
            };
        });
    }, [floorPlan, orders]);


    const occupancy = useMemo(() => {
        const filled = tablesWithStatus.filter(t => t.status === 'seated' || t.status === 'ordered' || t.status === 'attention').length;
        return { filled, total: tablesWithStatus.length };
    }, [tablesWithStatus]);

    const liveRevenue = useMemo(() => {
        return orders.reduce((acc, order) => {
            const tableOnPlan = floorPlan?.tables.find(t => t.label.toUpperCase() === order.plateNumber?.toUpperCase());
            return tableOnPlan ? acc + order.total : acc;
        }, 0);
    }, [orders, floorPlan]);
    
    const handleSelectTable = (table: FloorPlanTable & { status: TableStatus }) => {
        if (role !== 'kitchen_staff' && (table.status === 'available' || table.status === 'seated')) {
            setRapidOrderContext({ tableNumber: table.label });
        } else {
            setSelectedTable(table);
        }
    };

    const handleUpdateTableStatus = async (tableId: string, status: TableStatus) => {
        if (!floorPlan) return;
        const newTables = floorPlan.tables.map(t => t.id === tableId ? { ...t, status } : t);
        const planRef = doc(db, 'floorPlans', floorPlan.id);
        await updateDoc(planRef, { tables: newTables });
        setSelectedTable(null);
    };

    const handleUpdateOrderItemStatus = async (orderId: string, itemIndex: number, newStatus: boolean) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderToUpdate = orders.find(o => o.id === orderId) || null;
        if (orderToUpdate) {
            const updatedItems = [...orderToUpdate.items];
            if (updatedItems[itemIndex]) {
                updatedItems[itemIndex].isDelivered = newStatus;
                await updateDoc(orderRef, { items: updatedItems });
            }
        }
    };

    const handleCancelItem = async (orderId: string, itemIndex: number) => {
        if (!window.confirm(t('floor_plan_cancel_item_confirm'))) {
            return;
        }

        const orderToUpdate = orders.find(o => o.id === orderId);
        if (!orderToUpdate) {
            console.error("Order not found");
            return;
        }

        const batch = writeBatch(db);
        const orderRef = doc(db, 'orders', orderId);

        if (orderToUpdate.items.length === 1) {
            // Last item, delete the order and update table status
            batch.delete(orderRef);

            if (floorPlan && orderToUpdate.plateNumber) {
                const tableLabel = orderToUpdate.plateNumber.toUpperCase();
                const newTables = floorPlan.tables.map(table =>
                    table.label.toUpperCase() === tableLabel
                    ? { ...table, status: 'seated' } // Revert to seated status
                    : table
                );
                batch.update(doc(db, 'floorPlans', userId), { tables: newTables });
            }
        } else {
            // More than one item, just remove the specific item
            const newItems = [...orderToUpdate.items];
            newItems.splice(itemIndex, 1);

            const newSubtotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const newPlatformFee = newSubtotal * 0.03; // Recalculate fee
            const newTotal = newSubtotal + orderToUpdate.tip + newPlatformFee; // Use existing tip

            batch.update(orderRef, {
                items: newItems,
                subtotal: newSubtotal,
                platformFee: newPlatformFee,
                total: newTotal
            });
        }

        try {
            await batch.commit();
            setSelectedTable(null); // Close panel on success
        } catch (error) {
            console.error("Failed to cancel item/order:", error);
            alert("Error: Could not cancel the item.");
        }
    };


    const handleMarkOrderAsComplete = async (orderId: string) => {
        const orderToComplete = orders.find(o => o.id === orderId);
        if (!orderToComplete) return;

        const batch = writeBatch(db);

        // Deduct ingredients
        const deductions = new Map<string, number>();
        orderToComplete.items.forEach(orderItem => {
            const menuItem = menuItems.find(mi => mi.id === orderItem.menuItemId);
            if (menuItem?.recipe) {
                menuItem.recipe.forEach(recipeItem => {
                    const totalDeduction = recipeItem.quantity * orderItem.quantity;
                    deductions.set(recipeItem.ingredientId, (deductions.get(recipeItem.ingredientId) || 0) + totalDeduction);
                });
            }
        });

        deductions.forEach((quantityToDeduct, ingredientId) => {
            batch.update(doc(db, 'ingredients', ingredientId), { stock: increment(-quantityToDeduct) });
        });

        // Update order status
        batch.update(doc(db, 'orders', orderId), { status: 'Completed' });

        // Update table status
        if (floorPlan && orderToComplete.plateNumber) {
            const newTables = floorPlan.tables.map(table => 
                table.label.toUpperCase() === orderToComplete.plateNumber?.toUpperCase() 
                ? { ...table, status: 'needs_cleaning' } 
                : table
            );
            batch.update(doc(db, 'floorPlans', userId), { tables: newTables });
        }

        try {
            await batch.commit();
            setSelectedTable(null); // Close panel on success
        } catch (error) {
            console.error("Failed to complete order:", error);
        }
    };

    const handleSaveLayout = async (newPlan: FloorPlan) => {
        const planRef = doc(db, 'floorPlans', newPlan.id);
        const tablesToSave = newPlan.tables.map(({ status, ...t }) => t);
        await setDoc(planRef, { ...newPlan, tables: tablesToSave }, { merge: true });
        
        setFloorPlan(newPlan);
        setViewMode('live');
    };
    
    const handlePrintBill = (order: Order) => {
        setOrderToPrint(order);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }
    
    if (!floorPlan && canEdit) {
        return <FloorPlanEditor 
            planToEdit={{ id: userId, userId, gridWidth: 20, gridHeight: 12, tables: [] }} 
            onSaveLayout={handleSaveLayout}
        />;
    }
    
    if (!floorPlan) {
        return <div className="text-center p-8">{t('common_permission_denied')}</div>;
    }

    const selectedOrder = selectedTable ? orders.find(o => o.plateNumber?.toUpperCase() === selectedTable.label.toUpperCase()) || null : null;

    const ViewModeButton = ({ label, current, target }: { label:string, current:string, target:string }) => (
        <button
            onClick={() => setViewMode(target as 'live' | 'edit')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                current === target
                    ? 'bg-brand-teal text-white shadow'
                    : 'bg-white dark:bg-brand-gray-700 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h4 className="text-sm font-medium text-brand-gray-500">{t('floor_plan_occupancy')}</h4>
                        <p className="text-2xl font-bold text-brand-gray-800 dark:text-white">{occupancy.filled} / {occupancy.total}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-brand-gray-500">{t('floor_plan_live_revenue')}</h4>
                        <p className="text-2xl font-bold text-brand-teal">OMR {liveRevenue.toFixed(3)}</p>
                    </div>
                </div>
                 {canEdit && (
                    <div className="flex items-center gap-2 p-1 bg-brand-gray-100 dark:bg-brand-gray-800 rounded-xl">
                        <ViewModeButton label={t('floor_plan_live_view')} current={viewMode} target="live" />
                        <ViewModeButton label={t('floor_plan_edit_mode')} current={viewMode} target="edit" />
                    </div>
                 )}
            </div>
            
            {viewMode === 'edit' && canEdit ? (
                <FloorPlanEditor planToEdit={floorPlan} onSaveLayout={handleSaveLayout} />
            ) : (
                <LiveFloorPlanView 
                    plan={floorPlan} 
                    tablesWithStatus={tablesWithStatus} 
                    onSelectTable={handleSelectTable}
                    onUpdateOrderItemStatus={handleUpdateOrderItemStatus}
                />
            )}

            <FloorPlanDetailsPanel 
                table={selectedTable}
                order={selectedOrder}
                onClose={() => setSelectedTable(null)}
                onUpdateStatus={handleUpdateTableStatus}
                onUpdateOrderItemStatus={handleUpdateOrderItemStatus}
                onCancelItem={handleCancelItem}
                onAppendToOrder={(orderId, tableNumber) => setRapidOrderContext({ orderIdToAppend: orderId, tableNumber })}
                onPrintBill={handlePrintBill}
                onMarkAsComplete={handleMarkOrderAsComplete}
            />

            {rapidOrderContext && (
                <RapidOrderModal
                    restaurantId={userId}
                    tableNumber={rapidOrderContext.tableNumber}
                    orderIdToAppend={rapidOrderContext.orderIdToAppend}
                    onClose={() => setRapidOrderContext(null)}
                    menuItems={menuItems}
                    categories={categories}
                />
            )}
        </div>
    );
};

export default FloorPlanPage;
