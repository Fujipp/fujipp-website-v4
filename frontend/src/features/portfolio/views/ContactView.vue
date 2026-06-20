<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { AppFooter } from "@/shared/layout";
import { SecondaryButton } from "@/shared/ui/buttons";

type ContactId = "gmail" | "instagram" | "discord";
type DiscordStatus = "online" | "idle" | "dnd" | "offline";

interface ContactCard {
    id: ContactId;
    platform: string;
    handle: string;
    image: string;
    icon: string;
    href: string;
    action: string;
}

interface LanyardData {
    discord_user: {
        username: string;
        avatar: string | null;
    };
    discord_status: DiscordStatus;
}

interface LanyardSocketMessage {
    op: number;
    t?: "INIT_STATE" | "PRESENCE_UPDATE";
    d: LanyardData | {
        heartbeat_interval: number;
    };
}

const DISCORD_USER_ID = "1108816021915176962";
const DISCORD_FALLBACK_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";
const CONTACT_ICON_PATH = "/images/icons/contacts";
const openCardId = ref<ContactId | null>(null);
const lanyardData = ref<LanyardData | null>(null);
const discordAvatarFailed = ref(false);
let lanyardSocket: WebSocket | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let isUnmounted = false;

const contactCards: ContactCard[] = [
    {
        id: "gmail",
        platform: "Gmail",
        handle: "anawat.grudtoop@gmail.com",
        image: "/images/users/fujipp/anawat-grudtoop.png",
        icon: `${CONTACT_ICON_PATH}/gmail.svg`,
        href: "mailto:anawat.grudtoop@gmail.com",
        action: "Send Email",
    },
    {
        id: "instagram",
        platform: "Instagram",
        handle: "@f.janw",
        image: "/images/users/fujipp/profile-fujipp.png",
        icon: `${CONTACT_ICON_PATH}/instagram.svg`,
        href: "https://www.instagram.com/f.janw/",
        action: "View Profile",
    },
    {
        id: "discord",
        platform: "Discord",
        handle: "fujipp.",
        image: DISCORD_FALLBACK_AVATAR,
        icon: `${CONTACT_ICON_PATH}/discord.svg`,
        href: `https://discord.com/users/${DISCORD_USER_ID}`,
        action: "View Profile",
    },
];

