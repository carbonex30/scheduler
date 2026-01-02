import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Settings
} from 'lucide-react'
import { api, Schedule, ScheduleGenerateRequest } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'

export function Schedules() {
  const queryClient = useQueryClient()
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [generationResult, setGenerationResult] = useState<any>(null)

  // Form state
  const [scheduleName, setScheduleName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [useML, setUseML] = useState(true)
  const [notes, setNotes] = useState('')

  // Fetch schedules
  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.getSchedules({ limit: 100 }),
  })

  // Fetch departments for filter
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.getDepartments({ limit: 100, is_active: true }),
  })

  // Generate schedule mutation
  const generateMutation = useMutation({
    mutationFn: (data: ScheduleGenerateRequest) => api.generateSchedule(data),
    onSuccess: (result) => {
      setGenerationResult(result)
      queryClient.invalidateQueries({ queryKey: ['schedules'] })

      // Reset form if successful
      if (result.success) {
        setScheduleName('')
        setStartDate('')
        setEndDate('')
        setNotes('')
      }
    },
  })

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })

  // Publish schedule mutation
  const publishMutation = useMutation({
    mutationFn: (id: string) => api.publishSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })

  const handleGenerate = () => {
    const request: ScheduleGenerateRequest = {
      name: scheduleName,
      start_date: startDate,
      end_date: endDate,
      use_ml: useML,
      notes: notes || undefined,
    }

    generateMutation.mutate(request)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Schedules
          </h2>
          <p className="text-muted-foreground">
            Generate and manage employee schedules with ML-powered optimization
          </p>
        </div>
        <Button onClick={() => setShowGenerateDialog(!showGenerateDialog)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Schedule
        </Button>
      </div>

      {/* Generate Schedule Form */}
      {showGenerateDialog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate New Schedule
            </CardTitle>
            <CardDescription>
              Create an optimized schedule using ML predictions and employee preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schedule-name">Schedule Name *</Label>
                <Input
                  id="schedule-name"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="e.g., January 2026 Schedule"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="use-ml">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Optimization Mode
                  </div>
                </Label>
                <Select
                  id="use-ml"
                  value={useML ? 'ml' : 'basic'}
                  onChange={(e) => setUseML(e.target.value === 'ml')}
                >
                  <option value="ml">ML-Assisted (Recommended)</option>
                  <option value="basic">Basic Assignment</option>
                </Select>
                {useML && (
                  <p className="text-xs text-muted-foreground">
                    Uses trained models to predict employee preferences
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this schedule"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={!scheduleName || !startDate || !endDate || generateMutation.isPending}
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate Schedule'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowGenerateDialog(false)
                  setGenerationResult(null)
                }}
              >
                Cancel
              </Button>
            </div>

            {generateMutation.error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{generateMutation.error.message}</span>
              </div>
            )}

            {generationResult && (
              <div
                className={`p-4 rounded-lg border ${
                  generationResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-2 mb-3">
                  {generationResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {generationResult.success
                        ? 'Schedule Generated Successfully'
                        : 'Schedule Generation Failed'}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Assignments</p>
                    <p className="font-medium">{generationResult.num_assignments}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unassigned</p>
                    <p className="font-medium">{generationResult.num_unassigned_shifts}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Score</p>
                    <p className="font-medium">{(generationResult.optimizer_score * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {formatDuration(generationResult.generation_duration_seconds)}
                    </p>
                  </div>
                </div>

                {generationResult.ml_assisted && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    <span>ML-assisted optimization enabled</span>
                  </div>
                )}

                {generationResult.warnings.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Warnings:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {generationResult.warnings.map((warning: string, index: number) => (
                        <p key={index} className="text-xs text-yellow-800 bg-yellow-50 p-2 rounded">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {generationResult.errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Errors:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {generationResult.errors.map((error: string, index: number) => (
                        <p key={index} className="text-xs text-red-800 bg-red-50 p-2 rounded">
                          {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Schedules</CardTitle>
          <CardDescription>View and manage generated schedules</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading schedules...</p>
          ) : schedulesData && schedulesData.items.length > 0 ? (
            <div className="space-y-3">
              {schedulesData.items.map((schedule: Schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{schedule.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(schedule.status)}`}
                      >
                        {schedule.status}
                      </span>
                      {schedule.ml_assisted && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          ML
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(schedule.start_date)} - {formatDate(schedule.end_date)}
                      </span>
                      {schedule.optimizer_score && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Score: {(parseFloat(schedule.optimizer_score) * 100).toFixed(1)}%
                        </span>
                      )}
                      {schedule.generation_duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(schedule.generation_duration_seconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {schedule.status === 'generated' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => publishMutation.mutate(schedule.id)}
                        disabled={publishMutation.isPending}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Publish
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Navigate to schedule detail view
                        console.log('View schedule:', schedule.id)
                      }}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this schedule?')) {
                          deleteMutation.mutate(schedule.id)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No schedules yet. Generate your first schedule to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
