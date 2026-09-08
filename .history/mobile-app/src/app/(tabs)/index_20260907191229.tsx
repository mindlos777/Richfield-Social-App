import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ==========================================================================
   TYPES
   ========================================================================== */

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type FeedPost = {
  id: string;
  author: string;
  initials: string;
  headline: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
};

type Opportunity = {
  id: string;
  title: string;
  company: string;
  companyInitials: string;
  location: string;
  type: string;
  match: number;
  closingDate: string;
  skills: string[];
};

type EventItem = {
  id: string;
  title: string;
  date: string;
  month: string;
  time: string;
  location: string;
  category: string;
};

type SuggestedConnection = {
  id: string;
  name: string;
  initials: string;
  role: string;
  programme: string;
  type: 'ALUMNI' | 'STUDENT' | 'BUSINESS';
};

/* ==========================================================================
   TEMPORARY DEVELOPMENT DATA
   ========================================================================== */

/**
 * These are development-only values.
 *
 * Later these will come from:
 * - Firebase / backend API
 * - TanStack Query
 * - Authenticated user profile
 * - Recommendation / matching service
 */

const initialPosts: FeedPost[] = [
  {
    id: 'post-1',
    author: 'Thabo Mokoena',
    initials: 'TM',
    headline: 'Software Engineer · Richfield Alumni',
    time: '2h',
    content:
      'Excited to share that I have started a new role as a Backend Software Engineer. One thing I learnt during my transition from university into industry is that consistently building projects matters just as much as completing coursework.',
    likes: 42,
    comments: 8,
    shares: 3,
    liked: false,
  },
  {
    id: 'post-2',
    author: 'Richfield Career Development',
    initials: 'RC',
    headline: 'Career Development',
    time: '5h',
    content:
      'Applications are now open for the upcoming industry networking session. Students interested in software development, cloud computing and cybersecurity are encouraged to attend.',
    likes: 76,
    comments: 14,
    shares: 11,
    liked: false,
  },
  {
    id: 'post-3',
    author: 'Lerato Nkosi',
    initials: 'LN',
    headline: 'BSc IT · Final Year Student',
    time: '1d',
    content:
      'Just completed my first full-stack project using React, Node.js and PostgreSQL. Looking forward to connecting with other students working on interesting software projects.',
    likes: 31,
    comments: 6,
    shares: 2,
    liked: false,
  },
];

const recommendedOpportunity: Opportunity = {
  id: 'opportunity-1',
  title: 'Graduate Software Developer',
  company: 'Tech Solutions Africa',
  companyInitials: 'TS',
  location: 'Johannesburg, Gauteng',
  type: 'Graduate Programme',
  match: 92,
  closingDate: '18 Sep 2026',
  skills: ['Java', 'Spring Boot', 'REST APIs'],
};

const upcomingEvents: EventItem[] = [
  {
    id: 'event-1',
    title: 'Technology Career Fair',
    date: '18',
    month: 'SEP',
    time: '10:00',
    location: 'Richfield Centurion Campus',
    category: 'Career Fair',
  },
  {
    id: 'event-2',
    title: 'Building Your Developer Portfolio',
    date: '22',
    month: 'SEP',
    time: '14:00',
    location: 'Online',
    category: 'Workshop',
  },
  {
    id: 'event-3',
    title: 'Industry Networking Evening',
    date: '26',
    month: 'SEP',
    time: '17:30',
    location: 'Richfield Sandton Campus',
    category: 'Networking',
  },
];

const suggestedConnections: SuggestedConnection[] = [
  {
    id: 'person-1',
    name: 'Sipho Dlamini',
    initials: 'SD',
    role: 'Software Developer',
    programme: 'BSc IT',
    type: 'ALUMNI',
  },
  {
    id: 'person-2',
    name: 'Nadia Williams',
    initials: 'NW',
    role: 'Cloud Engineer',
    programme: 'BSc IT',
    type: 'ALUMNI',
  },
  {
    id: 'person-3',
    name: 'Kabelo Molefe',
    initials: 'KM',
    role: 'Cybersecurity Analyst',
    programme: 'BSc IT',
    type: 'ALUMNI',
  },
];

/* ==========================================================================
   MAIN HOME SCREEN
   ========================================================================== */

