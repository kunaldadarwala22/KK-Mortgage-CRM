import React, { useState, useRef, useEffect } from 'react';
import { LENDERS } from '../data/lenders';
import { Input } from './ui/input';

export const LenderAutocomplete = ({ value, onChange, placeholder, ...props }) => {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = query.length > 0
    ? LENDERS.filter(l => l.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : [];

  const select = (lender) => {
    setQuery(lender);
    setOpen(false);
    setHighlighted(-1);
    onChange({ target: { value: lender } });
  };

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      select(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (listRef.current && highlighted >= 0) {
      const el = listRef.current.children[highlighted];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        {...props}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlighted(-1);
          onChange(e);
        }}
        onFocus={() => { if (query.length > 0 && filtered.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Start typing lender name..."}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {filtered.map((lender, i) => (
            <div
              key={lender}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === highlighted ? 'bg-red-50 text-red-700' : 'hover:bg-slate-50 text-slate-900'
              }`}
              onMouseDown={() => select(lender)}
              onMouseEnter={() => setHighlighted(i)}
            >
              {lender}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
