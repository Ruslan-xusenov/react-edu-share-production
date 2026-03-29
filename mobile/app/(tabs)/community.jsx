import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../src/utils/theme';
import apiClient, { API_ENDPOINTS } from '../../src/api/client';

const CommunityScreen = () => {
    const [activeTab, setActiveTab] = useState('books');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const tabs = [
        { id: 'books', label: 'Kitoblar', icon: 'book' },
        { id: 'news', label: 'Yangiliklar', icon: 'newspaper' },
        { id: 'events', label: 'Tadbirlar', icon: 'calendar' },
    ];

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let endpoint = '';
            if (activeTab === 'books') endpoint = '/community/book-reviews/';
            else if (activeTab === 'news') endpoint = '/community/articles/';
            else endpoint = '/community/announcements/';

            const res = await apiClient.get(endpoint);
            setData(res.data.results || res.data);
        } catch (err) {
            console.error('Error fetching community data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const renderItem = ({ item }) => {
        if (activeTab === 'books') {
            return (
                <View style={[styles.card, SHADOWS.medium]}>
                    <View style={styles.cardHeader}>
                        <Image 
                            source={{ uri: item.cover_image_url || 'https://via.placeholder.com/150' }} 
                            style={styles.bookCover} 
                        />
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle}>{item.book_title}</Text>
                            <Text style={styles.cardSubtitle}>{item.book_author}</Text>
                            <View style={styles.ratingRow}>
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Ionicons 
                                        key={s} 
                                        name={s <= item.rating ? "star" : "star-outline"} 
                                        size={14} 
                                        color={COLORS.primary} 
                                    />
                                ))}
                            </View>
                        </View>
                    </View>
                    <Text style={styles.cardExcerpt} numberOfLines={3}>{item.review_content}</Text>
                    <View style={styles.cardFooter}>
                        <Image 
                            source={{ uri: item.author?.avatar_url || 'https://via.placeholder.com/50' }} 
                            style={styles.avatar} 
                        />
                        <Text style={styles.footerText}>{item.author?.full_name}</Text>
                    </View>
                </View>
            );
        }

        if (activeTab === 'news') {
            return (
                <TouchableOpacity style={[styles.card, SHADOWS.medium]}>
                    <Image 
                        source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/300x150' }} 
                        style={styles.newsImage} 
                    />
                    <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <View style={styles.metaRow}>
                            <Ionicons name="eye-outline" size={14} color={COLORS.textMuted} />
                            <Text style={styles.metaText}>{item.views} ko'rilgan</Text>
                            <Text style={styles.metaText}> • </Text>
                            <Text style={styles.metaText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <View style={[styles.card, SHADOWS.medium]}>
                <Image 
                    source={{ uri: item.image_url || 'https://via.placeholder.com/300x150' }} 
                    style={styles.newsImage} 
                />
                <View style={styles.cardBody}>
                    <View style={styles.eventBadge}>
                        <Ionicons name="location" size={12} color={COLORS.primary} />
                        <Text style={styles.badgeText}>{item.location}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardExcerpt} numberOfLines={2}>{item.description}</Text>
                    <TouchableOpacity style={styles.joinBtn}>
                        <Text style={styles.joinBtnText}>Batafsil</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Jamiyat</Text>
                <Text style={styles.headerSubtitle}>EduShare hamjamiyatiga xush kelibsiz</Text>
            </View>

            <View style={styles.tabContainer}>
                {tabs.map(tab => (
                    <TouchableOpacity 
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <Ionicons 
                            name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`} 
                            size={20} 
                            color={activeTab === tab.id ? COLORS.primary : COLORS.textMuted} 
                        />
                        <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={styles.emptyText}>Hozircha hech narsa yo'q</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: SPACING.lg,
        paddingTop: SPACING.xl * 2,
        backgroundColor: COLORS.surface,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 8,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: COLORS.primary + '10',
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    activeTabLabel: {
        color: COLORS.primary,
    },
    listContent: {
        padding: SPACING.md,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginBottom: SPACING.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        padding: SPACING.md,
    },
    bookCover: {
        width: 80,
        height: 110,
        borderRadius: 4,
        backgroundColor: COLORS.border,
    },
    cardInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    cardSubtitle: {
        fontSize: 13,
        color: COLORS.primary,
        marginTop: 4,
        fontWeight: '600',
    },
    ratingRow: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 2,
    },
    cardExcerpt: {
        padding: SPACING.md,
        paddingTop: 0,
        fontSize: 14,
        lineHeight: 20,
        color: COLORS.textSecondary,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    footerText: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginLeft: SPACING.sm,
    },
    newsImage: {
        width: '100%',
        height: 180,
    },
    cardBody: {
        padding: SPACING.md,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    metaText: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginLeft: 4,
    },
    eventBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 8,
        gap: 4,
    },
    badgeText: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '700',
    },
    joinBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: SPACING.sm,
    },
    joinBtnText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 50,
    },
    emptyText: {
        color: COLORS.textMuted,
    }
});

export default CommunityScreen;
