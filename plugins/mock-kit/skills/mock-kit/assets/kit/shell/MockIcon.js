// MockIcon: a Lucide icon by name ("shopping-cart" or "ShoppingCart").
import { defineComponent, h } from "vue"

const BASE = { "xmlns": "http://www.w3.org/2000/svg", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }

function pascal(name) {
    return name.replace(/(^|[-_ ])(\w)/g, (_, __, letter) => letter.toUpperCase())
}

function iconNode(name) {
    const icons = globalThis.lucide?.icons ?? {}
    return icons[pascal(name)] ?? icons[name] ?? null
}

export default defineComponent({
    name: "MockIcon",
    props: {
        name: { type: String, required: true },
        size: { type: [Number, String], default: 16 },
        strokeWidth: { type: [Number, String], default: 2 },
    },
    setup(props) {
        return () => {
            const node = iconNode(props.name)
            const attrs = { ...BASE, "width": props.size, "height": props.size, "stroke-width": props.strokeWidth, "aria-hidden": "true", "class": "inline-block shrink-0" }
            if (!node) {
                console.warn(`MockIcon: unknown icon "${props.name}"`)
                return h("svg", attrs, [h("rect", { x: 4, y: 4, width: 16, height: 16, rx: 2 })])
            }
            // Lucide icon nodes are [[tag, attrs], ...]; older builds wrap them in ["svg", attrs, children].
            const children = node[0] === "svg" ? node[2] : node
            return h("svg", attrs, children.map(([tag, childAttrs]) => h(tag, childAttrs)))
        }
    },
})
