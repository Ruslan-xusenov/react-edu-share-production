import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  useWindowDimensions,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import RenderHTML from 'react-native-render-html';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/utils/theme';
import apiClient from '../../src/api/client';

const ArticleDetailScreen = () => {
    const { slug } = useLocalSearchParams();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const { width } = useWindowDimensions();

    useEffect(() => {
        fetchArticle();
    }, [slug]);

    const fetchArticle = async () => {
        try {
            const res = await apiClient.get(`/community/articles/${slug}/`);
            setArticle(res.data);
            // Increment views
            apiClient.get(`/community/articles/${slug}/increment_views/`).catch(() => {});
        } catch (err) {
            console.error('Error fetching article detail:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!article) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Maqola topilmadi.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen options={{ title: 'Maqola', headerShown: true }} />
            
            <Image 
                source={{ uri: article.thumbnail_url || 'https://via.placeholder.com/600x300' }} 
                style={styles.thumbnail} 
            />
            
            <View style={styles.content}>
                <Text style={styles.title}>{article.title}</Text>
                
                <View style={styles.authorSection}>
                    <Image 
                        source={{ uri: article.author_info?.avatar_url || 'https://via.placeholder.com/50' }} 
                        style={styles.avatar} 
                    />
                    <View>
                        <Text style={styles.authorName}>{article.author_info?.full_name}</Text>
                        <Text style={styles.date}>{new Date(article.created_at).toLocaleDateString()}</Text>
                    </View>
                </View>

                <View style={styles.body}>
                    <RenderHTML
                        contentWidth={width - SPACING.lg * 2}
                        source={{ html: article.content }}
                        baseStyle={styles.htmlBase}
                        tagsStyles={{
                            p: { marginBottom: 15, color: COLORS.textSecondary },
                            h2: { marginTop: 20, marginBottom: 10, color: COLORS.text },
                        }}
                    />
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    thumbnail: {
        width: '100%',
        height: 250,
    },
    content: {
        padding: SPACING.lg,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.md,
        lineHeight: 32,
    },
    authorSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        marginBottom: SPACING.lg,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: SPACING.md,
    },
    authorName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    date: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    body: {
        marginTop: SPACING.md,
    },
    htmlBase: {
        fontSize: 16,
        lineHeight: 26,
        color: COLORS.textSecondary,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
    },
    errorText: {
        color: COLORS.textMuted,
    }
});

export default ArticleDetailScreen;
