
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnDestroy {

  private apiUrl = 'http://localhost:5000/api/v1/auth/register';

  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirmPassword = false;

  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Calculate password strength
  get passwordStrength(): string {
    if (!this.password) return '';

    const rules = [
      this.password.length >= 8,
      /[A-Z]/.test(this.password),
      /[a-z]/.test(this.password),
      /\d/.test(this.password),
      /[@#$!%*?&]/.test(this.password)
    ];

    const score = rules.filter(Boolean).length;

    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Medium';

    return 'Strong';
  }

  // Validate password
  get isPasswordValid(): boolean {
    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,}$/;

    return strongPassword.test(this.password);
  }

  // Check whether passwords match
  get passwordsMatch(): boolean {
    return (
      this.password.length > 0 &&
      this.confirmPassword.length > 0 &&
      this.password === this.confirmPassword
    );
  }

  // Register student
  register(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (
      !this.fullName.trim() ||
      !this.email.trim() ||
      !this.phone.trim() ||
      !this.password ||
      !this.confirmPassword
    ) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(this.email.trim())) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    if (!/^[0-9]{10}$/.test(this.phone.trim())) {
      this.errorMessage = 'Please enter a valid 10-digit mobile number.';
      return;
    }

    if (!this.isPasswordValid) {
      this.errorMessage =
        'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    const requestBody = {
      fullName: this.fullName.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
      password: this.password,
      confirmPassword: this.confirmPassword
    };

    this.loading = true;

    this.http.post<any>(this.apiUrl, requestBody).subscribe({

      next: (response) => {
        this.loading = false;

        this.successMessage =
          response?.message ||
          'Your student account has been created successfully!';

        // Clear the form
        this.fullName = '';
        this.email = '';
        this.phone = '';
        this.password = '';
        this.confirmPassword = '';

        this.showPassword = false;
        this.showConfirmPassword = false;

        // Redirect to login after successful registration
        this.redirectTimer = setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { registered: 'success' }
          });
        }, 2000);
      },

      error: (error) => {
        this.loading = false;

        this.errorMessage =
          error?.error?.errors?.[0]?.message ||
          error?.error?.message ||
          'Unable to create your account. Please try again.';
      }

    });
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  }
}
