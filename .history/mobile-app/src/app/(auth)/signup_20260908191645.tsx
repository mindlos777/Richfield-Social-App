```tsx
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

const PRIMARY = '#0300cf';

const programmes = [
  'BSc IT',
  'DIT',
  'BCom',
  'BBA',
  'BPM',
  'MBA',
];

const campuses = [
  'Braamfontein',
  'Cape Town',
  'Centurion',
  'Durban',
  'Mbombela',
  'Polokwane',
  'Pretoria',
  'Randburg',
  'Roodepoort',
  'Sandton',
];

function isInstitutionalEmail(email: string) {
  const domains = [
    '@my.richfield.ac.za',
    '@richfield.ac.za',
    '@my.aaa.ac.za',
    '@aaa.ac.za',
  ];

  return domains.some(domain =>
    email.toLowerCase().trim().endsWith(domain)
  );
}

function getPasswordStrength(password: string) {
  if (!password) {
    return {
      label: '',
      score: 0,
    };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return {
      label: 'Weak',
      score,
    };
  }

  if (score === 3 || score === 4) {
    return {
      label: 'Medium',
      score,
    };
  }

  return {
    label: 'Strong',
    score,
  };
}

export default function StudentSignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [programme, setProgramme] = useState('');
  const [campus, setCampus] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [programmeOpen, setProgrammeOpen] = useState(false);
  const [campusOpen, setCampusOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const passwordIsStrong =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const formIsValid =
    fullName.trim().length > 0 &&
    isInstitutionalEmail(email) &&
    studentNumber.length === 9 &&
    programme.length > 0 &&
    campus.length > 0 &&
    yearOfStudy.length > 0 &&
    passwordIsStrong &&
    passwordsMatch;

  async function handleSignup() {
    if (!fullName.trim()) {
      Alert.alert('Required field', 'Please enter your full name.');
      return;
    }

    if (!isInstitutionalEmail(email)) {
      Alert.alert(
        'Invalid email',
        'Please use your Richfield or AAA institutional email.'
      );
      return;
    }

    if (studentNumber.length !== 9) {
      Alert.alert(
        'Invalid student number',
        'Student number must contain exactly 9 numbers.'
      );
      return;
    }

    if (!programme) {
      Alert.alert('Required field', 'Please select your programme.');
      return;
    }

    if (!campus) {
      Alert.alert('Required field', 'Please select your campus.');
      return;
    }

    if (!yearOfStudy) {
      Alert.alert('Required field', 'Please select your year of study.');
      return;
    }

    if (!passwordIsStrong) {
      Alert.alert(
        'Weak password',
        'Your password must be at least 8 characters and contain uppercase, lowercase, a number and a special character.'
      );
      return;
    }

    if (!passwordsMatch) {
      Alert.alert(
        'Passwords do not match',
        'Please make sure both passwords are the same.'
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
            year_of_study: Number(yearOfStudy),
          },
        },
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Account could not be created.');
      }

      Alert.alert(
        'Account created',
        'Your account has been created. Please check your institutional email to verify your account.',
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
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create your account</Text>

      <Text style={styles.subtitle}>
        Join Richfield Connect and start building your professional network.
      </Text>

      <Text style={styles.label}>
        Full name <Text style={styles.required}>*</Text>
      </Text>

      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Enter your full name"
        style={styles.input}
      />

      <Text style={styles.label}>
        Institutional email <Text style={styles.required}>*</Text>
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@my.richfield.ac.za"
        keyboardType="email-address"
        autoCapitalize="none"
        style={[
          styles.input,
          email.length > 0 && !isInstitutionalEmail(email)
            ? styles.errorInput
            : null,
        ]}
      />

      {email.length > 0 && !isInstitutionalEmail(email) && (
        <Text style={styles.errorText}>
          Use a valid Richfield or AAA institutional email.
        </Text>
      )}

      <Text style={styles.label}>
        Student number <Text style={styles.required}>*</Text>
      </Text>

      <TextInput
        value={studentNumber}
        onChangeText={text =>
          setStudentNumber(text.replace(/[^0-9]/g, '').slice(0, 9))
        }
        placeholder="9-digit student number"
        keyboardType="numeric"
        maxLength={9}
        style={[
          styles.input,
          studentNumber.length > 0 && studentNumber.length !== 9
            ? styles.errorInput
            : null,
        ]}
      />

      <Text style={styles.helperText}>
        {studentNumber.length}/9 numbers
      </Text>

      <Text style={styles.label}>
        Programme <Text style={styles.required}>*</Text>
      </Text>

      <Pressable
        style={styles.select}
        onPress={() => {
          setProgrammeOpen(!programmeOpen);
          setCampusOpen(false);
        }}
      >
        <Text
          style={programme ? styles.selectText : styles.placeholderText}
        >
          {programme || 'Select your programme'}
        </Text>

        <Text style={styles.arrow}>
          {programmeOpen ? '▲' : '▼'}
        </Text>
      </Pressable>

      {programmeOpen && (
        <View style={styles.dropdown}>
          {programmes.map(item => (
            <Pressable
              key={item}
              style={styles.dropdownItem}
              onPress={() => {
                setProgramme(item);
                setProgrammeOpen(false);
              }}
            >
              <Text style={styles.dropdownText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>
        Campus <Text style={styles.required}>*</Text>
      </Text>

      <Pressable
        style={styles.select}
        onPress={() => {
          setCampusOpen(!campusOpen);
          setProgrammeOpen(false);
        }}
      >
        <Text
          style={campus ? styles.selectText : styles.placeholderText}
        >
          {campus || 'Select your campus'}
        </Text>

        <Text style={styles.arrow}>
          {campusOpen ? '▲' : '▼'}
        </Text>
      </Pressable>

      {campusOpen && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.campusList} nestedScrollEnabled>
            {campuses.map(item => (
              <Pressable
                key={item}
                style={styles.dropdownItem}
                onPress={() => {
                  setCampus(item);
                  setCampusOpen(false);
                }}
              >
                <Text style={styles.dropdownText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.label}>
        Year of study <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.radioContainer}>
        {['1', '2', '3'].map(year => (
          <Pressable
            key={year}
            style={styles.radioOption}
            onPress={() => setYearOfStudy(year)}
          >
            <View
              style={[
                styles.radio,
                yearOfStudy === year && styles.radioSelected,
              ]}
            >
              {yearOfStudy === year && (
                <View style={styles.radioInner} />
              )}
            </View>

            <Text style={styles.radioText}>
              {year === '1'
                ? '1st Year'
                : year === '2'
                ? '2nd Year'
                : '3rd Year'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>
        Password <Text style={styles.required}>*</Text>
      </Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Create a strong password"
        secureTextEntry
        style={styles.input}
      />

      {password.length > 0 && (
        <View style={styles.passwordSection}>
          <View style={styles.strengthRow}>
            <Text style={styles.strengthLabel}>
              Password strength
            </Text>

            <Text
              style={[
                styles.strengthValue,
                passwordStrength.label === 'Weak'
                  ? styles.weak
                  : passwordStrength.label === 'Medium'
                  ? styles.medium
                  : styles.strong,
              ]}
            >
              {passwordStrength.label}
            </Text>
          </View>

          <View style={styles.strengthBar}>
            <View
              style={[
                styles.strengthProgress,
                {
                  width:
                    passwordStrength.label === 'Weak'
                      ? '33%'
                      : passwordStrength.label === 'Medium'
                      ? '66%'
                      : '100%',
                },
              ]}
            />
          </View>

          <Text style={styles.passwordRule}>
            {password.length >= 8 ? '✓' : '○'} At least 8 characters
          </Text>

          <Text style={styles.passwordRule}>
            {/[A-Z]/.test(password) ? '✓' : '○'} Uppercase letter
          </Text>

          <Text style={styles.passwordRule}>
            {/[a-z]/.test(password) ? '✓' : '○'} Lowercase letter
          </Text>

          <Text style={styles.passwordRule}>
            {/[0-9]/.test(password) ? '✓' : '○'} Number
          </Text>

          <Text style={styles.passwordRule}>
            {/[^A-Za-z0-9]/.test(password) ? '✓' : '○'} Special character
          </Text>
        </View>
      )}

      <Text style={styles.label}>
        Re-enter password <Text style={styles.required}>*</Text>
      </Text>

      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter your password"
        secureTextEntry
        style={[
          styles.input,
          confirmPassword.length > 0 && !passwordsMatch
            ? styles.errorInput
            : null,
        ]}
      />

      {confirmPassword.length > 0 && (
        <Text
          style={
            passwordsMatch
              ? styles.matchText
              : styles.errorText
          }
        >
          {passwordsMatch
            ? '✓ Passwords match'
            : 'Passwords do not match'}
        </Text>
      )}

      <Pressable
        style={[
          styles.button,
          !formIsValid || loading
            ? styles.buttonDisabled
            : null,
        ]}
        onPress={handleSignup}
        disabled={!formIsValid || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating account...' : 'Create student account'}
        </Text>
      </Pressable>

      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    marginBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },

  required: {
    color: '#e00000',
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 6,
    backgroundColor: '#fff',
  },

  errorInput: {
    borderColor: '#e00000',
  },

  errorText: {
    color: '#e00000',
    fontSize: 12,
    marginBottom: 14,
  },

  helperText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 18,
  },

  select: {
    height: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  selectText: {
    color: '#111',
    fontSize: 15,
  },

  placeholderText: {
    color: '#999',
    fontSize: 15,
  },

  arrow: {
    color: PRIMARY,
    fontSize: 12,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },

  campusList: {
    maxHeight: 220,
  },

  dropdownItem: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  dropdownText: {
    fontSize: 15,
    color: '#222',
  },

  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#bbb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  radioSelected: {
    borderColor: PRIMARY,
  },

  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: PRIMARY,
  },

  radioText: {
    fontSize: 14,
    color: '#333',
  },

  passwordSection: {
    marginBottom: 20,
  },

  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  strengthLabel: {
    fontSize: 13,
    color: '#666',
  },

  strengthValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  weak: {
    color: '#e00000',
  },

  medium: {
    color: '#d58a00',
  },

  strong: {
    color: '#008a42',
  },

  strengthBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#eee',
    overflow: 'hidden',
    marginBottom: 12,
  },

  strengthProgress: {
    height: '100%',
    backgroundColor: PRIMARY,
  },

  passwordRule: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },

  matchText: {
    color: '#008a42',
    fontSize: 12,
    marginBottom: 14,
  },

  button: {
    height: 54,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  backButton: {
    alignItems: 'center',
    marginTop: 20,
  },

  backText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
});
```
