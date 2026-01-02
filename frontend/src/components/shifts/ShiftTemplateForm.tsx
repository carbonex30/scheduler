import { useState, useEffect, FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ShiftTemplate, ShiftTemplateCreate, ShiftTemplateUpdate } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface ShiftTemplateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shiftTemplate?: ShiftTemplate
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
]

export function ShiftTemplateForm({ open, onOpenChange, shiftTemplate }: ShiftTemplateFormProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('0')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [durationHours, setDurationHours] = useState('')
  const [requiredEmployees, setRequiredEmployees] = useState('1')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string>('')

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.getDepartments(),
  })

  // Update form fields when shift template changes or dialog opens
  useEffect(() => {
    if (open) {
      if (shiftTemplate) {
        setName(shiftTemplate.name)
        setDepartmentId(shiftTemplate.department_id)
        setDayOfWeek(shiftTemplate.day_of_week.toString())
        setStartTime(shiftTemplate.start_time)
        setEndTime(shiftTemplate.end_time)
        setDurationHours(shiftTemplate.duration_hours)
        setRequiredEmployees(shiftTemplate.required_employees.toString())
        setIsActive(shiftTemplate.is_active)
      } else {
        setName('')
        setDepartmentId('')
        setDayOfWeek('0')
        setStartTime('')
        setEndTime('')
        setDurationHours('')
        setRequiredEmployees('1')
        setIsActive(true)
      }
      setError('')
    }
  }, [open, shiftTemplate])

  const createMutation = useMutation({
    mutationFn: (data: ShiftTemplateCreate) => api.createShiftTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShiftTemplateUpdate }) =>
      api.updateShiftTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !departmentId || !startTime || !endTime || !durationHours) {
      setError('Please fill in all required fields')
      return
    }

    const durationNum = parseFloat(durationHours)
    const requiredNum = parseInt(requiredEmployees)

    if (isNaN(durationNum) || isNaN(requiredNum)) {
      setError('Duration and required employees must be valid numbers')
      return
    }

    const data = {
      name: name.trim(),
      department_id: departmentId,
      day_of_week: parseInt(dayOfWeek),
      start_time: startTime,
      end_time: endTime,
      duration_hours: durationNum,
      required_employees: requiredNum,
      is_active: isActive,
    }

    if (shiftTemplate) {
      updateMutation.mutate({ id: shiftTemplate.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {shiftTemplate ? 'Edit Shift Template' : 'Add Shift Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Shift Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning Shift, Evening Shift"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  id="department"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  required
                >
                  <option value="">Select a department</option>
                  {departmentsData?.items.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day of Week *</Label>
                <Select
                  id="dayOfWeek"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  required
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationHours">Duration (hours) *</Label>
                <Input
                  id="durationHours"
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredEmployees">Required Employees *</Label>
                <Input
                  id="requiredEmployees"
                  type="number"
                  min="1"
                  value={requiredEmployees}
                  onChange={(e) => setRequiredEmployees(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : shiftTemplate
                ? 'Update'
                : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
