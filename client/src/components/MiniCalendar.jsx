import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const MiniCalendar = () => {
  const [selectedDay, setSelectedDay] = useState(11);
  const [currentMonth, setCurrentMonth] = useState('September 2026');

  // Days of week row matching screenshot
  const days = [
    { label: 'S', date: 7 },
    { label: 'M', date: 8 },
    { label: 'T', date: 9 },
    { label: 'W', date: 10 },
    { label: 'T', date: 11 },
    { label: 'F', date: 12 },
    { label: 'S', date: 13 },
  ];

  return (
    <div className="bottom-card mini-calendar-card">
      {/* Month Navigation */}
      <div className="calendar-header">
        <button
          className="cal-nav-btn"
          onClick={() => setCurrentMonth('August 2026')}
          type="button"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="cal-month-title">{currentMonth}</span>
        <button
          className="cal-nav-btn"
          onClick={() => setCurrentMonth('October 2026')}
          type="button"
          aria-label="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Days Strip */}
      <div className="calendar-days-strip">
        {days.map((item, idx) => {
          const isSelected = item.date === selectedDay;
          return (
            <div
              key={idx}
              className={`cal-day-cell ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedDay(item.date)}
            >
              <span className="cal-day-label">{item.label}</span>
              <span className="cal-day-number">{item.date < 10 ? `0${item.date}` : item.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
