<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core"

defineProps<{ title: string, description?: string }>()
const open = defineModel<boolean>("open", { required: true })
// Dialog on desktop, bottom sheet on phones.
const desktop = useMediaQuery("(min-width: 768px)")
</script>

<template>
    <Dialog
        v-if="desktop"
        v-model:open="open"
    >
        <DialogContent class="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{{ title }}</DialogTitle>
                <!-- Always present: screen readers announce it, and reka warns without one. -->
                <DialogDescription :class="{ 'sr-only': !description }">
                    {{ description || title }}
                </DialogDescription>
            </DialogHeader>
            <slot />
            <DialogFooter v-if="$slots.footer">
                <slot name="footer" />
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <Sheet
        v-else
        v-model:open="open"
    >
        <SheetContent
            side="bottom"
            class="max-h-[90dvh] overflow-y-auto"
        >
            <SheetHeader>
                <SheetTitle>{{ title }}</SheetTitle>
                <!-- Always present: screen readers announce it, and reka warns without one. -->
                <SheetDescription :class="{ 'sr-only': !description }">
                    {{ description || title }}
                </SheetDescription>
            </SheetHeader>
            <div class="px-4">
                <slot />
            </div>
            <SheetFooter v-if="$slots.footer">
                <slot name="footer" />
            </SheetFooter>
        </SheetContent>
    </Sheet>
</template>
