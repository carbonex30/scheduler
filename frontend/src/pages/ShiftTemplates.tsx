import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, ShiftTemplate } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ShiftTemplateForm } from '@/components/shifts/ShiftTemplateForm'
import { DeleteShiftTemplateDialog } from '@/components/shifts/DeleteShiftTemplateDialog'

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function ShiftTemplates() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<ShiftTemplate | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shiftToDelete, setShiftToDelete] = useState<ShiftTemplate | undefined>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['shift-templates'],
    queryFn: () => api.getShiftTemplates(),
  })

  const handleEdit = (shift: ShiftTemplate) => {
    setSelectedShift(shift)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setSelectedShift(undefined)
    setIsFormOpen(true)
  }

  const handleDelete = (shift: ShiftTemplate) => {
    setShiftToDelete(shift)
    setDeleteDialogOpen(true)
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        Error: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Shift Templates</h2>
          <p className="text-muted-foreground">
            Define reusable shift patterns for scheduling
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Shift Template
        </Button>
      </div>

      {data?.items && data.items.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Day</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Required Staff</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.items.map((shift) => (
                    <tr key={shift.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {shift.name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {DAYS_OF_WEEK[shift.day_of_week]}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {shift.start_time} - {shift.end_time}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {shift.duration_hours} hrs
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {shift.required_employees}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={shift.is_active ? 'text-green-600' : 'text-gray-400'}>
                          {shift.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(shift)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(shift)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {data?.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No shift templates found. Create your first shift template to get started.
            </p>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Shift Template
            </Button>
          </CardContent>
        </Card>
      )}

      <ShiftTemplateForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        shiftTemplate={selectedShift}
      />

      {shiftToDelete && (
        <DeleteShiftTemplateDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          shiftTemplate={shiftToDelete}
        />
      )}
    </div>
  )
}
