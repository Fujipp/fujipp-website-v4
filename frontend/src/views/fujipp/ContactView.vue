<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { AppFooter } from "@/components";

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
        avatar_decoration_data?: {
            asset: string;
        } | null;
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
const CONTACT_ICON_PATH = "/images/icons/assets/contacts";

const contactCards: ContactCard[] = [
    {
        id: "gmail",
        platform: "Gmail",
        handle: "anawat.grudtoop@gmail.com",
        image: "/images/users/fujipp/anawat_grudtoop.png",
        icon: `${CONTACT_ICON_PATH}/bxl_gmail.svg`,
        href: "mailto:anawat.grudtoop@gmail.com",
        action: "Send Email",
    },
    {
        id: "instagram",
        platform: "Instagram",
        handle: "@f.janw",
        image: "/images/users/fujipp/profile-fujipp.png",
        icon: `${CONTACT_ICON_PATH}/ri_instagram-fill.svg`,
        href: "https://www.instagram.com/f.janw/",
        action: "View Profile",
    },
    {
        id: "discord",
        platform: "Discord",
        handle: "fujipp.",
        image: DISCORD_FALLBACK_AVATAR,
        icon: `${CONTACT_ICON_PATH}/ic_baseline-discord.svg`,
        href: `https://discord.com/users/${DISCORD_USER_ID}`,
        action: "View Profile",
    },
];

const openCardId = ref<ContactId | null>(null);
const lanyardData = ref<LanyardData | null>(null);
const discordAvatarFailed = ref(false);
let lanyardSocket: WebSocket | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let isUnmounted = false;

