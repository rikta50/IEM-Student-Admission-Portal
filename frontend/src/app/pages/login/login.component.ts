import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { API_BASE_URL } from '../../api.config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {

  private apiUrl = `${API_BASE_URL}/auth/login`;

  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('registered') === 'success') {
        this.successMessage =
          'Registration successful! Your account has been created. Please log in.';
      }
    });
  }

  login(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email.trim() || !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    this.loading = true;

    const requestBody = {
      email: this.email.trim(),
      password: this.password
    };

    this.http.post<any>(this.apiUrl, requestBody).subscribe({

      next: (response) => {
        const data = response?.data ?? response;

        if (!data?.token || !data?.user) {
          this.loading = false;
          this.errorMessage = 'Login response is missing user or authentication information.';
          return;
        }

        const role = String(data.user.role || '').toLowerCase();

        if (role !== 'admin' && role !== 'student') {
          this.loading = false;
          this.errorMessage = 'Your account has an unsupported role. Please contact the administrator.';
          return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        this.loading = false;
        this.successMessage = 'Login successful! Redirecting...';

        if (role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },

      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.errors?.[0]?.message ||
          error?.error?.message ||
          'Login failed. Please check your email and password.';
      }

    });
  }
}
