import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, Department } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { DepartmentForm } from '@/components/departments/DepartmentForm'
import { DeleteDepartmentDialog } from '@/components/departments/DeleteDepartmentDialog'

export function Departments() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | undefined>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.getDepartments(),
  })

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setSelectedDepartment(undefined)
    setIsFormOpen(true)
  }

  const handleDelete = (department: Department) => {
    setDepartmentToDelete(department)
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
          <h2 className="text-3xl font-bold tracking-tight">Departments</h2>
          <p className="text-muted-foreground">
            Manage your organization's departments
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((department) => (
          <Card key={department.id}>
            <CardHeader>
              <CardTitle>{department.name}</CardTitle>
              {department.description && (
                <CardDescription>{department.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Status: {department.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(department)}
                    className="flex-1"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(department)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No departments found. Create your first department to get started.
            </p>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </CardContent>
        </Card>
      )}

      <DepartmentForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        department={selectedDepartment}
      />

      {departmentToDelete && (
        <DeleteDepartmentDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          department={departmentToDelete}
        />
      )}
    </div>
  )
}
