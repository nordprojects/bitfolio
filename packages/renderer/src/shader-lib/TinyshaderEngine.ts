import ShaderPreprocessor from './ShaderPreprocessor';
import * as twgl from 'twgl.js';

const ERROR_INFO_REGEX = /ERROR: \d+:(\d+): (.*)/;


export interface RenderEngineError {
    message: any;
    lineNumber?: number;
}

export default class RenderEngine {
    private preprocessor = new ShaderPreprocessor();
    gl: WebGLRenderingContext;
    bufferInfo: twgl.BufferInfo;
    startTime: number;
    programInfo: twgl.ProgramInfo | null = null;
    error: RenderEngineError | null = null;
    fragmentShader: string = '';
    fragmentShaderLineOffset: number = 0;
    overrideRenderSize: {width: number, height: number}|null = null;

    constructor (readonly canvas: HTMLCanvasElement) {
        this.gl = canvas.getContext('webgl', {preserveDrawingBuffer: true})!;

        const arrays = {
          position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
        };
        this.bufferInfo = twgl.createBufferInfoFromArrays(this.gl, arrays);
        this.updateFragmentShader();
        this.createShader();
        this.startTime = Date.now();

        this._render = this._render.bind(this);
        (window as any).engine = this;
    }

    vertexShader = 'attribute vec4 position; void main() {gl_Position = position;}\n';

    updateFragmentShader() {
      const {shader, userCodeLineOffset} = this.preprocessor.preprocess(this.userCode);
      this.fragmentShader = shader;
      this.fragmentShaderLineOffset = userCodeLineOffset;
    }

    createShader() {
        const shaders = [this.vertexShader+'\n', this.fragmentShader+'\n'];
        this.programInfo = twgl.createProgramInfo(this.gl, shaders, {
            errorCallback: (errorMessage) => {
                const match = errorMessage.match(ERROR_INFO_REGEX);

                if (match !== null) {
                    let message = match[2];
                    let lineNumber = match[1] - this.fragmentShaderLineOffset;

                    if (lineNumber >= this.codeNumberOfLines) {
                        lineNumber = this.codeNumberOfLines;
                        if (message == "'}' : syntax error") {
                            message = 'Syntax error';
                        }
                    }

                    this.error = {
                        message,
                        lineNumber,
                    }
                } else {
                    this.error = {
                        message: errorMessage,
                    }
                }
                console.log({...this.error});
        }});

        if (this.programInfo === null) { return; }
        this.error = null;
        this.gl.useProgram(this.programInfo.program);
        twgl.setBuffersAndAttributes(this.gl, this.programInfo, this.bufferInfo);
    }

    // noise shader as the default
    _userCode = 'white = 0.3 + fract(sin(dot(xy, vec2(12.9898, 4.1414))) * 43758.5453);';
    get userCode() {
        return this._userCode;
    }
    set userCode(userCode) {
        if (this._userCode === userCode) {
            return;
        }
        this._userCode = userCode;
        this.updateFragmentShader();
        this.createShader();

        if (!this.isRunning) {
            // render once to get first frame
            this.render()
        }
    }

    get codeNumberOfLines() {
      return this.userCode.split('\n').length;
    }

    private animationFrameRequest: number|null = null;
    shaderTime = 0;
    lastRenderTime: number|null = null;
    private isRunning = false;

    restart() {
        this.shaderTime = 0;
        this.start();
    }
    start() {
        if (this.isRunning) { return }
        this.isRunning = true;
        this.animationFrameRequest = window.requestAnimationFrame(this._render);
    }
    stop() {
        if (this.animationFrameRequest) {
            window.cancelAnimationFrame(this.animationFrameRequest);
            this.animationFrameRequest = null;
        }
        this.isRunning = false;
        this.lastRenderTime = null;
    }
    render() {
        this._render()
    }
    private _render(time?: number) {
        if (this.isRunning) {
            this.animationFrameRequest = window.requestAnimationFrame(this._render);
        }

        if (this.lastRenderTime !== null && time !== undefined) {
            this.shaderTime += time - this.lastRenderTime
        }

        if (this.programInfo === null) {
          return;
        }

        if (this.overrideRenderSize) {
            const size = this.overrideRenderSize;
            if (this.canvas.width !== size.width || this.canvas.height !== size.height) {
                this.canvas.width = size.width;
                this.canvas.height = size.height;
            }
        } else {
            // TODO: make the scale static, so that the canvas is always rendering
            // e.g. 720p. width can flex, to add pixels if needed.
            twgl.resizeCanvasToDisplaySize(this.canvas, 2);
        }

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        let lastFrameTexture: WebGLTexture|null = null;

        if (this.preprocessor.usesLastFrame(this.userCode)) {
            lastFrameTexture = twgl.createTexture(this.gl, {
                src: this.gl.canvas as any,
                wrap: this.gl.CLAMP_TO_EDGE,
                format: this.gl.RGB,
                flipY: 1,
            })
        }

        const uniforms = {
          time: this.shaderTime / 1000,
          resolution: [this.gl.canvas.width, this.gl.canvas.height],
          lastFrameTexture,
        };
        twgl.setUniforms(this.programInfo, uniforms);
        twgl.drawBufferInfo(this.gl, this.bufferInfo);

        if (lastFrameTexture) {
            // it's important to delete the texture, otherwise the GC sometimes
            // doesn't catch up and we eat all RAM on the machine.
            this.gl.deleteTexture(lastFrameTexture)
        }

        if (time !== undefined) {
            this.lastRenderTime = time;
        }
    }
}
