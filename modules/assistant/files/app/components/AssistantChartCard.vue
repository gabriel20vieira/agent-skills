<script setup lang="ts">
import type { AssistantChart } from "#shared/utils/assistant"

// A chart a chart tool computed on the server. Plain SVG/HTML, coloured with the theme's
// --chart-1..5 tokens so it follows the light/dark mode and the chosen theme.
const props = defineProps<{ chart: AssistantChart }>()
const { t, locale } = useI18n()

const color = (index: number) => `var(--chart-${(index % 5) + 1})`
const number = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }))
const format = (value: number) => `${number.value.format(value)}${props.chart.unit ? ` ${props.chart.unit}` : ""}`

const categories = computed(() => props.chart.categories)
const series = computed(() => props.chart.series)
const multi = computed(() => series.value.length > 1)
const max = computed(() => Math.max(1, ...series.value.flatMap(item => item.data)))
const totals = computed(() => categories.value.map((_, index) => series.value.reduce((sum, item) => sum + (item.data[index] ?? 0), 0)))
const totalMax = computed(() => Math.max(1, ...totals.value))

// Donut: the first series across the categories.
const RING = 2 * Math.PI * 52
const slices = computed(() => {
    const values = categories.value.map((label, index) => ({ label, value: Math.max(0, series.value[0]?.data[index] ?? 0), color: color(index) }))
    const total = values.reduce((sum, item) => sum + item.value, 0) || 1
    let offset = 0
    return values.map((item) => {
        const length = (item.value / total) * RING
        const slice = { ...item, dash: `${length} ${RING - length}`, offset: -offset }
        offset += length
        return slice
    })
})
const donutTotal = computed(() => slices.value.reduce((sum, item) => sum + item.value, 0))

// Line / area geometry.
const W = 540
const H = 210
const PL = 12
const PR = 12
const PT = 12
const PB = 28
const plotW = W - PL - PR
const plotH = H - PT - PB
const xAt = (index: number) => (categories.value.length <= 1 ? PL + plotW / 2 : PL + (index * plotW) / (categories.value.length - 1))
const yAt = (value: number) => PT + plotH - (value / max.value) * plotH
const lines = computed(() => series.value.map((item, index) => {
    const points = item.data.map((value, at) => `${xAt(at)},${yAt(value)}`).join(" ")
    return {
        color: color(index),
        points,
        area: `${PL},${PT + plotH} ${points} ${PL + plotW},${PT + plotH}`,
        dots: item.data.map((value, at) => ({ x: xAt(at), y: yAt(value) })),
    }
}))
// Show every label when they fit, otherwise about eight.
const labelEvery = computed(() => Math.max(1, Math.ceil(categories.value.length / 8)))

// Radar geometry.
const RS = 300
const RC = RS / 2
const RR = RS / 2 - 46
function radarPoint(index: number, value: number) {
    const angle = (index / Math.max(categories.value.length, 1)) * 2 * Math.PI - Math.PI / 2
    const radius = (value / max.value) * RR
    return { x: RC + radius * Math.cos(angle), y: RC + radius * Math.sin(angle) }
}
const rings = computed(() => [0.33, 0.66, 1].map(level => categories.value.map((_, index) => {
    const point = radarPoint(index, max.value * level)
    return `${point.x},${point.y}`
}).join(" ")))
const axes = computed(() => categories.value.map((label, index) => ({ label, ...radarPoint(index, max.value) })))
const polygons = computed(() => series.value.map((item, index) => ({
    color: color(index),
    points: item.data.map((value, at) => {
        const point = radarPoint(at, value)
        return `${point.x},${point.y}`
    }).join(" "),
})))

const legend = computed(() => (multi.value ? series.value.map((item, index) => ({ name: item.name, color: color(index) })) : []))
</script>

