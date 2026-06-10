import { useState } from "react";
import { useListSchedules, useCreateSchedule, useDeleteSchedule, useListClients, getListSchedulesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const scheduleSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  dayOfWeek: z.coerce.number().min(0).max(6),
});

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Schedules() {
  const { data: schedules, isLoading } = useListSchedules();
  const { data: clients } = useListClients();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const createMutation = useCreateSchedule();
  const deleteMutation = useDeleteSchedule();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const canEdit = isAdmin;

  const form = useForm<z.infer<typeof scheduleSchema>>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      clientId: 0,
      dayOfWeek: 1, // Default Monday
    },
  });

  const handleOpenCreate = () => {
    form.reset({
      clientId: 0,
      dayOfWeek: 1,
    });
    setIsCreateOpen(true);
  };

  const onSubmit = (values: z.infer<typeof scheduleSchema>) => {
    createMutation.mutate({
      data: values,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
        setIsCreateOpen(false);
        toast({ title: "Schedule created successfully" });
      }
    });
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
          setDeleteId(null);
          toast({ title: "Schedule removed successfully" });
        }
      });
    }
  };

  // Group schedules by day
  const groupedSchedules = schedules?.reduce((acc, schedule) => {
    if (!acc[schedule.dayOfWeek]) acc[schedule.dayOfWeek] = [];
    acc[schedule.dayOfWeek].push(schedule);
    return acc;
  }, {} as Record<number, typeof schedules>) || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Weekly Schedule</h1>
          <p className="text-muted-foreground">Manage regular service visits</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Scheduled Visit
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading schedules...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
            const daySchedules = groupedSchedules[dayIdx] || [];
            
            return (
              <div key={dayIdx} className="rounded-md border bg-card text-card-foreground shadow-sm flex flex-col h-full">
                <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
                  <h3 className="font-semibold">{DAYS[dayIdx]}</h3>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                    {daySchedules.length} visits
                  </span>
                </div>
                <div className="p-0 flex-1 overflow-y-auto max-h-[300px]">
                  {daySchedules.length > 0 ? (
                    <div className="divide-y">
                      {daySchedules.map(schedule => (
                        <div key={schedule.id} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <span className="font-medium text-sm">{schedule.clientName}</span>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setDeleteId(schedule.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center justify-center h-full">
                      <CalendarDays className="w-8 h-8 mb-2 opacity-20" />
                      <p>No visits scheduled</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Scheduled Visit</DialogTitle>
            <DialogDescription>Assign a client to a day of the week for regular servicing.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Location</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.filter(c => c.hasContract).map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS.map((day, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Add to Schedule
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Scheduled Visit</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this visit from the schedule?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
