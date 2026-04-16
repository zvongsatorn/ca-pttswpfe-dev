'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface FilterOption {
    label: string;
    value: string;
}

export interface MultiSelectFilterProps {
    label: string;
    options: FilterOption[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    width?: string;
    className?: string;
}

export default function MultiSelectFilter({
    label,
    options,
    selectedValues,
    onChange,
    width = 'w-64',
    className = '',
}: MultiSelectFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (optionValue: string) => {
        if (selectedValues.includes(optionValue)) {
            onChange(selectedValues.filter((v) => v !== optionValue));
        } else {
            onChange([...selectedValues, optionValue]);
        }
    };

    const handleSelectAll = () => {
        if (selectedValues.length === options.length) onChange([]);
        else onChange(options.map((opt) => opt.value));
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className={`${width} min-h-[32px] px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer flex items-center justify-between`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="truncate flex gap-1 flex-wrap">
                    {selectedValues.length === 0 ? (
                        <span className="text-gray-400">{label}...</span>
                    ) : selectedValues.length === options.length ? (
                        <span className="text-blue-600 font-medium ">เลือกทั้งหมด ({options.length})</span>
                    ) : selectedValues.length === 1 ? (
                        <span className="text-gray-800">
                            {options.find((opt) => opt.value === selectedValues[0])?.label || '-'}
                        </span>
                    ) : (
                        <span className="text-gray-800">{selectedValues.length} รายการ</span>
                    )}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            </div>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-9999 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="ค้นหา..."
                                className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length > 0 && (
                            <div
                                className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer mb-1 border-b border-gray-50"
                                onClick={handleSelectAll}
                            >
                                <div
                                    className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${
                                        selectedValues.length === options.length && options.length > 0
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    {selectedValues.length === options.length && options.length > 0 && (
                                        <Check className="h-3 w-3 text-white" />
                                    )}
                                </div>
                                <span className="text-sm font-semibold text-blue-700">เลือกทั้งหมด</span>
                            </div>
                        )}

                        {filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => toggleOption(option.value)}
                            >
                                <div
                                    className={`w-4 h-4 rounded border mr-2 flex items-center justify-center transition-colors ${
                                        selectedValues.includes(option.value)
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    {selectedValues.includes(option.value) && (
                                        <Check className="h-3 w-3 text-white" />
                                    )}
                                </div>
                                <span className="text-sm text-gray-700 truncate" title={option.label}>
                                    {option.label}
                                </span>
                            </div>
                        ))}

                        {filteredOptions.length === 0 && (
                            <div className="text-center py-4 text-xs text-gray-400">ไม่พบข้อมูล</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
