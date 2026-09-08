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

export default function BusinessVerificationScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (
      !fullName ||
      !email ||
      !password ||
      !companyName ||
      !industry ||
      !location ||
      !description
    ) {
      Alert.alert('Missing information', 'Please complete all required fields.');
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
            signup_role: 'business',
            company_name: companyName.trim(),
            industry: industry.trim(),
            website: website.trim(),
            location: location.trim(),
            company_description: description.trim(),
          },
        },
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Account could not be created.');
      }

      router.replace('/verification-pending');
    } catch (error: any) {
      Alert.alert(
        'Registration failed',
        error.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Business Registration</Text>

      <Text style={styles.subtitle}>
        Business accounts must be verified before they can access the platform.
      </Text>

      <TextInput
        placeholder="Your full name"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />

      <TextInput
        placeholder="Business email"
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
        placeholder="Company name"
        value={companyName}
        onChangeText={setCompanyName}
        style={styles.input}
      />

      <TextInput
        placeholder="Industry"
        value={industry}
        onChangeText={setIndustry}
        style={styles.input}
      />

      <TextInput
        placeholder="Company website"
        value={website}
        onChangeText={setWebsite}
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="Company location"
        value={location}
        onChangeText={setLocation}
        style={styles.input}
      />

      <TextInput
        placeholder="Tell us about your company"
        value={description}
        onChangeText={setDescription}
        multiline
        style={[styles.input, styles.description]}
      />

      <Pressable
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Submitting...' : 'Continue to verification'}
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
    color: '#666',
    lineHeight: 21,
    marginBottom: 25,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  description: {
    height: 110,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  button: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  back: {
    textAlign: 'center',
    marginTop: 20,
  },
});
```
