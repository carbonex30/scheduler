const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface Department {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface DepartmentUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department_id: string;
  employment_type: string;
  hire_date: string;
  max_hours_per_week: string;
  min_hours_per_week: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department_id: string;
  employment_type: string;
  hire_date: string;
  max_hours_per_week: number;
  min_hours_per_week: number;
  is_active?: boolean;
}

export interface EmployeeUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  employment_type?: string;
  hire_date?: string;
  max_hours_per_week?: number;
  min_hours_per_week?: number;
  is_active?: boolean;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  department_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_hours: string;
  required_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftTemplateCreate {
  name: string;
  department_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_hours: number;
  required_employees: number;
  is_active?: boolean;
}

export interface ShiftTemplateUpdate {
  name?: string;
  department_id?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  required_employees?: number;
  is_active?: boolean;
}

export interface Schedule {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  generation_started_at?: string;
  generation_completed_at?: string;
  generation_duration_seconds?: number;
  optimizer_score?: string;
  ml_assisted: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface ScheduleGenerateRequest {
  name: string;
  start_date: string;
  end_date: string;
  department_ids?: string[];
  use_ml?: boolean;
  notes?: string;
}

export interface ScheduleGenerateResponse {
  success: boolean;
  schedule_id?: string;
  num_assignments: number;
  num_unassigned_shifts: number;
  optimizer_score: number;
  generation_duration_seconds: number;
  ml_assisted: boolean;
  warnings: string[];
  errors: string[];
}

export interface Assignment {
  id: string;
  schedule_id: string;
  employee_id: string;
  shift_template_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  hours: string;
  is_confirmed: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportResult {
  departments_created: number;
  employees_created: number;
  shift_templates_created: number;
  assignments_created: number;
  unallocated_shifts: number;
  errors: string[];
  warnings: string[];
  success: boolean;
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    // Handle empty responses (e.g., 204 No Content for DELETE)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return response.json();
  }

  // Departments
  async getDepartments(params?: { skip?: number; limit?: number; is_active?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());

    return this.request<{ total: number; items: Department[] }>(
      `/departments/?${searchParams}`
    );
  }

  async getDepartment(id: string) {
    return this.request<Department>(`/departments/${id}`);
  }

  async createDepartment(data: DepartmentCreate) {
    return this.request<Department>('/departments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDepartment(id: string, data: DepartmentUpdate) {
    return this.request<Department>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDepartment(id: string) {
    return this.request<void>(`/departments/${id}`, {
      method: 'DELETE',
    });
  }

  // Employees
  async getEmployees(params?: {
    skip?: number;
    limit?: number;
    department_id?: string;
    is_active?: boolean;
    employment_type?: string;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.department_id) searchParams.append('department_id', params.department_id);
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.employment_type) searchParams.append('employment_type', params.employment_type);
    if (params?.search) searchParams.append('search', params.search);

    return this.request<{ total: number; items: Employee[] }>(
      `/employees/?${searchParams}`
    );
  }

  async getEmployee(id: string) {
    return this.request<Employee>(`/employees/${id}`);
  }

  async createEmployee(data: EmployeeCreate) {
    return this.request<Employee>('/employees/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(id: string, data: EmployeeUpdate) {
    return this.request<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEmployee(id: string) {
    return this.request<void>(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // Shift Templates
  async getShiftTemplates(params?: {
    skip?: number;
    limit?: number;
    department_id?: string;
    is_active?: boolean;
    day_of_week?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.department_id) searchParams.append('department_id', params.department_id);
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.day_of_week !== undefined) searchParams.append('day_of_week', params.day_of_week.toString());

    return this.request<{ total: number; items: ShiftTemplate[] }>(
      `/shift-templates/?${searchParams}`
    );
  }

  async getShiftTemplate(id: string) {
    return this.request<ShiftTemplate>(`/shift-templates/${id}`);
  }

  async createShiftTemplate(data: ShiftTemplateCreate) {
    return this.request<ShiftTemplate>('/shift-templates/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateShiftTemplate(id: string, data: ShiftTemplateUpdate) {
    return this.request<ShiftTemplate>(`/shift-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteShiftTemplate(id: string) {
    return this.request<void>(`/shift-templates/${id}`, {
      method: 'DELETE',
    });
  }

  // Import/Export
  async importCSV(file: File, scheduleName: string = 'Imported Schedule'): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('schedule_name', scheduleName);

    const url = `${this.baseURL}/import/csv`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ML Training
  async trainMLModel(
    file: File,
    modelType: string = 'preference_predictor',
    modelName: string = ''
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_type', modelType);
    if (modelName) {
      formData.append('model_name', modelName);
    }

    const url = `${this.baseURL}/ml/train`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Training failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getMLTrainingHistory(params?: {
    skip?: number;
    limit?: number;
    model_type?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.model_type) searchParams.append('model_type', params.model_type);

    return this.request<any[]>(`/ml/history?${searchParams}`);
  }

  async getMLTrainingRecord(trainingId: string) {
    return this.request<any>(`/ml/history/${trainingId}`);
  }

  // Schedules
  async generateSchedule(data: ScheduleGenerateRequest) {
    return this.request<ScheduleGenerateResponse>('/schedules/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSchedules(params?: {
    skip?: number;
    limit?: number;
    status_filter?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.status_filter) searchParams.append('status_filter', params.status_filter);

    return this.request<{ total: number; items: Schedule[] }>(
      `/schedules/?${searchParams}`
    );
  }

  async getSchedule(id: string) {
    return this.request<Schedule>(`/schedules/${id}`);
  }

  async deleteSchedule(id: string) {
    return this.request<void>(`/schedules/${id}`, {
      method: 'DELETE',
    });
  }

  async publishSchedule(id: string) {
    return this.request<Schedule>(`/schedules/${id}/publish`, {
      method: 'POST',
    });
  }

  // Assignments
  async getScheduleAssignments(scheduleId: string, params?: {
    skip?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());

    return this.request<Assignment[]>(
      `/schedules/${scheduleId}/assignments?${searchParams}`
    );
  }
}

export const api = new APIClient(API_BASE_URL);
