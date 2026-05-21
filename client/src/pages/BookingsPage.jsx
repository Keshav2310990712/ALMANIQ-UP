import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Clock, XCircle, Search } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { cancelBooking, getAvailability, getBookings, getEventTypes, getSlots, rescheduleBooking } from '@/lib/api';
import Skeleton from '@/components/ui/skeleton';

export default function BookingsPage() {
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [upcomingRowsPerPage, setUpcomingRowsPerPage] = useState(6);
  const [pastRowsPerPage, setPastRowsPerPage] = useState(6);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['bookings-dashboard'],
    queryFn: async () => {
      const [bookingsData, eventTypes, availability] = await Promise.all([
        getBookings(),
        getEventTypes(),
        getAvailability()
      ]);

      const eventTypeMap = new Map((eventTypes || []).map((event) => [event.id, event]));

      return {
        timezone: availability?.timezone || 'UTC',
        bookings: (bookingsData || []).map((booking) => ({
          ...booking,
          id: booking.uid,
          eventTitle: eventTypeMap.get(booking.eventTypeId)?.title || 'Deleted Event',
          eventDescription: eventTypeMap.get(booking.eventTypeId)?.description || '',
          eventActive: eventTypeMap.get(booking.eventTypeId)?.active ?? false
        }))
      };
    }
  });

  const cancelBookingMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bookings-dashboard'] });
      toast({
        title: 'Booking cancelled',
        description: 'The booking was successfully cancelled.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to cancel booking',
        description: error?.response?.data?.message || 'Please try again.'
      });
    }
  });

  const rescheduleBookingMutation = useMutation({
    mutationFn: ({ id, payload }) => rescheduleBooking(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['booking-reschedule-slots'] })
      ]);
      toast({
        title: 'Booking rescheduled',
        description: 'Your booking has been successfully rescheduled.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to reschedule booking',
        description: error?.response?.data?.message || 'Please try another time.'
      });
    }
  });

  const bookings = dashboardData?.bookings || [];
  const timezone = dashboardData?.timezone || 'UTC';
  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId) || null;
  const selectedBookingCanReschedule =
    selectedBooking?.status === 'confirmed' && selectedBooking?.eventActive;

  useEffect(() => {
    if (!selectedBooking) {
      setRescheduleDate('');
      setRescheduleTime('');
      return;
    }

    setRescheduleDate(selectedBooking.date);
    setRescheduleTime('');
  }, [selectedBooking]);

  const { data: slotsResponse, isFetching: isFetchingSlots } = useQuery({
    queryKey: ['booking-reschedule-slots', selectedBooking?.eventTypeId, rescheduleDate],
    queryFn: () => getSlots({ eventId: selectedBooking.eventTypeId, date: rescheduleDate }),
    enabled: Boolean(selectedBookingCanReschedule && rescheduleDate)
  });

  const availableSlots = slotsResponse?.slots || [];
  const dialogTimezone = slotsResponse?.timezone || timezone;

  const handleCancelBooking = async (uid) => {
    try {
      await cancelBookingMutation.mutateAsync(uid);
    } catch {
      // Handled in onError
    }
  };

  const handleRescheduleBooking = async () => {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) {
      return;
    }

    try {
      await rescheduleBookingMutation.mutateAsync({
        id: selectedBooking.id,
        payload: {
          date: rescheduleDate,
          time: rescheduleTime
        }
      });

      setSelectedBookingId(null);
    } catch (error) {
      // Handled in onError
    }
  };

  const nowInTimezone = getNowInTimeZone(timezone);

  // Client side search filter by Booker Name or Booker Email
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const query = searchQuery.toLowerCase().trim();
    return bookings.filter((booking) => 
      (booking.name && booking.name.toLowerCase().includes(query)) || 
      (booking.email && booking.email.toLowerCase().includes(query))
    );
  }, [bookings, searchQuery]);

  const upcoming = useMemo(() => {
    return filteredBookings
      .filter((booking) => booking.status === 'confirmed' && `${booking.date}T${booking.time}` >= nowInTimezone)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [filteredBookings, nowInTimezone]);

  const past = useMemo(() => {
    return filteredBookings
      .filter((booking) => booking.status === 'cancelled' || (booking.status === 'confirmed' && `${booking.date}T${booking.time}` < nowInTimezone))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [filteredBookings, nowInTimezone]);

  useEffect(() => {
    setUpcomingPage(1);
  }, [upcomingRowsPerPage]);

  useEffect(() => {
    setPastPage(1);
  }, [pastRowsPerPage]);

  useEffect(() => {
    setUpcomingPage((prev) => Math.min(prev, Math.max(1, Math.ceil(upcoming.length / upcomingRowsPerPage))));
  }, [upcoming.length, upcomingRowsPerPage]);

  useEffect(() => {
    setPastPage((prev) => Math.min(prev, Math.max(1, Math.ceil(past.length / pastRowsPerPage))));
  }, [past.length, pastRowsPerPage]);

  const selectedBookingDetails = useMemo(() => {
    if (!selectedBooking) {
      return [];
    }

    return [
      { label: 'When', value: `${format(parseISO(selectedBooking.date), 'MMM d, yyyy')} at ${selectedBooking.time}` },
      { label: 'Duration', value: `${selectedBooking.duration}m` },
      { label: 'Status', value: selectedBooking.status === 'cancelled' ? 'Cancelled' : selectedBooking.eventActive ? 'Confirmed' : 'Inactive event' },
      { label: 'Timezone', value: dialogTimezone },
      { label: 'Guest', value: selectedBooking.name },
      { label: 'Email', value: selectedBooking.email }
    ];
  }, [dialogTimezone, selectedBooking]);

  const BookingCard = ({ booking, showActions }) => {
    const initials = booking.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'G';

    return (
      <div 
        className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80 cursor-pointer"
        onClick={() => setSelectedBookingId(booking.id)}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand to-purple-500 text-xs font-bold text-white shadow-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{booking.name}</p>
                <p className="text-xs text-muted-foreground truncate">{booking.email || 'No email'}</p>
              </div>
            </div>

            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${
              booking.status === 'cancelled'
                ? 'bg-destructive/10 text-destructive'
                : !booking.eventActive
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              {booking.status === 'cancelled' 
                ? 'Cancelled' 
                : !booking.eventActive 
                  ? 'Inactive' 
                  : 'Confirmed'}
            </span>
          </div>

          <div className="space-y-2 border-t border-border/40 pt-3">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{format(parseISO(booking.date), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>{booking.time} ({booking.duration} mins)</span>
            </div>

            <div className="mt-2 text-xs font-medium text-brand/80 bg-brand/5 inline-block px-2.5 py-1 rounded-md max-w-full truncate">
              {booking.eventTitle}
            </div>
          </div>
        </div>

        <div 
          className="flex items-center justify-end gap-2 border-t border-border/40 pt-3 mt-4"
          onClick={(e) => e.stopPropagation()} // Prevent card details dialog triggering on button click
        >
          {booking.status === 'confirmed' && showActions && booking.eventActive ? (
            <div className="flex gap-2 w-full justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 px-2.5 rounded-lg border-border"
                onClick={() => {
                  setSelectedBookingId(booking.id);
                }}
              >
                Reschedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 px-2.5 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 border-border"
                onClick={() => {
                  handleCancelBooking(booking.id);
                }}
                disabled={cancelBookingMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8 px-3 rounded-lg w-full text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedBookingId(booking.id)}
            >
              View details
            </Button>
          )}
        </div>
      </div>
    );
  };

  const BookingSkeleton = () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-2 pt-3 border-t border-border/40">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );

  const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm max-w-xl mx-auto my-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
        <Calendar className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{message}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        When matching bookings are scheduled, they will appear here.
      </p>
    </div>
  );

  const BookingSection = ({ bookingsList, page, onPageChange, rowsPerPage, onRowsPerPageChange, showActions, emptyMessage }) => {
    const totalPages = Math.max(1, Math.ceil(bookingsList.length / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = bookingsList.length === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, bookingsList.length);
    const visibleBookings = bookingsList.slice(startIndex, endIndex);

    return (
      <div className="space-y-6">
        {visibleBookings.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} showActions={showActions} />
            ))}
          </div>
        )}

        {bookingsList.length > 0 && (
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-secondary/30 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between shadow-sm">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <select
                value={rowsPerPage}
                onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
                className="h-9 rounded-xl border border-border bg-background px-3 text-xs shadow-sm outline-none transition focus:border-foreground/20"
              >
                {[6, 12, 24].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3 md:justify-end">
              <span className="text-xs text-muted-foreground">
                {`${startIndex + 1}-${endIndex} of ${bookingsList.length}`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-border"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || bookingsList.length === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-border"
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || bookingsList.length === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Bookings</h1>
            <p className="mt-1 text-sm text-muted-foreground">View and manage all your scheduled bookings.</p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Segmented Tab controls */}
          <div className="flex rounded-xl bg-secondary/80 p-1 self-start shadow-sm border border-border/40">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === 'upcoming'
                  ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === 'past'
                  ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Past ({past.length})
            </button>
          </div>

          {/* Search bar matching name and email */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl shadow-sm border-border bg-background focus:border-brand"
            />
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <BookingSkeleton />
          ) : activeTab === 'upcoming' ? (
            <BookingSection
              bookingsList={upcoming}
              page={upcomingPage}
              onPageChange={setUpcomingPage}
              rowsPerPage={upcomingRowsPerPage}
              onRowsPerPageChange={setUpcomingRowsPerPage}
              showActions
              emptyMessage={searchQuery ? 'No bookings found matching your search.' : 'No upcoming bookings'}
            />
          ) : (
            <BookingSection
              bookingsList={past}
              page={pastPage}
              onPageChange={setPastPage}
              rowsPerPage={pastRowsPerPage}
              onRowsPerPageChange={setPastRowsPerPage}
              showActions={false}
              emptyMessage={searchQuery ? 'No bookings found matching your search.' : 'No past bookings'}
            />
          )}
        </div>
      </div>

      <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => !open && setSelectedBookingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBooking?.eventTitle}</DialogTitle>
            <DialogDescription>
              {selectedBooking?.eventDescription || 'Booking details and quick actions.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {selectedBookingDetails.map((detail) => (
                <div key={detail.label} className="rounded-lg border border-border p-3 bg-secondary/20">
                  <p className="mb-1 text-xs text-muted-foreground">{detail.label}</p>
                  <p className="text-sm font-medium text-foreground">{detail.value}</p>
                </div>
              ))}
            </div>

            {selectedBookingCanReschedule ? (
              <div className="space-y-4 rounded-lg border border-border p-4 bg-background shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Clock className="w-4 h-4 text-brand" />
                  Reschedule
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reschedule-date" className="text-xs font-semibold">New Date</Label>
                  <Input
                    id="reschedule-date"
                    type="date"
                    value={rescheduleDate}
                    onChange={(event) => {
                      setRescheduleDate(event.target.value);
                      setRescheduleTime('');
                    }}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Available Times</Label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 border border-border/55 rounded-lg bg-secondary/10">
                    {isFetchingSlots ? (
                      <p className="text-xs text-muted-foreground p-2">Loading available times...</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">No available times for this date</p>
                    ) : (
                      availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          variant={rescheduleTime === slot ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setRescheduleTime(slot)}
                          className="rounded-lg text-xs h-8"
                        >
                          {slot}
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            {selectedBookingCanReschedule ? (
              <Button
                onClick={handleRescheduleBooking}
                disabled={!rescheduleDate || !rescheduleTime || rescheduleBookingMutation.isPending}
                className="rounded-xl h-10 px-5 shadow-sm"
              >
                {rescheduleBookingMutation.isPending ? 'Rescheduling...' : 'Save Reschedule'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function getNowInTimeZone(timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const getPart = (type) => parts.find((part) => part.type === type)?.value || '00';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
}
