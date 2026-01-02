import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  ArrowLeft,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { api, Schedule, Assignment } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ScheduleDetail() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const navigate = useNavigate()

  // Fetch schedule details
  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => api.getSchedule(scheduleId!),
    enabled: !!scheduleId,
  })

  // Fetch schedule assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['schedule-assignments', scheduleId],
    queryFn: () => api.getScheduleAssignments(scheduleId!),
    enabled: !!scheduleId,
  })

  // Fetch employees for lookup
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.getEmployees({ limit: 1000 }),
  })

  // Fetch shift templates for lookup
  const { data: shiftTemplatesData } = useQuery({
    queryKey: ['shift-templates'],
    queryFn: () => api.getShiftTemplates({ limit: 1000 }),
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    // Handle time format like "09:00:00"
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getEmployeeName = (employeeId: string) => {
    const employee = employeesData?.items.find(e => e.id === employeeId)
    if (!employee) return 'Unknown'
    return `${employee.first_name} ${employee.last_name}`.trim() || employee.email
  }

  const getShiftName = (shiftTemplateId: string) => {
    const shift = shiftTemplatesData?.items.find(s => s.id === shiftTemplateId)
    return shift?.name || 'Unknown Shift'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'generated':
        return 'bg-blue-100 text-blue-800'
      case 'generating':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Group assignments by date
  const assignmentsByDate = assignments?.reduce((acc, assignment) => {
    const date = assignment.shift_date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(assignment)
    return acc
  }, {} as Record<string, Assignment[]>) || {}

  const sortedDates = Object.keys(assignmentsByDate).sort()

  if (scheduleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading schedule...</p>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Schedule not found</p>
        <Button onClick={() => navigate('/schedules')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Schedules
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/schedules')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            {schedule.name}
          </h2>
          <p className="text-muted-foreground">
            {formatDate(schedule.start_date)} - {formatDate(schedule.end_date)}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(schedule.status)}`}>
          {schedule.status.toUpperCase()}
        </span>
      </div>

      {/* Schedule Details */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Details</CardTitle>
          <CardDescription>Overview and generation metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Assignments</p>
              <p className="text-2xl font-bold">{assignments?.length || 0}</p>
            </div>
            {schedule.optimizer_score && (
              <div>
                <p className="text-sm text-muted-foreground">Optimizer Score</p>
                <p className="text-2xl font-bold">
                  {(parseFloat(schedule.optimizer_score) * 100).toFixed(1)}%
                </p>
              </div>
            )}
            {schedule.generation_duration_seconds !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Generation Time</p>
                <p className="text-2xl font-bold">
                  {schedule.generation_duration_seconds}s
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Optimization Mode</p>
              <div className="flex items-center gap-2 mt-1">
                {schedule.ml_assisted ? (
                  <>
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">ML-Assisted</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Baseline</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {schedule.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{schedule.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignments by Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Shift Assignments
          </CardTitle>
          <CardDescription>
            {assignments?.length || 0} assignments across {sortedDates.length} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Loading assignments...
            </p>
          ) : sortedDates.length > 0 ? (
            <div className="space-y-6">
              {sortedDates.map(date => (
                <div key={date} className="space-y-2">
                  <h3 className="font-medium text-lg flex items-center gap-2 sticky top-0 bg-background py-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(date)}
                    <span className="text-sm text-muted-foreground font-normal">
                      ({assignmentsByDate[date].length} shifts)
                    </span>
                  </h3>
                  <div className="grid gap-2">
                    {assignmentsByDate[date].map(assignment => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="font-medium">
                              {getEmployeeName(assignment.employee_id)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {getShiftName(assignment.shift_template_id)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(assignment.start_time)} - {formatTime(assignment.end_time)}
                          </span>
                          <span className="font-medium">
                            {assignment.hours} hrs
                          </span>
                          {assignment.is_confirmed && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No assignments found for this schedule
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
