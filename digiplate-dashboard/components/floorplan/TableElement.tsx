import React, { useState, useEffect } from 'react';
import { FloorPlanTable, Order, TableStatus } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { RotateCwIcon, XIcon } from '../icons';

interface TableElementProps {
    table: FloorPlanTable & { status: TableStatus; order?: Order | null };
    isEditable: boolean;
    onUpdate?: (tableId: string, updates: Partial<FloorPlanTable>) => void;
    onDelete?: (tableId: string) => void;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onSelect?: () => void;
    onUpdateOrderItemStatus?: (orderId: string, itemIndex: number, newStatus: boolean) => void;
    isSelected?: boolean;
    isGhost?: boolean;
}

const TableElement: React.FC<TableElementProps> = ({ table, isEditable, onUpdate, onDelete, onDragStart, onDragEnd, onSelect, onUpdateOrderItemStatus, isSelected, isGhost }) => {
    const { t } = useTranslation();
    const [isEditingLabel, setIsEditingLabel] = useState(false);
    const [tempLabel, setTempLabel] = useState(table.label);
    const [timer, setTimer] = useState('');

    const allItemsDelivered = table.order?.items.every(item => item.isDelivered) ?? false;
    useEffect(() => {
        if (!table.order || allItemsDelivered) {
            setTimer('');
            return;
        }

        const orderDate = new Date(table.order.createdAt.seconds * 1000);
        const updateTimer = () => {
            const seconds = Math.floor((new Date().getTime() - orderDate.getTime()) / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const displayMinutes = minutes % 60;
            const displaySeconds = seconds % 60;
            
            let timeString = '';
            if (hours > 0) timeString += `${hours.toString().padStart(2, '0')}:`;
            timeString += `${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
            setTimer(timeString);
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [table.order, allItemsDelivered]);

    const statusClasses: Record<TableStatus, string> = {
        available: 'bg-green-100/10 text-green-700 border-green-400 dark:bg-green-900/10 dark:text-green-300 dark:border-green-700',
        seated: 'bg-blue-100/10 text-blue-700 border-blue-400 dark:bg-blue-900/10 dark:text-blue-300 dark:border-blue-700',
        ordered: 'bg-yellow-100/10 text-yellow-700 border-yellow-400 dark:bg-yellow-900/10 dark:text-yellow-300 dark:border-yellow-700',
        attention: 'bg-red-200/10 text-red-800 border-red-500 dark:bg-red-900/20 dark:text-red-200 dark:border-red-600 animate-pulse-attention',
        needs_cleaning: 'bg-gray-200/10 text-gray-700 border-gray-400 dark:bg-gray-800/20 dark:text-gray-300 dark:border-gray-600',
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempLabel(e.target.value);
    };

    const handleLabelBlur = () => {
        setIsEditingLabel(false);
        if (onUpdate && tempLabel.trim() !== '') {
            onUpdate(table.id, { label: tempLabel });
        } else {
            setTempLabel(table.label); // Revert if empty
        }
    };
    
    const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleLabelBlur();
        if (e.key === 'Escape') {
            setTempLabel(table.label);
            setIsEditingLabel(false);
        }
    };
    
    const handleRotate = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(onUpdate) {
            const currentRotation = table.rotation || 0;
            onUpdate(table.id, { rotation: (currentRotation + 90) % 360 });
        }
    }

    const gridStyle = {
        gridColumn: `${table.x} / span ${table.width}`,
        gridRow: `${table.y} / span ${table.height}`,
        opacity: isGhost ? 0.5 : 1,
    };

    const shapeClass = table.shape === 'round' ? 'rounded-[50%]' : 'rounded-lg';
    
    const hasOrderInLiveView = !isEditable && table.order && table.order.items && table.order.items.length > 0;

    const renderEditableControls = () => (
        <>
            <button
                title={t('floor_plan_table_delete')}
                onClick={(e) => { e.stopPropagation(); onDelete?.(table.id); }}
                className="absolute -top-2 -right-2 z-10 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <XIcon className="w-4 h-4" />
            </button>
            <button
                title={t('floor_plan_table_rotation')}
                onClick={handleRotate}
                className="absolute -top-2 -left-2 z-10 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <RotateCwIcon className="w-3 h-3" />
            </button>
        </>
    );

    return (
        <div
            id={table.id}
            style={gridStyle}
            className={`relative group p-1 transition-opacity duration-200 ${isEditable ? 'cursor-move' : 'cursor-pointer'}`}
            draggable={isEditable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onSelect}
            onDragOver={isEditable ? (e) => e.preventDefault() : undefined}
        >
            <div
                className={`w-full h-full flex font-bold text-sm select-none transition-all duration-200 border-2 ${shapeClass} ${statusClasses[table.status]} ${hasOrderInLiveView ? 'items-stretch' : 'items-center justify-center'}`}
                style={{
                    boxShadow: isSelected ? `0 0 10px 2px ${table.status === 'attention' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)'}` : 'none',
                    transform: `rotate(${table.rotation || 0}deg)`
                }}
                onDoubleClick={() => isEditable && setIsEditingLabel(true)}
            >
                {hasOrderInLiveView ? (
                     <div className="w-full h-full p-2 text-left rtl:text-right text-xs flex flex-col justify-between">
                        <div className="flex-shrink-0 font-bold flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-1 mb-1">
                            <span>{table.label}</span>
                            {timer && <span className="font-mono text-base text-orange-500">{timer}</span>}
                        </div>
                        <ul className="space-y-1 flex-grow overflow-y-auto my-1">
                             {table.order?.items.map((item, index) => (
                                <li
                                    key={index}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateOrderItemStatus?.(table.order!.id, index, !item.isDelivered);
                                    }}
                                    className={`block cursor-pointer p-1 rounded-md hover:bg-black/10`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-3.5 h-3.5 flex-shrink-0 border-2 rounded-sm flex items-center justify-center transition-all ${item.isDelivered ? 'bg-brand-teal border-brand-teal' : 'border-current'}`}>
                                            {item.isDelivered && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className={`flex-grow truncate ${item.isDelivered ? 'line-through opacity-60' : ''}`}>
                                            {item.quantity > 1 && <span className="font-bold">{item.quantity}x </span>}{item.name}
                                        </span>
                                    </div>
                                    {item.notes && (
                                        <p className={`text-[10px] italic text-amber-600 dark:text-amber-400 truncate ps-5 ${item.isDelivered ? 'line-through opacity-60' : ''}`}>
                                            {t('prep_view_note')} {item.notes}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                         {table.order && (
                            <div className="flex-shrink-0 font-bold text-sm border-t border-black/10 dark:border-white/10 pt-1 mt-1 flex justify-between items-center">
                                <span>{t('order_detail_total')}</span>
                                <span className="text-brand-teal">OMR {table.order.total.toFixed(3)}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    isEditable && isEditingLabel ? (
                        <input
                            type="text"
                            value={tempLabel}
                            onChange={handleLabelChange}
                            onBlur={handleLabelBlur}
                            onKeyDown={handleLabelKeyDown}
                            className="w-4/5 h-full bg-transparent text-center font-bold outline-none"
                            autoFocus
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <span>{table.label}</span>
                    )
                )}
            </div>
            {isEditable && onDelete && renderEditableControls()}
        </div>
    );
};

export default TableElement;