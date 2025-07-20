import React from 'react';
import { Timestamp } from 'firebase/firestore';

export interface SubNavItemType {
  name: string;
  path: string;
}

export interface NavItemType {
  name: string;
  icon: React.ElementType;
  path: string;
  active?: boolean;
  subItems?: SubNavItemType[];
  pageName?: 'Dashboard' | 'Menus' | 'Orders' | 'Floor Plan' | 'Inventory' | 'Stores' | 'Settings' | 'Reports' | 'Promotions';
}

export interface GrowthChartData {
    name: string;
    food: number;
    drinks: number;
    other: number;
}

export interface StatCardData {
    title: string;
    value: string | number;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    bgColor?: string;
    textColor?: string;
    showChart?: boolean;
    chartData?: { name: string, uv: number }[];
    showArrow?: boolean;
    iconBgColor?: string;
    iconColor?: string;
}

export interface DataTableData {
    headers: string[];
    rows: { cells: (string | number)[] }[];
}

export interface DashboardData {
    stats: StatCardData[];
    growthChart: {
        totalGrowth: string;
        data: GrowthChartData[];
    };
    qrScanCount: DataTableData;
    mostSoldFoods: DataTableData;
}

export interface Category {
  id: string;
  name: string;
  userId: string;
  order: number;
}

export interface ModifierOption {
    id: string;
    name: string;
    price: number;
}

export interface ModifierGroup {
    id: string;
    name: string;
    selectionType: 'single' | 'multiple';
    options: ModifierOption[];
}

export interface RecipeItem {
    ingredientId: string;
    name: string;
    quantity: number;
    unit: 'kg' | 'g' | 'L' | 'ml' | 'piece';
}

export interface MenuItem {
  id: string;
  name:string;
  category: string;
  price: number;
  description: string;
  userId: string;
  isAvailable: boolean;
  imageUrl?: string;
  modifierGroups?: ModifierGroup[];
  recipe?: RecipeItem[];
  order: number;
}

export interface SelectedModifier {
    groupName: string;
    optionName: string;
    optionPrice: number;
}

export interface CartItem {
    cartItemId: string; // Unique ID for this specific cart instance, e.g., "pizza-1-large-extra-cheese"
    id: string; // Original menu item ID
    name: string;
    basePrice: number;
    quantity: number;
    imageUrl?: string;
    selectedModifiers: SelectedModifier[];
    notes?: string;
}

export type OrderStatus = 'Pending' | 'New' | 'In Progress' | 'Ready' | 'Completed';

export interface AppliedDiscount {
    promotionName: string;
    amount: number;
}

export interface OrderItem {
    name: string;
    quantity: number;
    price: number; // Final price for this item including modifiers
    selectedModifiers: SelectedModifier[];
    menuItemId: string; // The ID of the menu item this order item corresponds to
    isDelivered?: boolean;
    notes?: string;
}

export interface Store {
    id: string;
    name: string;
    userId: string;
}

export interface Order {
    id: string;
    plateNumber?: string;
    storeId?: string;
    storeName?: string;
    items: OrderItem[];
    subtotal: number;
    tip: number;
    platformFee: number;
    total: number;
    status: OrderStatus;
    userId: string; // The restaurant owner's user ID
    createdAt: {
        seconds: number;
        nanoseconds: number;
    };
    isUrgent?: boolean;
    notes?: string;
    customerPhoneNumber?: string;
    appliedDiscounts?: AppliedDiscount[];
}

export interface PrepItem {
    name: string;
    notes?: string;
    modifiers?: string;
    totalQuantity: number;
    orders: {
        orderId: string;
        plateNumber?: string;
        quantity: number;
    }[];
}

export interface PrintSettings {
    headerText: string;
    footerText: string;
    fontSize: 'xs' | 'sm' | 'base';
    showRestaurantName: boolean;
    showStoreName: boolean;
    showPlateNumber: boolean;
    showOrderId: boolean;
    showDateTime: boolean;
    showUrgentBanner: boolean;
    showQRCode: boolean;
}

