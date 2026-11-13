// MockStepper: numbered steps (done, current, to do). v-model is the current step's index;
// steps already done can be clicked to go back.
import { defineComponent } from "vue"

export default defineComponent({
    name: "MockStepper",
    props: {
        steps: { type: Array, required: true },
        modelValue: { type: Number, default: 0 },
    },
    emits: ["update:modelValue"],
    template: `
        <ol class="flex w-full items-center gap-2">
            <li v-for="(step, index) in steps" :key="index" class="flex flex-1 items-center gap-2 last:flex-none">
                <button type="button" class="flex items-center gap-2 text-sm" :disabled="index > modelValue"
                    :aria-current="index === modelValue ? 'step' : null"
                    @click="index < modelValue && $emit('update:modelValue', index)">
                    <span class="flex size-7 items-center justify-center rounded-full text-xs font-semibold"
                        :class="index < modelValue ? 'bg-primary text-primary-foreground' : index === modelValue ? 'ring-2 ring-primary text-primary bg-white' : 'bg-muted text-muted-foreground'">
                        <mock-icon v-if="index < modelValue" name="check" :size="14"></mock-icon>
                        <template v-else>{{ index + 1 }}</template>
                    </span>
                    <span :class="index === modelValue ? 'font-medium text-foreground' : 'text-muted-foreground'">{{ step }}</span>
                </button>
                <span v-if="index < steps.length - 1" class="h-px flex-1" :class="index < modelValue ? 'bg-primary' : 'bg-border'"></span>
            </li>
        </ol>
    `,
})
