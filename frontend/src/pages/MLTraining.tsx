import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Upload, AlertCircle, CheckCircle2, XCircle, Info, History, Brain } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'

interface MLTrainingResult {
  success: boolean
  model_type: string
  num_samples: number
  metrics: Record<string, number>
  model_path: string
  training_duration_seconds: number
  warnings: string[]
  errors: string[]
}

interface TrainingHistory {
  id: string
  model_type: string
  training_started_at: string
  training_completed_at: string | null
  num_samples: number | null
  metrics: Record<string, number> | null
  status: string
  created_at: string
}

export function MLTraining() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [modelType, setModelType] = useState('preference_predictor')
  const [modelName, setModelName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [trainingResult, setTrainingResult] = useState<MLTrainingResult | null>(null)

  // Fetch training history
  const { data: historyData } = useQuery({
    queryKey: ['ml-training-history'],
    queryFn: () => api.getMLTrainingHistory(),
  })

  const trainingMutation = useMutation({
    mutationFn: ({ file, modelType, modelName }: { file: File; modelType: string; modelName: string }) =>
      api.trainMLModel(file, modelType, modelName),
    onSuccess: (result) => {
      setTrainingResult(result)
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
      setTrainingResult(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setTrainingResult(null)
    }
  }

  const handleTrain = () => {
    if (selectedFile) {
      trainingMutation.mutate({ file: selectedFile, modelType, modelName })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-8 w-8" />
          ML Training
        </h2>
        <p className="text-muted-foreground">
          Train machine learning models on historical schedule data
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Training Form */}
        <Card>
          <CardHeader>
            <CardTitle>Train New Model</CardTitle>
            <CardDescription>
              Upload historical schedule CSV to train ML models for preference prediction and conflict detection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-type">Model Type</Label>
              <Select
                id="model-type"
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
              >
                <option value="preference_predictor">Preference Predictor</option>
                <option value="conflict_detector">Conflict Detector</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                {modelType === 'preference_predictor'
                  ? 'Learns employee shift preferences from historical data'
                  : 'Detects potential scheduling conflicts and patterns'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name (Optional)</Label>
              <Input
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g., Q4_2025_model"
              />
            </div>

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
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
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

            <Button
              className="w-full"
              onClick={handleTrain}
              disabled={!selectedFile || trainingMutation.isPending}
            >
              {trainingMutation.isPending ? 'Training Model...' : 'Train Model'}
            </Button>

            {trainingMutation.error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{trainingMutation.error.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training Result */}
        {trainingResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {trainingResult.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Training Successful
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    Training Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Training Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model Type:</span>
                    <span className="font-medium">{trainingResult.model_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Samples:</span>
                    <span className="font-medium">{trainingResult.num_samples}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">
                      {formatDuration(trainingResult.training_duration_seconds)}
                    </span>
                  </div>
                </div>
              </div>

              {Object.keys(trainingResult.metrics).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Model Metrics</h4>
                  <div className="space-y-1">
                    {Object.entries(trainingResult.metrics).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-medium">
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trainingResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-yellow-600" />
                    Warnings ({trainingResult.warnings.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {trainingResult.warnings.map((warning, index) => (
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

              {trainingResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Errors ({trainingResult.errors.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {trainingResult.errors.map((error, index) => (
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

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Model saved to: <code className="text-xs">{trainingResult.model_path}</code>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Training History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Training History
          </CardTitle>
          <CardDescription>Recent ML model training sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {historyData && historyData.length > 0 ? (
            <div className="space-y-2">
              {historyData.map((record: TrainingHistory) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{record.model_type}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          record.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : record.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Trained {formatDate(record.created_at)}
                      {record.num_samples && ` • ${record.num_samples} samples`}
                    </p>
                  </div>
                  {record.metrics && (
                    <div className="text-right text-xs text-muted-foreground">
                      {Object.entries(record.metrics)
                        .slice(0, 2)
                        .map(([key, value]) => (
                          <div key={key}>
                            {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No training history yet. Train your first model to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
