
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private readonly api = 'http://localhost:5000/api/v1';

  adminName = 'Administrator';
  loading = false;
  detailLoading = false;
  updating = false;
  errorMessage = '';
  successMessage = '';

  statistics: any = {
    totalRegisteredStudents: 0,
    totalSubmittedApplications: 0,
    statusCounts: {
      draft: 0,
      submitted: 0,
      underReview: 0,
      selected: 0,
      rejected: 0,
      pending: 0
    },
    departmentDemand: []
  };

  applications: any[] = [];
  departments: any[] = [];
  selectedApplication: any = null;

  search = '';
  statusFilter = '';
  departmentFilter = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalApplications = 0;

  newStatus = '';
  remarks = '';
  assignedDepartment: number | null = null;
  examSettings: any = {
  feeAmount: 0,
  examDate: '',
  examTime: '',
  examCentre: '',
  examAddress: '',
  instructions: '',
  isPublished: false
};

examRegistrations: any[] = [];
examLoading = false;
examSaving = false;
examError = '';
examSuccess = '';

  getAvailableStatuses(): string[] {
    const transitions: Record<string, string[]> = {
      'Submitted': ['Under Review'],
      'Under Review': ['Selected', 'Rejected'],
      'Selected': ['Under Review'],
      'Rejected': ['Under Review']
    };

    return transitions[this.selectedApplication?.status] || [];
  }

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.getUser();

    if (user?.role !== 'admin') {
      this.logout();
      return;
    }

    this.adminName = user.fullName || 'Administrator';
   this.loadDashboard();
