import { useState } from "react";
import { useGetScheduleExecution } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle, Clock, MapPin } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";

export default function OperatorSchedule() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  const dateFrom = format(weekStart, 'yyyy-MM-dd');
  const dateTo = format(weekEnd, 'yyyy-MM-dd');

  const { data: scheduleExecution, isLoading } = useGetScheduleExecution({
    query: {
      queryKey: ["schedule-execution", dateFrom, dateTo],
    },
    request: {
      query: { dateFrom, dateTo }
    }
  });

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  // Group by day for this week (0-6 where 0 is Monday in our UI, but API uses 0 for Sunday)
  // Let's normalize it to match the week dates
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Weekly Plan</h1>
        <p className="text-muted-foreground">Your scheduled visits for the week</p>
      </div>

      <div className="flex justify-center mb-8">
        <Input 
          type="date" 
          value={format(currentDate, 'yyyy-MM-dd')}
          onChange={e => setCurrentDate(new Date(e.target.value))}
          className="max-w-[200px] text-center font-medium"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading schedule...</div>
      ) : (
        <div className="space-y-8">
          {weekDays.map((dayDate, idx) => {
            // API dayOfWeek is 0=Sunday, 1=Monday. JS getDay is same.
            const apiDayOfWeek = dayDate.getDay();
            const dateStr = format(dayDate, 'yyyy-MM-dd');
            const isToday = isSameDay(dayDate, new Date());
            
            // Find execution items for this specific date
            const dayItems = scheduleExecution?.filter(s => s.scheduledDate === dateStr) || [];
            
            if (dayItems.length === 0 && !isToday) return null; // Only show empty days if it's today
            
            return (
              <div key={dateStr} className={`space-y-3 ${isToday ? 'relative' : ''}`}>
                {isToday && (
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary rounded-full"></div>
                )}
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {format(dayDate, 'EEEE')} 
                  <span className="text-sm font-normal text-muted-foreground">{format(dayDate, 'dd.MM.yyyy')}</span>
                  {isToday && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full ml-2">TODAY</span>}
                </h2>
                
                {dayItems.length === 0 ? (
                  <Card className="border-dashed bg-transparent shadow-none">
                    <CardContent className="p-4 text-center text-muted-foreground text-sm">
                      No visits scheduled for today.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {dayItems.map((item, i) => (
                      <Card key={i} className={`border ${item.executed ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50' : ''}`}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className={`font-semibold ${item.executed ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{item.clientName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.executed ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                                <span>Completed ({item.loadCount} loads)</span>
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-sm">
                                <span>Pending</span>
                                <Circle className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
