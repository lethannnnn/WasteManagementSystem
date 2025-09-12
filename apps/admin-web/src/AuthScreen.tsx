import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './AuthScreen.css';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Sign in existing admin user
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is an admin
      if (data.user) {
        console.log('User signed in:', data.user.id, data.user.email);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', data.user.id)
          .single();

        console.log('Profile query result:', { profile, profileError });

        if (profileError) {
          console.error('Profile error details:', profileError);
          await supabase.auth.signOut();
          throw new Error(`Profile lookup failed: ${profileError.message}`);
        }

        if (!profile) {
          await supabase.auth.signOut();
          throw new Error('No profile found for this user.');
        }

        if (profile.user_type !== 'admin') {
          console.log('User type:', profile.user_type);
          await supabase.auth.signOut();
          throw new Error(`Access denied. User type is '${profile.user_type}', not 'admin'.`);
        }

        console.log('Admin access granted');
        onAuthSuccess(data.user);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      alert('Please enter your email address first');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      
      alert('Password reset link sent to your email');
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">MyCycle+ Admin</h1>
          <p className="auth-subtitle">Administrator Dashboard Access</p>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
            Please contact system administrator for account access
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="auth-form">
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mycycle.com"
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className={`auth-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Please wait...' : 'Sign In to Dashboard'}
          </button>

          <button
            type="button"
            onClick={resetPassword}
            className="link-button"
          >
            Forgot Password?
          </button>
        </form>
      </div>
    </div>
  );
}
