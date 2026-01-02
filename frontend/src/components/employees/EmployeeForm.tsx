import { useState, useEffect, FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, Employee, EmployeeCreate, EmployeeUpdate } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface EmployeeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: Employee
}

export function EmployeeForm({ open, onOpenChange, employee }: EmployeeFormProps) {
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [employmentType, setEmploymentType] = useState('full_time')
  const [hireDate, setHireDate] = useState('')
  const [maxHours, setMaxHours] = useState('40')
  const [minHours, setMinHours] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string>('')

  // Update form fields when employee changes or dialog opens
  useEffect(() => {
    if (open) {
      if (employee) {
        setFirstName(employee.first_name)
        setLastName(employee.last_name)
        setEmail(employee.email)
        setPhone(employee.phone || '')
        setDepartmentId(employee.department_id)
        setEmploymentType(employee.employment_type)
        setHireDate(employee.hire_date)
        setMaxHours(employee.max_hours_per_week)
        setMinHours(employee.min_hours_per_week)
        setIsActive(employee.is_active)
      } else {
        setFirstName('')
        setLastName('')
        setEmail('')
        setPhone('')
        setDepartmentId('')
        setEmploymentType('full_time')
        setHireDate('')
        setMaxHours('40')
        setMinHours('0')
        setIsActive(true)
      }
      setError('')
    }
  }, [open, employee])

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.getDepartments(),
  })

  const createMutation = useMutation({
    mutationFn: (data: EmployeeCreate) => api.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeUpdate }) =>
      api.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setDepartmentId('')
    setEmploymentType('full_time')
    setHireDate('')
    setMaxHours('40')
    setMinHours('0')
    setIsActive(true)
    setError('')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !departmentId || !hireDate) {
      setError('Please fill in all required fields')
      return
    }

    const maxHoursNum = parseFloat(maxHours)
    const minHoursNum = parseFloat(minHours)

    if (isNaN(maxHoursNum) || isNaN(minHoursNum)) {
      setError('Hours must be valid numbers')
      return
    }

    if (minHoursNum > maxHoursNum) {
      setError('Minimum hours cannot be greater than maximum hours')
      return
    }

    const data = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      department_id: departmentId,
      employment_type: employmentType,
      hire_date: hireDate,
      max_hours_per_week: maxHoursNum,
      min_hours_per_week: minHoursNum,
      is_active: isActive,
    }

    if (employee) {
      updateMutation.mutate({ id: employee.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {employee ? 'Edit Employee' : 'Add Employee'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="555-1234"
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
                <Label htmlFor="employmentType">Employment Type *</Label>
                <Select
                  id="employmentType"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  required
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contractor">Contractor</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hireDate">Hire Date *</Label>
              <Input
                id="hireDate"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minHours">Min Hours/Week</Label>
                <Input
                  id="minHours"
                  type="number"
                  step="0.01"
                  min="0"
                  max="168"
                  value={minHours}
                  onChange={(e) => setMinHours(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxHours">Max Hours/Week</Label>
                <Input
                  id="maxHours"
                  type="number"
                  step="0.01"
                  min="0"
                  max="168"
                  value={maxHours}
                  onChange={(e) => setMaxHours(e.target.value)}
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
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : employee
                ? 'Update'
                : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
