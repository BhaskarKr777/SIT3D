'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, MapPin, Building as BuildingIcon, BookOpen, Utensils, Home, Trophy } from 'lucide-react';
import { Building, Amenity } from '@/types/campus';

interface SearchBarProps {
  buildings: Building[];
  amenities: Amenity[];
  onSelectBuilding: (b: Building) => void;
  onSelectAmenity: (a: Amenity) => void;
  onFocusSearchTarget: (target: { position: [number, number, number]; target: [number, number, number] }) => void;
}

type FilterCategory = 'all' | 'academic' | 'lab' | 'canteen' | 'hostel' | 'sports' | 'admin';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'building' | 'room' | 'amenity';
  category: string;
  building?: Building;
  amenity?: Amenity;
  floorLevel?: number;
}

export function SearchBar({
  buildings,
  amenities,
  onSelectBuilding,
  onSelectAmenity,
  onFocusSearchTarget,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Index all searchables: buildings, rooms/labs, amenities
  const allSearchItems = useMemo(() => {
    const items: SearchResultItem[] = [];

    // 1. Buildings
    for (const b of buildings) {
      items.push({
        id: `b_${b.id}`,
        title: b.name,
        subtitle: `${b.shortName} • ${b.levels} Floor${b.levels > 1 ? 's' : ''}`,
        type: 'building',
        category: b.category,
        building: b,
      });

      // 2. Rooms and Laboratories inside buildings
      for (const fl of b.floors) {
        for (const rm of fl.rooms) {
          items.push({
            id: `r_${b.id}_${rm.code}`,
            title: rm.name,
            subtitle: `${rm.code} • ${fl.name} (${b.shortName})`,
            type: 'room',
            category: rm.type === 'lab' || rm.type === 'workshop' ? 'lab' : b.category,
            building: b,
            floorLevel: fl.level,
          });
        }
      }
    }

    // 3. Outdoor Sports & Amenities
    for (const a of amenities) {
      items.push({
        id: `a_${a.id}`,
        title: a.name,
        subtitle: `Outdoor Campus Facility`,
        type: 'amenity',
        category: a.category,
        amenity: a,
      });
    }

    return items;
  }, [buildings, amenities]);

  // Filtered results
  const filteredResults = useMemo(() => {
    let list = allSearchItems;

    // Apply category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'lab') {
        list = list.filter((item) => item.category === 'lab' || item.title.toLowerCase().includes('lab'));
      } else if (selectedCategory === 'admin') {
        list = list.filter((item) => item.category === 'administrative' || item.category === 'entrance');
      } else {
        list = list.filter((item) => item.category === selectedCategory);
      }
    }

    // Apply text search
    if (!query.trim()) {
      return list.slice(0, 8); // Top results when empty
    }

    const q = query.toLowerCase().trim();
    return list
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [allSearchItems, selectedCategory, query]);

  const handleSelectItem = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');

    if (item.type === 'building' && item.building) {
      onSelectBuilding(item.building);
      const [bx, bz] = item.building.center;
      onFocusSearchTarget({
        position: [bx + 35, item.building.height + 25, bz + 40],
        target: [bx, item.building.height / 2, bz],
      });
    } else if (item.type === 'room' && item.building) {
      onSelectBuilding(item.building);
      const [bx, bz] = item.building.center;
      onFocusSearchTarget({
        position: [bx + 30, item.building.height + 20, bz + 35],
        target: [bx, item.building.height / 2, bz],
      });
    } else if (item.type === 'amenity' && item.amenity) {
      onSelectAmenity(item.amenity);
      const [ax, az] = item.amenity.center;
      onFocusSearchTarget({
        position: [ax + 30, 25, az + 35],
        target: [ax, 0, az],
      });
    }
  };

  const categories: { id: FilterCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <MapPin className="w-3 h-3" /> },
    { id: 'academic', label: 'Academic', icon: <BuildingIcon className="w-3 h-3" /> },
    { id: 'lab', label: 'Labs', icon: <BookOpen className="w-3 h-3" /> },
    { id: 'canteen', label: 'Food', icon: <Utensils className="w-3 h-3" /> },
    { id: 'hostel', label: 'Hostels', icon: <Home className="w-3 h-3" /> },
    { id: 'sports', label: 'Sports', icon: <Trophy className="w-3 h-3" /> },
  ];

  return (
    <div ref={containerRef} className="absolute top-[66px] sm:top-20 left-2.5 right-2.5 sm:left-4 sm:right-auto z-20 sm:w-96 pointer-events-none">
      <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-2 transition-all">
        {/* Input Bar */}
        <div className="flex items-center gap-2 px-2.5 py-2 sm:py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all">
          <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            aria-label="Search campus buildings, labs, classrooms, and facilities"
            aria-expanded={isOpen}
            placeholder="Search buildings, labs, classrooms, canteen..."
            className="w-full bg-transparent text-sm sm:text-xs text-slate-100 placeholder-slate-400 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              aria-label="Clear search"
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-2 pb-0.5 px-0.5" role="tablist" aria-label="Campus facility categories">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              role="tab"
              aria-selected={selectedCategory === cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setIsOpen(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Dropdown Results List */}
        {isOpen && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 max-h-[42vh] sm:max-h-72 overflow-y-auto space-y-1 animate-sit-slide-down">
            {filteredResults.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching locations found for &quot;{query}&quot;.
              </div>
            ) : (
              filteredResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/90 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                        item.type === 'amenity'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/40'
                          : item.type === 'room'
                          ? 'bg-amber-950 text-amber-400 border border-amber-700/40'
                          : 'bg-blue-950 text-blue-400 border border-blue-700/40'
                      }`}
                    >
                      {item.type === 'amenity' ? (
                        <Trophy className="w-3.5 h-3.5" />
                      ) : item.type === 'room' ? (
                        <BookOpen className="w-3.5 h-3.5" />
                      ) : (
                        <BuildingIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                    View →
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
