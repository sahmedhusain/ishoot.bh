'use client';

import * as React from 'react';
import type { CalendarEvent, CRMDeal } from '@ishoot/database/types';
import { createCalendarEventAction, deleteCalendarEventAction } from '../../app/actions/calendar';
import { Card, Button, Modal, Input, Select } from '@ishoot/ui';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';

interface OdooCalendarViewProps {
  initialEvents: CalendarEvent[];
  deals: CRMDeal[];
}

export function OdooCalendarView({ initialEvents, deals }: OdooCalendarViewProps) {
  const { t, locale, isRTL } = useAdminLocale();

  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'day'>('month');
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);

  // Form states
  const [title, setTitle] = React.useState('');
  const [titleAr, setTitleAr] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = React.useState(
    new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16)
  );
  const [location, setLocation] = React.useState('');
  const [eventType, setEventType] = React.useState<'shoot' | 'meeting' | 'deadline' | 'reminder'>('shoot');
  const [dealId, setDealId] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun

  const monthNames = [
    locale === 'ar' ? 'يناير' : 'January',
    locale === 'ar' ? 'فبراير' : 'February',
    locale === 'ar' ? 'مارس' : 'March',
    locale === 'ar' ? 'أبريل' : 'April',
    locale === 'ar' ? 'مايو' : 'May',
    locale === 'ar' ? 'يونيو' : 'June',
    locale === 'ar' ? 'يوليو' : 'July',
    locale === 'ar' ? 'أغسطس' : 'August',
    locale === 'ar' ? 'سبتمبر' : 'September',
    locale === 'ar' ? 'أكتوبر' : 'October',
    locale === 'ar' ? 'نوفمبر' : 'November',
    locale === 'ar' ? 'ديسمبر' : 'December',
  ];

  const weekDayNames = [
    locale === 'ar' ? 'الأحد' : 'Sun',
    locale === 'ar' ? 'الإثنين' : 'Mon',
    locale === 'ar' ? 'الثلاثاء' : 'Tue',
    locale === 'ar' ? 'الأربعاء' : 'Wed',
    locale === 'ar' ? 'الخميس' : 'Thu',
    locale === 'ar' ? 'الجمعة' : 'Fri',
    locale === 'ar' ? 'السبت' : 'Sat',
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) return;
    setSaving(true);

    try {
      const typeColors: Record<string, string> = {
        shoot: '#09937F',
        meeting: '#3B82F6',
        deadline: '#E11D48',
        reminder: '#F59E0B',
      };

      const res = await createCalendarEventAction({
        title,
        title_ar: titleAr || undefined,
        description: description || undefined,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        location: location || undefined,
        color: typeColors[eventType],
        event_type: eventType,
        deal_id: dealId || undefined,
      });

      if (res.event) {
        setEvents((prev) => [...prev, res.event as CalendarEvent]);
        setCreateModalOpen(false);
        setTitle('');
        setTitleAr('');
        setDescription('');
        setLocation('');
        setDealId('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteCalendarEventAction(id);
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
    setSelectedEvent(null);
  };

  // Google Calendar Sync Deep Link
  const openGoogleCalendarExport = (ev: CalendarEvent) => {
    const startIso = new Date(ev.start_date).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endIso = new Date(ev.end_date).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const gTitle = encodeURIComponent(locale === 'ar' && ev.title_ar ? ev.title_ar : ev.title);
    const gDesc = encodeURIComponent(ev.description || 'Cinema Production Shoot Event by ishoot.bh');
    const gLoc = encodeURIComponent(ev.location || 'Manama, Bahrain');

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gTitle}&dates=${startIso}/${endIso}&details=${gDesc}&location=${gLoc}`;
    window.open(googleUrl, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Calendar Header with Odoo Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0B1210] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#09937F]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
              {t.calendar.title}
            </h1>
          </div>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.calendar.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigation */}
          <div className="flex items-center gap-1.5 bg-[#050807] p-1 rounded-xl border border-white/10">
            <button
              onClick={isRTL ? nextMonth : prevMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#9EADA9] hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-white text-xs px-2 min-w-[110px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={isRTL ? prevMonth : nextMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#9EADA9] hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs"
          >
            {t.calendar.today}
          </Button>

          {/* View Switchers */}
          <div className="flex items-center bg-[#050807] p-1 rounded-xl border border-white/10 text-xs font-semibold">
            {(['month', 'week', 'day'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  viewMode === m
                    ? 'bg-[#09937F] text-white shadow-sm'
                    : 'text-[#9EADA9] hover:text-white'
                }`}
              >
                {(t.calendar as any)[`${m}View`]}
              </button>
            ))}
          </div>

          {/* New Event Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-1.5 shadow-lg shadow-[#09937F]/20"
          >
            <Plus className="w-4 h-4" />
            <span>{t.actions.newEvent}</span>
          </Button>
        </div>
      </div>

      {/* Month View Grid */}
      {viewMode === 'month' && (
        <Card className="p-4 sm:p-6 bg-[#0B1210] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs text-[#9EADA9] uppercase pb-3 border-b border-white/10 font-bold">
            {weekDayNames.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2">
            {/* Blank offset boxes */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[90px] sm:min-h-[110px] rounded-2xl bg-white/[0.01] border border-white/[0.03]" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday =
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === dayNum;

              // Filter events occurring on this date
              const dayEvents = events.filter((ev) => {
                const evStart = new Date(ev.start_date).toISOString().split('T')[0];
                return evStart === dateStr;
              });

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    setStartDate(`${dateStr}T09:00`);
                    setEndDate(`${dateStr}T12:00`);
                    setCreateModalOpen(true);
                  }}
                  className={`min-h-[90px] sm:min-h-[110px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isToday
                      ? 'bg-[#014842]/20 border-[#09937F] shadow-lg shadow-[#09937F]/10'
                      : 'bg-[#050807] border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-[#09937F] text-white' : 'text-[#9EADA9]'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#09937F]" />
                    )}
                  </div>

                  {/* Event pills on the day */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className="p-1 px-1.5 rounded-md text-[10px] font-semibold truncate border transition-transform hover:scale-[1.02]"
                        style={{
                          backgroundColor: `${ev.color || '#09937F'}20`,
                          color: ev.color || '#09937F',
                          borderColor: `${ev.color || '#09937F'}40`,
                        }}
                      >
                        {locale === 'ar' && ev.title_ar ? ev.title_ar : ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] font-mono text-[#9EADA9] text-center">
                        +{dayEvents.length - 2} {locale === 'ar' ? 'أخرى' : 'more'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Week / Day View List */}
      {(viewMode === 'week' || viewMode === 'day') && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
          <div className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
            {locale === 'ar' ? 'قائمة الفعاليات المجدولة' : 'Upcoming Event Agenda'}
          </div>

          <div className="divide-y divide-white/5 space-y-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className="p-4 rounded-2xl bg-[#050807] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#09937F]/50 transition-all cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
                      style={{
                        backgroundColor: `${ev.color || '#09937F'}20`,
                        color: ev.color || '#09937F',
                      }}
                    >
                      {ev.event_type}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {locale === 'ar' && ev.title_ar ? ev.title_ar : ev.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#9EADA9]">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#09937F]" />
                      <span>{new Date(ev.start_date).toLocaleString(locale === 'ar' ? 'ar-BH' : 'en-US')}</span>
                    </span>
                    {ev.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#09937F]" />
                        <span>{ev.location}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGoogleCalendarExport(ev);
                    }}
                    className="gap-1.5 text-xs text-[#09937F] border-[#09937F]/40"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{locale === 'ar' ? 'تقويم جوجل' : 'Google Calendar'}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          title={locale === 'ar' && selectedEvent.title_ar ? selectedEvent.title_ar : selectedEvent.title}
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-2 bg-[#050807] p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">{locale === 'ar' ? 'نوع الفعالية:' : 'Event Type:'}</span>
                <span className="font-bold text-[#09937F] uppercase">{selectedEvent.event_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">{locale === 'ar' ? 'وقت البدء:' : 'Start Time:'}</span>
                <span className="text-white font-mono">{new Date(selectedEvent.start_date).toLocaleString(locale === 'ar' ? 'ar-BH' : 'en-US')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">{locale === 'ar' ? 'وقت الانتهاء:' : 'End Time:'}</span>
                <span className="text-white font-mono">{new Date(selectedEvent.end_date).toLocaleString(locale === 'ar' ? 'ar-BH' : 'en-US')}</span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center justify-between">
                  <span className="text-[#9EADA9]">{locale === 'ar' ? 'الموقع:' : 'Location:'}</span>
                  <span className="text-white">{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.deal && (
                <div className="flex items-center justify-between">
                  <span className="text-[#9EADA9]">{locale === 'ar' ? 'الصفقة المرتبطة:' : 'Linked Deal:'}</span>
                  <span className="text-[#09937F] font-bold">{selectedEvent.deal.title}</span>
                </div>
              )}
            </div>

            {selectedEvent.description && (
              <p className="text-sm text-[#9EADA9] bg-[#050807] p-4 rounded-xl border border-white/5">
                {selectedEvent.description}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openGoogleCalendarExport(selectedEvent)}
                className="gap-2 text-[#09937F] border-[#09937F]/40"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t.actions.syncGoogle}</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  {t.actions.close}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Event Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t.actions.newEvent}
      >
        <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">
              {locale === 'ar' ? 'عنوان الفعالية بالإنجليزية *' : 'Event Title (English) *'}
            </label>
            <Input
              required
              placeholder={locale === 'ar' ? 'مثال: Batelco Cinema Shoot Day 1' : 'e.g. Batelco Cinema Shoot Day 1'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">
              {locale === 'ar' ? 'عنوان الفعالية بالعربية' : 'Event Title (Arabic)'}
            </label>
            <Input
              placeholder={locale === 'ar' ? 'مثال: تصوير إعلان بتلكو السينمائي' : 'e.g. Batelco National Day Shoot'}
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className="text-end font-arabic"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[#9EADA9] font-medium">
                {locale === 'ar' ? 'تاريخ ووقت البدء *' : 'Start Date & Time *'}
              </label>
              <Input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#9EADA9] font-medium">
                {locale === 'ar' ? 'تاريخ ووقت الانتهاء *' : 'End Date & Time *'}
              </label>
              <Input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[#9EADA9] font-medium">
                {locale === 'ar' ? 'نوع الفعالية' : 'Event Type'}
              </label>
              <Select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as any)}
              >
                <option value="shoot">{locale === 'ar' ? 'تصوير سينمائي' : 'Cinema Shoot'}</option>
                <option value="meeting">{locale === 'ar' ? 'اجتماع عملاء' : 'Client Meeting'}</option>
                <option value="deadline">{locale === 'ar' ? 'موعد تسليم نهائي' : 'Delivery Deadline'}</option>
                <option value="reminder">{locale === 'ar' ? 'تذكير' : 'Reminder'}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#9EADA9] font-medium">
                {locale === 'ar' ? 'ربط بصفقة إنتاج' : 'Link with Production Deal'}
              </label>
              <Select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
              >
                <option value="">
                  {locale === 'ar' ? 'بدون صفقة (استوديو عام)' : 'No linked deal (General Studio)'}
                </option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">
              {locale === 'ar' ? 'موقع التصوير / العنوان' : 'Shoot Location / Address'}
            </label>
            <Input
              placeholder={locale === 'ar' ? 'مثال: استوديو A، ضاحية السيف' : 'e.g. Soundstage A, Seef District'}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
            >
              {saving
                ? locale === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'
                : t.actions.save}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