const discordAvatar = computed(() => {
    const avatar = lanyardData.value?.discord_user.avatar;
    if (!avatar || discordAvatarFailed.value) {
        return DISCORD_FALLBACK_AVATAR;
    }

    const extension = avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${DISCORD_USER_ID}/${avatar}.${extension}?size=512`;
});

const discordHandle = computed(() => {
    const username = lanyardData.value?.discord_user.username;
    return username ? `@${username}` : "@fujipp.";
});

const discordStatus = computed<DiscordStatus>(() => lanyardData.value?.discord_status ?? "offline");

const statusLabels: Record<DiscordStatus, string> = {
    online: "Online",
    idle: "Away",
    dnd: "Busy",
    offline: "Offline",
};

function toggleCard(cardId: ContactId): void {
    openCardId.value = openCardId.value === cardId ? null : cardId;
}

function cardImage(card: ContactCard): string {
    return card.id === "discord" ? discordAvatar.value : card.image;
}

function cardHandle(card: ContactCard): string {
    return card.id === "discord" ? discordHandle.value : card.handle;
}

function cardStatus(card: ContactCard): DiscordStatus {
    return card.id === "discord" ? discordStatus.value : "online";
}

function clearHeartbeat(): void {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
    }
}

function connectDiscordPresence(): void {
    lanyardSocket = new WebSocket("wss://api.lanyard.rest/socket");

    lanyardSocket.addEventListener("message", (event: MessageEvent<string>) => {
        const payload = JSON.parse(event.data) as LanyardSocketMessage;

        if (payload.op === 1 && "heartbeat_interval" in payload.d) {
            lanyardSocket?.send(JSON.stringify({
                op: 2,
                d: { subscribe_to_id: DISCORD_USER_ID },
            }));
            clearHeartbeat();
            heartbeatTimer = setInterval(() => {
                if (lanyardSocket?.readyState === WebSocket.OPEN) {
                    lanyardSocket.send(JSON.stringify({ op: 3 }));
                }
            }, payload.d.heartbeat_interval);
            return;
        }

        if (payload.op === 0 && (payload.t === "INIT_STATE" || payload.t === "PRESENCE_UPDATE")) {
            lanyardData.value = payload.d as LanyardData;
            discordAvatarFailed.value = false;
        }
    });

    lanyardSocket.addEventListener("close", () => {
        clearHeartbeat();
        if (!isUnmounted) {
            reconnectTimer = setTimeout(connectDiscordPresence, 3000);
        }
    });
}

onMounted(() => {
    connectDiscordPresence();
});

onUnmounted(() => {
    isUnmounted = true;
    clearHeartbeat();
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
    }
    lanyardSocket?.close();
});
</script>

<template>
    <main :class="$style.contact">
        <section :class="$style.contactSection" aria-label="Contact">
            <div :class="$style.cardList">
                <article
                    v-for="card in contactCards"
                    :key="card.id"
                    :class="[$style.contactCard, openCardId === card.id && $style.open]"
                >
                    <button
                        type="button"
                        :class="$style.cardToggle"
                        :aria-expanded="openCardId === card.id"
                        :aria-label="`${openCardId === card.id ? 'Close' : 'Open'} ${card.platform} contact card`"
                        @click="toggleCard(card.id)"
                    >
                        <template v-if="openCardId !== card.id">
                            <img :class="$style.platformIcon" :src="card.icon" :alt="`${card.platform} icon`">
                        </template>
                        <template v-else>
                            <span :class="$style.previewImage">
                                <img
                                    :src="cardImage(card)"
                                    :alt="`${card.platform} profile`"
                                    @error="card.id === 'discord' && (discordAvatarFailed = true)"
                                >
                            </span>
                            <span :class="$style.cardContent">
                                <span :class="$style.cardHeader">
                                    <span :class="$style.platformName">{{ card.platform }}</span>
                                    <span :class="$style.statusPill">
                                        <span :class="[$style.statusDot, $style[cardStatus(card)]]" aria-hidden="true" />
                                        <span>{{ statusLabels[cardStatus(card)] }}</span>
                                    </span>
                                </span>
                                <span :class="$style.accountName">{{ cardHandle(card) }}</span>
                            </span>
                        </template>
                    </button>

                    <SecondaryButton
                        v-if="openCardId === card.id"
                        :class="$style.contactAction"
                        :href="card.href"
                        :target="card.id === 'gmail' ? undefined : '_blank'"
                        :rel="card.id === 'gmail' ? undefined : 'noreferrer'"
                    >
                        <img
                            :class="$style.contactActionIcon"
                            :src="card.id === 'gmail'
                                ? `${CONTACT_ICON_PATH}/mail-send.svg`
                                : `${CONTACT_ICON_PATH}/mail-open.svg`"
                            alt=""
                            aria-hidden="true"
                        >
                        <span>{{ card.action }}</span>
                    </SecondaryButton>
                </article>
            </div>
        </section>

        <AppFooter />
    </main>
</template>

<style module>
.contact {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    padding-top: var(--spacing-space-16);
}

.contactSection {
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    width: 100%;
    padding: var(--spacing-space-5);
}

.cardList {
    display: flex;
    width: 100%;
    max-width: var(--container-7xl);
    align-items: center;
    justify-content: center;
    gap: 38px;
}

.contactCard {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 380px;
    height: 450px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 10px;
    border: 2px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-surface);
    transition: border-color 180ms ease, transform 180ms ease;
}

.contactCard.open {
    align-items: center;
    justify-content: space-between;
}

.contactCard.open .cardToggle {
    height: auto;
    flex: 0 1 auto;
    justify-content: flex-start;
    gap: 10px;
}

.cardToggle {
    display: flex;
    width: 100%;
    height: 100%;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    cursor: pointer;
}

.cardToggle:focus-visible,
.contactAction:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: -4px;
}

.platformIcon {
    display: block;
    width: 84px;
    height: 84px;
    object-fit: contain;
    transition: transform 180ms ease;
}

.previewImage {
    display: block;
    width: 100%;
    height: 242px;
    overflow: hidden;
    border-radius: var(--radius-xl);
}

.previewImage img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.cardContent {
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: var(--spacing-space-2);
    color: var(--color-text-secondary);
}

.cardHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
}

.platformName {
    overflow: hidden;
    font-size: 1.5rem;
    font-weight: 600;
    line-height: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.statusPill {
    display: inline-flex;
    height: 36px;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 10px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-full);
    background: var(--color-main-surface);
    font-size: 1.25rem;
    font-weight: 400;
    line-height: normal;
    white-space: nowrap;
}

.statusDot {
    width: 15px;
    height: 15px;
    border-radius: var(--radius-full);
}

.statusDot.online {
    background: var(--color-status-success);
}

.statusDot.idle {
    background: var(--color-status-warning);
}

.statusDot.dnd {
    background: var(--color-status-error);
}

.statusDot.offline {
    background: var(--color-neutral-500);
}

.accountName {
    overflow: hidden;
    width: 100%;
    font-size: 1.25rem;
    font-weight: 400;
    line-height: normal;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.contactAction {
    gap: var(--spacing-space-2);
}

.contactActionIcon {
    width: var(--spacing-icon-xs);
    height: var(--spacing-icon-xs);
    object-fit: contain;
}

.contact :global(footer) {
    margin-top: auto;
}

@media (hover: hover) and (pointer: fine) {
    .contactCard:hover {
        border-color: var(--color-main-primary);
        transform: translateY(-4px);
    }

    .contactCard:hover .platformIcon {
        transform: scale(1.08);
    }

}

@media (max-width: 767px) {
    .contact {
        padding-top: var(--spacing-space-16);
    }

    .contactSection {
        min-height: 542px;
        align-items: center;
        padding: var(--spacing-space-5);
    }

    .cardList {
        flex-direction: column;
        gap: var(--spacing-space-5);
    }

    .contactCard {
        width: min(100%, 350px);
        height: 104px;
    }

    .contactCard.open {
        height: 450px;
    }
}

@media (min-width: 768px) and (max-width: 1023px) {
    .contactSection {
        padding: var(--spacing-space-5);
    }

    .cardList {
        flex-wrap: wrap;
        gap: 10px;
    }
}

@media (min-width: 1024px) {
    .contact {
        min-height: 100dvh;
    }

    .contactSection {
        flex: 1 0 auto;
        align-items: center;
    }
}

@media (prefers-reduced-motion: reduce) {
    .contactCard,
    .platformIcon,
    .contactAction {
        transition: none;
    }
}
</style>
