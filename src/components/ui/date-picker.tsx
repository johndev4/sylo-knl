// ===========================================================================
// 📅 Custom reusable DatePicker component
// Built in-house (not from shadcn/ui)
// Provides a styled calendar popover for selecting single dates
// ===========================================================================

'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ChevronDownIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  dateFormat?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  dateFormat = 'PPP',
  disabled = false,
  className,
}: DatePickerProps) {
  const [internal, setInternal] = React.useState<Date>();
  const date = value ?? internal;
  const setDate = onChange ?? setInternal;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            data-empty={!date}
            className={`data-[empty=true]:text-muted-foreground w-[212px] justify-between text-left font-normal ${className ?? ''}`}
          >
            {date ? format(date, dateFormat) : <span>{placeholder}</span>}
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  );
}
