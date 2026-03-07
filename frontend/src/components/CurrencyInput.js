import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';

/**
 * Currency input component that shows raw number when focused 
 * and formatted £ when blurred
 */
const CurrencyInput = ({ value, onChange, ...props }) => {
  const [display, setDisplay] = useState(value || '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDisplay(value || '');
    }
  }, [value, focused]);

  const formatForDisplay = (v) => {
    const num = parseFloat(v);
    if (isNaN(num) || !v) return v;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <Input
      {...props}
      type={focused ? 'number' : 'text'}
      value={focused ? display : (display ? formatForDisplay(display) : '')}
      onChange={(e) => {
        setDisplay(e.target.value);
        onChange(e);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};

export default CurrencyInput;
