import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';

export default function SignupScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Join Richfield Connect</Text>

      <Text style={styles.subtitle}>
        Choose the account that best describes you.
      </Text>

      <Pressable
        style={styles.card}
        onPress={() => router.push('/student-signup')}
      >
        <Text style={styles.cardTitle}>Student</Text>
        <Text style={styles.cardText}>
          Connect with students, alumni and opportunities.
        </Text>
      </Pressable>

      <Pressable
        style={styles.card}
        onPress={() => router.push('/alumni-verification')}
      >
        <Text style={styles.cardTitle}>Alumni</Text>
        <Text style={styles.cardText}>
          Reconnect with Richfield and help build the next generation.
        </Text>
      </Pressable>

      <Pressable
        style={styles.card}
        onPress={() => router.push('/business-verification')}
      >
        <Text style={styles.cardTitle}>Business</Text>
        <Text style={styles.cardText}>
          Find talent, post opportunities and connect with students.
        </Text>
      </Pressable>

      <Text style={styles.adminText}>
        Administrator accounts are created separately by the platform.
      </Text>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Already have an account? Log in</Text>
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
    marginBottom: 30,
  },

  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 6,
  },

  cardText: {
    color: '#666',
    lineHeight: 21,
  },

  adminText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 13,
    marginVertical: 20,
  },

  back: {
    textAlign: 'center',
    fontWeight: '600',
  },
});