export default function HomeScreen() {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);

    /*
     * Temporary refresh simulation.
     *
     * Later:
     * queryClient.invalidateQueries({
     *   queryKey: ['feed'],
     * });
     */

    await new Promise((resolve) => setTimeout(resolve, 800));

    setRefreshing(false);
  };

  const handleLike = (postId: string) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? post.likes - 1 : post.likes + 1,
        };
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListHeaderComponent={
          <HomeContentHeader />
        }
        renderItem={({ item }) => (
          <FeedPostCard
            post={item}
            onLike={() => handleLike(item.id)}
          />
        )}
        ListFooterComponent={<View style={styles.bottomSpacing} />}
      />
    </SafeAreaView>
  );
}

/* ==========================================================================
   HOME CONTENT HEADER
   ========================================================================== */

function HomeContentHeader() {
  return (
    <View>
      {/* Welcome */}

      <View style={styles.welcomeSection}>
        <Text style={styles.greeting}>Good afternoon, Ashley</Text>

        <Text style={styles.welcomeTitle}>
          Build your professional future.
        </Text>

        <Text style={styles.welcomeDescription}>
          Connect with students, alumni and industry professionals while
          discovering opportunities that match your career goals.
        </Text>
      </View>

      {/* Profile Strength */}

      <ProfileStrengthCard />

      {/* Quick Actions */}

      <QuickActions />

      {/* Recommended Opportunity */}

      <SectionHeader
        title="Recommended for you"
        action="View all"
        onPress={() => router.push('/opportunities')}
      />

      <OpportunityCard opportunity={recommendedOpportunity} />

      {/* Events */}

      <SectionHeader
        title="Upcoming events"
      />

      <EventsSection />

      {/* People */}

      <SectionHeader
        title="People you may know"
      />

      <SuggestedConnections />

      {/* Feed */}

      <View style={styles.feedHeading}>
        <View>
          <Text style={styles.sectionTitle}>Professional feed</Text>

          <Text style={styles.sectionSubtitle}>
            Updates from your Richfield community
          </Text>
        </View>

        <Pressable
          style={styles.filterButton}
          onPress={() => {
            // Feed filter screen will be added later.
          }}
        >
          <Ionicons
            name="options-outline"
            size={19}
            color={COLORS.textPrimary}
          />
        </Pressable>
      </View>

      <CreatePostCard />
    </View>
  );
}

/* ==========================================================================
   PROFILE STRENGTH
   ========================================================================== */

