Bitfolio
========

Put files in this directory to view them in Bitfolio.

Supported file types:

- Images: .jpg, .jpeg, .png, .gif
- Video: .mp4, .webm, .mov
- Webpages: .html
- Fragment shaders: .glsl

Filename tags
-------------

To customize the display of a file, you can add tags to the filename.

- *Duration*: to set a file duration to 10 seconds, add `.10s.` to the
  filename. e.g. `myvideo.10s.mp4`. If a duration is specified for a video, 
  it will loop for the duration.

- *Conform*: to specify the scale mode of a file, you can add `.fill.`, 
  `.fit.` or `.1-1.` to the filename. e.g. `myimage.fill.jpg`. The 
  default is `fill`.

Shaders
-------

Shaders can be written in [Tinyshader] format. There is one extra option - you 
can specify the resolution of the shader using a comment at the start of the 
file.

Here's an example:

*sample.glsl*
```
// {"resolution": 80}
t*=0.2;
color = vec3(
  sin(x+t),
  sawtooth(x*y+t),
  triangle(x*r+t)
);
```

[Tinyshader]: https://tinyshader.com
