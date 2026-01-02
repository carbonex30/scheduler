import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, Employee } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { EmployeeForm } from '@/components/employees/EmployeeForm'
import { DeleteEmployeeDialog } from '@/components/employees/DeleteEmployeeDialog'

export function Employees() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | undefined>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.getEmployees(),
  })

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setSelectedEmployee(undefined)
    setIsFormOpen(true)
  }

  const handleDelete = (employee: Employee) => {
    setEmployeeToDelete(employee)
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
          <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">
            Manage your organization's employees
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
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
                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Hours/Week</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.items.map((employee) => (
                    <tr key={employee.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        {employee.first_name} {employee.last_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {employee.email}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">
                        {employee.employment_type.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {employee.min_hours_per_week} - {employee.max_hours_per_week}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={employee.is_active ? 'text-green-600' : 'text-gray-400'}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(employee)}
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
              No employees found. Add your first employee to get started.
            </p>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </CardContent>
        </Card>
      )}

      <EmployeeForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        employee={selectedEmployee}
      />

      {employeeToDelete && (
        <DeleteEmployeeDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          employee={employeeToDelete}
        />
      )}
    </div>
  )
}
