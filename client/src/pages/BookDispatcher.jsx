import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getEventTypeBySlug, getPublicProfile } from '@/lib/api';
import BookingPage from './BookingPage';
import PublicProfilePage from './PublicProfilePage';
import Skeleton from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function BookDispatcher() {
  const { identifier } = useParams();

  // 1. Try to fetch event type by slug first
  const { data: event, isLoading: isLoadingEvent, isError: isErrorEvent } = useQuery({
    queryKey: ['event-type', identifier],
    queryFn: () => getEventTypeBySlug(identifier),
    retry: false,
    enabled: Boolean(identifier),
  });

  // 2. Try to fetch public profile by username if the event fetch fails or returns empty/inactive
  const shouldFetchProfile = isErrorEvent || (event && !event.active);
  const { data: profile, isLoading: isLoadingProfile, isError: isErrorProfile } = useQuery({
    queryKey: ['public-profile', identifier],
    queryFn: () => getPublicProfile(identifier),
    retry: false,
    enabled: Boolean(identifier && shouldFetchProfile),
  });

  // Loading state for event type
  if (isLoadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/95 p-4">
        <div className="w-full max-w-md bg-card border border-border/80 p-8 rounded-3xl shadow-lg space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  // If event exists and is active, render BookingPage
  if (event && event.active) {
    return <BookingPage event={event} />;
  }

  // Loading state for public profile
  if (shouldFetchProfile && isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/15 py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-4 w-72 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // If public profile exists, render PublicProfilePage
  if (profile) {
    return <PublicProfilePage profile={profile} />;
  }

  // Fallback 404 for neither found
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center bg-card border border-border p-8 rounded-3xl shadow-sm">
        <h1 className="text-xl font-bold text-foreground mb-2">Link Not Found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          This booking link or user profile could not be found, or the meeting is currently inactive.
        </p>
        <Link to="/">
          <Button className="rounded-xl">Go to Homepage</Button>
        </Link>
      </div>
    </div>
  );
}
