
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HttpClient,
  HttpHeaders,
  HttpEventType
} from '@angular/common/http';
import { RouterLink } from '@angular/router';

interface Department {
  id: number;
  code: string;
  name: string;
  campus: string;
  degree: string;
  programmeLevel: string;
  intakeCapacity: number;
}

interface UploadedDocument {
  docType: string;
  originalName: string;
  filename?: string;
  mimetype: string;
  sizeBytes: number;
  uploadedAt: string;
}

@Component({
  selector: 'app-application',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './application.component.html',
  styleUrl: './application.component.scss'
})
export class ApplicationComponent implements OnInit {

  private readonly apiBase = 'http://localhost:5000/api/v1';

  // Course
  selectedCourse = '';
  courseOptions = ['B.Tech', 'BBA', 'BCA', 'MBA', 'MCA'];
  iemJeeRequired = false;

  // Personal details
  fullName = '';
  dateOfBirth = '';
  gender = '';
  email = '';
  phone = '';
  alternatePhone = '';
  category = '';
  guardianName = '';
  guardianPhone = '';

  // Address
  address = '';
  city = '';
  state = '';
  pinCode = '';

  // Class 10
  class10Board = '';
  class10School = '';
  class10PassingYear: number | null = null;
  class10Percentage: number | null = null;

  // Class 12
  class12Board = '';
  class12School = '';
  class12Stream = '';
  class12PassingYear: number | null = null;
  class12Percentage: number | null = null;

  // Departments
  departments: Department[] = [];
  selectedDepartmentIds: number[] = [];

  // Application
  application: any = null;
  applicationStatus = 'Draft';
  applicationNumber = '';
  submittedAt = '';

  // Documents
  readonly documentTypes = [
    {
      key: 'photo',
      title: 'Student Photograph',
      description: 'Upload your recent passport-size photograph.'
    },
    {
      key: 'marksheet10',
      title: 'Class 10 Marksheet',
      description: 'Upload your Class 10 marksheet.'
    },
    {
      key: 'marksheet12',
      title: 'Class 12 Marksheet',
      description: 'Upload your Class 12 marksheet.'
    }
  ];

  uploadedDocuments: Record<string, UploadedDocument> = {};
  uploadProgress: Record<string, number> = {};
  uploading: Record<string, boolean> = {};
  uploadErrors: Record<string, string> = {};

  // Page status
  loading = false;
  loadingDepartments = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  submissionErrors: string[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadStudentInformation();
    this.loadDepartments();
    this.loadApplication();
  }