function ProfileStrengthCard() {
  const profileStrength = 72;

  return (
    <Pressable
      style={styles.profileStrengthCard}
      onPress={() => router.push('/profile')}
    >
      <View style={styles.profileStrengthHeader}>
        <View style={styles.profileStrengthIcon}>
          <Ionicons
            name="person-outline"
            size={20}
            color={COLORS.white}
          />
        </View>

        <View style={styles.profileStrengthContent}>
          <View style={styles.profileStrengthTitleRow}>
            <Text style={styles.profileStrengthTitle}>
              Profile strength
            </Text>

            <Text style={styles.profileStrengthPercentage}>
              {profileStrength}%
            </Text>
          </View>

          <Text style={styles.profileStrengthDescription}>
            Your profile is looking good. Add a few more details to stand out
            to recruiters and alumni.
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${profileStrength}%`,
            },
          ]}
        />
      </View>

      <View style={styles.profileStrengthFooter}>
        <View style={styles.suggestionContainer}>
          <Ionicons
            name="sparkles-outline"
            size={15}
            color={COLORS.textSecondary}
          />

          <Text style={styles.profileSuggestion}>
            Add GitHub and 2 more skills
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={17}
          color={COLORS.textSecondary}
        />
      </View>
    </Pressable>
  );
}

/* ==========================================================================
   QUICK ACTIONS
   ========================================================================== */

function QuickActions() {
  const actions: {
    title: string;
    icon: IconName;
    route?: '/opportunities' | '/profile';
  }[] = [
    {
      title: 'Opportunities',
      icon: 'briefcase-outline',
      route: '/opportunities',
    },
    {
      title: 'Explore Alumni',
      icon: 'people-outline',
      route: '/profile',
    },
    {
      title: 'Portfolio',
      icon: 'folder-open-outline',
      route: '/profile',
    },
    {
      title: 'AI Assistant',
      icon: 'sparkles-outline',
    },
  ];

  return (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick actions</Text>

      <View style={styles.quickActionsGrid}>
        {actions.map((action) => (
          <Pressable
            key={action.title}
            style={styles.quickAction}
            onPress={() => {
              if (action.route) {
                router.push(action.route);
              }
            }}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons
                name={action.icon}
                size={21}
                color={COLORS.textPrimary}
              />
            </View>

            <Text style={styles.quickActionText}>
              {action.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ==========================================================================
   SECTION HEADER
   ========================================================================== */

function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {action && onPress ? (
        <Pressable onPress={onPress} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ==========================================================================
   OPPORTUNITY CARD
   ========================================================================== */

function OpportunityCard({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  return (
    <Pressable
      style={styles.opportunityCard}
      onPress={() => router.push('/opportunities')}
    >
      <View style={styles.opportunityHeader}>
        <View style={styles.companyLogo}>
          <Text style={styles.companyLogoText}>
            {opportunity.companyInitials}
          </Text>
        </View>

        <View style={styles.opportunityMain}>
          <Text
            style={styles.opportunityTitle}
            numberOfLines={2}
          >
            {opportunity.title}
          </Text>

          <Text style={styles.companyName}>
            {opportunity.company}
          </Text>

          <View style={styles.opportunityLocation}>
            <Ionicons
              name="location-outline"
              size={14}
              color={COLORS.textMuted}
            />

            <Text style={styles.locationText}>
              {opportunity.location}
            </Text>
          </View>
        </View>

        <View style={styles.matchBadge}>
          <Text style={styles.matchNumber}>
            {opportunity.match}%
          </Text>

          <Text style={styles.matchText}>MATCH</Text>
        </View>
      </View>

      <View style={styles.matchExplanation}>
        <Ionicons
          name="sparkles-outline"
          size={15}
          color={COLORS.textSecondary}
        />

        <Text style={styles.matchExplanationText}>
          Strong match based on your skills, programme and career interests.
        </Text>
      </View>

      <View style={styles.skillsContainer}>
        {opportunity.skills.map((skill) => (
          <View key={skill} style={styles.skillTag}>
            <Text style={styles.skillTagText}>{skill}</Text>
          </View>
        ))}
      </View>

      <View style={styles.opportunityDivider} />

      <View style={styles.opportunityFooter}>
        <View>
          <Text style={styles.opportunityType}>
            {opportunity.type}
          </Text>

          <Text style={styles.closingText}>
            Closes {opportunity.closingDate}
          </Text>
        </View>

        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View opportunity</Text>

          <Ionicons
            name="arrow-forward"
            size={15}
            color={COLORS.white}
          />
        </View>
      </View>
    </Pressable>
  );
}

/* ==========================================================================
   EVENTS
   ========================================================================== */

function EventsSection() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalContainer}
    >
      {upcomingEvents.map((event) => (
        <Pressable
          key={event.id}
          style={styles.eventCard}
        >
          <View style={styles.eventDateContainer}>
            <Text style={styles.eventMonth}>
              {event.month}
            </Text>

            <Text style={styles.eventDay}>{event.date}</Text>
          </View>

          <View style={styles.eventContent}>
            <Text style={styles.eventCategory}>
              {event.category}
            </Text>

            <Text
              style={styles.eventTitle}
              numberOfLines={2}
            >
              {event.title}
            </Text>

            <View style={styles.eventMeta}>
              <Ionicons
                name="time-outline"
                size={13}
                color={COLORS.textMuted}
              />

              <Text style={styles.eventMetaText}>
                {event.time}
              </Text>
            </View>

            <View style={styles.eventMeta}>
              <Ionicons
                name="location-outline"
                size={13}
                color={COLORS.textMuted}
              />

              <Text
                style={styles.eventMetaText}
                numberOfLines={1}
              >
                {event.location}
              </Text>
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/* ==========================================================================
   CONNECTION SUGGESTIONS
   ========================================================================== */

function SuggestedConnections() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalContainer}
    >
      {suggestedConnections.map((person) => (
        <View
          key={person.id}
          style={styles.connectionCard}
        >
          <View style={styles.connectionAvatar}>
            <Text style={styles.connectionAvatarText}>
              {person.initials}
            </Text>
          </View>

          <Text
            style={styles.connectionName}
            numberOfLines={1}
          >
            {person.name}
          </Text>

          <Text
            style={styles.connectionRole}
            numberOfLines={1}
          >
            {person.role}
          </Text>

          <Text style={styles.connectionProgramme}>
            {person.programme} · Alumni
          </Text>

          <Pressable
            style={styles.connectButton}
            onPress={() => {
              // Connection API will be implemented later.
            }}
          >
            <Ionicons
              name="person-add-outline"
              size={15}
              color={COLORS.textPrimary}
            />

            <Text style={styles.connectButtonText}>
              Connect
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

/* ==========================================================================
   CREATE POST
   ========================================================================== */

function CreatePostCard() {
  return (
    <Pressable
      style={styles.createPostCard}
      onPress={() => {
        // Post composer screen will be added later.
      }}
    >
      <View style={styles.currentUserAvatar}>
        <Text style={styles.currentUserInitials}>AT</Text>
      </View>

      <View style={styles.postInput}>
        <Text style={styles.postPlaceholder}>
          Share a professional update...
        </Text>
      </View>

      <View style={styles.postCreateIcon}>
        <Ionicons
          name="create-outline"
          size={19}
          color={COLORS.textPrimary}
        />
      </View>
    </Pressable>
  );
}

/* ==========================================================================
   FEED POST
   ========================================================================== */

function FeedPostCard({
  post,
  onLike,
}: {
  post: FeedPost;
  onLike: () => void;
}) {
  return (
    <View style={styles.postCard}>
      {/* Author */}

      <View style={styles.postHeader}>
        <View style={styles.postAvatar}>
          <Text style={styles.postAvatarText}>
            {post.initials}
          </Text>
        </View>

        <View style={styles.postAuthorContainer}>
          <Text style={styles.postAuthor}>
            {post.author}
          </Text>

          <Text style={styles.postHeadline}>
            {post.headline}
          </Text>

          <View style={styles.postTimeRow}>
            <Text style={styles.postTime}>
              {post.time}
            </Text>

            <Text style={styles.postVisibility}>
              ·
            </Text>

            <Ionicons
              name="globe-outline"
              size={12}
              color={COLORS.textMuted}
            />
          </View>
        </View>

        <Pressable
          style={styles.moreButton}
          hitSlop={8}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={COLORS.textMuted}
          />
        </Pressable>
      </View>

      {/* Content */}

      <Text style={styles.postContent}>
        {post.content}
      </Text>

      {/* Engagement */}

      <View style={styles.engagementSummary}>
        <View style={styles.likeSummary}>
          <View style={styles.likeIcon}>
            <Ionicons
              name="thumbs-up"
              size={10}
              color={COLORS.white}
            />
          </View>

          <Text style={styles.engagementText}>
            {post.likes}
          </Text>
        </View>

        <Text style={styles.engagementText}>
          {post.comments} comments · {post.shares} shares
        </Text>
      </View>

      <View style={styles.postDivider} />

      {/* Actions */}

      <View style={styles.postActions}>
        <Pressable
          style={styles.postAction}
          onPress={onLike}
        >
          <Ionicons
            name={
              post.liked
                ? 'thumbs-up'
                : 'thumbs-up-outline'
            }
            size={19}
            color={
              post.liked
                ? COLORS.textPrimary
                : COLORS.textSecondary
            }
          />

          <Text
            style={[
              styles.postActionText,
              post.liked && styles.postActionTextActive,
            ]}
          >
            Like
          </Text>
        </Pressable>

        <Pressable style={styles.postAction}>
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={COLORS.textSecondary}
          />

          <Text style={styles.postActionText}>
            Comment
          </Text>
        </Pressable>

        <Pressable style={styles.postAction}>
          <Ionicons
            name="share-social-outline"
            size={19}
            color={COLORS.textSecondary}
          />

          <Text style={styles.postActionText}>
            Share
          </Text>
        </Pressable>

        <Pressable style={styles.bookmarkButton}>
          <Ionicons
            name="bookmark-outline"
            size={19}
            color={COLORS.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

/* ==========================================================================
   DESIGN TOKENS
   ========================================================================== */

const COLORS = {
  background: '#F5F7F9',
  white: '#FFFFFF',

  textPrimary: '#17212B',
  textSecondary: '#5F6B76',
  textMuted: '#8A949E',

  border: '#E4E8EC',

  brand: '#243447',
  brandLight: '#EEF2F5',

  success: '#287A52',
  successLight: '#EAF6EF',

  warning: '#A66A00',
  warningLight: '#FFF5DF',
};

/* ==========================================================================
   STYLES
   ========================================================================== */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  listContent: {
    paddingTop: 0,
  },

  /* ------------------------------------------------------------------------
     Welcome
     ------------------------------------------------------------------------ */

  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
  },

  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 7,
  },

  welcomeTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 8,
  },

  welcomeDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    maxWidth: 390,
  },

  /* ------------------------------------------------------------------------
     Profile Strength
     ------------------------------------------------------------------------ */

  profileStrengthCard: {
    marginHorizontal: 20,
    marginBottom: 22,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  profileStrengthHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  profileStrengthIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  profileStrengthContent: {
    flex: 1,
  },

  profileStrengthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  profileStrengthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  profileStrengthPercentage: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  profileStrengthDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  progressTrack: {
    height: 7,
    borderRadius: 10,
    backgroundColor: '#E9EDF0',
    overflow: 'hidden',
    marginTop: 15,
  },

  progressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: COLORS.brand,
  },

  profileStrengthFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileSuggestion: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 6,
  },

  /* ------------------------------------------------------------------------
     Quick Actions
     ------------------------------------------------------------------------ */

  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  sectionSubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  quickActionsGrid: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 9,
  },

  quickAction: {
    flex: 1,
    minHeight: 90,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  quickActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  /* ------------------------------------------------------------------------
     Section Header
     ------------------------------------------------------------------------ */

  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionAction: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  /* ------------------------------------------------------------------------
     Opportunity
     ------------------------------------------------------------------------ */

  opportunityCard: {
    marginHorizontal: 20,
    marginBottom: 25,
    padding: 16,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  opportunityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  companyLogo: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  companyLogoText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },

  opportunityMain: {
    flex: 1,
    paddingRight: 8,
  },

  opportunityTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  companyName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  opportunityLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  locationText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginLeft: 3,
  },

  matchBadge: {
    minWidth: 54,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
  },

  matchNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.success,
  },

  matchText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: COLORS.success,
    marginTop: 1,
  },

  matchExplanation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F5F7F9',
  },

  matchExplanationText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginLeft: 7,
  },

  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 13,
  },

  skillTag: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.brandLight,
  },

  skillTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  opportunityDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  opportunityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  opportunityType: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  closingText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 3,
  },

  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brand,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  viewButtonText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.white,
    marginRight: 5,
  },

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */

  horizontalContainer: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    gap: 10,
  },

  eventCard: {
    width: 270,
    minHeight: 128,
    padding: 13,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
  },

  eventDateContainer: {
    width: 52,
    height: 59,
    borderRadius: 11,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  eventMonth: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  eventDay: {
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  eventContent: {
    flex: 1,
  },

  eventCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  eventTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 7,
  },

  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },

  eventMetaText: {
    flex: 1,
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 4,
  },

  /* ------------------------------------------------------------------------
     Connections
     ------------------------------------------------------------------------ */

  connectionCard: {
    width: 165,
    padding: 14,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },

  connectionAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  connectionAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  connectionName: {
    width: '100%',
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  connectionRole: {
    width: '100%',
    fontSize: 10.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 3,
  },

  connectionProgramme: {
    width: '100%',
    fontSize: 9.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 3,
  },

  connectButton: {
    marginTop: 11,
    minWidth: 108,
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  connectButtonText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 5,
  },

  /* ------------------------------------------------------------------------
     Feed Heading
     ------------------------------------------------------------------------ */

  feedHeading: {
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ------------------------------------------------------------------------
     Create Post
     ------------------------------------------------------------------------ */

  createPostCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  currentUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },

  currentUserInitials: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },

  postInput: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 11,
  },

  postPlaceholder: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  postCreateIcon: {
    width: 35,
    height: 35,
    borderRadius: 9,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ------------------------------------------------------------------------
     Feed Post
     ------------------------------------------------------------------------ */

  postCard: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
  },

  postAvatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  postAvatarText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  postAuthorContainer: {
    flex: 1,
  },

  postAuthor: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  postHeadline: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  postTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },

  postTime: {
    fontSize: 9.5,
    color: COLORS.textMuted,
  },

  postVisibility: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginHorizontal: 4,
  },

  moreButton: {
    padding: 2,
  },

  postContent: {
    paddingHorizontal: 15,
    paddingBottom: 14,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },

  engagementSummary: {
    paddingHorizontal: 15,
    paddingBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  likeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  likeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },

  engagementText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  postDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  postActions: {
    minHeight: 48,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },

  postAction: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  postActionText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  postActionTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },

  bookmarkButton: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ------------------------------------------------------------------------
     Bottom
     ------------------------------------------------------------------------ */

  bottomSpacing: {
    height: 30,
  },
});
