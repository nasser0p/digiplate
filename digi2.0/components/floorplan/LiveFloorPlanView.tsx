import React from 'react';
import { FloorPlan, FloorPlanTable, TableStatus, Order } from '../../types';
import TableElement from './TableElement';

interface LiveFloorPlanViewProps {
    plan: FloorPlan;
    tablesWithStatus: (FloorPlanTable & { status: TableStatus; order?: Order | null })[];
    onSelectTable: (table: FloorPlanTable & { status: TableStatus }) => void;
}

const LiveFloorPlanView: React.FC<LiveFloorPlanViewProps> = ({ plan, tablesWithStatus, onSelectTable }) => {
    
    return (
        <div 
            className="bg-white dark:bg-brand-gray-900 rounded-xl shadow-md p-2 relative min-h-[500px]"
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${plan.gridWidth}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${plan.gridHeight}, minmax(120px, 1fr))`,
                gap: '4px'
            }}
        >
            {tablesWithStatus.map(table => (
                <TableElement
                    key={table.id}
                    table={table}
                    isEditable={false}
                    onPointerDown={() => onSelectTable(table)}
                />
            ))}
        </div>
    );
};

export default LiveFloorPlanView;