<template>
    <Card class="max-w-xl gap-3 py-4">
        <CardContent class="space-y-3 px-4">
            <p class="text-sm font-semibold">
                {{ chart.title }}
            </p>

            <p
                v-if="!categories.length"
                class="text-sm text-muted-foreground"
            >
                {{ t("assistant.chart.empty") }}
            </p>

            <div
                v-else-if="chart.type === 'donut'"
                class="flex flex-wrap items-center gap-5"
            >
                <svg
                    viewBox="0 0 140 140"
                    class="size-36 shrink-0 -rotate-90"
                    role="img"
                    :aria-label="chart.title"
                >
                    <circle
                        cx="70"
                        cy="70"
                        r="52"
                        fill="none"
                        stroke="var(--muted)"
                        stroke-width="18"
                    />
                    <circle
                        v-for="(slice, index) in slices"
                        :key="index"
                        cx="70"
                        cy="70"
                        r="52"
                        fill="none"
                        :stroke="slice.color"
                        stroke-width="18"
                        :stroke-dasharray="slice.dash"
                        :stroke-dashoffset="slice.offset"
                    />
                </svg>
                <div class="min-w-40 flex-1 space-y-1.5 text-sm">
                    <div
                        v-for="(slice, index) in slices"
                        :key="index"
                        class="flex items-center gap-2"
                    >
                        <span
                            class="size-2.5 shrink-0 rounded-full"
                            :style="{ background: slice.color }"
                        />
                        <span class="min-w-0 flex-1 truncate">{{ slice.label }}</span>
                        <span class="font-medium tabular-nums">{{ format(slice.value) }}</span>
                    </div>
                    <div class="flex justify-between border-t pt-1.5 text-muted-foreground">
                        <span>{{ t("assistant.chart.total") }}</span>
                        <span class="tabular-nums">{{ format(donutTotal) }}</span>
                    </div>
                </div>
            </div>

            <svg
                v-else-if="chart.type === 'line' || chart.type === 'area'"
                :viewBox="`0 0 ${W} ${H}`"
                class="w-full"
                role="img"
                :aria-label="chart.title"
            >
                <line
                    :x1="PL"
                    :y1="PT + plotH"
                    :x2="PL + plotW"
                    :y2="PT + plotH"
                    stroke="var(--border)"
                />
                <template
                    v-for="(line, index) in lines"
                    :key="index"
                >
                    <polygon
                        v-if="chart.type === 'area'"
                        :points="line.area"
                        :fill="line.color"
                        fill-opacity="0.15"
                    />
                    <polyline
                        :points="line.points"
                        fill="none"
                        :stroke="line.color"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <circle
                        v-for="(dot, at) in line.dots"
                        :key="at"
                        :cx="dot.x"
                        :cy="dot.y"
                        r="3"
                        :fill="line.color"
                    />
                </template>
                <template
                    v-for="(category, index) in categories"
                    :key="`x${index}`"
                >
                    <text
                        v-if="index % labelEvery === 0"
                        :x="xAt(index)"
                        :y="H - 8"
                        text-anchor="middle"
                        class="fill-muted-foreground text-[10px]"
                    >{{ category }}</text>
                </template>
            </svg>

            <div
                v-else-if="chart.type === 'column' || chart.type === 'stacked'"
                class="flex h-52 items-end gap-2 pt-4"
            >
                <div
                    v-for="(category, index) in categories"
                    :key="index"
                    class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                >
                    <div
                        v-if="chart.type === 'column'"
                        class="flex h-full w-full items-end justify-center gap-0.5"
                    >
                        <div
                            v-for="(item, at) in series"
                            :key="at"
                            class="min-h-0.5 max-w-8 flex-1 rounded-t-[5px] rounded-b-[2px]"
                            :title="`${item.name}: ${format(item.data[index] ?? 0)}`"
                            :style="{ height: `${((item.data[index] ?? 0) / max) * 100}%`, background: color(at) }"
                        />
                    </div>
                    <div
                        v-else
                        class="flex w-full max-w-11 flex-col-reverse overflow-hidden rounded-t-[5px] rounded-b-[2px]"
                        :style="{ height: `${(totals[index]! / totalMax) * 100}%` }"
                    >
                        <div
                            v-for="(item, at) in series"
                            :key="at"
                            :title="`${item.name}: ${format(item.data[index] ?? 0)}`"
                            :style="{ flexGrow: item.data[index] ?? 0, background: color(at) }"
                        />
                    </div>
                    <span
                        v-if="!multi"
                        class="text-[11px] font-semibold tabular-nums"
                    >{{ format(series[0]?.data[index] ?? 0) }}</span>
                    <span class="max-w-full truncate text-[11px] text-muted-foreground">{{ category }}</span>
                </div>
            </div>

            <div
                v-else-if="chart.type === 'bar'"
                class="space-y-3"
            >
                <div
                    v-for="(category, index) in categories"
                    :key="index"
                    class="grid grid-cols-[6rem_1fr] items-center gap-2.5"
                >
                    <span class="truncate text-right text-xs">{{ category }}</span>
                    <div class="space-y-1">
                        <div
                            v-for="(item, at) in series"
                            :key="at"
                            class="flex items-center gap-1.5"
                        >
                            <div
                                class="h-3.5 min-w-0.5 rounded-[3px]"
                                :style="{ width: `${((item.data[index] ?? 0) / max) * 100}%`, background: color(at) }"
                            />
                            <span class="text-[11px] text-muted-foreground tabular-nums">{{ format(item.data[index] ?? 0) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                v-else-if="chart.type === 'radar'"
                class="flex justify-center"
            >
                <svg
                    :viewBox="`0 0 ${RS} ${RS}`"
                    class="w-full max-w-80"
                    role="img"
                    :aria-label="chart.title"
                >
                    <polygon
                        v-for="(ring, index) in rings"
                        :key="`r${index}`"
                        :points="ring"
                        fill="none"
                        stroke="var(--border)"
                    />
                    <line
                        v-for="(axis, index) in axes"
                        :key="`a${index}`"
                        :x1="RC"
                        :y1="RC"
                        :x2="axis.x"
                        :y2="axis.y"
                        stroke="var(--border)"
                    />
                    <polygon
                        v-for="(polygon, index) in polygons"
                        :key="`p${index}`"
                        :points="polygon.points"
                        :fill="polygon.color"
                        fill-opacity="0.15"
                        :stroke="polygon.color"
                        stroke-width="2"
                    />
                    <text
                        v-for="(axis, index) in axes"
                        :key="`t${index}`"
                        :x="axis.x"
                        :y="axis.y"
                        :text-anchor="axis.x > RC + 4 ? 'start' : axis.x < RC - 4 ? 'end' : 'middle'"
                        :dy="axis.y > RC ? 12 : -4"
                        class="fill-muted-foreground text-[10px]"
                    >{{ axis.label }}</text>
                </svg>
            </div>

            <div
                v-else
                class="overflow-x-auto"
            >
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b">
                            <th class="px-2 py-1.5" />
                            <th
                                v-for="(item, index) in series"
                                :key="index"
                                class="px-2 py-1.5 text-right font-semibold"
                            >
                                {{ item.name }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(category, index) in categories"
                            :key="index"
                            class="border-b last:border-0"
                        >
                            <td class="px-2 py-1.5">
                                {{ category }}
                            </td>
                            <td
                                v-for="(item, at) in series"
                                :key="at"
                                class="px-2 py-1.5 text-right tabular-nums"
                            >
                                {{ format(item.data[index] ?? 0) }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div
                v-if="legend.length && chart.type !== 'donut' && chart.type !== 'table'"
                class="flex flex-wrap gap-3"
            >
                <span
                    v-for="(entry, index) in legend"
                    :key="index"
                    class="flex items-center gap-1.5 text-xs"
                >
                    <span
                        class="size-2.5 rounded-[3px]"
                        :style="{ background: entry.color }"
                    />{{ entry.name }}
                </span>
            </div>
        </CardContent>
    </Card>
</template>
