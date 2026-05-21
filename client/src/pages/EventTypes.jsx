import { useState } from 'react';
import { Plus, Copy, Pencil, Trash2, ExternalLink, Clock, Calendar } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import EventTypeDialog from '@/components/EventTypeDialog';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEventType, deleteEventType, getEventTypes, updateEventType } from '@/lib/api';
import Skeleton from '@/components/ui/skeleton';

const borderColors = [
  'border-l-indigo-500 dark:border-l-indigo-400',
  'border-l-emerald-500 dark:border-l-emerald-400',
  'border-l-rose-500 dark:border-l-rose-400',
  'border-l-amber-500 dark:border-l-amber-400',
  'border-l-violet-500 dark:border-l-violet-400'
];

export default function EventTypes() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const queryClient = useQueryClient();
    const { data: eventTypes = [], isLoading: loading } = useQuery({
        queryKey: ['event-types'],
        queryFn: getEventTypes,
    });
    const invalidateEventTypeQueries = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['event-types'] }),
            queryClient.invalidateQueries({ queryKey: ['event-type'] })
        ]);
    };
    const createEventMutation = useMutation({
        mutationFn: createEventType,
        onSuccess: async () => {
            await invalidateEventTypeQueries();
            toast({
                title: 'Event type created',
                description: 'Your new event type has been created successfully.'
            });
        }
    });
    const updateEventMutation = useMutation({
        mutationFn: ({ id, payload }) => updateEventType(id, payload),
        onSuccess: async (data, variables) => {
            await invalidateEventTypeQueries();
            if (variables && variables.payload && Object.keys(variables.payload).length === 1 && 'active' in variables.payload) {
                toast({
                    title: variables.payload.active ? 'Event type enabled' : 'Event type disabled',
                    description: `The event type is now ${variables.payload.active ? 'active' : 'hidden'}.`
                });
            } else {
                toast({
                    title: 'Event type updated',
                    description: 'Your changes have been saved successfully.'
                });
            }
        }
    });
    const deleteEventMutation = useMutation({
        mutationFn: deleteEventType,
        onSuccess: async () => {
            await invalidateEventTypeQueries();
            toast({
                title: 'Event type deleted',
                description: 'The event type was successfully removed.'
            });
        }
    });
    const getEventPath = (slug) => `/book/${slug}`;
    const copyLink = (slug) => {
        const url = `${window.location.origin}${getEventPath(slug)}`;
        navigator.clipboard.writeText(url);
        toast({ title: 'Link copied', description: 'Booking link copied to clipboard.' });
    };
    const toggleEvent = async (id) => {
        const currentEvent = eventTypes.find(e => e.id === id);
        if (!currentEvent)
            return;
        try {
            await updateEventMutation.mutateAsync({ id, payload: { active: !currentEvent.active } });
        }
        catch (error) {
            toast({
                title: 'Failed to update event type',
                description: error?.response?.data?.message || 'Please try again.'
            });
        }
    };
    const addEvent = async (event) => {
        await createEventMutation.mutateAsync(event);
    };
    const saveEventUpdate = async (id, updates) => {
        await updateEventMutation.mutateAsync({ id, payload: updates });
    };
    const removeEvent = async (id) => {
        try {
            await deleteEventMutation.mutateAsync(id);
        }
        catch (error) {
            toast({
                title: 'Cannot delete event type',
                description: error?.response?.data?.message || 'Please try again.'
            });
        }
    };
    const handleSave = async (data) => {
        try {
            if (editing) {
                await saveEventUpdate(editing.id, data);
            }
            else {
                await addEvent(data);
            }
            setDialogOpen(false);
            setEditing(null);
        }
        catch (error) {
            toast({
                title: 'Failed to save event type',
                description: error?.response?.data?.message || 'Please try again.'
            });
        }
    };
    const getEventHref = (slug) => getEventPath(slug);
    return (<DashboardLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Event Types</h1>
            <p className="text-sm text-muted-foreground mt-1">Create events for people to book on your calendar.</p>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="h-11 gap-2 self-start rounded-xl px-5 shadow-sm">
            <Plus className="w-4 h-4"/>
            New Event Type
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm border-l-4 border-l-muted">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-8 w-16" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : eventTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm max-w-2xl mx-auto my-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-4">
              <Calendar className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No event types yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              No event types yet. Create your first one to get a booking link.
            </p>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="mt-4 gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Create Event Type
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {eventTypes.map((event, i) => {
              const borderColorClass = borderColors[i % borderColors.length];
              return (
                <div 
                  key={event.id} 
                  className={`flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80 border-l-4 ${borderColorClass}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-semibold text-foreground tracking-tight line-clamp-1">
                        {event.title}
                      </h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        event.active 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {event.active ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{event.duration} mins</span>
                    </div>

                    <p className="text-xs text-muted-foreground truncate font-mono bg-secondary/50 px-2 py-1 rounded">
                      /book/{event.slug}
                    </p>

                    {event.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                        {event.description}
                      </p>
                    ) : (
                      <div className="h-10 text-xs text-muted-foreground/40 italic flex items-center">
                        No description provided.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Status</span>
                      <Switch 
                        checked={event.active} 
                        onCheckedChange={() => toggleEvent(event.id)}
                        className="scale-90"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="View Live Booking Page"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary" 
                        onClick={() => window.open(getEventHref(event.slug), '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Copy Link"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary" 
                        onClick={() => copyLink(event.slug)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Edit Event Type"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary" 
                        onClick={() => { setEditing(event); setDialogOpen(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Delete Event Type"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                        onClick={() => removeEvent(event.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EventTypeDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} initial={editing}/>
    </DashboardLayout>);
}
