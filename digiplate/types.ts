import React from 'react';

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
  pageName?: 'Dashboard' | 'Menus' | 'Orders' | 'Inventory' | 'Stores' | 'Settings';
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
}

export type OrderStatus = 'New' | 'In Progress' | 'Ready' | 'Completed';

export interface OrderItem {
    name: string;
    quantity: number;
    price: number; // Final price for this item including modifiers
    selectedModifiers: SelectedModifier[];
    menuItemId: string; // The ID of the menu item this order item corresponds to
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

export interface CustomerBranding {
    brandColor?: string;
}

export interface RestaurantProfile {
    name: string;
    address: string;
    logoUrl: string;
    avatarUrl?: string;
    printSettings?: PrintSettings;
    isLiveTrackingEnabled?: boolean;
    customerBranding?: CustomerBranding;
    hasCompletedTour?: boolean;
    restaurantType?: string;
    currency?: string;
    languages?: string[];
    onboardingCompleted?: boolean;
}

export interface PrepItem {
    name: string;
    totalQuantity: number;
    orders: {
        orderId: string;
        plateNumber?: string;
        quantity: number;
    }[];
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
