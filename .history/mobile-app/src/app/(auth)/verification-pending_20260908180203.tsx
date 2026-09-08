```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function VerificationPendingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>✓</Text>
      </View>

      <Text style={styles.title}>Verification submitted</Text>

      <Text style={styles.description}>
        Your application has been submitted for review. You will receive access
        once your account has been approved.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => router.replace('/login')}
      >
        <Text style={styles.buttonText}>Back to login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  iconText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 350,
    marginBottom: 30,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
