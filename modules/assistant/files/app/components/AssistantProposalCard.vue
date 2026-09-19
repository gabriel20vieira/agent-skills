<script setup lang="ts">
import { CheckIcon, LoaderCircleIcon, XIcon } from "@lucide/vue"
import type { AssistantProposal } from "#shared/utils/assistant"

const props = defineProps<{ proposal: AssistantProposal }>()
const emit = defineEmits<{ accept: [AssistantProposal], reject: [AssistantProposal] }>()
const { t } = useI18n()

const variant = computed(() => ({
    pending: "outline",
    claimed: "secondary",
    done: "default",
    rejected: "secondary",
    failed: "destructive",
} as const)[props.proposal.state])
</script>

<template>
    <Card class="gap-3 border-dashed py-4">
        <CardContent class="flex flex-col gap-3 px-4 sm:flex-row sm:items-center">
            <div class="flex-1 space-y-1">
                <p class="text-xs text-muted-foreground">
                    {{ t("assistant.proposal.label") }}
                </p>
                <p class="font-medium">
                    {{ proposal.summary }}
                </p>
            </div>
            <div
                v-if="proposal.state === 'pending'"
                class="flex gap-2"
            >
                <Button
                    variant="outline"
                    size="sm"
                    @click="emit('reject', proposal)"
                >
                    <XIcon /> {{ t("assistant.proposal.reject") }}
                </Button>
                <Button
                    size="sm"
                    @click="emit('accept', proposal)"
                >
                    <CheckIcon /> {{ t("assistant.proposal.accept") }}
                </Button>
            </div>
            <Badge
                v-else
                :variant="variant"
            >
                <LoaderCircleIcon
                    v-if="proposal.state === 'claimed'"
                    class="animate-spin"
                />
                {{ t(`assistant.proposal.states.${proposal.state}`) }}
            </Badge>
        </CardContent>
    </Card>
</template>
