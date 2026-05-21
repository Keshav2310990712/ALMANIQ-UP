import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Calendar, ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import { getPublicProfile } from '@/lib/api';

const BRAND_BORDER_COLORS = [
  'border-l-4 border-l-indigo-500',
  'border-l-4 border-l-emerald-500',
  'border-l-4 border-l-amber-500',
  'border-l-4 border-l-rose-500',
  'border-l-4 border-l-cyan-500'
];

export default function PublicProfilePage({ profile: initialProfile }) {
  const { username } = useParams();

  const { data: profileData, isLoading: isLoadingProfile, isError: isErrorProfile } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => getPublicProfile(username),
    enabled: !initialProfile && Boolean(username),
  });

  const profileDataResolved = initialProfile || profileData;
  const isLoading = !initialProfile && isLoadingProfile;
  const isError = !initialProfile && isErrorProfile;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/15 py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header Skeleton */}
          <div className="flex flex-col items-center text-center space-y-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-4 w-72 rounded" />
          </div>
          {/* Cards Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-border/80 p-6 rounded-2xl space-y-4">
                <Skeleton className="h-6 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/4 rounded" />
                <Skeleton className="h-12 w-full rounded" />
                <Skeleton className="h-10 w-full rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !profileDataResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center bg-card border border-border p-8 rounded-3xl shadow-sm">
          <h1 className="text-xl font-bold text-foreground mb-2">User Profile Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We couldn't retrieve event types for "{username}". The user may not exist or has no active meetings.
          </p>
          <Link to="/">
            <Button className="rounded-xl">Go to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { name, eventTypes } = profileDataResolved;
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/15 py-16 px-4 relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-brand/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        {/* Host Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-md transform transition-all duration-300 hover:scale-105">
            {initials}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{name}</h1>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Welcome to my booking page. Please select one of the meeting options below to view my availability and schedule a time.
            </p>
          </div>
        </div>

        {/* Event Types Grid */}
        {eventTypes && eventTypes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {eventTypes.map((event, index) => {
              const borderStyle = BRAND_BORDER_COLORS[index % BRAND_BORDER_COLORS.length];
              return (
                <div
                  key={event.id}
                  className={`bg-card border border-border/80 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:border-brand/40 relative overflow-hidden group flex flex-col justify-between min-h-[220px] ${borderStyle}`}
                >
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold text-foreground group-hover:text-brand transition-colors">
                      {event.title}
                    </h2>
                    
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground bg-secondary/40 w-fit px-2.5 py-1 rounded-lg">
                      <Clock className="w-4 h-4 text-brand shrink-0" />
                      {event.duration} mins
                    </div>

                    {event.description && (
                      <p className="text-sm text-muted-foreground/90 leading-relaxed line-clamp-3 pt-1">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-6 border-t border-border/40 mt-4 flex justify-end">
                    <Link to={`/book/${event.slug}`} className="w-full sm:w-auto">
                      <Button
                        id={`book-btn-${event.slug}`}
                        className="w-full sm:w-auto gap-2 rounded-xl bg-brand hover:bg-brand/90 text-white shadow-sm font-semibold group-hover:translate-x-0.5 transition-transform"
                      >
                        Book Meeting
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-card border border-border/60 rounded-3xl p-8 max-w-lg mx-auto shadow-sm">
            <Calendar className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-1">No active events</h3>
            <p className="text-sm text-muted-foreground">
              This host hasn't published any active event types yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
