import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type OpportunityType = 'All' | 'Graduate' | 'Internship' | 'Part-time';

type Opportunity = {
  id: string;
  title: string;
  company: string;
  initials: string;
  location: string;
  type: Exclude<OpportunityType, 'All'>;
  workplace: string;
  match: number;
  closingLabel: string;
  description: string;
  skills: string[];
  saved: boolean;
};

const filters: OpportunityType[] = ['All', 'Graduate', 'Internship', 'Part-time'];

const currentOpportunities: Opportunity[] = [
  {
    id: 'graduate-software-developer',
    title: 'Graduate Software Developer',
    company: 'Tech Solutions Africa',
    initials: 'TS',
    location: 'Johannesburg, Gauteng',
    type: 'Graduate',
    workplace: 'Hybrid',
    match: 92,
    closingLabel: 'Closes 18 Sep 2026',
    description: 'Join a graduate engineering team building reliable software for organisations across Africa.',
    skills: ['Java', 'Spring Boot', 'REST APIs'],
    saved: false,
  },
  {
    id: 'junior-cloud-engineer',
    title: 'Junior Cloud Engineer',
    company: 'Moya Digital',
    initials: 'MD',
    location: 'Cape Town, Western Cape',
    type: 'Graduate',
    workplace: 'Remote-friendly',
    match: 87,
    closingLabel: 'Closes 24 Sep 2026',
    description: 'Develop your cloud career while helping teams deploy secure and scalable applications.',
    skills: ['AWS', 'Linux', 'Python'],
    saved: false,
  },
  {
    id: 'software-development-intern',
    title: 'Software Development Intern',
    company: 'Nexa Systems',
    initials: 'NS',
    location: 'Pretoria, Gauteng',
    type: 'Internship',
    workplace: 'On-site',
    match: 81,
    closingLabel: 'Closes 2 Oct 2026',
    description: 'Gain practical experience working with a product team on customer-facing web applications.',
    skills: ['React', 'TypeScript', 'Git'],
    saved: false,
  },
  {
    id: 'cybersecurity-intern',
    title: 'Cybersecurity Analyst Intern',
    company: 'SecureNet Africa',
    initials: 'SA',
    location: 'Durban, KwaZulu-Natal',
    type: 'Internship',
    workplace: 'Hybrid',
    match: 76,
    closingLabel: 'Closes 29 Sep 2026',
    description: 'Support security monitoring and incident response in a growing technology environment.',
    skills: ['Networking', 'SIEM', 'Security'],
    saved: false,
  },
  {
    id: 'student-frontend-developer',
    title: 'Student Frontend Developer',
    company: 'Brightside Studio',
    initials: 'BS',
    location: 'Remote, South Africa',
    type: 'Part-time',
    workplace: 'Remote',
    match: 74,
    closingLabel: 'Closes 21 Sep 2026',
    description: 'Work part-time with a design-led team to create accessible and polished digital experiences.',
    skills: ['React Native', 'CSS', 'Figma'],
    saved: false,
  },
];

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
  successSoft: '#EAF6EF',
};

export default function OpportunitiesScreen() {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<OpportunityType>('All');
  const [opportunities, setOpportunities] = useState(currentOpportunities);
  const [refreshing, setRefreshing] = useState(false);

  const visibleOpportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      const matchesType = selectedType === 'All' || opportunity.type === selectedType;
      const searchableText = [opportunity.title, opportunity.company, opportunity.location, opportunity.workplace, ...opportunity.skills].join(' ').toLowerCase();

      return matchesType && searchableText.includes(normalizedQuery);
    });
  }, [opportunities, query, selectedType]);

  const toggleSaved = (opportunityId: string) => {
    setOpportunities((current) => current.map((opportunity) => opportunity.id === opportunityId ? { ...opportunity, saved: !opportunity.saved } : opportunity));
  };

  const refreshOpportunities = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={visibleOpportunities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OpportunityCard opportunity={item} onToggleSaved={() => toggleSaved(item.id)} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshOpportunities} tintColor={colors.brand} />}
        ListHeaderComponent={
          <View>
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>CAREER OPPORTUNITIES</Text>
              <Text style={styles.title}>Find your next opportunity</Text>
              <Text style={styles.subtitle}>Current roles matched to students and graduates in the Richfield community.</Text>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={19} color={colors.muted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search roles, companies or skills" placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" />
              {query.length > 0 ? <Pressable onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
            </View>

            <FlatList
              data={filters}
              horizontal
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => (
                <Pressable style={[styles.filter, selectedType === item && styles.filterSelected]} onPress={() => setSelectedType(item)}>
                  <Text style={[styles.filterText, selectedType === item && styles.filterTextSelected]}>{item}</Text>
                </Pressable>
              )}
            />

            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>{visibleOpportunities.length} current {visibleOpportunities.length === 1 ? 'role' : 'roles'}</Text>
              <View style={styles.liveStatus}><View style={styles.liveDot} /><Text style={styles.liveText}>Updated today</Text></View>
            </View>
          </View>
        }
        ListEmptyComponent={<View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="search-outline" size={25} color={colors.brand} /></View><Text style={styles.emptyTitle}>No matching opportunities</Text><Text style={styles.emptyText}>Try a different role, company, skill or opportunity type.</Text></View>}
        ListFooterComponent={<View style={styles.footerSpacing} />}
      />
    </SafeAreaView>
  );
}