export interface MenuAppearance {
    layout: 'grid' | 'list' | 'elegant';
    fontTheme: 'modern' | 'classic' | 'casual';
    brandColor: string;
    backgroundColor: string;
    textColor: string;
    headerBannerUrl?: string;
}

export interface RestaurantProfile {
    id: string; // This will be the user's UID
    name: string;
    address: string;
    logoUrl: string;
    avatarUrl?: string;
    phoneNumber?: string;
    printSettings?: PrintSettings;
    isLiveTrackingEnabled?: boolean;
    menuAppearance?: MenuAppearance;
    customerBranding?: { brandColor: string; }; // Kept for backwards compatibility if needed
    hasCompletedTour?: boolean;
    restaurantType?: string;
    currency?: string;
    languages?: string[];
    onboardingCompleted?: boolean;
    isLocked?: boolean;
    email?: string;
    createdAt?: {
        seconds: number;
        nanoseconds: number;
    };
}

export type Role = 'admin' | 'manager' | 'front_of_house' | 'kitchen_staff';

export interface StaffMember {
    id: string; // This will be the user's UID
    restaurantId: string; // The owner's UID
    email: string;
    name?: string;
    role: Role;
}

export interface Invite {
    id: string;
    restaurantId: string;
    email: string;
    role: Role;
    name?: string;
    temporaryPassword?: string;
}

export interface Ingredient {
  id: string;
  userId: string;
  name: string;
  category: string;
  unit: 'kg' | 'g' | 'L' | 'ml' | 'piece';
  stock: number;
  lowStockThreshold: number;
}

export type TableStatus = 'available' | 'seated' | 'ordered' | 'attention' | 'needs_cleaning';

export interface FloorPlanTable {
  id: string;
  label: string;
  shape: 'square' | 'round';
  x: number; // grid column start
  y: number; // grid row start
  width: number; // col span
  height: number; // row span
  rotation?: number;
  status?: TableStatus;
}

export interface FloorPlan {
  id: string; // same as userId
  userId: string;
  gridWidth: number;
  gridHeight: number;
  tables: FloorPlanTable[];
}

// PROMOTION TYPES
export type PromotionType = 'loyalty' | 'special_offer' | 'multi_buy';
export type LoyaltyType = 'visit_based' | 'spend_based';
export type DiscountType = 'percentage' | 'fixed_amount';

export interface LoyaltyRewardTier {
    id: string;
    points: number;
    description: string;
}

export interface LoyaltyProgram {
    type: LoyaltyType;
    // Visit-based ("Punch Card")
    visitGoal?: number;
    rewardItemId?: string;
    applicableItemIds?: string[];
    // Spend-based ("Points")
    earnRate?: number; // e.g., 1 point per 1 OMR
    rewardTiers?: LoyaltyRewardTier[];
}

export interface SpecialOfferSchedule {
    days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
    startTime: string; // "HH:MM" format
    endTime: string; // "HH:MM" format
}

export interface SpecialOffer {
    discountType: DiscountType;
    discountValue: number;
    applicableItemIds?: string[]; // Empty means applies to whole order
    schedule?: SpecialOfferSchedule;
}

export interface MultiBuyOffer {
    buyQuantity: number;
    buyItemIds: string[];
    getQuantity: number;
    getItemIds: string[];
    getDiscountType: 'percentage' | 'free';
    getDiscountValue: number; // e.g., 50 for 50% off
}


export interface Promotion {
    id: string;
    userId: string;
    name: string;
    badgeText?: string;
    type: PromotionType;
    isActive: boolean;
    details: LoyaltyProgram | SpecialOffer | MultiBuyOffer;
    createdAt: Timestamp;
}


// Customer Loyalty
export interface CustomerLoyaltyProgress {
    id: string; // customer's phone number
    userId: string; // restaurant owner's ID
    points: number;
    visitCounts: Record<string, number>; // promotionId -> count
    createdAt: Timestamp;
}