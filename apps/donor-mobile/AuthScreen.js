import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { sendPinEmail } from './emailService'; // Import real email service
import { createDonorAccount, loginDonorAccount } from './userService'; // Import updated user service

export default function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [pin, setPin] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [tempUserData, setTempUserData] = useState(null);
  const [formKey, setFormKey] = useState(0); // Add key for force re-render

  // Generate 4-digit PIN
  const generatePin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Send PIN via email
  const sendPinEmailWrapper = async (email, pin, fullName) => {
    try {
      // Use real email service
      const success = await sendPinEmail(email, pin, fullName);
      
      if (success) {
        Alert.alert(
          'Verification PIN Sent',
          `A verification PIN has been sent to ${email}. Please check your email and enter the PIN below.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Email Error',
          'Failed to send verification email. Please check your email address and try again.',
          [{ text: 'OK' }]
        );
      }
      
      return success;
    } catch (error) {
      console.error('Error sending PIN email:', error);
      Alert.alert(
        'Email Error',
        'Failed to send verification email. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  // Handle PIN verification
  const handlePinVerification = async () => {
    if (pin !== generatedPin) {
      Alert.alert('Error', 'Invalid PIN. Please try again.');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Starting complete donor account creation...');
      
      // Use the user service to create a complete donor account
      const result = await createDonorAccount({
        email: tempUserData.email,
        password: tempUserData.password,
        fullName: tempUserData.fullName,
        phone: tempUserData.phone
      });

      if (result.success) {
        // Update verification status to verified since PIN was confirmed
        const { updateDonorVerification } = await import('./userService');
        await updateDonorVerification(result.userId);
        
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => {
            console.log('✅ Registration success - switching to login mode');
            console.log('Created user ID:', result.userId);
            
            // Reset all form states properly
            setShowPinVerification(false);
            setIsLogin(true);
            setPin('');
            setGeneratedPin('');
            
            // Keep email filled for easier login, clear other fields
            const userEmail = tempUserData.email;
            setTempUserData(null);
            
            // Clear form fields with a slight delay to ensure proper state reset
            setTimeout(() => {
              console.log('🔄 Setting email to:', userEmail);
              setEmail(userEmail); // Keep email for login convenience
              setPassword(''); // Clear password for security
              setFullName('');
              setPhone('');
              setFormKey(prev => prev + 1); // Force form re-render
              console.log('📝 Form reset complete - ready for login');
            }, 100);
          }}
        ]);
      } else {
        console.error('Account creation failed:', result.error);
        Alert.alert('Registration Failed', result.userMessage || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && !fullName) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Sign in existing user using custom authentication
        console.log('🔐 Attempting login with custom auth...');
        
        const result = await loginDonorAccount(email, password);

        if (result.success) {
          console.log('✅ Login successful:', result.user);
          onAuthSuccess(result.user);
        } else {
          throw new Error(result.error);
        }
      } else {
        // Sign up new user with PIN verification
        console.log('Starting PIN-based signup for:', email);
        
        // Generate and send PIN
        const newPin = generatePin();
        setGeneratedPin(newPin);
        
        // Store user data temporarily
        setTempUserData({
          email,
          password,
          fullName,
          phone
        });

        // Send PIN via email (or show it for demo)
        const pinSent = await sendPinEmailWrapper(email, newPin, fullName);
        
        if (pinSent) {
          setShowPinVerification(true);
        } else {
          Alert.alert('Error', 'Failed to send verification PIN. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    try {
      // For now, show a message about contacting support
      // In a production app, you'd implement a proper password reset flow
      Alert.alert(
        'Password Reset', 
        'Password reset functionality will be implemented. Please contact support for assistance.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Password reset failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>MyCycle+</Text>
            <Text style={styles.subtitle}>
              {showPinVerification 
                ? 'Enter verification PIN' 
                : (isLogin ? 'Welcome back!' : 'Join the recycling revolution')
              }
            </Text>
          </View>

          {showPinVerification ? (
            // PIN Verification Screen
            <View style={styles.form}>
              <Text style={styles.pinInstructions}>
                We've sent a 4-digit PIN to your email address. Please enter it below to complete your registration.
              </Text>
              
              <TextInput
                style={[styles.input, styles.pinInput]}
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                maxLength={4}
                textAlign="center"
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handlePinVerification}
                disabled={loading || pin.length !== 4}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Verifying...' : 'Verify PIN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowPinVerification(false);
                  setPin('');
                  setGeneratedPin('');
                  setTempUserData(null);
                }}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Back to Sign Up</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Regular Auth Screen
            <View style={styles.form} key={`form-${formKey}-${isLogin ? 'login' : 'signup'}`}>
              {!isLogin && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    key={`fullName-${formKey}`}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number (Optional)"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    key={`phone-${formKey}`}
                  />
                </>
              )}
              
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                  console.log('Email input changed:', text);
                  setEmail(text);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                textContentType="emailAddress"
                key={`email-${formKey}`}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={(text) => {
                  console.log('Password input changed:', text.length, 'characters');
                  setPassword(text);
                }}
                secureTextEntry
                editable={!loading}
                textContentType="password"
                autoCorrect={false}
                autoCapitalize="none"
                key={`password-${formKey}`}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </Text>
              </TouchableOpacity>

              {isLogin && (
                <TouchableOpacity onPress={resetPassword} style={styles.linkButton}>
                  <Text style={styles.linkText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setIsLogin(!isLogin)}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>
                  {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  button: {
    backgroundColor: '#2d5a27',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#2d5a27',
    fontSize: 14,
  },
  pinInstructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  pinInput: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    textAlign: 'center',
  },
});
