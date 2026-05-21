import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, Clock, Calendar } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAvailability, saveAvailability } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import Skeleton from '@/components/ui/skeleton';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';
const TIMEZONE_OPTIONS = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London'
];

function sortRules(rules = []) {
  return [...rules].sort((a, b) => a.day - b.day);
}

function sortOverrides(overrides = []) {
  return [...overrides].sort((a, b) => a.date.localeCompare(b.date));
}

function addOneHour(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const nextHour = Math.min(hours + 1, 23);
  return `${String(nextHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function subtractOneHour(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const nextHour = Math.max(hours - 1, 0);
  return `${String(nextHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeRange(startTime, endTime, changedField) {
  if (startTime < endTime) {
    return { startTime, endTime };
  }

  return changedField === 'startTime'
    ? { startTime, endTime: addOneHour(startTime) }
    : { startTime: subtractOneHour(endTime), endTime };
}

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState({
    weeklyRules: [],
    dateOverrides: [],
    timezone: 'UTC'
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const saveAbortControllerRef = useRef(null);

  const { data: availabilityResponse, isLoading } = useQuery({
    queryKey: ['availability'],
    queryFn: getAvailability,
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: ({ payload, signal }) => saveAvailability(payload, { signal }),
    onSuccess: () => toast({ title: 'Availability saved', description: 'Your schedule has been successfully updated.' }),
    onError: (error) => {
      if (error?.code === 'ERR_CANCELED') return;
      toast({
        title: 'Failed to save availability',
        description: error?.response?.data?.message || 'Please try again.'
      });
    }
  });

  useEffect(() => {
    if (!availabilityResponse) return;

    setAvailability({
      weeklyRules: sortRules(Array.isArray(availabilityResponse.weeklyRules) ? availabilityResponse.weeklyRules : []),
      dateOverrides: sortOverrides(Array.isArray(availabilityResponse.dateOverrides) ? availabilityResponse.dateOverrides : []),
      timezone: availabilityResponse.timezone || 'UTC'
    });
  }, [availabilityResponse]);

  useEffect(() => () => {
    saveAbortControllerRef.current?.abort();
  }, []);

  const syncAvailability = (nextAvailability) => {
    const payload = {
      timezone: nextAvailability.timezone,
      weeklyRules: sortRules(nextAvailability.weeklyRules),
      dateOverrides: sortOverrides(nextAvailability.dateOverrides)
    };

    setAvailability(payload);
    saveAbortControllerRef.current?.abort();
    saveAbortControllerRef.current = new AbortController();

    saveAvailabilityMutation.mutate({
      payload,
      signal: saveAbortControllerRef.current.signal
    });
  };

  const ruleMap = useMemo(
    () => new Map(availability.weeklyRules.map((rule) => [rule.day, rule])),
    [availability.weeklyRules]
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd)
  });

  const getDefaultRangeForDay = (day) => {
    const existingRule = ruleMap.get(day);
    if (existingRule) return existingRule;
    const firstRule = availability.weeklyRules[0];
    return firstRule || { startTime: DEFAULT_START, endTime: DEFAULT_END };
  };

  const toggleDay = (day) => {
    if (ruleMap.has(day)) {
      syncAvailability({
        ...availability,
        weeklyRules: availability.weeklyRules.filter((rule) => rule.day !== day)
      });
      return;
    }

    const range = getDefaultRangeForDay(day);
    syncAvailability({
      ...availability,
      weeklyRules: [...availability.weeklyRules, { day, startTime: range.startTime, endTime: range.endTime }]
    });
  };

  const updateDayTime = (day, field, value) => {
    const rule = ruleMap.get(day);
    if (!rule) return;

    const nextRange = normalizeRange(
      field === 'startTime' ? value : rule.startTime,
      field === 'endTime' ? value : rule.endTime,
      field
    );

    syncAvailability({
      ...availability,
      weeklyRules: availability.weeklyRules.map((item) =>
        item.day === day ? { ...item, ...nextRange } : item
      )
    });
  };

  const addOverride = (date) => {
    if (availability.dateOverrides.some((override) => override.date === date)) return;

    const day = new Date(`${date}T00:00:00`).getDay();
    const range = getDefaultRangeForDay(day);

    syncAvailability({
      ...availability,
      dateOverrides: [
        ...availability.dateOverrides,
        {
          date,
          blocked: false,
          startTime: range.startTime,
          endTime: range.endTime
        }
      ]
    });
  };

  const updateOverride = (date, updater) => {
    syncAvailability({
      ...availability,
      dateOverrides: availability.dateOverrides.map((override) =>
        override.date === date ? updater(override) : override
      )
    });
  };

  const updateOverrideTime = (date, field, value) => {
    const override = availability.dateOverrides.find((item) => item.date === date);
    if (!override || override.blocked) return;

    const nextRange = normalizeRange(
      field === 'startTime' ? value : override.startTime,
      field === 'endTime' ? value : override.endTime,
      field
    );

    updateOverride(date, (item) => ({ ...item, ...nextRange }));
  };

  const setOverrideMode = (date, blocked) => {
    updateOverride(date, (override) => {
      if (blocked) {
        return { ...override, blocked: true, startTime: null, endTime: null };
      }

      const day = new Date(`${date}T00:00:00`).getDay();
      const range = getDefaultRangeForDay(day);
      return {
        ...override,
        blocked: false,
        startTime: override.startTime || range.startTime,
        endTime: override.endTime || range.endTime
      };
    });
  };

  const removeOverride = (date) => {
    syncAvailability({
      ...availability,
      dateOverrides: availability.dateOverrides.filter((override) => override.date !== date)
    });
  };

  const getCalendarState = (date) => {
    const override = availability.dateOverrides.find((item) => item.date === date);
    if (!override) return 'none';
    return override.blocked ? 'blocked' : 'custom';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-10 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-28" />
                      <Skeleton className="h-9 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-8" />
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(35)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square w-full rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Availability</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set day-wise hours, timezone, and special date overrides.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_380px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">Schedule timezone</h2>
              <select
                value={availability.timezone}
                onChange={(event) => syncAvailability({ ...availability, timezone: event.target.value })}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {TIMEZONE_OPTIONS.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </section>

            <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-base font-semibold text-foreground">Weekly hours</h2>
                <p className="mt-1 text-sm text-muted-foreground">Turn days on and set their hours.</p>
              </div>

              <div className="divide-y divide-border">
                {DAYS.map((label, day) => {
                  const rule = ruleMap.get(day);
                  const isEnabled = Boolean(rule);

                  return (
                    <div 
                      key={label} 
                      className={`px-6 py-4 transition-all duration-200 ${
                        !isEnabled ? 'bg-secondary/15 opacity-60' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                          <Switch checked={isEnabled} onCheckedChange={() => toggleDay(day)} />
                          <span className={`text-sm font-semibold transition-colors ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {label}
                          </span>
                        </div>

                        {rule ? (
                          <div className="flex items-center gap-3">
                            <Input
                              type="time"
                              value={rule.startTime}
                              onChange={(event) => updateDayTime(day, 'startTime', event.target.value)}
                              className="h-10 w-[140px] rounded-xl"
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={rule.endTime}
                              onChange={(event) => updateDayTime(day, 'endTime', event.target.value)}
                              className="h-10 w-[140px] rounded-xl"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Unavailable</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-base font-semibold text-foreground">Date overrides</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a date from the calendar and give it custom hours or mark it unavailable.
                </p>
              </div>

              <div className="p-6">
                {availability.dateOverrides.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    No overrides yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {availability.dateOverrides.map((override) => (
                      <div key={override.date} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {format(new Date(`${override.date}T00:00:00`), 'EEEE, MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {override.blocked ? 'Unavailable all day' : 'Custom hours'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeOverride(override.date)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={override.blocked ? 'outline' : 'default'}
                            className="rounded-xl h-8 text-xs px-3"
                            onClick={() => setOverrideMode(override.date, false)}
                          >
                            Custom hours
                          </Button>
                          <Button
                            type="button"
                            variant={override.blocked ? 'destructive' : 'outline'}
                            className="rounded-xl h-8 text-xs px-3"
                            onClick={() => setOverrideMode(override.date, true)}
                          >
                            Unavailable
                          </Button>
                        </div>

                        {!override.blocked ? (
                          <div className="flex items-center gap-3">
                            <Input
                              type="time"
                              value={override.startTime || DEFAULT_START}
                              onChange={(event) => updateOverrideTime(override.date, 'startTime', event.target.value)}
                              className="h-10 rounded-xl"
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={override.endTime || DEFAULT_END}
                              onChange={(event) => updateOverrideTime(override.date, 'endTime', event.target.value)}
                              className="h-10 rounded-xl"
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <aside className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-foreground">{format(currentMonth, 'MMMM yyyy')}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {SHORT_DAYS.map((day) => (
                  <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}

                {calendarDays.map((day) => {
                  const date = format(day, 'yyyy-MM-dd');
                  const state = getCalendarState(date);

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => isSameMonth(day, currentMonth) && addOverride(date)}
                      className={`aspect-square rounded-xl text-sm transition-colors ${
                        !isSameMonth(day, currentMonth)
                          ? 'cursor-default text-muted-foreground/25'
                          : state === 'blocked'
                            ? 'bg-destructive/15 font-medium text-destructive'
                            : state === 'custom'
                              ? 'bg-secondary font-medium text-foreground'
                              : isToday(day)
                                ? 'bg-background text-foreground ring-2 ring-brand'
                                : 'text-foreground hover:bg-secondary'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2 text-xs text-muted-foreground border-t border-border/40 pt-4">
                <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand" /> Click any date to add an override.</p>
                <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-secondary" /> `Gray` means custom hours override.</p>
                <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> `Red` means unavailable override.</p>
              </div>
            </aside>

            {/* Live Preview grid section */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand shrink-0" />
                  Live Preview
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Here is what your bookers see</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-1">
                {DAYS.map((label, dayIndex) => {
                  const rule = ruleMap.get(dayIndex);
                  const isEnabled = Boolean(rule);

                  return (
                    <div
                      key={label}
                      className={`flex flex-col gap-1.5 rounded-xl border p-3.5 transition-all duration-200 ${
                        isEnabled
                          ? 'border-brand/20 bg-brand/5 text-foreground'
                          : 'border-border bg-secondary/15 text-muted-foreground opacity-55'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{label}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'
                          }`}
                        />
                      </div>

                      <div className="text-xs mt-1">
                        {isEnabled ? (
                          <div className="flex items-center gap-1.5 font-medium text-brand">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{rule.startTime} - {rule.endTime}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/80 italic text-[11px]">Closed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
