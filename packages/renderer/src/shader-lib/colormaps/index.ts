import colorMapsSVGString from './colormaps.svg?raw';
import parseColor from "parse-color";

class ColormapStop {
    constructor(readonly red: number, readonly green: number, readonly blue: number, readonly position: number) {
    }
    css() {
        const f = (n: number) => n.toFixed(1);
        return `rgb(${f(this.red)}, ${f(this.green)}, ${f(this.blue)}) ${f(this.position*100)}%`;
    }
    shaderColor() {
        const f = (n: number) => n.toFixed(3);
        return `vec3(${f(this.red/255)}, ${f(this.green/255)}, ${f(this.blue/255)})`;
    }
}

class Colormap {
    static fromSVGElement(element: SVGLinearGradientElement) {
        const stopElements = element.getElementsByTagName('stop');

        const stops = [];
        for (const stopElement of Array.from(stopElements)) {
            const offset = stopElement.offset.baseVal;
            const color = parseColor(stopElement.getAttribute('stop-color') || '#000');
            stops.push(new ColormapStop(color.rgb[0], color.rgb[1], color.rgb[2], offset));
        }
        return new this(element.id, stops);
    }
    constructor(readonly name: string, readonly stops: ColormapStop[]) {}

    get capitalizedName() {
        return this.name[0].toUpperCase() + this.name.slice(1);
    }

    get shaderFunctionName() {
        return `Colormap${this.capitalizedName}`;
    }

    css(direction: string) {
        direction = direction || 'to right';
        return `linear-gradient(${direction}, ${this.stops.map((s: { css: () => void; }) => s.css()).join(', ')})`;
    }
    shader() {
        const lines = [];
        lines.push(`vec3 ${this.shaderFunctionName}(float x) {`);

        let prevStop = null;

        for (const stop of this.stops) {
            if (!prevStop) {
                lines.push(`  vec3 color = ${stop.shaderColor()};`);
            } else {
                const f = (n: { toFixed: (arg0: number) => void; }) => n.toFixed(3)
                lines.push(`  color = mix(color, ${stop.shaderColor()}, linearstep(${f(prevStop.position)}, ${f(stop.position)}, x));`);
            }
            prevStop = stop;
        }

        lines.push(`  return color;`);
        lines.push(`}`);
        return lines.join('\n');
    }
}

const svgParser = new DOMParser().parseFromString(colorMapsSVGString, 'text/xml');
const elements = svgParser.getElementsByTagName('linearGradient')
const colormaps = Array.from(elements).map(el => Colormap.fromSVGElement(el));

export default colormaps;
