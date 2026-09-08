import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '..\/lib/supabase';

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

export default function StudentSignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [programme, setProgramme] = useState('');
  const [campus, setCampus] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (
      !fullName ||
      !email ||
      !password ||
      !studentNumber ||
      !programme ||
      !campus
    ) {
      Alert.alert('Missing information', 'Please complete all fields.');
      return;
    }

    if (!isInstitutionalEmail(email)) {
      Alert.alert(
        'Invalid email',
        'Students must use their Richfield or AAA institutional email.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Weak password',
        'Password must contain at least 6 characters.'
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
            student_number: studentNumber.trim(),
            programme: programme.trim(),
            campus: campus.trim(),
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Student Account</Text>

      <Text style={styles.subtitle}>
        Use your Richfield or AAA institutional email.
      </Text>

      <TextInput
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />

      <TextInput
        placeholder="Institutional email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TextInput
        placeholder="Student number"
        value={studentNumber}
        onChangeText={setStudentNumber}
        style={styles.input}
      />

      <TextInput
        placeholder="Programme"
        value={programme}
        onChangeText={setProgramme}
        style={styles.input}
      />

      <TextInput
        placeholder="Campus"
        value={campus}
        onChangeText={setCampus}
        style={styles.input}
      />

      <Pressable
        style={styles.button}
        onPress={handleSignup}
        disabled={loading}
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
    justifyContent: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 30,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  button: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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