function OpportunityCard({ opportunity, onToggleSaved }: { opportunity: Opportunity; onToggleSaved: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.companyMark}><Text style={styles.companyMarkText}>{opportunity.initials}</Text></View>
        <View style={styles.cardHeading}><Text style={styles.cardTitle}>{opportunity.title}</Text><Text style={styles.company}>{opportunity.company}</Text></View>
        <Pressable onPress={onToggleSaved} hitSlop={8} style={styles.saveButton}><Ionicons name={opportunity.saved ? 'bookmark' : 'bookmark-outline'} size={20} color={opportunity.saved ? colors.brand : colors.muted} /></Pressable>
      </View>

      <View style={styles.metaRow}><Ionicons name="location-outline" size={15} color={colors.muted} /><Text style={styles.metaText}>{opportunity.location}</Text><View style={styles.metaSeparator} /><Text style={styles.metaText}>{opportunity.workplace}</Text></View>
      <Text style={styles.description}>{opportunity.description}</Text>

      <View style={styles.skills}>{opportunity.skills.map((skill) => <View style={styles.skill} key={skill}><Text style={styles.skillText}>{skill}</Text></View>)}</View>
      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View><View style={styles.matchRow}><Ionicons name="sparkles-outline" size={14} color={colors.success} /><Text style={styles.matchText}>{opportunity.match}% match</Text></View><Text style={styles.closingText}>{opportunity.closingLabel}</Text></View>
        <View style={styles.typeBadge}><Text style={styles.typeText}>{opportunity.type}</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingTop: 8, paddingBottom: 24 },
  heading: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.secondary, marginBottom: 7 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 13.5, lineHeight: 20, color: colors.secondary, marginTop: 8 },
  searchBox: { marginHorizontal: 20, height: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 9, fontSize: 13, color: colors.ink },
  filterList: { paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  filter: { paddingHorizontal: 15, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  filterSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterText: { fontSize: 12, fontWeight: '700', color: colors.secondary },
  filterTextSelected: { color: colors.white },
  resultsRow: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  liveStatus: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success, marginRight: 5 },
  liveText: { fontSize: 11, color: colors.muted },
  card: { marginHorizontal: 20, marginTop: 10, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  companyMark: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  companyMarkText: { fontSize: 12, fontWeight: '800', color: colors.white },
  cardHeading: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.ink },
  company: { fontSize: 12.5, color: colors.secondary, marginTop: 3 },
  saveButton: { padding: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  metaText: { fontSize: 11, color: colors.muted, marginLeft: 4 },
  metaSeparator: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted, marginHorizontal: 8 },
  description: { fontSize: 12.5, lineHeight: 19, color: colors.secondary, marginTop: 13 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
  skill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, backgroundColor: colors.brandSoft },
  skillText: { fontSize: 10.5, fontWeight: '700', color: colors.ink },
  cardDivider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchRow: { flexDirection: 'row', alignItems: 'center' },
  matchText: { fontSize: 11.5, fontWeight: '800', color: colors.success, marginLeft: 4 },
  closingText: { fontSize: 10.5, color: colors.muted, marginTop: 4 },
  typeBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, backgroundColor: colors.successSoft },
  typeText: { fontSize: 10.5, fontWeight: '700', color: colors.success },
  emptyState: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 55 },
  emptyIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 14 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', color: colors.secondary, marginTop: 6 },
  footerSpacing: { height: 20 },
});