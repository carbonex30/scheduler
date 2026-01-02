import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ShiftTemplate } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteShiftTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shiftTemplate: ShiftTemplate
}

export function DeleteShiftTemplateDialog({
  open,
  onOpenChange,
  shiftTemplate,
}: DeleteShiftTemplateDialogProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string>('')

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteShiftTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] })
      onOpenChange(false)
      setError('')
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const handleDelete = () => {
    setError('')
    deleteMutation.mutate(shiftTemplate.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Shift Template</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{shiftTemplate.name}"? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
