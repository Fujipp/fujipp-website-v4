<script setup lang="ts">
import { ConfirmModal } from "@/shared/ui/modals";

interface Props {
    disabled?: boolean;
    reason: string;
}

withDefaults(defineProps<Props>(), {
    disabled: false,
});

const emit = defineEmits<{
    cancel: [];
    confirm: [];
}>();
</script>

<template>
    <ConfirmModal
        variant="danger"
        title="Delete"
        :reason="reason"
        :disabled="disabled"
        @cancel="emit('cancel')"
        @confirm="emit('confirm')"
    />
</template>
