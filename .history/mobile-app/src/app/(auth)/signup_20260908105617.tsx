import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

export default function SignupScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <Text style={styles.subtitle}>
        Choose the account that describes you.
      </Text>

      <Pressable
        style={styles.card}
        onPress={() =>
          router.push('/(')
        }
      >
        <Text style={styles.cardTitle}>Student</Text>
        <Text style={styles.cardText}>
          Currently studying at Richfield or AAA
        </Text>
      </Pressable>

      <Pressable
        style={styles.card}
        onPress={() =>
          router.push('/(auth)/alumni-verification')
        }
      >
        <Text style={styles.cardTitle}>Alumni</Text>
        <Text style={styles.cardText}>
          A graduate of Richfield or AAA
        </Text>
      </Pressable>

      <Pressable
        style={styles.card}
        onPress={() =>
          router.push('/(auth)/business-verification')
        }
      >
        <Text style={styles.cardTitle}>Business</Text>
        <Text style={styles.cardText}>
          Employer, recruiter or industry partner
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.back()}
      >
        <Text style={styles.login}>
          Already have an account? Sign in
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  card: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardText: {
    color: '#666',
  },
  login: {
    textAlign: 'center',
    marginTop: 20,
  },
});