  // Authentication headers
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token || ''}`
    });
  }

  // Extract API response
  private getPayload(response: any): any {
    return response?.data ?? response?.result ?? response;
  }

  // Normalize backend status values
  // IMPORTANT: This method must be public because HTML uses it.
  isDraft(): boolean {
    return String(this.applicationStatus).toLowerCase() === 'draft';
  }

  isSubmitted(): boolean {
    return String(this.applicationStatus).toLowerCase() === 'submitted';
  }

  // Load registered student information
  private loadStudentInformation(): void {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) return;

    try {
      const user = JSON.parse(storedUser);

      this.fullName = user.fullName || user.name || '';
      this.email = user.email || '';
      this.phone = user.phone || '';
    } catch {
      console.error('Unable to read registered student information.');
    }
  }

  // Load departments
  loadDepartments(): void {
    this.loadingDepartments = true;

    this.http.get<any>(
      `${this.apiBase}/departments`
    ).subscribe({
      next: (response) => {
        const data = this.getPayload(response);

        this.departments = Array.isArray(data)
          ? data
          : data?.departments || [];

        this.loadingDepartments = false;
      },
      error: (error) => {
        this.loadingDepartments = false;
        console.error('Department loading failed:', error);

        this.errorMessage =
          'Unable to load departments. Please try again.';
      }
    });
  }

  // Load application
  loadApplication(): void {
    if (!localStorage.getItem('token')) {
      this.errorMessage = 'Please log in to continue.';
      return;
    }

    this.loading = true;

    this.http.get<any>(
      `${this.apiBase}/applications/my-application`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        const data = this.getPayload(response);

        this.application = data;
        this.applicationStatus = data?.status || 'Draft';
        this.applicationNumber = data?.applicationNumber || '';
        this.submittedAt = data?.submittedAt || '';

        this.populateForm(data);
        this.loadUploadedDocuments(data?.documents || []);

        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        console.error('Application loading failed:', error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to load your application details.';
      }
    });
  }

  // Populate form fields
  private populateForm(data: any): void {
    if (!data) return;

    const personal = data.personalDetails || {};
    const academic = data.academicDetails || {};
    const applicant = data.applicant || {};

    this.fullName =
      applicant.fullName || this.fullName;

    this.email =
      applicant.email || this.email;

    this.phone =
      applicant.phone || this.phone;

    this.dateOfBirth = personal.dob
      ? String(personal.dob).substring(0, 10)
      : '';

    this.gender = personal.gender || '';
    this.category = personal.category || '';

    this.guardianName = personal.guardianName || '';
    this.guardianPhone = personal.guardianPhone || '';

    this.address = personal.permanentAddressLine1 || '';
    this.city = personal.permanentCity || '';
    this.state = personal.permanentState || '';
    this.pinCode = personal.permanentPincode || '';

    this.class10Board = academic.class10Board || '';
    this.class10PassingYear =
      academic.class10PassingYear ?? null;
    this.class10Percentage =
      academic.class10Percentage ?? null;

    this.class12Board = academic.class12Board || '';
    this.class12PassingYear =
      academic.class12PassingYear ?? null;
    this.class12Stream = academic.class12Stream || '';
    this.class12Percentage =
      academic.class12AggregatePercentage ?? null;

    this.selectedDepartmentIds =
      (data.departmentPreferences || [])
        .map((item: any) =>
          Number(item.departmentId ?? item.department?.id)
        )
        .filter((id: number) =>
          Number.isInteger(id) && id > 0
        );
  }

  // Load previously uploaded documents
  private loadUploadedDocuments(documents: any[]): void {
    this.uploadedDocuments = {};

    if (!Array.isArray(documents)) return;

    for (const document of documents) {
      if (document.docType) {
        this.uploadedDocuments[document.docType] = document;
      }
    }
  }

  // Course selection
  onCourseChange(): void {
    this.iemJeeRequired = this.selectedCourse === 'B.Tech';
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Department selection
  toggleDepartment(
    departmentId: number,
    checked: boolean
  ): void {

    if (checked) {
      if (
        !this.selectedDepartmentIds.includes(departmentId) &&
        this.selectedDepartmentIds.length < 5
      ) {
        this.selectedDepartmentIds = [
          ...this.selectedDepartmentIds,
          departmentId
        ];
      }
    } else {
      this.selectedDepartmentIds =
        this.selectedDepartmentIds.filter(
          id => id !== departmentId
        );
    }
  }

  // Department name
  getDepartmentName(departmentId: number): string {
    const department = this.departments.find(
      item => item.id === departmentId
    );

    return department?.name || 'Unknown Department';
  }

  // Validate percentages
  private validatePercentages(): boolean {

    if (
      this.class10Percentage !== null &&
      (
        this.class10Percentage < 0 ||
        this.class10Percentage > 100
      )
    ) {
      this.errorMessage =
        'Class 10 percentage must be between 0 and 100.';
      return false;
    }

    if (
      this.class12Percentage !== null &&
      (
        this.class12Percentage < 0 ||
        this.class12Percentage > 100
      )
    ) {
      this.errorMessage =
        'Class 12 percentage must be between 0 and 100.';
      return false;
    }

    return true;
  }

  // Save draft
  saveApplication(submitAfterSave: boolean = false): void {

    this.errorMessage = '';
    this.successMessage = '';

    if (!localStorage.getItem('token')) {
      this.errorMessage =
        'Please log in before saving your application.';
      return;
    }

    if (!this.isDraft()) {
      this.errorMessage =
        'This application can no longer be edited.';
      return;
    }

    if (!this.validatePercentages()) return;

    this.loading = true;

    const personalDetails: any = {
      address: {
        permanent: {
          line1: this.address.trim(),
          city: this.city.trim(),
          state: this.state.trim(),
          pincode: this.pinCode.trim()
        }
      }
    };

    if (this.dateOfBirth) {
      personalDetails.dob = this.dateOfBirth;
    }

    if (this.gender) {
      personalDetails.gender = this.gender;
    }

    if (this.category) {
      personalDetails.category = this.category;
    }

    if (this.guardianName.trim()) {
      personalDetails.guardianName =
        this.guardianName.trim();
    }

    if (this.guardianPhone.trim()) {
      personalDetails.guardianPhone =
        this.guardianPhone.trim();
    }

    const academicDetails: any = {
      class10: {},
      class12: {}
    };

    if (this.class10Board.trim()) {
      academicDetails.class10.board =
        this.class10Board.trim();
    }

    if (this.class10PassingYear !== null) {
      academicDetails.class10.passingYear =
        Number(this.class10PassingYear);
    }

    if (this.class10Percentage !== null) {
      academicDetails.class10.percentage =
        Number(this.class10Percentage);
    }

    if (this.class12Board.trim()) {
      academicDetails.class12.board =
        this.class12Board.trim();
    }

    if (this.class12PassingYear !== null) {
      academicDetails.class12.passingYear =
        Number(this.class12PassingYear);
    }

    if (this.class12Stream) {
      academicDetails.class12.stream =
        this.class12Stream;
    }

    if (this.class12Percentage !== null) {
      academicDetails.class12.aggregatePercentage =
        Number(this.class12Percentage);
    }

    const requestBody: any = {
      personalDetails,
      academicDetails
    };

    if (this.selectedDepartmentIds.length > 0) {
      requestBody.departmentPreferences =
        this.selectedDepartmentIds.map(
          (departmentId, index) => ({
            departmentId,
            priority: index + 1
          })
        );
    }

    this.http.put<any>(
      `${this.apiBase}/applications/save-draft`,
      requestBody,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        this.application = this.getPayload(response);
        this.applicationStatus =
          this.application?.status || 'Draft';

        this.loading = false;

        if (submitAfterSave) {
          this.sendSubmissionRequest();
          return;
        }

        this.successMessage =
          'Your application draft has been saved successfully.';
      },
      error: (error) => {
        this.loading = false;
        if (submitAfterSave) {
          this.submitting = false;
        }

        console.error('Draft saving failed:', error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to save your application. Please try again.';
      }
    });
  }

  // Upload document
  uploadDocument(docType: string, file: File | null): void {

    this.uploadErrors[docType] = '';

    if (!file) return;

    if (!this.isDraft()) {
      this.uploadErrors[docType] =
        'Documents cannot be changed after submission.';
      return;
    }

    if (!localStorage.getItem('token')) {
      this.uploadErrors[docType] =
        'Please log in before uploading documents.';
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.uploadErrors[docType] =
        'Invalid format. Please upload PDF, JPG or PNG.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.uploadErrors[docType] =
        'File size exceeds the 5 MB maximum limit.';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.uploading[docType] = true;
    this.uploadProgress[docType] = 0;

    this.http.post<any>(
      `${this.apiBase}/applications/upload-document/${docType}`,
      formData,
      {
        headers: this.getHeaders(),
        observe: 'events',
        reportProgress: true
      }
    ).subscribe({
      next: (event) => {

        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total || file.size;

          this.uploadProgress[docType] =
            Math.round(100 * event.loaded / total);
        }

        if (event.type === HttpEventType.Response) {
          const data = this.getPayload(event.body);
          const uploaded = data?.document;

          if (uploaded) {
            this.uploadedDocuments[docType] = {
              docType,
              ...uploaded
            };
          }

          this.uploading[docType] = false;
          this.uploadProgress[docType] = 100;

          this.successMessage =
            `${file.name} uploaded successfully.`;

          this.loadApplication();
        }
      },
      error: (error) => {
        this.uploading[docType] = false;
        this.uploadProgress[docType] = 0;

        console.error('Document upload failed:', error);

        this.uploadErrors[docType] =
          error?.error?.message ||
          'Document upload failed. Please try again.';
      }
    });
  }

  // Get uploaded document
  getUploadedDocument(docType: string): UploadedDocument | null {
    return this.uploadedDocuments[docType] || null;
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (!bytes) return 'Unknown size';

    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // View uploaded document
  viewDocument(docType: string): void {

    if (!this.application?.id) {
      this.errorMessage =
        'Application information is not available.';
      return;
    }

    const url =
      `${this.apiBase}/applications/${this.application.id}` +
      `/documents/${docType}`;

    this.http.get(url, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const fileUrl = URL.createObjectURL(blob);
        const openedWindow = window.open(fileUrl, '_blank');

        if (!openedWindow) {
          const link = document.createElement('a');
          link.href = fileUrl;
          link.target = '_blank';
          link.rel = 'noopener';
          link.click();
        }

        setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
      },
      error: (error) => {
        console.error('Document viewing failed:', error);

        this.uploadErrors[docType] =
          'Unable to open this document.';
      }
    });
  }

  // Check all final submission requirements
  getMissingRequirements(): string[] {
    const missing: string[] = [];

    if (!this.dateOfBirth) {
      missing.push('Date of Birth');
    }

    if (!this.gender) {
      missing.push('Gender');
    }

    if (!this.guardianName.trim()) {
      missing.push('Guardian Name');
    }

    if (!this.guardianPhone.trim()) {
      missing.push('Guardian Phone');
    }

    if (!this.city.trim() || !this.pinCode.trim()) {
      missing.push('Permanent Address: City and PIN Code');
    }

    if (!this.class10Board.trim() || this.class10Percentage === null) {
      missing.push('Class 10 Board and Percentage');
    }

    if (!this.class12Board.trim() || this.class12Percentage === null) {
      missing.push('Class 12 Board and Percentage');
    }

    if (this.selectedDepartmentIds.length === 0) {
      missing.push('At least one Department Preference');
    }

    if (!this.uploadedDocuments['photo']) {
      missing.push('Student Photograph');
    }

    if (!this.uploadedDocuments['marksheet10']) {
      missing.push('Class 10 Marksheet');
    }

    if (!this.uploadedDocuments['marksheet12']) {
      missing.push('Class 12 Marksheet');
    }

    return missing;
  }

  // Submit final application
  submitApplication(): void {

    this.errorMessage = '';
    this.successMessage = '';
    this.submissionErrors = [];

    if (!localStorage.getItem('token')) {
      this.errorMessage =
        'Please log in before submitting your application.';
      return;
    }

    if (!this.isDraft()) {
      this.errorMessage =
        'This application has already been submitted or locked.';
      return;
    }

    if (!this.validatePercentages()) return;

    this.submissionErrors = this.getMissingRequirements();

    if (this.submissionErrors.length > 0) {
      this.errorMessage =
        'Please complete all required items before submission.';
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to submit your admission application? ' +
      'After submission, you cannot edit your application or replace documents.'
    );

    if (!confirmed) return;

    this.submitting = true;

    // Save the latest form data before final submission.
    this.saveApplication(true);
  }

  // Called only after the draft has been saved successfully.
  private sendSubmissionRequest(): void {

    this.http.post<any>(
      `${this.apiBase}/applications/submit`,
      {},
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        const data = this.getPayload(response);

        this.application = data?.application || this.application;
        this.applicationNumber =
          data?.applicationNumber ||
          this.application?.applicationNumber ||
          '';

        this.applicationStatus =
          data?.status || 'Submitted';

        this.submittedAt =
          data?.submittedAt || '';

        this.submitting = false;
        this.submissionErrors = [];

        this.successMessage =
          'Your application has been submitted successfully!';

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      },
      error: (error) => {
        this.submitting = false;

        console.error('Application submission failed:', error);

        const response = error?.error;
        const details = response?.data;

        this.submissionErrors = Array.isArray(details)
          ? details
          : [];

        this.errorMessage =
          response?.message ||
          'Application submission failed. Please try again.';
      }
    });
  }
}
