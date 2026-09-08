import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const programmes = [
  'BSc IT',
];

const campuses = [
  'Braamfontein',
  'Centurion',
  'Cape Town',
  'Durban',
  'East London',
  'Mbombela',
  'Polokwane',
  'Pretoria',
  'Randburg',
  'Roodepoort',
  'Rosebank',
  'Sandton',
];

const allowedDomains = [
  '@my.richfield.ac.za',
  '@richfield.ac.za',
  '@my.aaa.ac.za',
  '@aaa.ac.za',
];

function isInstitutionalEmail(email: string) {
  const value = email.toLowerCase().trim();

  return allowedDomains.some(domain =>
    value.endsWith(domain)
  );
}

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (password.length === 0) {
    return {
      label: '',
      valid: false,
    };
  }

  if (score <= 2) {
    return {
      label: 'Weak',
      valid: false,
    };
  }

  if (score === 3 || score === 4) {
    return {
      label: 'Medium',
      valid: false,
    };
  }

  return {
    label: 'Strong',
    valid: true,
  };
}

export default function StudentSignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [programme, setProgramme] = useState('');
  const [campus, setCampus] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const formValid =
    fullName.trim().length > 0 &&
    isInstitutionalEmail(email) &&
    studentNumber.length === 9 &&
    /^\d{9}$/.test(studentNumber) &&
    programme.length > 0 &&
    campus.length > 0 &&
    passwordStrength.valid;

  async function handleSignup() {
    if (!formValid) {
      Alert.alert(
        'Incomplete information',
        'Please complete all fields correctly.'
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            signup_role: 'student',
            student_number: studentNumber,
            programme,
            campus,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Account could not be created.');
      }

      Alert.alert(
        'Account created',
        'Check your institutional email to verify your account.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Signup failed',
        error.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create Student Account</Text>

      <Text style={styles.subtitle}>
        Use your Richfield or AAA institutional email.
      </Text>

      <Text style={styles.label}>Full name</Text>

      <TextInput
        placeholder="Enter your full name"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />

      <Text style={styles.label}>Institutional email</Text>

      <TextInput
        placeholder="name@my.richfield.ac.za"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={[
          styles.input,
          email.length > 0 && !isInstitutionalEmail(email)
            ? styles.invalidInput
            : null,
        ]}
      />

      {email.length > 0 && !isInstitutionalEmail(email) && (
        <Text style={styles.errorText}>
          Use a valid Richfield or AAA institutional email.
        </Text>
      )}

      <Text style={styles.label}>Student number</Text>

      <TextInput
        placeholder="9 digit student number"
        value={studentNumber}
        onChangeText={text => {
          const numbersOnly = text.replace(/[^0-9]/g, '');
          setStudentNumber(numbersOnly.slice(0, 9));
        }}
        keyboardType="numeric"
        maxLength={9}
        style={[
          styles.input,
          studentNumber.length > 0 && studentNumber.length !== 9
            ? styles.invalidInput
            : null,
        ]}
      />

      <Text style={styles.helperText}>
        {studentNumber.length}/9 digits
      </Text>

      <Text style={styles.label}>Programme</Text>

      <View style={styles.dropdown}>
        {programmes.map(item => (
          <Pressable
            key={item}
            onPress={() => setProgramme(item)}
            style={[
              styles.option,
              programme === item && styles.selectedOption,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                programme === item && styles.selectedOptionText,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Campus</Text>

      <View style={styles.dropdown}>
        {campuses.map(item => (
          <Pressable
            key={item}
            onPress={() => setCampus(item)}
            style={[
              styles.option,
              campus === item && styles.selectedOption,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                campus === item && styles.selectedOptionText,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Password</Text>

      <TextInput
        placeholder="Create a strong password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {password.length > 0 && (
        <View style={styles.passwordSection}>
          <Text
            style={[
              styles.passwordStrength,
              passwordStrength.label === 'Strong'
                ? styles.strong
                : passwordStrength.label === 'Medium'
                ? styles.medium
                : styles.weak,
            ]}
          >
            Password: {passwordStrength.label}
          </Text>

          <Text style={styles.passwordRule}>
            {password.length >= 8 ? '✓' : '○'} At least 8 characters
          </Text>

          <Text style={styles.passwordRule}>
            {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
          </Text>

          <Text style={styles.passwordRule}>
            {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
          </Text>

          <Text style={styles.passwordRule}>
            {/[0-9]/.test(password) ? '✓' : '○'} One number
          </Text>

          <Text style={styles.passwordRule}>
            {/[^A-Za-z0-9]/.test(password) ? '✓' : '○'} One special character
          </Text>
        </View>
      )}

      <Pressable
        style={[
          styles.button,
          !formValid || loading ? styles.disabledButton : null,
        ]}
        onPress={handleSignup}
        disabled={!formValid || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating account...' : 'Create account'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 7,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 6,
    backgroundColor: '#fff',
  },

  invalidInput: {
    borderColor: '#d9534f',
  },

  errorText: {
    color: '#d9534f',
    fontSize: 12,
    marginBottom: 12,
  },

  helperText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 20,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },

  option: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  selectedOption: {
    backgroundColor: '#111',
  },

  optionText: {
    fontSize: 15,
  },

  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },

  passwordSection: {
    marginTop: 4,
    marginBottom: 20,
  },

  passwordStrength: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },

  strong: {
    color: '#218838',
  },

  medium: {
    color: '#d99000',
  },

  weak: {
    color: '#d9534f',
  },

  passwordRule: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },

  button: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  disabledButton: {
    opacity: 0.4,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  back: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
  },
});
