import React, { useState, useEffect, useRef } from 'react';
import { FloorPlan, FloorPlanTable } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import TableElement from './TableElement';

interface FloorPlanEditorProps {
    planToEdit: FloorPlan;
    onSaveLayout: (plan: FloorPlan) => Promise<void>;
}

interface DragData {
    type: 'new' | 'existing';
    shape?: 'square' | 'round';
    table?: FloorPlanTable;
    offsetX?: number;
    offsetY?: number;
}

const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({ planToEdit, onSaveLayout }) => {
    const { t } = useTranslation();
    const [plan, setPlan] = useState<FloorPlan>(planToEdit);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    
    const [dragData, setDragData] = useState<DragData | null>(null);
    const [dragPreview, setDragPreview] = useState<{x: number, y: number, width: number, height: number} | null>(null);

    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPlan(planToEdit);
    }, [planToEdit]);

    const handleGridSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const size = Math.max(5, parseInt(value, 10)) || 10;
        setPlan(p => ({ ...p, [name]: size }));
    };

    const handleSaveLayout = async () => {
        setSaving(true);
        setMessage('');
        try {
            await onSaveLayout(plan);
        } catch (error) {
            console.error(error);
            setMessage(t('floor_plan_table_error'));
        } finally {
            setSaving(false);
        }
    };
    
    const updateTable = (tableId: string, updates: Partial<FloorPlanTable>) => {
        setPlan(p => ({
            ...p,
            tables: p.tables.map(t => t.id === tableId ? { ...t, ...updates } : t)
        }));
    };
    
    const deleteTable = (tableId: string) => {
        setPlan(p => ({
            ...p,
            tables: p.tables.filter(t => t.id !== tableId)
        }));
    };

    const handleDragStart = (e: React.DragEvent, data: Omit<DragData, 'offsetX' | 'offsetY'>) => {
        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const fullDragData: DragData = { ...data, offsetX, offsetY };
        
        setDragData(fullDragData);
        
        e.dataTransfer.setData('application/json', JSON.stringify(fullDragData)); 
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    
        if (!gridRef.current || !dragData) return;
    
        const gridRect = gridRef.current.getBoundingClientRect();
        const cellWidth = gridRect.width / plan.gridWidth;
        const cellHeight = gridRect.height / plan.gridHeight;
    
        let tableWidth = dragData.table ? dragData.table.width : 2;
        let tableHeight = dragData.table ? dragData.table.height : 2;
    
        const rotation = dragData.table?.rotation || 0;
        const isVertical = rotation === 90 || rotation === 270;
        
        const previewWidth = isVertical ? tableHeight : tableWidth;
        const previewHeight = isVertical ? tableWidth : tableHeight;
    
        const offsetX = dragData.offsetX || (cellWidth * previewWidth / 2);
        const offsetY = dragData.offsetY || (cellHeight * previewHeight / 2);
    
        const x = e.clientX - gridRect.left - offsetX;
        const y = e.clientY - gridRect.top - offsetY;
    
        const col = Math.round(x / cellWidth);
        const row = Math.round(y / cellHeight);
    
        const clampedCol = Math.max(0, Math.min(col, plan.gridWidth - previewWidth));
        const clampedRow = Math.max(0, Math.min(row, plan.gridHeight - previewHeight));
    
        setDragPreview({ x: clampedCol, y: clampedRow, width: previewWidth, height: previewHeight });
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!dragPreview || !dragData) return;
        
        const newGridX = dragPreview.x + 1;
        const newGridY = dragPreview.y + 1;

        if (dragData.type === 'new' && dragData.shape) {
            const newTable: FloorPlanTable = {
                id: `table_${Date.now()}`,
                label: `T${plan.tables.length + 1}`,
                shape: dragData.shape,
                x: newGridX,
                y: newGridY,
                width: 2,
                height: 2,
                rotation: 0,
            };
            setPlan(p => ({ ...p, tables: [...p.tables, newTable] }));
        } else if (dragData.type === 'existing' && dragData.table) {
            updateTable(dragData.table.id, { x: newGridX, y: newGridY });
        }
        
        handleDragEnd();
    };
    
    const handleDragEnd = () => {
        setDragPreview(null);
        setDragData(null);
    };

    const draggedTableId = dragData?.type === 'existing' ? dragData.table?.id : null;

    return (
        <div className="space-y-4">
             <div className="bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow-md space-y-4">
                <h3 className="text-lg font-bold">{t('floor_plan_editor_title')}</h3>
                <p className="text-sm text-brand-gray-500">{t('floor_plan_editor_desc')}</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
                    <div className="flex items-center gap-4">
                        <label htmlFor="gridWidth" className="text-sm font-medium whitespace-nowrap">{t('floor_plan_grid_width')}: <span className="font-bold text-brand-teal">{plan.gridWidth}</span></label>
                        <input type="range" id="gridWidth" name="gridWidth" min="5" max="50" value={plan.gridWidth} onChange={handleGridSizeChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                    </div>
                     <div className="flex items-center gap-4">
                        <label htmlFor="gridHeight" className="text-sm font-medium whitespace-nowrap">{t('floor_plan_grid_height')}: <span className="font-bold text-brand-teal">{plan.gridHeight}</span></label>
                        <input type="range" id="gridHeight" name="gridHeight" min="5" max="50" value={plan.gridHeight} onChange={handleGridSizeChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    {message && <span className="text-red-500 text-sm font-semibold mr-4">{message}</span>}
                    <button onClick={handleSaveLayout} disabled={saving} className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors disabled:bg-teal-300">
                         {saving ? t('floor_plan_table_saving') : t('floor_plan_table_save_layout')}
                    </button>
                </div>
            </div>

            <div className="flex gap-4 items-start">
                <div className="w-48 flex-shrink-0 bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow-md">
                    <h4 className="font-bold mb-3">{t('floor_plan_toolbox')}</h4>
                    <div className="space-y-3">
                        <div draggable onDragStart={(e) => handleDragStart(e, { type: 'new', shape: 'square' })} onDragEnd={handleDragEnd} className="flex items-center gap-2 p-2 border rounded-md cursor-grab hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">
                            <div className="w-8 h-8 bg-brand-gray-300 dark:bg-brand-gray-600 rounded"></div>
                            <span className="text-sm">{t('floor_plan_square_table')}</span>
                        </div>
                        <div draggable onDragStart={(e) => handleDragStart(e, { type: 'new', shape: 'round' })} onDragEnd={handleDragEnd} className="flex items-center gap-2 p-2 border rounded-md cursor-grab hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">
                            <div className="w-8 h-8 bg-brand-gray-300 dark:bg-brand-gray-600 rounded-full"></div>
                             <span className="text-sm">{t('floor_plan_round_table')}</span>
                        </div>
                    </div>
                </div>
                <div 
                    ref={gridRef}
                    className="flex-grow bg-white dark:bg-brand-gray-900 rounded-xl shadow-md p-2 relative min-h-[500px] blueprint-bg"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${plan.gridWidth}, 1fr)`,
                        gridTemplateRows: `repeat(${plan.gridHeight}, 1fr)`,
                        gap: '2px'
                    }}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    onDragLeave={() => setDragPreview(null)}
                >
                    {plan.tables.map(table => (
                        <TableElement 
                            key={table.id}
                            table={{...table, status: 'available'}}
                            isEditable={true}
                            onUpdate={updateTable}
                            onDelete={deleteTable}
                            onDragStart={(e) => handleDragStart(e, { type: 'existing', table })}
                            onDragEnd={handleDragEnd}
                            isGhost={draggedTableId === table.id}
                        />
                    ))}
                    {dragPreview && (
                        <div
                            className="bg-green-500/30 border-2 border-dashed border-green-500 rounded-lg"
                            style={{
                                gridColumn: `${dragPreview.x + 1} / span ${dragPreview.width}`,
                                gridRow: `${dragPreview.y + 1} / span ${dragPreview.height}`,
                                pointerEvents: 'none'
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default FloorPlanEditor;