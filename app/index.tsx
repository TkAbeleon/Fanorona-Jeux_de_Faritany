import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const T = Colors.theme;

const GAMES = [
  {
    id: "fanorona",
    route: "/fanorona",
    title: "Fanorona Sivy",
    subtitle: "Jeu Traditionnel Malgache",
    description: "Capturez toutes les pièces adverses par approche ou retrait. IA intégrée avec Minimax + réseau de neurones.",
    icon: "chess-queen" as const,
    iconSet: "MaterialCommunity" as const,
    players: "1–2 joueurs",
    difficulty: "Stratégique",
    accentColor: T.green,
    accentLight: T.greenPale,
    tag: "IA Disponible",
  },
  {
    id: "jeu-des-points",
    route: "/points",
    title: "Le Jeu des Points",
    subtitle: "Stratégie · Territoire",
    description: "Encerclez les points adverses pour les capturer. Chaque point encerclé rapporte 1 point.",
    icon: "circle-multiple" as const,
    iconSet: "MaterialCommunity" as const,
    players: "2 joueurs",
    difficulty: "Territorial",
    accentColor: T.orange,
    accentLight: "#FFF3E0",
    tag: "2 Joueurs",
  },
];

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons name="leaf" size={14} color={T.greenAccent} />
            <Text style={styles.headerBadgeText}>Collection</Text>
          </View>
          <Text style={styles.headerTitle}>Lalaothèque</Text>
          <Text style={styles.headerSub}>Jeux de stratégie · Madagascar</Text>
        </View>

        {/* Game Cards */}
        <View style={styles.cardsContainer}>
          {GAMES.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(game.route as any)}
            >
              {/* Card Header */}
              <View style={[styles.cardHeader, { backgroundColor: game.accentColor }]}>
                <View style={styles.cardHeaderContent}>
                  <View style={styles.cardHeaderIcon}>
                    <MaterialCommunityIcons
                      name={game.icon}
                      size={32}
                      color={T.white}
                    />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>{game.title}</Text>
                    <Text style={styles.cardSubtitle}>{game.subtitle}</Text>
                  </View>
                </View>
                <View style={styles.cardTag}>
                  <Text style={styles.cardTagText}>{game.tag}</Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={[styles.cardBody, { backgroundColor: T.card }]}>
                <Text style={styles.cardDesc}>{game.description}</Text>

                <View style={styles.cardMeta}>
                  <View style={styles.cardMetaItem}>
                    <Ionicons name="people-outline" size={14} color={T.gray} />
                    <Text style={styles.cardMetaText}>{game.players}</Text>
                  </View>
                  <View style={styles.cardMetaSep} />
                  <View style={styles.cardMetaItem}>
                    <Ionicons name="flash-outline" size={14} color={T.gray} />
                    <Text style={styles.cardMetaText}>{game.difficulty}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.playBtn, { backgroundColor: game.accentColor }]}
                  onPress={() => router.push(game.route as any)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="play" size={16} color={T.white} />
                  <Text style={styles.playBtnText}>Jouer</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <MaterialCommunityIcons name="leaf" size={16} color={T.greenPale} />
          <Text style={styles.footerText}>Jeux traditionnels · Stratégie pure</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,200,83,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.greenAccent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: T.green,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 13,
    color: T.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: T.shadowDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    padding: 20,
    paddingBottom: 18,
  },
  cardHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  cardHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: T.white,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  cardTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: T.white,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cardBody: {
    padding: 18,
  },
  cardDesc: {
    fontSize: 14,
    color: T.textMuted,
    lineHeight: 21,
    marginBottom: 16,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  cardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardMetaText: {
    fontSize: 12,
    color: T.gray,
    fontWeight: "600",
  },
  cardMetaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: T.greenPale,
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  playBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: T.white,
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: T.greenPale,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
