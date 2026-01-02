import { useState, useEffect, FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Department, DepartmentCreate, DepartmentUpdate } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface DepartmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  department?: Department
}

export function DepartmentForm({ open, onOpenChange, department }: DepartmentFormProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string>('')

  // Update form fields when department changes or dialog opens
  useEffect(() => {
    if (open) {
      if (department) {
        setName(department.name)
        setDescription(department.description || '')
        setIsActive(department.is_active)
      } else {
        setName('')
        setDescription('')
        setIsActive(true)
      }
      setError('')
    }
  }, [open, department])

  const createMutation = useMutation({
    mutationFn: (data: DepartmentCreate) => api.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepartmentUpdate }) =>
      api.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const resetForm = () => {
    setName('')
    setDescription('')
    setIsActive(true)
    setError('')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Department name is required')
      return
    }

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      is_active: isActive,
    }

    if (department) {
      updateMutation.mutate({ id: department.id, data })
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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {department ? 'Edit Department' : 'Add Department'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pharmacy, Kitchen"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
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
                : department
                ? 'Update'
                : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
