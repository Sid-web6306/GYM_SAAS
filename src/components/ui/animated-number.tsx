import React, { useEffect, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedNumber({ 
  value, 
  duration = 1000, 
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (displayValue === value) return;

    setIsAnimating(true);
    const startValue = displayValue;
    const difference = value - startValue;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = startValue + (difference * easeOutQuart);
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, displayValue]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  return (
    <span className={`${className} ${isAnimating ? 'animate-pulse' : ''}`}>
      {prefix}{formatNumber(displayValue)}{suffix}
    </span>
  );
}

interface RollingDigitProps {
  digit: string;
  className?: string;
}

function RollingDigit({ digit, className = '' }: RollingDigitProps) {
  return (
    <span className={`inline-block transition-transform duration-300 ${className}`}>
      {digit}
    </span>
  );
}

interface OdometerNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function OdometerNumber({ 
  value, 
  className = '',
  prefix = '',
  suffix = ''
}: OdometerNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value !== prevValue) {
      const duration = 500;
      const startTime = Date.now();
      const startValue = prevValue;
      const difference = value - startValue;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (difference * easeOutCubic));
        
        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
          setPrevValue(value);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value, prevValue]);

  const formatValue = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const digits = formatValue(displayValue).split('');

  return (
    <span className={`font-mono ${className}`}>
      {prefix}
      {digits.map((char, index) => (
        <RollingDigit 
          key={`${index}-${char}`} 
          digit={char}
          className="transform-gpu"
        />
      ))}
      {suffix}
    </span>
  );
} 