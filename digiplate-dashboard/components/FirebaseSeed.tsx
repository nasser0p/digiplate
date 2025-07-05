import React, { useState } from 'react';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, Category } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

export const getSampleCategories = (userId: string): Omit<Category, 'id'>[] => [
    { name: 'Main Courses', userId, order: 0 },
    { name: 'Salads', userId, order: 1 },
    { name: 'Drinks', userId, order: 2 },
    { name: 'Desserts', userId, order: 3 },
];

export const getSampleMenuItems = (userId: string): Omit<MenuItem, 'id'>[] => [
    {
        name: "Fresh Chicken Salad",
        category: "Salads",
        price: 8.500,
        description: "Crispy chicken, mixed greens, and a tangy vinaigrette.",
        userId,
        isAvailable: true,
        imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        modifierGroups: [
            { id: 'dressing1', name: 'Dressing Choice', selectionType: 'single', options: [
                { id: 'd1', name: 'Ranch', price: 0 },
                { id: 'd2', name: 'Vinaigrette', price: 0 },
                { id: 'd3', name: 'Caesar', price: 0 },
            ]},
            { id: 'addons1', name: 'Add-ons', selectionType: 'multiple', options: [
                { id: 'a1', name: 'Avocado', price: 2.000 },
                { id: 'a2', name: 'Bacon Bits', price: 1.500 },
            ]}
        ],
        order: 0,
    },
    { name: "Beef Steak", category: "Main Courses", price: 18.000, description: "Juicy beef steak cooked to perfection.", userId, isAvailable: true, imageUrl: "https://images.unsplash.com/photo-1546964124-6c1467ae0b36?q=80&w=2864&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", order: 0 },
    { name: "Fried Chicken", category: "Main Courses", price: 12.500, description: "Golden-brown fried chicken, crispy and delicious.", userId, isAvailable: true, imageUrl: "https://images.unsplash.com/photo-1569058242253-92a9c5552db3?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", order: 1 },
    { name: "Salmon Portion", category: "Main Courses", price: 16.000, description: "Grilled salmon with a lemon-dill sauce.", userId, isAvailable: false, imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", order: 2 },
    { name: "Classic Mojito", category: "Drinks", price: 6.000, description: "Refreshing cocktail with mint and lime.", userId, isAvailable: true, imageUrl: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", order: 0 },
    { name: "Iced Latte", category: "Drinks", price: 4.500, description: "Chilled espresso with milk.", userId, isAvailable: true, imageUrl: "https://images.unsplash.com/photo-1563805352521-d7c713331564?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", order: 1 },
    { name: "Cheesecake", category: "Desserts", price: 7.000, description: "Creamy New York style cheesecake with a berry coulis.", userId, isAvailable: true, imageUrl: "https://images.unsplash.com/photo-1542826438-c32144d12a30?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", order: 0 },
];


interface TemplateGeneratorProps {
    userId: string;
}

const TemplateGenerator: React.FC<TemplateGeneratorProps> = ({ userId }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleGenerate = async () => {
        if (!userId) {
            setMessage(t('seed_error_login_required'));
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            const batch = writeBatch(db);

            // Seed categories
            const categoriesCollection = collection(db, "categories");
            getSampleCategories(userId).forEach((category) => {
                const docRef = doc(categoriesCollection);
                batch.set(docRef, { ...category, id: docRef.id });
            });

            // Seed menu items
            const menuItemsCollection = collection(db, "menuItems");
            getSampleMenuItems(userId).forEach((item) => {
                const docRef = doc(menuItemsCollection); 
                batch.set(docRef, { ...item, id: docRef.id });
            });
            
            await batch.commit();

            setMessage(t('seed_success'));
        } catch (error) {
            console.error("Error generating template: ", error);
            setMessage(t('seed_error'));
        }
        setLoading(false);
        setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
    };

    return (
        <div className="text-center">
            <button
                onClick={handleGenerate}
                disabled={loading || !userId}
                className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors disabled:bg-teal-300"
            >
                {loading ? t('seed_button_generating') : t('seed_button_generate')}
            </button>
            {message && <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300 mt-4">{message}</p>}
        </div>
    );
};

export default TemplateGenerator;