this.loadApplications();
this.loadDepartments();
this.loadExamSettings();
this.loadExamRegistrations();
  }

  private getUser(): any {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return null;
    }
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`
    });
  }

  private payload(response: any): any {
    return response?.data ?? response?.result ?? response;
  }

  loadDashboard(): void {
    this.http.get<any>(
      `${this.api}/admin/statistics`,
      { headers: this.headers() }
    ).subscribe({
      next: response => {
        this.statistics = this.payload(response);
      },
      error: error => {
        this.handleError(error, 'Unable to load dashboard statistics.');
      }
    });
  }

  loadApplications(): void {
    this.loading = true;
    this.errorMessage = '';

    let params = new HttpParams()
      .set('page', this.currentPage)
      .set('limit', this.pageSize);

    if (this.search.trim()) {
      params = params.set('search', this.search.trim());
    }

    if (this.statusFilter) {
      params = params.set('status', this.statusFilter);
    }

    if (this.departmentFilter) {
      params = params.set('department', this.departmentFilter);
    }

    this.http.get<any>(
      `${this.api}/admin/applications`,
      { headers: this.headers(), params }
    ).subscribe({
      next: response => {
        const data = this.payload(response);

        this.applications = data?.applications || [];
        const pagination = data?.pagination || {};

        this.totalApplications = pagination.total || 0;
        this.totalPages = pagination.totalPages || 1;
        this.currentPage = pagination.currentPage || 1;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.handleError(error, 'Unable to load applications.');
      }
    });
  }

  loadDepartments(): void {
    this.http.get<any>(`${this.api}/departments`).subscribe({
      next: response => {
        const data = this.payload(response);
        this.departments = Array.isArray(data)
          ? data
          : data?.departments || [];
      },
      error: error => {
        console.error('Department loading failed:', error);
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.selectedApplication = null;
    this.loadApplications();
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = '';
    this.departmentFilter = '';
    this.currentPage = 1;
    this.loadApplications();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;
    this.loadApplications();
  }

  viewApplication(id: number): void {
    this.detailLoading = true;
    this.selectedApplication = null;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.get<any>(
      `${this.api}/admin/applications/${id}`,
      { headers: this.headers() }
    ).subscribe({
      next: response => {
        this.selectedApplication = this.payload(response);
        this.newStatus = '';
        this.remarks = this.selectedApplication?.statusRemarks || '';
        this.assignedDepartment =
          this.selectedApplication?.assignedDepartmentId || null;
        this.detailLoading = false;
      },
      error: error => {
        this.detailLoading = false;
        this.handleError(error, 'Unable to load application details.');
      }
    });
  }

  closeDetails(): void {
    this.selectedApplication = null;
  }

  updateStatus(): void {
    if (!this.selectedApplication || !this.newStatus) return;

    const current = this.selectedApplication.status;
    const allowed: Record<string, string[]> = {
      'Submitted': ['Under Review'],
      'Under Review': ['Selected', 'Rejected'],
      'Selected': ['Under Review'],
      'Rejected': ['Under Review']
    };

    if (!allowed[current]?.includes(this.newStatus)) {
      this.errorMessage = `Cannot change status from ${current} to ${this.newStatus}.`;
      return;
    }

    if (
      this.newStatus === 'Selected' &&
      !this.assignedDepartment &&
      !this.selectedApplication.assignedDepartmentId &&
      !this.selectedApplication.departmentPreferences?.length
    ) {
      this.errorMessage = 'No department is available to assign.';
      return;
    }

    const body: any = {
      status: this.newStatus,
      remarks: this.remarks
    };

    if (this.newStatus === 'Selected' && this.assignedDepartment) {
      body.assignedDepartment = Number(this.assignedDepartment);
    }

    this.updating = true;
    this.errorMessage = '';

    this.http.patch<any>(
      `${this.api}/admin/applications/${this.selectedApplication.id}/status`,
      body,
      { headers: this.headers() }
    ).subscribe({
      next: response => {
        this.selectedApplication = this.payload(response);
        this.newStatus = this.selectedApplication?.status || this.newStatus;
        this.assignedDepartment =
          this.selectedApplication?.assignedDepartmentId || this.assignedDepartment;

        this.updating = false;
        this.successMessage = 'Application status updated successfully.';

        this.loadDashboard();
        this.loadApplications();
      },
      error: error => {
        this.updating = false;
        this.handleError(error, 'Unable to update application status.');
      }
    });
  }

  viewDocument(applicationId: number, docType: string): void {
    this.http.get(
      `${this.api}/applications/${applicationId}/documents/${docType}`,
      {
        headers: this.headers(),
        responseType: 'blob'
      }
    ).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, '_blank');

        if (!opened) {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.click();
        }

        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: error => {
        this.handleError(error, 'Unable to open the document.');
      }
    });
  }

  exportCsv(): void {
    let params = new HttpParams();

    if (this.statusFilter) {
      params = params.set('status', this.statusFilter);
    }

    if (this.departmentFilter) {
      params = params.set('department', this.departmentFilter);
    }

    this.http.get(
      `${this.api}/admin/export-csv`,
      {
        headers: this.headers(),
        params,
        responseType: 'blob'
      }
    ).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'iem_admission_applications.csv';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: error => {
        this.handleError(error, 'CSV export failed.');
      }
    });
  }

  getFirstPreference(application: any): string {
    const preferences = application?.departmentPreferences || [];
    const sorted = [...preferences].sort(
      (a: any, b: any) => a.priority - b.priority
    );

    return sorted[0]?.department?.name || 'Not specified';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Selected': return 'selected';
      case 'Rejected': return 'rejected';
      case 'Under Review': return 'review';
      case 'Submitted': return 'submitted';
      default: return 'neutral';
    }
  }

  formatDate(value: string): string {
    if (!value) return '-';

    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
loadExamSettings(): void {
  this.examLoading = true;

  this.http.get<any>(
    `${this.api}/admin/entrance-exam`,
    { headers: this.headers() }
  ).subscribe({
    next: response => {
      const data = this.payload(response);

      if (data) {
        this.examSettings = {
          feeAmount: data.feeAmount ?? 0,
          examDate: data.examDate ? String(data.examDate).slice(0, 10) : '',
          examTime: data.examTime || '',
          examCentre: data.examCentre || '',
          examAddress: data.examAddress || '',
          instructions: data.instructions || '',
          isPublished: Boolean(data.isPublished)
        };
      }

      this.examLoading = false;
    },
    error: error => {
      this.examLoading = false;
      this.examError = error?.error?.message || 'Unable to load exam settings.';
    }
  });
}

saveExamSettings(): void {
  this.examSaving = true;
  this.examError = '';
  this.examSuccess = '';

  this.http.put<any>(
    `${this.api}/admin/entrance-exam`,
    this.examSettings,
    { headers: this.headers() }
  ).subscribe({
    next: () => {
      this.examSaving = false;
      this.examSuccess = 'Examination settings saved successfully.';
      this.loadExamSettings();
      this.loadExamRegistrations();
    },
    error: error => {
      this.examSaving = false;
      this.examError = error?.error?.message || 'Unable to save exam settings.';
    }
  });
}

loadExamRegistrations(): void {
  this.http.get<any>(
    `${this.api}/admin/entrance-exam/registrations`,
    { headers: this.headers() }
  ).subscribe({
    next: response => {
      const data = this.payload(response);
      this.examRegistrations = Array.isArray(data) ? data : [];
    },
    error: error => {
      console.error('Unable to load exam registrations:', error);
    }
  });
}
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  private handleError(error: any, fallback: string): void {
    console.error(error);

    if (error?.status === 401 || error?.status === 403) {
      this.logout();
      return;
    }

    this.errorMessage = error?.error?.message || fallback;
  }
}