const discordAvatar = computed(() => {
    const avatar = lanyardData.value?.discord_user.avatar;
    if (!avatar || discordAvatarFailed.value) {
        return DISCORD_FALLBACK_AVATAR;
    }

    const extension = avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${DISCORD_USER_ID}/${avatar}.${extension}?size=512`;
});

const discordDecoration = computed(() => {
    const asset = lanyardData.value?.discord_user.avatar_decoration_data?.asset;
    return asset
        ? `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=512&passthrough=true`
        : "";
});

const discordHandle = computed(() => {
    const username = lanyardData.value?.discord_user.username;
    return username ? `@${username}` : "@fujipp.";
});

const discordStatus = computed(() => lanyardData.value?.discord_status ?? "offline");

function toggleCard(cardId: ContactId): void {
    openCardId.value = openCardId.value === cardId ? null : cardId;
}

function cardImage(card: ContactCard): string {
    return card.id === "discord" ? discordAvatar.value : card.image;
}

function cardHandle(card: ContactCard): string {
    return card.id === "discord" ? discordHandle.value : card.handle;
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
    <main :class="$style.contact" class="pt-22">
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
                            <img
                                :class="$style.platformIcon"
                                :src="card.icon"
                                :alt="`${card.platform} icon`"
                            >
                        </template>
                        <template v-else>
                            <span :class="$style.photoWrap">
                                <img
                                    :class="[$style.profilePhoto, card.id === 'discord' && $style.discordProfilePhoto]"
                                    :src="cardImage(card)"
                                    :alt="`${card.platform} profile`"
                                    @error="card.id === 'discord' && (discordAvatarFailed = true)"
                                >
                                <img
                                    v-if="card.id === 'discord' && discordDecoration"
                                    :class="$style.discordDecoration"
                                    :src="discordDecoration"
                                    alt=""
                                    aria-hidden="true"
                                >
                                <span
                                    v-if="card.id === 'discord'"
                                    :class="[$style.discordBadge, $style[discordStatus]]"
                                    aria-hidden="true"
                                />
                            </span>
                            <span :class="$style.cardDetails">
                                <span :class="$style.platformName">{{ card.platform }}</span>
                                <span :class="$style.accountName">{{ cardHandle(card) }}</span>
                            </span>
                        </template>
                    </button>
                    <a
                        v-if="openCardId === card.id"
                        :class="$style.contactAction"
                        :href="card.href"
                        :target="card.id === 'gmail' ? undefined : '_blank'"
                        :rel="card.id === 'gmail' ? undefined : 'noreferrer'"
                    >
                        <img
                            :src="card.id === 'gmail'
                                ? `${CONTACT_ICON_PATH}/streamline-sharp_mail-send-email-message-solid.svg`
                                : `${CONTACT_ICON_PATH}/pepicons-pencil_open.svg`"
                            alt=""
                        >
                        <span>{{ card.action }}</span>
                    </a>
                </article>
            </div>
        </section>
        <AppFooter />
    </main>
</template>

<style module>
.contact {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    gap: var(--spacing-space-16);
}

.contactSection {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: min(100%, 1261px);
    margin: 0 auto;
    padding-inline: var(--spacing-space-16);
    gap: var(--spacing-space-6);
}

.contact :global(footer) {
    margin-top: auto;
}

.mobileHeader {
    display: none;
}

.cardList {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
}

.contactCard {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: 300px;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background: var(--gradient-card-highlight);
    transition: background 700ms ease, transform 700ms ease;
}

.contactCard.open {
    background: var(--color-main-surface);
}

.cardToggle {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 10px;
    gap: 20px;
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
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
    transition: transform 240ms ease;
}

.photoWrap {
    position: relative;
    flex-shrink: 0;
    width: 242px;
    height: 242px;
}

.contactCard.open .photoWrap {
    animation: card-photo-in 270ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.profilePhoto {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: var(--radius-xl);
    object-fit: cover;
}

.discordProfilePhoto {
    border-radius: var(--radius-full);
}

.discordDecoration {
    position: absolute;
    inset: -8px;
    width: calc(100% + 16px);
    height: calc(100% + 16px);
    object-fit: contain;
    pointer-events: none;
}

.discordBadge {
    position: absolute;
    right: 6px;
    bottom: 16px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 4px solid var(--color-main-surface);
    border-radius: 50%;
}

.discordBadge.online {
    background-color: #40a258;
    animation: status-online-pulse 2.4s ease-out infinite;
}

.discordBadge.idle {
    background-color: #f0b232;
}

.discordBadge.dnd {
    background-color: #d83c3e;
}

.discordBadge.offline {
    background-color: #80848e;
}

.cardDetails {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 0;
    line-height: normal;
}

.contactCard.open .cardDetails {
    animation: card-details-in 300ms 45ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.platformName {
    font-size: 24px;
    font-weight: 600;
}

.accountName {
    max-width: 100%;
    overflow: hidden;
    font-size: 24px;
    font-weight: 300;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.contactAction {
    position: absolute;
    top: 50%;
    right: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 154px;
    height: 48px;
    gap: var(--spacing-space-2);
    transform: translateY(-50%);
    border-radius: var(--radius-xl);
    background-color: var(--color-button-secondary-btn-bg);
    color: var(--color-button-secondary-btn-text);
    font-size: 16px;
    font-weight: 300;
    text-decoration: none;
    animation: card-action-in 300ms 90ms cubic-bezier(0.22, 1, 0.36, 1) both;
    transition: background-color 180ms ease, transform 180ms ease;
}

.contactAction img {
    width: 16px;
    height: 16px;
    transition: transform 180ms ease;
}

.contactAction span {
    display: inline;
}

.contactCard.open .cardToggle {
    justify-content: flex-start;
    padding: 24px 202px 24px 24px;
}

@media (hover: hover) and (pointer: fine) {
    .contactCard:not(.open):hover {
        transform: translateY(-4px);
    }

    .contactCard:not(.open):hover .platformIcon {
        transform: scale(1.1);
    }

    .contactAction:hover {
        background-color: var(--color-button-secondary-btn-hover);
        transform: translateY(-50%) scale(1.02);
    }

    .contactAction:hover img {
        transform: translateX(2px);
    }
}

@media (max-width: 767px) {
    .contact {
        gap: var(--spacing-space-8);
    }

    .contactSection {
        padding-inline: var(--spacing-space-4);
    }

    .mobileHeader {
        display: block;
    }

    .contactCard {
        height: 156px;
    }

    .contactCard.open .cardToggle {
        justify-content: flex-start;
        padding: 10px 10px;
        gap: 10px;
    }

    .photoWrap {
        width: 118px;
        height: 118px;
    }

    .discordDecoration {
        inset: -4px;
        width: calc(100% + 8px);
        height: calc(100% + 8px);
    }

    .discordBadge {
        right: 0;
        bottom: 7px;
        width: 26px;
        height: 26px;
        border-width: 3px;
    }

    .platformName {
        font-size: 20px;
    }

    .accountName {
        font-size: clamp(14px, 5.35vw, 22px);
    }

    .contactAction {
        top: auto;
        right: 10px;
        bottom: 10px;
        width: 112px;
        height: 34px;
        gap: 6px;
        transform: none;
        font-size: 13px;
    }

    .contactAction img {
        width: 13px;
        height: 13px;
    }

    .contactCard.open .cardDetails {
        align-items: center;
        align-self: stretch;
        justify-content: center;
        padding-bottom: 34px;
    }

    .contactAction:hover {
        transform: none;
    }
}

@media (min-width: 768px) and (max-width: 1023px) {
    .contact {
        box-sizing: border-box;
        height: 100dvh;
        min-height: 100dvh;
        overflow: hidden;
        gap: var(--spacing-space-4);
    }

    .contactSection {
        flex: 1 1 auto;
        min-height: 0;
        gap: 0;
    }

    .contact :global(footer) {
        flex-shrink: 0;
    }

    .cardList {
        height: 100%;
        min-height: 0;
        gap: var(--spacing-space-3);
    }

    .contactCard {
        flex: 1 1 0;
        height: auto;
        min-height: 104px;
    }

    .contactCard.open .cardToggle {
        padding: 10px 184px 10px 10px;
        gap: 10px;
    }

    .photoWrap {
        width: auto;
        height: min(242px, calc(100% - 20px));
        aspect-ratio: 1;
    }

    .contactAction {
        right: 16px;
    }
}

@media (min-width: 1024px) {
    .cardList {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--spacing-space-4);
    }

    .contactCard {
        height: clamp(520px, calc(100dvh - 360px), 600px);
    }

    .contactCard.open .cardToggle {
        flex-direction: column;
        justify-content: flex-start;
        padding: 24px 24px 82px;
        gap: 10px;
    }

    .photoWrap {
        width: min(clamp(293px, 29dvh, 350px), 100%);
        height: min(clamp(293px, 29dvh, 350px), 100%);
    }

    .cardDetails {
        flex: 0 0 auto;
    }

    .contactAction {
        top: auto;
        right: 50%;
        bottom: 24px;
        width: 160px;
        height: 48px;
        gap: var(--spacing-space-2);
        transform: translateX(50%);
        background-color: var(--color-button-secondary-btn-bg);
        color: var(--color-button-secondary-btn-text);
        font-size: 16px;
        font-weight: 300;
    }

    .contactAction img {
        width: 16px;
        height: 16px;
    }

    .contactAction:hover {
        transform: translateX(50%) scale(1.02);
    }
}

@keyframes card-photo-in {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes card-details-in {
    from {
        opacity: 0;
        transform: translateY(8px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes card-action-in {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes status-online-pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(64, 162, 88, 0.55);
    }

    72%,
    100% {
        box-shadow: 0 0 0 10px rgba(64, 162, 88, 0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .contactCard,
    .platformIcon,
    .contactAction,
    .contactAction img {
        transition: none;
    }

    .contactCard.open .photoWrap,
    .contactCard.open .cardDetails,
    .contactAction,
    .discordBadge.online {
        animation: none;
    }
}
</style>
