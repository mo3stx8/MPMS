import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Ship, Package, Anchor, FileText, User as UserIcon, Shield, ArrowRight, Radio } from 'lucide-react';
import api from '../services/api';
import { User, Language } from '../App';

interface SearchSuggestion {
  id: number;
  type: 'vessel' | 'container' | 'anchorage' | 'clearance' | 'user' | 'log' | 'wharf' | 'discharge';
  title: string;
  subtitle: string;
  targetTab: string;
  params: Record<string, any>;
}

interface SearchAutocompleteProps {
  user: User;
  language: Language;
  onNavigate: (page: string, params?: Record<string, any>) => void;
}

const localTranslations = {
  en: {
    placeholder: 'Search vessels, containers, requests...',
    loading: 'Searching...',
    noResults: 'No results found',
    typeLabels: {
      vessel: 'Vessel',
      container: 'Container',
      anchorage: 'Anchorage',
      clearance: 'Clearance',
      user: 'User',
      log: 'Log',
      wharf: 'Wharf',
      discharge: 'Discharge',
    }
  },
  ar: {
    placeholder: 'البحث عن السفن، الحاويات، الطلبات...',
    loading: 'جاري البحث...',
    noResults: 'لم يتم العثور على نتائج',
    typeLabels: {
      vessel: 'سفينة',
      container: 'حاوية',
      anchorage: 'طلب رسو',
      clearance: 'تصريح مغادرة',
      user: 'مستخدم',
      log: 'سجل',
      wharf: 'رصيف',
      discharge: 'طلب تفريغ',
    }
  }
};

export function SearchAutocomplete({ user, language, onNavigate }: SearchAutocompleteProps) {
  const t = localTranslations[language] || localTranslations.en;
  const isRTL = language === 'ar';

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch results
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get<SearchSuggestion[]>('/search', {
        params: { q: searchQuery }
      });
      setSuggestions(response.data);
      setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (val.trim().length >= 2) {
      setIsLoading(true);
      setIsOpen(true);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(val);
      }, 300);
    } else {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const selectSuggestion = (item: SearchSuggestion) => {
    onNavigate(item.targetTab, item.params);
    setIsOpen(false);
    setQuery('');
  };

  // Get icon for the suggestion type
  const getTypeIcon = (type: string) => {
    const className = "w-4 h-4";
    switch (type) {
      case 'vessel':
        return <Ship className={`${className} text-blue-500`} />;
      case 'container':
        return <Package className={`${className} text-emerald-500`} />;
      case 'anchorage':
        return <Anchor className={`${className} text-amber-500`} />;
      case 'clearance':
        return <FileText className={`${className} text-purple-500`} />;
      case 'user':
        return <UserIcon className={`${className} text-rose-500`} />;
      case 'log':
        return <Shield className={`${className} text-indigo-500`} />;
      case 'wharf':
        return <Radio className={`${className} text-cyan-500`} />;
      case 'discharge':
        return <ArrowRight className={`${className} text-orange-500`} />;
      default:
        return <Search className={`${className} text-slate-400`} />;
    }
  };

  // Get localized type label
  const getTypeLabel = (type: keyof typeof t.typeLabels) => {
    return t.typeLabels[type] || type;
  };

  return (
    <div className="relative flex-1 max-w-md w-full" ref={containerRef}>
      {/* Search Bar Input Container */}
      <div className="relative flex items-center bg-[var(--background)] rounded-lg px-3 py-1.5 border border-secondary focus-within:border-primary transition-all duration-300 shadow-sm focus-within:shadow-md">
        <Search className={`w-4 h-4 text-[var(--text-secondary)] ${isRTL ? 'ml-1' : 'mr-1'}`} />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder={t.placeholder}
          className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] mx-2 w-full placeholder-[var(--text-secondary)] focus:ring-0"
          dir={isRTL ? 'rtl' : 'ltr'}
        />
        {isLoading && (
          <Loader2 className={`w-4 h-4 text-primary animate-spin ${isRTL ? 'mr-1' : 'ml-1'}`} />
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (query.trim().length >= 2) && (
        <div 
          className={`absolute top-full mt-2 w-full max-h-96 overflow-y-auto rounded-xl border border-secondary bg-[var(--bg-card)]/90 backdrop-blur-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${
            isRTL ? 'right-0' : 'left-0'
          }`}
        >
          {suggestions.length > 0 ? (
            <div className="py-2">
              {suggestions.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => selectSuggestion(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-secondary/40 last:border-b-0 transition-all duration-150 ${
                    index === activeIndex 
                      ? 'bg-primary/10 text-[var(--text-primary)] scale-[1.01]' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  } ${isRTL ? 'text-right flex-row-reverse' : 'text-left flex-row'}`}
                >
                  <div className="mt-0.5 p-1.5 bg-[var(--background)] rounded-lg shadow-sm">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                        {item.title}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        item.type === 'vessel' ? 'bg-blue-500/10 text-blue-500' :
                        item.type === 'container' ? 'bg-emerald-500/10 text-emerald-500' :
                        item.type === 'anchorage' ? 'bg-amber-500/10 text-amber-500' :
                        item.type === 'clearance' ? 'bg-purple-500/10 text-purple-500' :
                        item.type === 'user' ? 'bg-rose-500/10 text-rose-500' :
                        item.type === 'log' ? 'bg-indigo-500/10 text-indigo-500' :
                        item.type === 'wharf' ? 'bg-cyan-500/10 text-cyan-500' :
                        'bg-orange-500/10 text-orange-500'
                      }`}>
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            !isLoading && (
              <div className="p-6 text-center text-sm text-[var(--text-secondary)]">
                <Search className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
                <p>{t.noResults}</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
