import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Upload, AlertCircle, CheckCircle2, XCircle, Info } from 'lucide-react'
import { api, ImportResult } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Import() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [scheduleName, setScheduleName] = useState('Imported Schedule')
  const [isDragging, setIsDragging] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const importMutation = useMutation({
    mutationFn: ({ file, name }: { file: File; name: string }) => api.importCSV(file, name),
    onSuccess: (result) => {
      setImportResult(result)
      setSelectedFile(null)
    },
  })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].name.endsWith('.csv')) {
      setSelectedFile(files[0])
      setImportResult(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setImportResult(null)
    }
  }

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate({ file: selectedFile, name: scheduleName })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Import Schedule Data</h2>
        <p className="text-muted-foreground">
          Import historical schedule data from CSV files
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Expected format: Location, Area, Team Member, Start Date, Start Time, End Date, End Time,
              Total Meal Break, Total Rest Break, Total Time, Status, Note, Cost, Email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {selectedFile ? selectedFile.name : 'Drag and drop your CSV file here'}
                </p>
                <p className="text-xs text-muted-foreground">or</p>
                <label htmlFor="file-upload">
                  <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('file-upload')?.click()}>
                    Browse Files
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-name">Schedule Name</Label>
              <Input
                id="schedule-name"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="Enter schedule name"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
            >
              {importMutation.isPending ? 'Importing...' : 'Import Schedule'}
            </Button>

            {importMutation.error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{importMutation.error.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Import Successful
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    Import Completed with Errors
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Entities Created</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Departments:</span>
                    <span className="font-medium">{importResult.departments_created}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employees:</span>
                    <span className="font-medium">{importResult.employees_created}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shift Templates:</span>
                    <span className="font-medium">{importResult.shift_templates_created}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assignments:</span>
                    <span className="font-medium">{importResult.assignments_created}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Unallocated Shifts:</span>
                    <span className="font-medium">{importResult.unallocated_shifts}</span>
                  </div>
                </div>
              </div>

              {importResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-yellow-600" />
                    Warnings ({importResult.warnings.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.warnings.map((warning, index) => (
                      <div
                        key={index}
                        className="text-xs p-2 bg-yellow-50 text-yellow-900 rounded border border-yellow-200"
                      >
                        {warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Errors ({importResult.errors.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <div
                        key={index}
                        className="text-xs p-2 bg-destructive/10 text-destructive rounded border border-destructive/20"
                      >
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
