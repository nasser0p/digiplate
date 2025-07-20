import React from 'react';
import { Promotion, CustomerLoyaltyProgress, LoyaltyProgram, MenuItem } from '../../../types';
import { useTranslation } from '../../../contexts/LanguageContext';
import { GiftIcon } from '../../icons';

interface MyRewardsPanelProps {
    promotions: Promotion[];
    loyaltyProgress: CustomerLoyaltyProgress | null;
    menuItems: MenuItem[];
    onRedeem: (promotionId: string, rewardItemId: string) => void;
}

const MyRewardsPanel: React.FC<MyRewardsPanelProps> = ({ promotions, loyaltyProgress, menuItems, onRedeem }) => {
    const { t } = useTranslation();

    const loyaltyPromotions = promotions.filter(p => p.type === 'loyalty' && p.isActive);

    if (loyaltyPromotions.length === 0) {
        return <p className="text-center text-sm text-brand-gray-500 p-4">{t('customer_rewards_no_programs')}</p>;
    }

    return (
        <div className="h-full flex flex-col bg-brand-gray-50 dark:bg-brand-gray-900">
            <div className="p-6 pb-2">
                <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white flex items-center gap-2">
                    <GiftIcon className="w-6 h-6 text-brand-customer" />
                    {t('customer_rewards_title')}
                </h2>
                {loyaltyProgress?.points !== undefined && (
                     <p className="mt-2 text-2xl font-bold text-brand-customer">{loyaltyProgress.points.toLocaleString()} <span className="text-base font-semibold text-brand-gray-500">{t('customer_rewards_points')}</span></p>
                )}
            </div>
            <div className="flex-grow overflow-y-auto p-6 pt-2 space-y-6">
                {loyaltyPromotions.map(promo => {
                    const details = promo.details as LoyaltyProgram;
                    if (details.type === 'visit_based') {
                        const progress = loyaltyProgress?.visitCounts[promo.id] || 0;
                        const goal = details.visitGoal || 1;
                        const rewardItem = menuItems.find(mi => mi.id === details.rewardItemId);
                        const isComplete = progress >= goal;

                        return (
                            <div key={promo.id} className="bg-white dark:bg-brand-gray-800 p-4 rounded-lg shadow">
                                <h3 className="font-bold">{promo.name}</h3>
                                <p className="text-sm text-brand-gray-500 mb-3">{t('customer_rewards_punch_card_desc', goal, rewardItem?.name || '')}</p>
                                <div className="flex items-center gap-2">
                                    {Array.from({ length: goal }).map((_, i) => (
                                        <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-colors ${i < progress ? 'bg-brand-customer' : 'bg-brand-gray-200 dark:bg-brand-gray-700'}`}>
                                            {i + 1}
                                        </div>
                                    ))}
                                </div>
                                {isComplete && rewardItem && (
                                     <button onClick={() => onRedeem(promo.id, rewardItem.id)} className="w-full mt-4 bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600">
                                        {t('customer_rewards_redeem_button')}
                                    </button>
                                )}
                            </div>
                        )
                    }
                    if (details.type === 'spend_based') {
                         return (
                            <div key={promo.id} className="bg-white dark:bg-brand-gray-800 p-4 rounded-lg shadow">
                                <h3 className="font-bold">{promo.name}</h3>
                                <div className="space-y-2 mt-2">
                                    {details.rewardTiers?.map(tier => {
                                        const canAfford = loyaltyProgress ? loyaltyProgress.points >= tier.points : false;
                                        return (
                                            <div key={tier.id} className={`flex justify-between items-center p-3 rounded-md ${canAfford ? 'bg-green-50 dark:bg-green-900/40' : 'bg-brand-gray-50 dark:bg-brand-gray-700/50'}`}>
                                                <div>
                                                    <p className="font-semibold">{tier.description}</p>
                                                    <p className="text-sm text-brand-customer font-bold">{tier.points} {t('customer_rewards_points')}</p>
                                                </div>
                                                <button disabled={!canAfford} onClick={() => {}} className="bg-green-500 text-white font-bold py-1 px-3 text-sm rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                                    {t('customer_rewards_redeem_button')}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                         )
                    }
                    return null;
                })}
            </div>
        </div>
    );
};

export default MyRewardsPanel;
