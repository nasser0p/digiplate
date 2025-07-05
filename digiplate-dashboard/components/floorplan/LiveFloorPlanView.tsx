import React from 'react';
import { FloorPlan, FloorPlanTable, TableStatus, Order } from '../../types';
import TableElement from './TableElement';

interface LiveFloorPlanViewProps {
    plan: FloorPlan;
    tablesWithStatus: (FloorPlanTable & { status: TableStatus; order?: Order | null })[];
    onSelectTable: (table: FloorPlanTable & { status: TableStatus }) => void;
    onUpdateOrderItemStatus: (orderId: string, itemIndex: number, newStatus: boolean) => void;
}

const LiveFloorPlanView: React.FC<LiveFloorPlanViewProps> = ({ plan, tablesWithStatus, onSelectTable, onUpdateOrderItemStatus }) => {
    
    return (
        <div 
            className="bg-white dark:bg-brand-gray-900 rounded-xl shadow-md p-2 relative min-h-[500px]"
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${plan.gridWidth}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${plan.gridHeight}, minmax(80px, 1fr))`,
                gap: '4px'
            }}
        >
            {tablesWithStatus.map(table => (
                <TableElement
                    key={table.id}
                    table={table}
                    isEditable={false}
                    onSelect={() => onSelectTable(table)}
                    onUpdateOrderItemStatus={onUpdateOrderItemStatus}
                />
            ))}
        </div>
    );
};

export default LiveFloorPlanView;