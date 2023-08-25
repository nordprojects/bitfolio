import shaderTemplate from './shader-template.glsl?raw';
import colormaps from './colormaps'

const LAST_FRAME_CODE = `
uniform sampler2D lastFrameTexture;
vec3 lastFrame(vec2 position) {
    // map non-square aspect ratios to [-1, 1]
    position /= resolution / min(resolution.x, resolution.y);

    // map from [-1, 1] to [0, 1]
    position = 0.5*position + 0.5;

    return texture2D(lastFrameTexture, position).rgb;
}
vec3 lastFrame(float x, float y) {
  return lastFrame(vec2(x, y));
}
`

const CONTENT_TEMPLATE_TAG_LINE_REGEX = /\s*{{content}}/;
const FUNCTIONS_TEMPLATE_TAG_LINE_REGEX = /\s*{{functions}}/
const FUNCTIONS_REGEX = /(void|bool|float|int|vec2|vec3|vec4|mat2|mat3|mat4)\s+(?<fn_name>[a-zA-Z]\w+)\([\w\s,]+\)\s+\{[^\{\}]*(\{[^\{\}]*\})*[^\{\}]*}/g;

const shaderTemplateLines = shaderTemplate.split('\n');
const contentTagFound = shaderTemplateLines.some(
  line => line.match(CONTENT_TEMPLATE_TAG_LINE_REGEX)
);
const functionsTagFound = shaderTemplateLines.some(
  line => line.match(FUNCTIONS_TEMPLATE_TAG_LINE_REGEX)
);
console.assert(contentTagFound);
console.assert(functionsTagFound);

export default class ShaderPreprocessor {
    preprocess(userCode: string) {
        let lines = shaderTemplate.split('\n');
        let shader = '';
        let extensions: string[] = []

        for (const line of lines) {
          if (line.match(FUNCTIONS_TEMPLATE_TAG_LINE_REGEX)) {
            shader += this.functions(userCode) + '\n';
          } else {
            shader += line + '\n';
          }
        }

        lines = shader.split('\n');
        shader = '';
        let userCodeLineOffset;
        let i = 0;

        for (const line of lines) {
          if (line.match(CONTENT_TEMPLATE_TAG_LINE_REGEX)) {
            shader += this.shaderBody(userCode) + '\n';
            userCodeLineOffset = i;
          } else {
            shader += line + '\n';
          }
          i += 1;
        }

        if (userCodeLineOffset === undefined) {
            throw new Error('content tag not found');
        }

        return {
            shader,
            userCodeLineOffset,
            extensions,
        }
    }

    functions(userCode: string) {
        const functionCodes = this.colormapsInUse(userCode).map(c => c.shader());

        for(const match of userCode.matchAll(FUNCTIONS_REGEX)) {
            functionCodes.push(match[0])
        }

        if (this.usesLastFrame(userCode)) {
            functionCodes.push(LAST_FRAME_CODE)
        }

        return functionCodes.join('\n');
    }

    shaderBody(userCode: string) {
        // remove shader functions from the body
        return userCode.replace(FUNCTIONS_REGEX, '')
    }

    colormapsInUse(userCode: string) {
        return colormaps.filter(c => userCode.includes(c.shaderFunctionName));
    }

    usesLastFrame(userCode: string) {
        return userCode.includes('lastFrame')
    }
}
