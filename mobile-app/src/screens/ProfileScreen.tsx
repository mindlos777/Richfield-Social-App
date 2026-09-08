import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/auth_context';

const fallbackProfile = {
  name: 'Ashley Taylor',
  programme: 'BSc Information Technology',
  location: 'Richfield Student · South Africa',
  bio: 'IT student interested in software development, cloud technology and building products that make work simpler.',
};

const skills = ['React Native', 'TypeScript', 'Java', 'SQL', 'Git', 'UI design'];

const experience = [
  {
    icon: 'code-slash-outline' as const,
    title: 'Full-stack project builder',
    organisation: 'Personal projects · 2025 - Present',
    description: 'Building practical applications with React, Node.js and PostgreSQL.',
  },
  {
    icon: 'school-outline' as const,
    title: 'BSc Information Technology',
    organisation: 'Richfield Graduate Institute · In progress',
    description: 'Coursework focused on software development, databases and systems analysis.',
  },
];

export default function ProfileScreen() {
  const { profile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(fallbackProfile.bio);
  const [savedBio, setSavedBio] = useState(fallbackProfile.bio);

  const profileName = profile?.full_name || profile?.name || fallbackProfile.name;
  const programme = profile?.programme || fallbackProfile.programme;
  const location = profile?.location || fallbackProfile.location;
  const initials = profileName
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const toggleEditing = () => {
    if (editing) {
      setSavedBio(bio.trim() || fallbackProfile.bio);
      setBio(bio.trim() || fallbackProfile.bio);
    }
    setEditing((current) => !current);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>MY PROFILE</Text>
            <Text style={styles.screenTitle}>Your professional identity</Text>
          </View>
          <Pressable style={styles.editButton} onPress={toggleEditing}>
            <Ionicons name={editing ? 'checkmark-outline' : 'create-outline'} size={17} color={colors.white} />
            <Text style={styles.editButtonText}>{editing ? 'Save' : 'Edit'}</Text>
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <View style={styles.identity}>
              <Text style={styles.name}>{profileName}</Text>
              <Text style={styles.programme}>{programme}</Text>
              <View style={styles.locationRow}><Ionicons name="location-outline" size={14} color={colors.muted} /><Text style={styles.location}>{location}</Text></View>
            </View>
          </View>

          {editing ? (
            <TextInput value={bio} onChangeText={setBio} multiline textAlignVertical="top" style={styles.bioInput} maxLength={240} />
          ) : (
            <Text style={styles.bio}>{savedBio}</Text>
          )}

          <View style={styles.profileStats}>
            <Stat value="72%" label="Profile strength" />
            <View style={styles.statDivider} />
            <Stat value="18" label="Connections" />
            <View style={styles.statDivider} />
            <Stat value="6" label="Posts" />
          </View>
        </View>

        <View style={styles.strengthCard}>
          <View style={styles.sectionHeadingRow}>
            <View><Text style={styles.sectionTitle}>Profile strength</Text><Text style={styles.sectionCaption}>Complete your profile to stand out.</Text></View>
            <Text style={styles.strengthValue}>72%</Text>
          </View>
          <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
          <View style={styles.strengthHint}><Ionicons name="sparkles-outline" size={15} color={colors.secondary} /><Text style={styles.hintText}>Add your GitHub profile and two more skills</Text></View>
        </View>

        <SectionTitle title="Skills" action="6 skills" />
        <View style={styles.skillList}>{skills.map((skill) => <View key={skill} style={styles.skill}><Text style={styles.skillText}>{skill}</Text></View>)}</View>

        <SectionTitle title="Experience and education" />
        <View style={styles.timeline}>{experience.map((item, index) => <View style={styles.timelineItem} key={item.title}>
          <View style={styles.timelineIcon}><Ionicons name={item.icon} size={19} color={colors.brand} /></View>
          <View style={styles.timelineContent}><Text style={styles.timelineTitle}>{item.title}</Text><Text style={styles.timelineOrganisation}>{item.organisation}</Text><Text style={styles.timelineDescription}>{item.description}</Text></View>
          {index < experience.length - 1 ? <View style={styles.timelineLine} /> : null}
        </View>)}</View>

        <SectionTitle title="Profile visibility" />
        <View style={styles.visibilityCard}><View style={styles.visibilityIcon}><Ionicons name="globe-outline" size={19} color={colors.brand} /></View><View style={styles.visibilityContent}><Text style={styles.visibilityTitle}>Visible to the Richfield community</Text><Text style={styles.visibilityDescription}>Students, alumni and recruiters can discover your profile.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Text style={styles.sectionAction}>{action}</Text> : null}</View>;
}

const colors = {
  background: '#F5F7F9',
  white: '#FFFFFF',
  ink: '#17212B',
  secondary: '#5F6B76',
  muted: '#89949E',
  border: '#E3E8EC',
  brand: '#243447',
  brandSoft: '#EEF2F5',
  success: '#287A52',
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.secondary, marginBottom: 6 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  editButton: { height: 36, paddingHorizontal: 12, borderRadius: 9, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brand },
  editButtonText: { fontSize: 12, fontWeight: '700', color: colors.white, marginLeft: 5 },
  profileCard: { padding: 17, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.white },
  identity: { flex: 1 },
  name: { fontSize: 19, fontWeight: '800', color: colors.ink },
  programme: { fontSize: 12.5, color: colors.secondary, marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  location: { fontSize: 11, color: colors.muted, marginLeft: 3 },
  bio: { fontSize: 13, lineHeight: 20, color: colors.secondary, marginTop: 16 },
  bioInput: { minHeight: 70, marginTop: 16, padding: 10, borderRadius: 9, borderWidth: 1, borderColor: colors.border, fontSize: 13, lineHeight: 19, color: colors.ink },
  profileStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.border },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 10, color: colors.muted, marginTop: 3 },
  statDivider: { width: 1, height: 27, backgroundColor: colors.border },
  strengthCard: { marginTop: 12, padding: 16, borderRadius: 15, backgroundColor: colors.brandSoft },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sectionCaption: { fontSize: 11.5, color: colors.secondary, marginTop: 4 },
  strengthValue: { fontSize: 16, fontWeight: '900', color: colors.brand },
  progressTrack: { height: 7, borderRadius: 5, backgroundColor: colors.white, overflow: 'hidden', marginTop: 14 },
  progressFill: { width: '72%', height: '100%', borderRadius: 5, backgroundColor: colors.brand },
  strengthHint: { flexDirection: 'row', alignItems: 'center', marginTop: 11 },
  hintText: { fontSize: 11, fontWeight: '600', color: colors.secondary, marginLeft: 6 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 11 },
  sectionAction: { fontSize: 11.5, fontWeight: '700', color: colors.secondary },
  skillList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skill: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  skillText: { fontSize: 11.5, fontWeight: '700', color: colors.ink },
  timeline: { padding: 15, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  timelineItem: { minHeight: 75, flexDirection: 'row', position: 'relative' },
  timelineIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  timelineContent: { flex: 1, paddingBottom: 15 },
  timelineTitle: { fontSize: 13, fontWeight: '800', color: colors.ink },
  timelineOrganisation: { fontSize: 11, color: colors.secondary, marginTop: 3 },
  timelineDescription: { fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 5 },
  timelineLine: { position: 'absolute', left: 17, top: 38, bottom: 0, width: 1, backgroundColor: colors.border },
  visibilityCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  visibilityIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  visibilityContent: { flex: 1 },
  visibilityTitle: { fontSize: 12.5, fontWeight: '800', color: colors.ink },
  visibilityDescription: { fontSize: 11, lineHeight: 16, color: colors.secondary, marginTop: 3 },
});
``