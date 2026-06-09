<script setup lang="ts">
import { computed } from "vue";

export interface EmbedField {
    name?: string;
    value?: string;
    inline?: boolean;
}
export interface EmbedObject {
    color?: number;
    title?: string;
    description?: string;
    url?: string;
    image?: { url?: string };
    thumbnail?: { url?: string };
    footer?: { text?: string; icon_url?: string };
    author?: { name?: string; icon_url?: string };
    fields?: EmbedField[];
}

const props = defineProps<{ embed: EmbedObject }>();

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Render a subset of Discord markdown to safe HTML. Input is escaped first, so only
// the controlled tags we add below are ever emitted (no raw user HTML).
function renderText(raw: string | undefined): string {
    let s = escapeHtml(raw ?? "");
    s = s.replace(/```([\s\S]*?)```/g, (_m, c) => `<code class="block">${c}</code>`);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    // custom emoji <a:name:id> / <:name:id>  (angle brackets are now &lt; &gt;)
    s = s.replace(/&lt;(a)?:(\w+):(\d+)&gt;/g, (_m, anim, name, id) =>
        `<img class="emoji" src="https://cdn.discordapp.com/emojis/${id}.${anim ? "gif" : "png"}" alt=":${name}:" />`);
    s = s.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention">@role</span>');
    s = s.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@user</span>');
    s = s.replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#channel</span>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    s = s.replace(/__([^_]+)__/g, "<u>$1</u>");
    s = s.replace(/\*([^*]+)\*/g, "<i>$1</i>");
    s = s.replace(/~~([^~]+)~~/g, "<s>$1</s>");
    s = s.replace(/^&gt; ?(.*)$/gm, '<span class="quote">$1</span>');
    s = s.replace(/\n/g, "<br/>");
    return s;
}

function safeUrl(u: string | undefined): string {
    return u && /^https?:\/\//i.test(u) ? u : "";
}

const barColor = computed(() => {
    const c = props.embed.color;
    return typeof c === "number" ? `#${(c & 0xffffff).toString(16).padStart(6, "0")}` : "#4f545c";
});
const titleHtml = computed(() => renderText(props.embed.title));
const descHtml = computed(() => renderText(props.embed.description));
const fields = computed(() => (props.embed.fields ?? []).filter((f) => f.name || f.value));
const image = computed(() => safeUrl(props.embed.image?.url));
const thumbnail = computed(() => safeUrl(props.embed.thumbnail?.url));
const authorIcon = computed(() => safeUrl(props.embed.author?.icon_url));
const footerIcon = computed(() => safeUrl(props.embed.footer?.icon_url));
</script>

<template>
    <div :class="$style.wrap">
        <div :class="$style.embed" :style="{ borderColor: barColor }">
            <div :class="$style.body">
                <div v-if="embed.author?.name" :class="$style.author">
                    <img v-if="authorIcon" :class="$style.authorIcon" :src="authorIcon" alt="" />
                    <span>{{ embed.author.name }}</span>
                </div>
                <div v-if="embed.title" :class="$style.title" v-html="titleHtml" />
                <div v-if="embed.description" :class="$style.desc" v-html="descHtml" />

                <div v-if="fields.length" :class="$style.fields">
                    <div
                        v-for="(f, i) in fields"
                        :key="i"
                        :class="[$style.field, f.inline ? $style.inline : '']"
                    >
                        <div :class="$style.fieldName" v-html="renderText(f.name)" />
                        <div :class="$style.fieldValue" v-html="renderText(f.value)" />
                    </div>
                </div>

                <img v-if="image" :class="$style.image" :src="image" alt="" />

                <div v-if="embed.footer?.text" :class="$style.footer">
                    <img v-if="footerIcon" :class="$style.footerIcon" :src="footerIcon" alt="" />
                    <span>{{ embed.footer.text }}</span>
                </div>
            </div>
            <img v-if="thumbnail" :class="$style.thumb" :src="thumbnail" alt="" />
        </div>
    </div>
</template>

<style module>
.wrap {
    background: #313338;
    padding: 16px;
    border-radius: var(--radius-lg);
}

.embed {
    display: flex;
    gap: 12px;
    max-width: 432px;
    background: #2b2d31;
    border-left: 4px solid #4f545c;
    border-radius: 4px;
    padding: 12px 16px 12px 12px;
    color: #dbdee1;
    font-family: "gg sans", var(--font-sans), sans-serif;
    font-size: 14px;
    line-height: 1.4;
}

.body { flex: 1; min-width: 0; }

.author { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #f2f3f5; }
.authorIcon { width: 24px; height: 24px; border-radius: 50%; }

.title { font-weight: 600; color: #f2f3f5; margin-bottom: 6px; }
.desc { white-space: normal; word-break: break-word; }

.fields { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.field { flex: 1 1 100%; min-width: 0; }
.inline { flex: 1 1 30%; }
.fieldName { font-weight: 600; color: #f2f3f5; font-size: 13px; margin-bottom: 2px; }
.fieldValue { font-size: 14px; word-break: break-word; }

.image { max-width: 100%; border-radius: 6px; margin-top: 10px; }
.thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }

.footer { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 12px; color: #b5bac1; }
.footerIcon { width: 20px; height: 20px; border-radius: 50%; }

.embed :global(.emoji) { width: 1.375em; height: 1.375em; vertical-align: bottom; object-fit: contain; }
.embed :global(.mention) { background: rgba(88,101,242,0.3); color: #c9cdfb; border-radius: 3px; padding: 0 2px; }
.embed :global(code) { background: #1e1f22; border-radius: 3px; padding: 0 3px; font-family: monospace; font-size: 13px; }
.embed :global(code.block) { display: block; padding: 6px 8px; margin: 2px 0; white-space: pre-wrap; }
.embed :global(.quote) { display: inline-block; border-left: 3px solid #4e5058; padding-left: 8px; }
</style>
