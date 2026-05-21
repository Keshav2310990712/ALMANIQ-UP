import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, Clock, User, CheckCircle2, ChevronRight, Download, CalendarPlus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBookingByUid } from '@/lib/api';
import Skeleton from '@/components/ui/skeleton';

export default function BookingConfirmedPage() {
  const { uid } = useParams();
  const [downloading, setDownloading] = useState(false);

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['booking-confirmed', uid],
    queryFn: () => getBookingByUid(uid),
    enabled: Boolean(uid),
  });

  const getGoogleCalendarUrl = (booking) => {
    if (!booking) return '';
    try {
      // Create dates in UTC format (YYYYMMDDTHHmmssZ)
      const startDate = new Date(`${booking.date}T${booking.time}:00`);
      const endDate = new Date(startDate.getTime() + (booking.duration || 30) * 60 * 1000);
      
      const formatGCalDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dates = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;
      const text = encodeURIComponent(booking.eventName || "Meeting");
      const details = encodeURIComponent(`Scheduled with ${booking.name}. Thank you!`);
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
    } catch (e) {
      console.error("Failed to generate Google Calendar URL", e);
      return '';
    }
  };

  const handleDownloadIcs = () => {
    if (!booking) return;
    setDownloading(true);
    try {
      const startDate = new Date(`${booking.date}T${booking.time}:00`);
      const endDate = new Date(startDate.getTime() + (booking.duration || 30) * 60 * 1000);
      
      const formatIcsDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Almaniq//NONSGML v1.0//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${booking.uid}`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `SUMMARY:${booking.eventName || 'Meeting'}`,
        `DTSTART:${formatIcsDate(startDate)}`,
        `DTEND:${formatIcsDate(endDate)}`,
        `DESCRIPTION:Scheduled booking with ${booking.name} via Almaniq.`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(booking.eventName || 'meeting').toLowerCase().replace(/\s+/g, '-')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download ICS file", e);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/95 p-4">
        <div className="w-full max-w-md bg-card border border-border/80 p-8 rounded-3xl shadow-lg space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-3 pt-4 border-t border-border/40">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center bg-card border border-border p-8 rounded-3xl shadow-sm">
          <h1 className="text-xl font-bold text-foreground mb-2">Booking Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">We couldn't retrieve the details for this booking. The link may have expired or is incorrect.</p>
          <Link to="/">
            <Button className="rounded-xl">Go to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Format booking date
  let formattedDate = booking.date;
  try {
    formattedDate = format(new Date(`${booking.date}T00:00:00`), 'EEEE, MMMM d, yyyy');
  } catch (e) {}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/15 p-4 relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-brand/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

      <style>{`
        .checkmark-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .checkmark {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: block;
          stroke-width: 3;
          stroke: #fff;
          stroke-miterlimit: 10;
          box-shadow: inset 0px 0px 0px #4f46e5;
          animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
        }
        .checkmark__circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 3;
          stroke-miterlimit: 10;
          stroke: #4f46e5;
          fill: none;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        .checkmark__check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
        }
        @keyframes stroke {
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes scale {
          0%, 100% {
            transform: none;
          }
          50% {
            transform: scale3d(1.1, 1.1, 1);
          }
        }
        @keyframes fill {
          100% {
            box-shadow: inset 0px 0px 0px 32px #4f46e5;
          }
        }
      `}</style>

      <div className="w-full max-w-md bg-card border border-border/80 p-8 rounded-3xl shadow-xl space-y-8 relative z-10 transition-all duration-300 hover:shadow-2xl">
        {/* Animated Checkmark Header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="checkmark-wrapper">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
              <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">You're booked!</h1>
            <p className="text-sm text-muted-foreground">A confirmation email has been sent to you.</p>
          </div>
        </div>

        {/* Booking Details Card */}
        <div className="bg-secondary/30 border border-border/50 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground border-b border-border/40 pb-2.5">
            {booking.eventName || "Meeting"}
          </h2>

          <div className="space-y-3.5 pt-1">
            <div className="flex items-center gap-3 text-sm text-foreground/90">
              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-brand shrink-0 border border-border/40">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="font-medium">{formattedDate}</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-foreground/90">
              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-brand shrink-0 border border-border/40">
                <Clock className="w-4 h-4" />
              </div>
              <span className="font-medium">{booking.time} ({booking.duration || 30} mins)</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-foreground/90">
              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-brand shrink-0 border border-border/40">
                <User className="w-4 h-4" />
              </div>
              <span className="font-medium">{booking.name}</span>
            </div>
          </div>
        </div>

        {/* Calendar Integration CTAs */}
        <div className="space-y-3 pt-2">
          <a
            href={getGoogleCalendarUrl(booking)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
          >
            <Button
              className="w-full gap-2 rounded-xl h-11 bg-brand hover:bg-brand/90 text-white shadow-sm font-medium transition-all"
            >
              <CalendarPlus className="w-4 h-4 shrink-0" />
              Add to Google Calendar
              <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-auto" />
            </Button>
          </a>

          <Button
            onClick={handleDownloadIcs}
            disabled={downloading}
            variant="outline"
            className="w-full gap-2 rounded-xl h-11 border-border/80 hover:bg-secondary/50 font-medium transition-all shadow-sm"
          >
            <Download className="w-4 h-4 shrink-0" />
            {downloading ? 'Downloading...' : 'Add to Apple Calendar'}
          </Button>
        </div>

        {/* Footer Link */}
        <div className="text-center pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Almaniq Home
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
