import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

import { API_BASE_URL } from '../../api.config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  private apiUrl = `${API_BASE_URL}/applications/my-application`;

  studentName = 'Student';
  studentEmail = '';
  studentId = '';
  // Entrance exam registration popup
  showExamRegistration = false;
  selectedExamType = 'IEMJEE';
  openExamRegistration(): void {
  if (!this.isExamEligible || !this.isExamPublished) {
    return;
  }

  this.showExamRegistration = true;
}

closeExamRegistration(): void {
  this.showExamRegistration = false;
}

continueExamRegistration(): void {
  if (!this.selectedExamType) {
    this.examError = 'Please select an entrance examination.';
    return;
  }

  this.showExamRegistration = false;
  this.examError = '';

  // Continue with the existing demo payment process.
  this.payDemo();
}

  application: any = null;

  applicationStatus = 'Loading...';
  applicationNumber = '';
  documentStatus = 'Loading...';

  applicationProgress = 0;

  loading = false;
  errorMessage = '';
  entranceExam: any = null;
examLoading = false;
examPaying = false;
examError = '';
examSuccess = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
  this.loadStudentInformation();
  this.loadApplication();
  this.loadEntranceExam();
}
  // Load student information saved during login
  loadStudentInformation(): void {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      this.studentName =
        user.fullName ||
        user.name ||
        'Student';

      this.studentEmail = user.email || '';
      this.studentId = user.id || user.userId || '';

    } catch (error) {
      console.error('Unable to load student information:', error);
    }
  }

  // Retrieve the student's application from the backend
  loadApplication(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any>(this.apiUrl, { headers }).subscribe({

      next: (response) => {
        this.loading = false;

        const data = response?.data ?? response;

        this.application = data;

        // Use applicant information returned by the backend
        if (data?.applicant) {
          this.studentName =
            data.applicant.fullName || this.studentName;

          this.studentEmail =
            data.applicant.email || this.studentEmail;

          this.studentId =
            data.applicant.id || this.studentId;
        }

        this.applicationStatus =
          data?.status || 'DRAFT';

        this.applicationNumber =
          data?.applicationNumber || '';

        this.updateDocumentStatus(data?.documents || []);
        this.calculateProgress(data);
      },

      error: (error) => {
        this.loading = false;

        console.error('Application retrieval failed:', error);

        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/login']);
          return;
        }

        this.errorMessage =
          error?.error?.message ||
          'Unable to load your application. Please try again.';
      }

    });
  }

  // Check the three documents required by the backend
  updateDocumentStatus(documents: any[]): void {
    const uploadedTypes = documents.map(
      (document) => document.docType
    );

    const requiredDocuments = [
      'photo',
      'marksheet10',
      'marksheet12'
    ];

    const uploadedCount = requiredDocuments.filter(
      (type) => uploadedTypes.includes(type)
    ).length;

    this.documentStatus =
      uploadedCount === 3
        ? 'Completed'
        : `${uploadedCount}/3 Uploaded`;
  }

  // Calculate progress from actual application information
  calculateProgress(data: any): void {
    if (data?.status === 'SUBMITTED') {
      this.applicationProgress = 100;
      return;
    }

    const academic = data?.academicDetails || {};
    const preferences = data?.departmentPreferences || [];
    const documents = data?.documents || [];

    const uploadedTypes = documents.map(
      (document: any) => document.docType
    );

    const checks = [
      !!academic.class12Board,
      academic.class12AggregatePercentage !== null &&
        academic.class12AggregatePercentage !== undefined,
      preferences.length > 0,
      uploadedTypes.includes('photo'),
      uploadedTypes.includes('marksheet10'),
      uploadedTypes.includes('marksheet12')
    ];

    const completed = checks.filter(Boolean).length;

    this.applicationProgress = Math.round(
      (completed / checks.length) * 100
    );
  }

  get isSubmitted(): boolean {
    return this.applicationStatus === 'SUBMITTED';
  }

  // Logout student
  loadEntranceExam(): void {
  const token = localStorage.getItem('token');

  if (!token) {
    this.router.navigate(['/login']);
    return;
  }

  this.examLoading = true;
  this.examError = '';

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  this.http.get<any>(
    `${API_BASE_URL}/entrance-exam/my-status`,
    { headers }
  ).subscribe({
    next: response => {
      this.entranceExam = response?.data ?? response;
      this.examLoading = false;
    },
    error: error => {
      this.examLoading = false;
      this.examError =
        error?.error?.message || 'Unable to load examination details.';
      console.error('Entrance examination error:', error);
    }
  });
}

payDemo(): void {
  const token = localStorage.getItem('token');

  if (!token || this.examPaying) return;

  if (!window.confirm('Confirm demo examination fee payment? No real money will be charged.')) {
    return;
  }

  this.examPaying = true;
  this.examError = '';
  this.examSuccess = '';

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  this.http.post<any>(
    `${API_BASE_URL}/entrance-exam/pay-demo`,
    {},
    { headers }
  ).subscribe({
    next: response => {
      this.examPaying = false;
      this.examSuccess =
        response?.message || 'Demo payment completed successfully.';
      this.loadEntranceExam();
    },
    error: error => {
      this.examPaying = false;
      this.examError =
        error?.error?.message || 'Demo payment could not be completed.';
    }
  });
}

printHallTicket(): void {
  window.print();
}

get isExamEligible(): boolean {
  return this.entranceExam?.eligible === true;
}

get isExamPublished(): boolean {
  return this.entranceExam?.examPublished === true;
}

get isExamPaid(): boolean {
  return this.entranceExam?.registration?.paymentStatus === 'Paid';
}
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    this.router.navigate(['/login']);
  }
}