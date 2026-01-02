import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Employee } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee
}

export function DeleteEmployeeDialog({
  open,
  onOpenChange,
  employee,
}: DeleteEmployeeDialogProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string>('')
  const [showDeactivateOption, setShowDeactivateOption] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      onOpenChange(false)
      setError('')
      setShowDeactivateOption(false)
    },
    onError: (error: Error) => {
      setError(error.message)
      // Check if error is about having assignments
      if (error.message.includes('assignments')) {
        setShowDeactivateOption(true)
      }
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.updateEmployee(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      onOpenChange(false)
      setError('')
      setShowDeactivateOption(false)
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const handleDelete = () => {
    setError('')
    setShowDeactivateOption(false)
    deleteMutation.mutate(employee.id)
  }

  const handleDeactivate = () => {
    setError('')
    deactivateMutation.mutate(employee.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {showDeactivateOption ? 'Cannot Delete Employee' : 'Delete Employee'}
          </DialogTitle>
          <DialogDescription>
            {showDeactivateOption ? (
              <>
                This employee has existing schedule assignments and cannot be deleted.
                You can deactivate the employee instead to prevent them from being assigned to future schedules.
              </>
            ) : (
              <>
                Are you sure you want to delete "{employee.first_name} {employee.last_name}"?
                This action cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && !showDeactivateOption && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {showDeactivateOption && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
            <p className="font-medium mb-1">What does deactivating do?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Employee will be marked as inactive</li>
              <li>Historical assignments and data are preserved</li>
              <li>Employee won't appear in active employee lists</li>
              <li>Can be reactivated later if needed</li>
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {showDeactivateOption ? (
            <Button
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate Employee'}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
