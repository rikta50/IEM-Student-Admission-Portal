
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  const token = localStorage.getItem('token');

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Allow administrators
    if (token && user.role === 'admin') {
      return true;
    }

    // Redirect students to their dashboard
    if (token && user.role === 'student') {
      router.navigate(['/dashboard']);
      return false;
    }
  } catch (error) {
    console.error('Invalid user session:', error);
  }

  // Redirect unauthenticated users to login
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.navigate(['/login']);

  return false;
};
